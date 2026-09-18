import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import {createRemoteJWKSet,jwtVerify,SignJWT} from 'jose';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {installEmailAuth} from './email-auth.js';
import {
  initDb,upsertUser,getUser,publicUser,setStripeCustomer,applySubscription,updateSubscriptionByStripeId,
  resetPeriodUsageBySubscription,consumeUsage,addHistory,listHistory,clearHistory,addEvent,getAnalytics
} from './db.js';

const app=express(),port=Number(process.env.PORT||3000),isProduction=process.env.NODE_ENV==='production';
app.set('trust proxy',1);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const rootDir=path.resolve(__dirname,'..');
const staticDir=path.join(rootDir,'app','src','main','assets');
const ffmpegDist=path.join(rootDir,'node_modules','@ffmpeg','ffmpeg','dist','umd');
const ffmpegCoreDist=path.join(rootDir,'node_modules','@ffmpeg','core','dist','esm');
const renderUrl=process.env.RENDER_EXTERNAL_HOSTNAME?`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`:'';
const appUrl=(process.env.APP_URL||process.env.RENDER_EXTERNAL_URL||renderUrl||`http://localhost:${port}`).replace(/\/$/,'');
const jwtSecret=process.env.APP_JWT_SECRET||'';
const stripeSecretKey=process.env.STRIPE_SECRET_KEY||'';
const stripe=stripeSecretKey?new Stripe(stripeSecretKey):null;
const stripeWebhookClient=stripe||new Stripe('sk_test_video_uniquifier_webhook_verifier');
const googleJwks=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs')),appleJwks=createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const plans={
  basic:{name:'Basic',limit:750,amount:9,priceId:process.env.STRIPE_PRICE_BASIC||'',paymentLink:process.env.STRIPE_PAYMENT_LINK_BASIC||''},
  pro:{name:'Pro',limit:2250,amount:24,priceId:process.env.STRIPE_PRICE_PRO||'',paymentLink:process.env.STRIPE_PAYMENT_LINK_PRO||''},
  business:{name:'Business',limit:15000,amount:99,priceId:process.env.STRIPE_PRICE_BUSINESS||'',paymentLink:process.env.STRIPE_PAYMENT_LINK_BUSINESS||''}
};

function fromUnix(v){return v?new Date(Number(v)*1000):null;}
function requireServerConfig(){if(!jwtSecret)throw new Error('APP_JWT_SECRET is not configured');}
function sameOriginFallback(){try{return new URL(appUrl).origin;}catch(_){return'';}}
function billingConfigured(){return Object.values(plans).every(p=>p.paymentLink||(stripe&&p.priceId));}
function paymentLinkUrl(base,user){const url=new URL(base);url.searchParams.set('client_reference_id',user.id);if(user.email)url.searchParams.set('prefilled_email',user.email);return url.toString();}

app.use((req,res,next)=>{
  if(isProduction&&!req.secure){const host=req.headers.host;if(host)return res.redirect(308,`https://${host}${req.originalUrl}`);}
  if(req.secure||isProduction)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(self)');res.setHeader('Cross-Origin-Opener-Policy','same-origin-allow-popups');
  res.setHeader('X-Video-Processing','local-only');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://accounts.google.com https://appleid.cdn-apple.com blob: 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' blob: data: https:; connect-src 'self' https://accounts.google.com https://www.googleapis.com https://appleid.apple.com; frame-src https://accounts.google.com https://appleid.apple.com https://js.stripe.com https://checkout.stripe.com; worker-src 'self' blob:; media-src 'self' blob: data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://accounts.google.com https://appleid.apple.com https://checkout.stripe.com");
  next();
});

app.get('/vendor/ffmpeg/ffmpeg.js',(req,res)=>{res.setHeader('Cache-Control','public,max-age=31536000,immutable');res.type('application/javascript').sendFile(path.join(ffmpegDist,'ffmpeg.js'));});
app.get('/vendor/ffmpeg/ffmpeg-core.js',(req,res)=>{res.setHeader('Cache-Control','public,max-age=31536000,immutable');res.type('application/javascript').sendFile(path.join(ffmpegCoreDist,'ffmpeg-core.js'));});
app.get('/vendor/ffmpeg/ffmpeg-core.wasm',(req,res)=>{res.setHeader('Cache-Control','public,max-age=31536000,immutable');res.type('application/wasm').sendFile(path.join(ffmpegCoreDist,'ffmpeg-core.wasm'));});

app.use((req,res,next)=>{
  const configured=(process.env.CORS_ORIGIN||sameOriginFallback()).split(',').map(x=>x.trim()).filter(Boolean),origin=req.headers.origin;
  if(origin&&configured.includes(origin))res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, Stripe-Signature');res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  if(req.method==='OPTIONS')return res.sendStatus(204);next();
});
app.use('/api',(req,res,next)=>{
  res.setHeader('Cache-Control','no-store, private');
  const type=String(req.headers['content-type']||'').toLowerCase();
  if(type.startsWith('video/')||type.includes('multipart/form-data'))return res.status(415).json({error:'RAW_VIDEO_UPLOAD_DISABLED',message:'Video files are processed locally on the user device.'});
  next();
});

app.post('/api/webhooks/stripe',express.raw({type:'application/json'}),async(req,res)=>{
  if(!process.env.STRIPE_WEBHOOK_SECRET)return res.status(503).send('Stripe webhook is not configured');let event;
  try{event=stripeWebhookClient.webhooks.constructEvent(req.body,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET);}catch(e){return res.status(400).send(`Webhook signature error: ${e.message}`);}
  try{
    if(event.type==='checkout.session.completed'){const s=event.data.object,userId=s.metadata?.userId||s.client_reference_id,plan=s.metadata?.plan;if(userId&&plans[plan])await applySubscription({userId,customerId:String(s.customer||''),subscriptionId:String(s.subscription||''),plan,status:'active',currentPeriodEnd:null,markSubscribed:true});}
    if(event.type==='customer.subscription.created'||event.type==='customer.subscription.updated'){const sub=event.data.object,userId=sub.metadata?.userId,plan=sub.metadata?.plan;if(userId&&plans[plan])await applySubscription({userId,customerId:String(sub.customer||''),subscriptionId:sub.id,plan,status:sub.status,currentPeriodEnd:fromUnix(sub.current_period_end),markSubscribed:true});else await updateSubscriptionByStripeId({subscriptionId:sub.id,status:sub.status,currentPeriodEnd:fromUnix(sub.current_period_end)});}
    if(event.type==='customer.subscription.deleted'){const sub=event.data.object;await updateSubscriptionByStripeId({subscriptionId:sub.id,status:'canceled',currentPeriodEnd:fromUnix(sub.current_period_end)});}
    if(event.type==='invoice.paid'){const invoice=event.data.object,subscriptionId=typeof invoice.subscription==='string'?invoice.subscription:invoice.subscription?.id;if(subscriptionId&&invoice.billing_reason==='subscription_cycle')await resetPeriodUsageBySubscription(subscriptionId);}
    res.json({received:true});
  }catch(e){console.error('[stripe webhook]',e);res.status(500).send('Webhook processing failed');}
});

app.use(express.json({limit:'1mb'}));
async function signAppToken(user){requireServerConfig();const key=new TextEncoder().encode(jwtSecret);return new SignJWT({email:user.email||'',name:user.name||''}).setProtectedHeader({alg:'HS256'}).setSubject(user.id).setIssuer('video-variator').setAudience('video-variator-client').setIssuedAt().setExpirationTime('7d').sign(key);}
async function auth(req,res,next){try{requireServerConfig();const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!token)return res.status(401).json({error:'AUTH_REQUIRED'});const key=new TextEncoder().encode(jwtSecret),{payload}=await jwtVerify(token,key,{issuer:'video-variator',audience:'video-variator-client'}),user=await getUser(payload.sub);if(!user)return res.status(401).json({error:'USER_NOT_FOUND'});req.user=user;next();}catch(_){res.status(401).json({error:'INVALID_SESSION'});}}
installEmailAuth(app,{signAppToken});

app.get('/api/health',(req,res)=>res.json({ok:true,service:'video-uniquifier',https:req.secure||!isProduction,videoProcessing:'local-only',ffmpegRuntime:'same-origin-esm',appUrl,time:new Date().toISOString()}));
app.get('/api/version',(req,res)=>res.json({webVersion:process.env.WEB_VERSION||'5.0.0',androidVersion:process.env.ANDROID_VERSION||'5.0.0',androidVersionCode:Number(process.env.ANDROID_VERSION_CODE||5),latestApkUrl:process.env.LATEST_APK_URL||'https://github.com/mvryhan-web/video-variator-android/releases/download/latest/VideoUniquifier.apk'}));
app.get('/api/config',(req,res)=>res.json({
  googleClientId:process.env.GOOGLE_CLIENT_ID||'',appleClientId:process.env.APPLE_CLIENT_ID||'',appleRedirectUri:process.env.APPLE_REDIRECT_URI||'',emailAuth:true,billingConfigured:billingConfigured(),
  introOfferText:process.env.INTRO_OFFER_TEXT||'Intro discount available on your first subscription',privacy:{httpsRequired:isProduction,localVideoProcessing:true,rawVideoUploadDisabled:true},plans:{basic:{price:9,limit:750,unit:'credits'},pro:{price:24,limit:2250,unit:'credits'},business:{price:99,limit:15000,unit:'credits'}}
}));

app.post('/api/auth/google',async(req,res)=>{try{if(!process.env.GOOGLE_CLIENT_ID)return res.status(503).json({error:'GOOGLE_AUTH_NOT_CONFIGURED'});const credential=req.body?.credential;if(!credential)return res.status(400).json({error:'MISSING_GOOGLE_CREDENTIAL'});const {payload}=await jwtVerify(credential,googleJwks,{audience:process.env.GOOGLE_CLIENT_ID,issuer:['https://accounts.google.com','accounts.google.com']});const email=payload.email_verified===false?null:payload.email;const user=await upsertUser({provider:'google',providerSub:payload.sub,email,name:payload.name});res.json({token:await signAppToken(user),user:publicUser(user)});}catch(e){console.error('[google auth]',e);res.status(401).json({error:'GOOGLE_AUTH_FAILED'});}});
app.post('/api/auth/apple',async(req,res)=>{try{if(!process.env.APPLE_CLIENT_ID)return res.status(503).json({error:'APPLE_AUTH_NOT_CONFIGURED'});const idToken=req.body?.idToken;if(!idToken)return res.status(400).json({error:'MISSING_APPLE_TOKEN'});const {payload}=await jwtVerify(idToken,appleJwks,{audience:process.env.APPLE_CLIENT_ID,issuer:'https://appleid.apple.com'}),supplied=req.body?.user||{},fullName=supplied?.name?[supplied.name.firstName,supplied.name.lastName].filter(Boolean).join(' '):null,user=await upsertUser({provider:'apple',providerSub:payload.sub,email:payload.email||supplied.email||null,name:fullName});res.json({token:await signAppToken(user),user:publicUser(user)});}catch(e){console.error('[apple auth]',e);res.status(401).json({error:'APPLE_AUTH_FAILED'});}});
app.get('/api/me',auth,(req,res)=>res.json({user:publicUser(req.user)}));

app.post('/api/usage/consume',auth,async(req,res)=>{try{const user=await consumeUsage(req.user.id,{seconds:req.body?.seconds,sourceCount:req.body?.sourceCount??req.body?.count});await addEvent(req.user.id,{type:'processing_success',category:'usage'});res.json({user:publicUser(user)});}catch(e){if(e.code==='CREDIT_LIMIT_REACHED'||e.message==='CREDIT_LIMIT_REACHED')return res.status(402).json({error:'CREDIT_LIMIT_REACHED'});console.error(e);res.status(500).json({error:'USAGE_UPDATE_FAILED'});}});
app.post('/api/events',auth,async(req,res)=>{try{await addEvent(req.user.id,{type:req.body?.type||'event',category:req.body?.category||null,message:req.body?.message||null});res.json({ok:true});}catch(e){res.status(500).json({error:'EVENT_SAVE_FAILED'});}});
app.get('/api/analytics',auth,async(req,res)=>{try{res.json({analytics:await getAnalytics(req.user.id)});}catch(e){res.status(500).json({error:'ANALYTICS_FAILED'});}});
app.get('/api/history',auth,async(req,res)=>{try{res.json({history:await listHistory(req.user.id)});}catch(e){res.status(500).json({error:'HISTORY_FAILED'});}});
app.post('/api/history',auth,async(req,res)=>{try{const items=Array.isArray(req.body?.items)?req.body.items:[];for(const item of items.slice(0,25))await addHistory(req.user.id,item);res.json({ok:true});}catch(e){res.status(500).json({error:'HISTORY_SAVE_FAILED'});}});
app.delete('/api/history',auth,async(req,res)=>{try{await clearHistory(req.user.id);res.json({ok:true});}catch(e){res.status(500).json({error:'HISTORY_CLEAR_FAILED'});}});

app.post('/api/billing/checkout',auth,async(req,res)=>{try{if(publicUser(req.user)?.isAdmin)return res.status(409).json({error:'ADMIN_ACCESS_ALREADY_UNLIMITED'});const plan=req.body?.plan,p=plans[plan];if(!p)return res.status(400).json({error:'INVALID_OR_UNCONFIGURED_PLAN'});if(p.paymentLink)return res.json({url:paymentLinkUrl(p.paymentLink,req.user)});if(!stripe||!p.priceId)return res.status(503).json({error:'BILLING_NOT_CONFIGURED'});let customerId=req.user.stripe_customer_id;if(!customerId){const customer=await stripe.customers.create({email:req.user.email||undefined,name:req.user.name||undefined,metadata:{userId:req.user.id}});customerId=customer.id;await setStripeCustomer(req.user.id,customerId);}const coupon=!req.user.has_subscribed&&process.env.STRIPE_FIRST_SUBSCRIPTION_COUPON_ID?process.env.STRIPE_FIRST_SUBSCRIPTION_COUPON_ID:null;const session=await stripe.checkout.sessions.create({mode:'subscription',customer:customerId,line_items:[{price:p.priceId,quantity:1}],client_reference_id:req.user.id,metadata:{userId:req.user.id,plan,credits:String(p.limit)},subscription_data:{metadata:{userId:req.user.id,plan,credits:String(p.limit)}},discounts:coupon?[{coupon}]:undefined,success_url:`${appUrl}/?checkout=success`,cancel_url:`${appUrl}/?checkout=cancel`});res.json({url:session.url});}catch(e){console.error('[checkout]',e);res.status(500).json({error:'CHECKOUT_FAILED'});}});
app.post('/api/billing/portal',auth,async(req,res)=>{try{if(publicUser(req.user)?.isAdmin)return res.status(409).json({error:'ADMIN_ACCESS_ALREADY_UNLIMITED'});if(!stripe||!req.user.stripe_customer_id)return res.status(400).json({error:'BILLING_PORTAL_UNAVAILABLE'});const session=await stripe.billingPortal.sessions.create({customer:req.user.stripe_customer_id,return_url:`${appUrl}/`});res.json({url:session.url});}catch(e){console.error('[portal]',e);res.status(500).json({error:'BILLING_PORTAL_FAILED'});}});
app.post('/api/billing/cancel',auth,async(req,res)=>{try{if(publicUser(req.user)?.isAdmin)return res.status(409).json({error:'ADMIN_ACCESS_ALREADY_UNLIMITED'});if(!stripe||!req.user.stripe_subscription_id)return res.status(400).json({error:'NO_ACTIVE_SUBSCRIPTION'});const sub=await stripe.subscriptions.update(req.user.stripe_subscription_id,{cancel_at_period_end:true});await updateSubscriptionByStripeId({subscriptionId:sub.id,status:sub.status,currentPeriodEnd:fromUnix(sub.current_period_end)});res.json({ok:true,cancelAtPeriodEnd:!!sub.cancel_at_period_end,currentPeriodEnd:fromUnix(sub.current_period_end)});}catch(e){console.error('[cancel]',e);res.status(500).json({error:'SUBSCRIPTION_CANCEL_FAILED'});}});

app.use(express.static(staticDir,{extensions:['html'],setHeaders(res,file){if(/\.(html|js|css|webmanifest)$/.test(file))res.setHeader('Cache-Control','no-cache');else res.setHeader('Cache-Control','public,max-age=86400');}}));
app.use((req,res,next)=>{if(req.method==='GET'&&!req.path.startsWith('/api/')&&!req.path.startsWith('/vendor/'))return res.sendFile(path.join(staticDir,'index.html'));next();});

await initDb();app.listen(port,()=>console.log(`Video Uniquifier running on ${appUrl}`));