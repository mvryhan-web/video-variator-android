import {initToolAccess,installToolAccess} from './tool-access.js';
import {installGenerationStudio} from './generation-studio.js';
import {installProductWatcher} from './product-watcher/admin-api.js';
import {platformFeatureEnabled} from './platform-feature-flags.js';
import {installGenerationBilling} from './generation-billing.js';
import {installGenerationTemplates} from './generation-templates.js';
import {installInspiration} from './generation-inspiration.js';
import {installOnboarding} from './generation-onboarding.js';
import {runAiMigrations} from './ai-migrations.js';
import {pool as generationPool} from './db.js';
import {installSpeech} from './speech.js';
import {installJarvixBrainRoutes} from './jarvix-brain.js';
import {installJarvixVoiceRoutes} from './jarvix-voice.js';
import {installTelegramBot} from './telegram.js';
import {installReminders,initRemindersDb,startReminderScheduler} from './reminders.js';
import {isPaidLifetimeSession} from './lifetime.js';
import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import {createRemoteJWKSet,jwtVerify,SignJWT} from 'jose';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {installEmailAuth} from './email-auth.js';
import {
  initDb,upsertUser,getUser,getUserByProvider,publicUser,setStripeCustomer,applySubscription,applyLifetime,updateSubscriptionByStripeId,
  resetPeriodUsageBySubscription,consumeUsage,addHistory,listHistory,clearHistory,deleteHistoryItem,reserveSpeech,addEvent,getAnalytics
} from './db.js';

const app=express(),port=Number(process.env.PORT||3000),isProduction=process.env.NODE_ENV==='production';
app.set('trust proxy',1);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const rootDir=path.resolve(__dirname,'..');
const staticDir=path.join(rootDir,'app','src','main','assets');
const ffmpegDist=path.join(rootDir,'node_modules','@ffmpeg','ffmpeg','dist','umd');
const ffmpegCoreDist=path.join(rootDir,'node_modules','@ffmpeg','core','dist','esm');
const renderUrl=process.env.RENDER_EXTERNAL_HOSTNAME?`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`:'';
if(process.env.RENDER_EXTERNAL_HOSTNAME){
  const renderDefaults={
    DEEPSYQ_HOME_ENABLED:'true',
    AI_STUDIO_ENABLED:'true',
    AI_INSPIRATION_ENABLED:'true',
    AI_APPS_ENABLED:'true',
    AI_STUDIO_MAX_CALLS:'20',
    AI_STUDIO_ALLOWED_KINDS:'image,video,music',
    AI_STUDIO_ALLOWED_MODELS:'gemini-3.1-flash-image,gemini-nano-banana-2.1,gemini-3-pro-image,byteplus-seedream-4-5,byteplus-seedream-3,gpt-image-2.5-sunburst,gpt-image-2,veo-3.1-lite-generate-preview,veo-3.1-fast-generate-preview,byteplus-seedance-2,byteplus-seedance-1-pro,lyria-3-clip-preview',
    AI_IMAGE_ENABLED:'true',
    AI_VIDEO_ENABLED:'true',
    AI_MUSIC_ENABLED:'true',
    AI_IMAGE_GOOGLE_ENABLED:'true',
    AI_IMAGE_BYTEPLUS_ENABLED:'true',
    AI_IMAGE_OPENAI_ENABLED:'true',
    AI_VIDEO_GOOGLE_ENABLED:'true',
    AI_VIDEO_BYTEPLUS_ENABLED:'true',
    AI_MUSIC_GOOGLE_ENABLED:'true',
    AI_SMART_ROUTING_ENABLED:'true',
    AI_SMART_DECISION_ENABLED:'true',
    AI_STUDIO_BACKGROUND_POLLING:'true',
    AI_STUDIO_WALLET_ENABLED:'true',
    AI_PUBLIC_GENERATION_ENABLED:'true',
    AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true',
    AI_STUDIO_PUBLIC_POLICY_ENABLED:'true',
    AI_STUDIO_MAX_CONCURRENT_PER_USER:'2',
    AI_STUDIO_MAX_JOBS_PER_HOUR:'30',
    AI_PROVIDER_ADMIN_ENABLED:'true',
    AI_OWNER_CREDIT_ADJUSTMENTS:'true',
    AI_BILLING_ENABLED:'true',
    AI_BILLING_MODE:'live',
    AI_LIVE_BILLING_APPROVED:'true',
    STRIPE_PRICE_BASIC:'price_1UGmi7LR9hQMNEjM5aL8c7Us',
    STRIPE_PRICE_PRO:'price_1UGmiKLR9hQMNEjMo71YfrIY',
    STRIPE_PRICE_BUSINESS:'price_1UGmiULR9hQMNEjMHurOX9bk',
    STRIPE_PRICE_LIFETIME:'price_1UHgZOLR9hQMNEjMIOXXrpVs',
    AI_SUBSCRIPTION_CREDITS_ENABLED:'true',
    AI_SUBSCRIPTION_CREDITS_JSON:JSON.stringify({basic:500,pro:1500,business:6000}),
    AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([
      {plan:'basic',maxConcurrent:2,maxPerHour:20},
      {plan:'pro',maxConcurrent:3,maxPerHour:60},
      {plan:'business',maxConcurrent:5,maxPerHour:150}
    ]),
    AI_CREDIT_RATES_JSON:JSON.stringify([
      {kind:'image',credits:5},
      {kind:'video',credits:20},
      {kind:'music',credits:10}
    ]),
    AI_CREDIT_PACKS_JSON:JSON.stringify([
      {sku:'pack_starter',priceId:'price_1URuWTLR9hQMNEjM0E4GWLXN',credits:20,amount:99,currency:'usd'}
    ]),
    AI_MODEL_PRICING_JSON:JSON.stringify([
      {model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:5,providerCostMicros:15000,currency:'usd'},
      {model:'gemini-nano-banana-2.1',provider:'Google',kind:'image',credits:5,providerCostMicros:15000,currency:'usd'},
      {model:'gemini-3-pro-image',provider:'Google',kind:'image',credits:8,providerCostMicros:24000,currency:'usd'},
      {model:'byteplus-seedream-4-5',provider:'BytePlus',kind:'image',credits:5,providerCostMicros:15000,currency:'usd'},
      {model:'byteplus-seedream-3',provider:'BytePlus',kind:'image',credits:4,providerCostMicros:12000,currency:'usd'},
      {model:'gpt-image-2.5-sunburst',provider:'OpenAI',kind:'image',credits:8,providerCostMicros:24000,currency:'usd'},
      {model:'gpt-image-2',provider:'OpenAI',kind:'image',credits:8,providerCostMicros:24000,currency:'usd'},
      {model:'veo-3.1-lite-generate-preview',provider:'Google',kind:'video',credits:20,providerCostMicros:90000,currency:'usd'},
      {model:'veo-3.1-fast-generate-preview',provider:'Google',kind:'video',credits:20,providerCostMicros:100000,currency:'usd'},
      {model:'byteplus-seedance-2',provider:'BytePlus',kind:'video',credits:20,providerCostMicros:90000,currency:'usd'},
      {model:'byteplus-seedance-1-pro',provider:'BytePlus',kind:'video',credits:15,providerCostMicros:75000,currency:'usd'},
      {model:'lyria-3-clip-preview',provider:'Google',kind:'music',credits:10,providerCostMicros:30000,currency:'usd'}
    ])
  };
  for(const [k,v] of Object.entries(renderDefaults)){
    if(process.env[k]===undefined||process.env[k]==='')process.env[k]=v;
  }
}
const appUrl=(process.env.APP_URL||process.env.RENDER_EXTERNAL_URL||renderUrl||`http://localhost:${port}`).replace(/\/$/,'');
const jwtSecret=process.env.APP_JWT_SECRET||'';
const stripeSecretKey=process.env.STRIPE_SECRET_KEY||'';
const stripe=stripeSecretKey?new Stripe(stripeSecretKey):null;
const stripeWebhookClient=stripe||new Stripe('sk_test_video_uniquifier_webhook_verifier');
const googleJwks=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs')),appleJwks=createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const plans={
  basic:{name:'Basic',limit:750,amount:9,priceId:process.env.STRIPE_PRICE_BASIC||'',paymentLink:process.env.STRIPE_PAYMENT_LINK_BASIC||''},
  pro:{name:'Pro',limit:2250,amount:24,priceId:process.env.STRIPE_PRICE_PRO||'',paymentLink:process.env.STRIPE_PAYMENT_LINK_PRO||''},
  business:{name:'Business',limit:15000,amount:99,priceId:process.env.STRIPE_PRICE_BUSINESS||'',paymentLink:process.env.STRIPE_PAYMENT_LINK_BUSINESS||''},
  lifetime:{name:'Lifetime',limit:null,amount:2999,currency:'eur',priceId:process.env.STRIPE_PRICE_LIFETIME||'',paymentLink:process.env.STRIPE_PAYMENT_LINK_LIFETIME||'',oneTime:true}
};

function fromUnix(v){return v?new Date(Number(v)*1000):null;}
function requireServerConfig(){if(!jwtSecret)throw new Error('APP_JWT_SECRET is not configured');}
function sameOriginFallback(){try{return new URL(appUrl).origin;}catch(_){return'';}}
function billingConfigured(){return Object.values(plans).every(p=>p.paymentLink||(stripe&&p.priceId));}

function paymentLinkUrl(base,user){const url=new URL(base);url.searchParams.set('client_reference_id',user.id);if(user.email)url.searchParams.set('prefilled_email',user.email);return url.toString();}
async function cancelPreviousSubscriptionForLifetime(subscriptionId){
  if(!subscriptionId||!stripe)return;
  try{
    const sub=await stripe.subscriptions.retrieve(subscriptionId);
    if(sub.status!=='canceled')await stripe.subscriptions.cancel(subscriptionId);
  }catch(e){
    if(e?.code==='resource_missing'||e?.statusCode===404)return;
    throw e;
  }
}

app.use((req,res,next)=>{
  if(isProduction&&!req.secure){const host=req.headers.host;if(host)return res.redirect(308,`https://${host}${req.originalUrl}`);}
  if(req.secure||isProduction)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains; preload');
  // Telegram Desktop/Web embeds Mini App HTML in an iframe.
  // Allow only Telegram to frame HTML pages; keep the frame ban for API/non-HTML routes.
  const servesHtmlPage=req.method==='GET'&&!req.path.startsWith('/api/')&&!req.path.startsWith('/vendor/')&&(!path.extname(req.path)||req.path.endsWith('.html'));
  const frameAncestors=servesHtmlPage?"'self' https://web.telegram.org https://telegram.org https://*.telegram.org":"'none'";
  res.setHeader('X-Content-Type-Options','nosniff');
  if(!servesHtmlPage)res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(self), microphone=(self), geolocation=(), payment=(self)');res.setHeader('Cross-Origin-Opener-Policy','same-origin-allow-popups');
  res.setHeader('X-Video-Processing','local-only');
  res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self' https://accounts.google.com https://appleid.cdn-apple.com https://telegram.org blob: 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' blob: data: https:; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co https://tessdata.projectnaptha.com https://accounts.google.com https://www.googleapis.com https://appleid.apple.com; frame-src https://accounts.google.com https://appleid.apple.com https://js.stripe.com https://checkout.stripe.com; worker-src 'self' blob:; media-src 'self' blob: data:; object-src 'none'; base-uri 'self'; frame-ancestors ${frameAncestors}; form-action 'self' https://accounts.google.com https://appleid.apple.com https://checkout.stripe.com`);
  next();
});

app.use('/vendor/ai',express.static(path.join(rootDir,'node_modules','@huggingface','transformers','dist'),{maxAge:'1d'}));
/* Browser OCR reads images locally; only language data is downloaded. */
app.use('/vendor/pdf-lib',express.static(path.join(rootDir,'node_modules','pdf-lib','dist'),{maxAge:'1d'}));
app.use('/vendor/jszip',express.static(path.join(rootDir,'node_modules','jszip','dist'),{maxAge:'1d'}));
app.get('/vendor/qr/qrcode.js',(req,res)=>res.type('application/javascript').sendFile(path.join(rootDir,'node_modules','qrcode-generator','qrcode.js')));
app.use('/vendor/ocr',express.static(path.join(rootDir,'node_modules','tesseract.js','dist'),{maxAge:'1d'}));
app.use('/vendor/ocr-core',express.static(path.join(rootDir,'node_modules','tesseract.js-core'),{maxAge:'1d'}));

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
  const approvedReferencePilot=req.method==='POST'&&req.path==='/studio/references'&&type==='video/mp4'&&process.env.AI_STUDIO_REFERENCE_UPLOAD_ENABLED==='true';
  if((type.startsWith('video/')||type.includes('multipart/form-data'))&&!approvedReferencePilot)return res.status(415).json({error:'RAW_VIDEO_UPLOAD_DISABLED',message:'Video files are processed locally on the user device.'});
  next();
});

async function grantLifetimeFromCheckoutSession(s){
  const userId=s.metadata?.userId||s.client_reference_id,plan=s.metadata?.plan;
  if(!userId||!isPaidLifetimeSession(s,{paymentLinkId:process.env.STRIPE_PAYMENT_LINK_LIFETIME_ID||''}))return false;
  const account=await getUser(userId);if(!account)throw new Error('LIFETIME_ACCOUNT_NOT_FOUND');
  const previousSubscriptionId=s.metadata?.previousSubscriptionId||account.stripe_subscription_id||'';
  await applyLifetime({userId,customerId:String(s.customer||'')});
  if(previousSubscriptionId)await cancelPreviousSubscriptionForLifetime(previousSubscriptionId);
  return true;
}

app.post('/api/webhooks/stripe',express.raw({type:'application/json'}),async(req,res)=>{
  if(!process.env.STRIPE_WEBHOOK_SECRET)return res.status(503).send('Stripe webhook is not configured');let event;
  try{event=stripeWebhookClient.webhooks.constructEvent(req.body,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET);}catch(_){return res.status(400).send('Invalid Stripe webhook signature');}
  try{
    if(await generationBilling.handleEvent(event))return res.json({received:true});
    if(event.type==='checkout.session.completed'){
      const s=event.data.object,userId=s.metadata?.userId||s.client_reference_id,plan=s.metadata?.plan;
      if(plan==='lifetime')await grantLifetimeFromCheckoutSession(s);
      else if(userId&&plans[plan]&&!plans[plan].oneTime)await applySubscription({userId,customerId:String(s.customer||''),subscriptionId:String(s.subscription||''),plan,status:'active',currentPeriodEnd:null,markSubscribed:true});
    }
    if(event.type==='checkout.session.async_payment_succeeded')await grantLifetimeFromCheckoutSession(event.data.object);
    if(event.type==='customer.subscription.created'||event.type==='customer.subscription.updated'){const sub=event.data.object,userId=sub.metadata?.userId,plan=sub.metadata?.plan;if(userId&&plans[plan]&&!plans[plan].oneTime)await applySubscription({userId,customerId:String(sub.customer||''),subscriptionId:sub.id,plan,status:sub.status,currentPeriodEnd:fromUnix(sub.current_period_end),markSubscribed:true});else await updateSubscriptionByStripeId({subscriptionId:sub.id,status:sub.status,currentPeriodEnd:fromUnix(sub.current_period_end)});}
    if(event.type==='customer.subscription.deleted'){const sub=event.data.object;await updateSubscriptionByStripeId({subscriptionId:sub.id,status:'canceled',currentPeriodEnd:fromUnix(sub.current_period_end)});}
    if(event.type==='invoice.paid'){const invoice=event.data.object,subscriptionId=typeof invoice.subscription==='string'?invoice.subscription:invoice.subscription?.id;if(subscriptionId&&invoice.billing_reason==='subscription_cycle')await resetPeriodUsageBySubscription(subscriptionId);}
    res.json({received:true});
  }catch(e){console.error('[stripe webhook]',e);res.status(500).send('Webhook processing failed');}
});

app.use('/api/studio/jobs',express.json({limit:'5mb'}));
app.use(express.json({limit:'1mb'}));
const registerTelegramWebhook=installTelegramBot(app,{appUrl});
async function signAppToken(user){requireServerConfig();const key=new TextEncoder().encode(jwtSecret);return new SignJWT({email:user.email||'',name:user.name||''}).setProtectedHeader({alg:'HS256'}).setSubject(user.id).setIssuer('video-variator').setAudience('video-variator-client').setIssuedAt().setExpirationTime('7d').sign(key);}
async function auth(req,res,next){try{requireServerConfig();const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!token)return res.status(401).json({error:'AUTH_REQUIRED'});const key=new TextEncoder().encode(jwtSecret),{payload}=await jwtVerify(token,key,{issuer:'video-variator',audience:'video-variator-client'}),user=await getUser(payload.sub);if(!user)return res.status(401).json({error:'USER_NOT_FOUND'});req.user=user;next();}catch(_){res.status(401).json({error:'INVALID_SESSION'});}}
installEmailAuth(app,{signAppToken});
installToolAccess(app,{auth});
installSpeech(app,{auth,reserve:reserveSpeech});
installReminders(app,{auth});
installJarvixBrainRoutes(app);
installJarvixVoiceRoutes(app);

app.get('/api/health',(req,res)=>res.json({ok:true,service:'video-uniquifier',https:req.secure||!isProduction,videoProcessing:'local-only',ffmpegRuntime:'same-origin-esm',appUrl,time:new Date().toISOString()}));
app.get('/api/version',(req,res)=>res.json({webVersion:process.env.WEB_VERSION||'5.3.0',androidVersion:process.env.ANDROID_VERSION||'5.3.0',androidVersionCode:Number(process.env.ANDROID_VERSION_CODE||5),latestApkUrl:process.env.LATEST_APK_URL||'https://github.com/mvryhan-web/video-variator-android/releases/latest/download/VideoUniquifier.apk'}));
app.get('/api/config',(req,res)=>res.json({
  googleClientId:process.env.GOOGLE_CLIENT_ID||'',appleClientId:process.env.APPLE_CLIENT_ID||'',appleRedirectUri:process.env.APPLE_REDIRECT_URI||'',emailAuth:true,trialLimit:100,billingConfigured:billingConfigured(),
  introOfferText:process.env.INTRO_OFFER_TEXT||'Intro discount available on your first subscription',features:{aiApps:platformFeatureEnabled('AI_APPS_ENABLED'),inspiration:platformFeatureEnabled('AI_INSPIRATION_ENABLED'),onboarding:platformFeatureEnabled('AI_ONBOARDING_ENABLED')},privacy:{httpsRequired:isProduction,localVideoProcessing:true,rawVideoUploadDisabled:true},plans:{basic:{price:9,limit:750,unit:'credits'},pro:{price:24,limit:2250,unit:'credits'},business:{price:99,limit:15000,unit:'credits'},lifetime:{price:2999,currency:'eur',unlimited:true,allFeatures:true,oneTime:true}}
}));

app.post('/api/auth/google',async(req,res)=>{try{if(!process.env.GOOGLE_CLIENT_ID)return res.status(503).json({error:'GOOGLE_AUTH_NOT_CONFIGURED'});const credential=req.body?.credential;if(!credential)return res.status(400).json({error:'MISSING_GOOGLE_CREDENTIAL'});const {payload}=await jwtVerify(credential,googleJwks,{audience:process.env.GOOGLE_CLIENT_ID,issuer:['https://accounts.google.com','accounts.google.com']});const email=payload.email_verified===false?null:payload.email,existing=await getUserByProvider('google',payload.sub);const user=await upsertUser({provider:'google',providerSub:payload.sub,email,name:payload.name});res.json({token:await signAppToken(user),user:publicUser(user),newAccount:!existing});}catch(e){console.error('[google auth]',e);res.status(401).json({error:'GOOGLE_AUTH_FAILED'});}});
app.post('/api/auth/apple',async(req,res)=>{try{if(!process.env.APPLE_CLIENT_ID)return res.status(503).json({error:'APPLE_AUTH_NOT_CONFIGURED'});const idToken=req.body?.idToken;if(!idToken)return res.status(400).json({error:'MISSING_APPLE_TOKEN'});const {payload}=await jwtVerify(idToken,appleJwks,{audience:process.env.APPLE_CLIENT_ID,issuer:'https://appleid.apple.com'}),supplied=req.body?.user||{},fullName=supplied?.name?[supplied.name.firstName,supplied.name.lastName].filter(Boolean).join(' '):null,existing=await getUserByProvider('apple',payload.sub),user=await upsertUser({provider:'apple',providerSub:payload.sub,email:payload.email||supplied.email||null,name:fullName});res.json({token:await signAppToken(user),user:publicUser(user),newAccount:!existing});}catch(e){console.error('[apple auth]',e);res.status(401).json({error:'APPLE_AUTH_FAILED'});}});
app.get('/api/me',auth,(req,res)=>res.json({user:publicUser(req.user)}));

app.post('/api/usage/consume',auth,async(req,res)=>{try{const user=await consumeUsage(req.user.id,{seconds:req.body?.seconds,sourceCount:req.body?.sourceCount??req.body?.count});await addEvent(req.user.id,{type:'processing_success',category:'usage'});res.json({user:publicUser(user)});}catch(e){if(e.code==='CREDIT_LIMIT_REACHED'||e.message==='CREDIT_LIMIT_REACHED')return res.status(402).json({error:'CREDIT_LIMIT_REACHED'});console.error(e);res.status(500).json({error:'USAGE_UPDATE_FAILED'});}});
app.post('/api/events',auth,async(req,res)=>{try{await addEvent(req.user.id,{type:req.body?.type||'event',category:req.body?.category||null,message:req.body?.message||null});res.json({ok:true});}catch(e){res.status(500).json({error:'EVENT_SAVE_FAILED'});}});
app.get('/api/analytics',auth,async(req,res)=>{try{res.json({analytics:await getAnalytics(req.user.id)});}catch(e){res.status(500).json({error:'ANALYTICS_FAILED'});}});
app.get('/api/history',auth,async(req,res)=>{try{res.json({history:await listHistory(req.user.id)});}catch(e){res.status(500).json({error:'HISTORY_FAILED'});}});
app.post('/api/history',auth,async(req,res)=>{try{const items=Array.isArray(req.body?.items)?req.body.items:[];for(const item of items.slice(0,25))await addHistory(req.user.id,item);res.json({ok:true});}catch(e){res.status(500).json({error:'HISTORY_SAVE_FAILED'});}});
app.delete('/api/history/:id',auth,async(req,res)=>{try{await deleteHistoryItem(req.user.id,req.params.id);res.json({ok:true});}catch(_){res.status(500).json({error:'HISTORY_DELETE_FAILED'});}});
app.delete('/api/history',auth,async(req,res)=>{try{await clearHistory(req.user.id);res.json({ok:true});}catch(e){res.status(500).json({error:'HISTORY_CLEAR_FAILED'});}});

app.post('/api/billing/checkout',auth,async(req,res)=>{try{
  const current=publicUser(req.user);if(current?.isAdmin)return res.status(409).json({error:'ADMIN_ACCESS_ALREADY_UNLIMITED'});
  if(current?.usage?.plan==='lifetime'&&current.usage.active)return res.status(409).json({error:'LIFETIME_ALREADY_ACTIVE'});
  const plan=req.body?.plan,p=plans[plan];if(!p)return res.status(400).json({error:'INVALID_OR_UNCONFIGURED_PLAN'});
  if(p.paymentLink&&(!p.oneTime||!stripe)){
    if(p.oneTime&&req.user.stripe_subscription_id&&['active','trialing','past_due','unpaid'].includes(req.user.subscription_status))return res.status(409).json({error:'Please contact support to switch your existing subscription to Lifetime without further recurring charges.'});
    return res.json({url:paymentLinkUrl(p.paymentLink,req.user)});
  }
  if(!stripe||!p.priceId)return res.status(503).json({error:'BILLING_NOT_CONFIGURED'});
  let customerId=req.user.stripe_customer_id;if(!customerId){const customer=await stripe.customers.create({email:req.user.email||undefined,name:req.user.name||undefined,metadata:{userId:req.user.id}});customerId=customer.id;await setStripeCustomer(req.user.id,customerId);}
  if(p.oneTime){
    const session=await stripe.checkout.sessions.create({mode:'payment',customer:customerId,line_items:[{price:p.priceId,quantity:1}],client_reference_id:req.user.id,metadata:{userId:req.user.id,plan:'lifetime',entitlement:'permanent',previousSubscriptionId:String(req.user.stripe_subscription_id||'')},payment_intent_data:{metadata:{userId:req.user.id,plan:'lifetime',entitlement:'permanent'}},success_url:`${appUrl}/?checkout=success&plan=lifetime`,cancel_url:`${appUrl}/?checkout=cancel`});
    return res.json({url:session.url});
  }
  const coupon=!req.user.has_subscribed&&process.env.STRIPE_FIRST_SUBSCRIPTION_COUPON_ID?process.env.STRIPE_FIRST_SUBSCRIPTION_COUPON_ID:null;
  const session=await stripe.checkout.sessions.create({mode:'subscription',customer:customerId,line_items:[{price:p.priceId,quantity:1}],client_reference_id:req.user.id,metadata:{userId:req.user.id,plan,credits:String(p.limit)},subscription_data:{metadata:{userId:req.user.id,plan,credits:String(p.limit)}},discounts:coupon?[{coupon}]:undefined,allow_promotion_codes:coupon?undefined:true,success_url:`${appUrl}/?checkout=success`,cancel_url:`${appUrl}/?checkout=cancel`});res.json({url:session.url});
}catch(e){console.error('[checkout]',e);res.status(500).json({error:'CHECKOUT_FAILED'});}});
app.post('/api/billing/portal',auth,async(req,res)=>{try{if(publicUser(req.user)?.isAdmin)return res.status(409).json({error:'ADMIN_ACCESS_ALREADY_UNLIMITED'});if(!stripe||!req.user.stripe_customer_id)return res.status(400).json({error:'BILLING_PORTAL_UNAVAILABLE'});const session=await stripe.billingPortal.sessions.create({customer:req.user.stripe_customer_id,return_url:`${appUrl}/`});res.json({url:session.url});}catch(e){console.error('[portal]',e);res.status(500).json({error:'BILLING_PORTAL_FAILED'});}});
app.post('/api/billing/cancel',auth,async(req,res)=>{try{const current=publicUser(req.user);if(current?.isAdmin)return res.status(409).json({error:'ADMIN_ACCESS_ALREADY_UNLIMITED'});if(current?.usage?.plan==='lifetime')return res.status(409).json({error:'LIFETIME_HAS_NO_SUBSCRIPTION'});if(!stripe||!req.user.stripe_subscription_id)return res.status(400).json({error:'NO_ACTIVE_SUBSCRIPTION'});const sub=await stripe.subscriptions.update(req.user.stripe_subscription_id,{cancel_at_period_end:true});await updateSubscriptionByStripeId({subscriptionId:sub.id,status:sub.status,currentPeriodEnd:fromUnix(sub.current_period_end)});res.json({ok:true,cancelAtPeriodEnd:!!sub.cancel_at_period_end,currentPeriodEnd:fromUnix(sub.current_period_end)});}catch(e){console.error('[cancel]',e);res.status(500).json({error:'SUBSCRIPTION_CANCEL_FAILED'});}});

const generationBilling=installGenerationBilling(app,{auth,pool:generationPool,stripe,appUrl});
installGenerationTemplates(app,{auth,pool:generationPool});
installInspiration(app,{auth,pool:generationPool});
installOnboarding(app,{auth,pool:generationPool});
const generationStudio=installGenerationStudio(app,{auth,pool:generationPool,wallet:generationBilling.wallet});
installProductWatcher(app,{auth,pool:generationPool});
// Opt-in platform entry. Legacy auth/payment returns retain their existing handler.
app.get('/',(req,res,next)=>{
  if(process.env.DEEPSYQ_HOME_ENABLED!=='true'||req.query.mobileAuth||req.query.checkout)return next();
  res.setHeader('Cache-Control','no-cache');
  res.sendFile(path.join(staticDir,'deepsyq.html'));
});
app.get('/dashboard',(req,res)=>res.sendFile(path.join(staticDir,'deepsyq.html')));
app.get(['/ai-apps','/ai-apps.html'],(req,res,next)=>platformFeatureEnabled('AI_APPS_ENABLED')?next():res.status(404).type('text/plain').send('Not found'));
app.get(['/inspiration','/inspiration.html'],(_req,res)=>res.redirect(302,'/deepsyq.html#inspirationPreview'));
// Retired owner-deleted workflow: never fall through to the generic SPA index.
app.get(['/product-video','/product-video.html'],(_req,res)=>res.status(404).type('text/plain').send('Not found'));
app.use(express.static(staticDir,{extensions:['html'],setHeaders(res,file){if(/\.(html|js|css|webmanifest)$/.test(file))res.setHeader('Cache-Control','no-cache');else res.setHeader('Cache-Control','public,max-age=86400');}}));
app.use((req,res,next)=>{if(req.method==='GET'&&!req.path.startsWith('/api/')&&!req.path.startsWith('/vendor/'))return res.sendFile(path.join(staticDir,'index.html'));next();});

async function seedStarterInspirationAndTemplates(){
  if(!generationPool)return;
  try{
    await runAiMigrations(generationPool);
    await generationPool.query(`DELETE FROM vv_ai_inspiration WHERE preview_url LIKE '%logo%' OR preview_poster_url LIKE '%logo%' OR slug LIKE 'insp_seed_%';`);
    await generationPool.query(`DELETE FROM vv_ai_template WHERE thumbnail LIKE '%logo%' OR slug LIKE 'tpl_seed_%';`);
    await generationPool.query(`
      INSERT INTO vv_ai_inspiration(id,title,slug,kind,category,description,preview_url,preview_poster_url,prompt,default_model,aspect_ratio,required_input_types,default_settings,action_target,rights_basis,rights_note,active,featured,sort_order)
      VALUES
        ('owner-01-close-up-woman','Close-up woman','owner-01-close-up-woman','video','Cinematic','Close-up woman — owner-selected cinematic scene.','/media/home/owner-20261018/01-close-up-woman.mp4','/media/home/owner-20261018/01-close-up-woman.jpg','Create an original cinematic scene inspired by close-up woman. Use your own source material.','veo-3.1-lite-generate-preview','16:9','[]'::jsonb,'{"ratio":"16:9","homeShowcase":{"title":"AI Canvas","label":"CREATIVE WORKSPACE","href":"#quickCreateForm"}}'::jsonb,'studio','owned','Approved owner preview asset',TRUE,TRUE,10),
        ('owner-02-futuristic-portal','Futuristic portal','owner-02-futuristic-portal','video','Cinematic','Futuristic portal — owner-selected cinematic scene.','/media/home/owner-20261018/02-futuristic-portal.mp4','/media/home/owner-20261018/02-futuristic-portal.jpg','Create an original cinematic scene inspired by futuristic portal. Use your own source material.','veo-3.1-lite-generate-preview','16:9','[]'::jsonb,'{"ratio":"16:9","homeShowcase":{"title":"Seedance 2.0","label":"EXPLORE VIDEO MODELS","href":"generate-studio.html?studio=video"}}'::jsonb,'studio','owned','Approved owner preview asset',TRUE,TRUE,20),
        ('owner-03-underwater-woman','Underwater woman','owner-03-underwater-woman','video','Cinematic','Underwater woman — owner-selected cinematic scene.','/media/home/owner-20261018/03-underwater-woman.mp4','/media/home/owner-20261018/03-underwater-woman.jpg','Create an original cinematic scene inspired by underwater woman. Use your own source material.','veo-3.1-lite-generate-preview','16:9','[]'::jsonb,'{"ratio":"16:9","homeShowcase":{"title":"Seedance 2.5","label":"EXPLORE VIDEO MODELS","href":"generate-studio.html?studio=video"}}'::jsonb,'studio','owned','Approved owner preview asset',TRUE,TRUE,30),
        ('owner-04-neon-motorcycle','Neon motorcycle','owner-04-neon-motorcycle','video','Cinematic','Neon motorcycle — owner-selected cinematic scene.','/media/home/owner-20261018/04-neon-motorcycle.mp4','/media/home/owner-20261018/04-neon-motorcycle.jpg','Create an original cinematic scene inspired by neon motorcycle. Use your own source material.','veo-3.1-lite-generate-preview','16:9','[]'::jsonb,'{"ratio":"16:9","homeShowcase":{"title":"Video Studio","label":"CREATE WITH DEEPSYQ","href":"generate-studio.html?studio=video"}}'::jsonb,'studio','owned','Approved owner preview asset',TRUE,TRUE,40),
        ('owner-05-sky-whale','Whale among the clouds','owner-05-sky-whale','video','Cinematic','Whale among the clouds — owner-selected cinematic scene.','/media/home/owner-20261018/05-sky-whale.mp4','/media/home/owner-20261018/05-sky-whale.jpg','Create an original cinematic scene inspired by whale among the clouds. Use your own source material.','veo-3.1-lite-generate-preview','16:9','[]'::jsonb,'{"ratio":"16:9","homeShowcase":{"title":"AI Agent","label":"CREATIVE CO-PILOT","href":"#agentFeature"}}'::jsonb,'studio','owned','Approved owner preview asset',TRUE,TRUE,50),
        ('owner-06-golden-forest','Golden forest','owner-06-golden-forest','video','Cinematic','Golden forest — owner-selected cinematic scene.','/media/home/owner-20261018/06-golden-forest.mp4','/media/home/owner-20261018/06-golden-forest.jpg','Create an original cinematic scene inspired by golden forest. Use your own source material.','veo-3.1-lite-generate-preview','16:9','[]'::jsonb,'{"ratio":"16:9","homeShowcase":{"title":"Inspiration","label":"CREATIVE GALLERY","href":"#inspirationPreview"}}'::jsonb,'studio','owned','Approved owner preview asset',TRUE,TRUE,60),
        ('orbital-muse','Orbital Muse','orbital-muse','image','Cinematic','Editorial magazine cover','/media/inspiration/openai-20261021/image-01-orbital-muse.webp',NULL,'Editorial magazine cover, portrait 4:5: an adult astronaut fashion model fully dressed in a sculptural silver flight suit with a high collar, floating among small translucent orbital rings and planets.','gemini-3.1-flash-image','1:1','[]'::jsonb,'{"ratio":"1:1"}'::jsonb,'studio','owned','Approved owner preview asset',TRUE,TRUE,80),
        ('soft-signal','Soft Signal','soft-signal','image','Beauty','Portrait 4:5 beauty editorial cover','/media/inspiration/openai-20261021/image-04-soft-signal.webp',NULL,'Portrait 4:5 premium beauty editorial cover, entirely original adult woman wearing a high-neck ivory blouse.','gemini-3.1-flash-image','1:1','[]'::jsonb,'{"ratio":"1:1"}'::jsonb,'studio','owned','Approved owner preview asset',TRUE,TRUE,90),
        ('solar-visor','Solar Visor','solar-visor','image','Fashion','Portrait 4:5 futuristic eyewear campaign','/media/inspiration/openai-20261021/image-05-solar-visor.webp',NULL,'Portrait 4:5 futuristic eyewear campaign. Original adult Black woman wearing oversized translucent amber visor glasses.','gemini-3.1-flash-image','1:1','[]'::jsonb,'{"ratio":"1:1"}'::jsonb,'studio','owned','Approved owner preview asset',TRUE,TRUE,100),
        ('wild-form','Wild Form','wild-form','image','Creative Effects','Portrait 4:5 surreal art-fashion magazine cover','/media/inspiration/openai-20261021/image-06-wild-form.webp',NULL,'Portrait 4:5 surreal art-fashion magazine cover. A sculptural matte-white vase overflowing with impossible oversized flowers.','gemini-3.1-flash-image','1:1','[]'::jsonb,'{"ratio":"1:1"}'::jsonb,'studio','owned','Approved owner preview asset',TRUE,TRUE,110),
        ('neon-archive','Neon Archive','neon-archive','image','Futuristic Fashion','Portrait 4:5 cyberpunk culture poster','/media/inspiration/openai-20261021/image-07-neon-archive.webp',NULL,'Portrait 4:5 original cyberpunk culture poster. Close-up, fully clothed adult East Asian woman with a calm focused gaze.','gemini-3.1-flash-image','1:1','[]'::jsonb,'{"ratio":"1:1"}'::jsonb,'studio','owned','Approved owner preview asset',TRUE,TRUE,120)
      ON CONFLICT (slug) DO UPDATE SET
        preview_url = EXCLUDED.preview_url,
        preview_poster_url = EXCLUDED.preview_poster_url,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        default_settings = EXCLUDED.default_settings,
        active = TRUE,
        featured = TRUE
    `);
    await generationPool.query(`
      INSERT INTO vv_ai_template(id,title,slug,category,description,thumbnail,generation_type,prompt_template,default_model,required_input_types,default_settings,active,featured,sort_order,rights_basis,rights_note)
      VALUES
        ('creative50-bottle-of-weather','Weather in a Bottle','creative50-bottle-of-weather','Creative Effects','Explore the effect and adapt its original prompt in Studio.','/media/creative/creative50-20261021/10-bottle-of-weather.webp','image','Create one entirely original premium photographic artwork: unbranded frosted perfume bottle contains a miniature thunderstorm','gemini-3.1-flash-image','[]'::jsonb,'{"ratio":"4:5"}'::jsonb,TRUE,TRUE,10,'owned','Approved owner creative template'),
        ('creative50-embroidered-dawn','Embroidered Dawn','creative50-embroidered-dawn','Creative Effects','Explore the effect and adapt its original prompt in Studio.','/media/creative/creative50-20261021/11-embroidered-dawn.webp','image','Fine golden embroidery crosses the air around her like a three-dimensional sunrise','gemini-3.1-flash-image','[]'::jsonb,'{"ratio":"16:9"}'::jsonb,TRUE,TRUE,20,'owned','Approved owner creative template'),
        ('creative50-urban-bonsai','Urban Bonsai','creative50-urban-bonsai','Creative Effects','Explore the effect and adapt its original prompt in Studio.','/media/creative/creative50-20261021/12-urban-bonsai.webp','image','A perfectly realistic miniature coastal city grows from the crown of a twisted ancient bonsai tree','gemini-3.1-flash-image','[]'::jsonb,'{"ratio":"1:1"}'::jsonb,TRUE,TRUE,30,'owned','Approved owner creative template'),
        ('creative50-liquid-porcelain','Liquid Porcelain','creative50-liquid-porcelain','Creative Effects','Explore the effect and adapt its original prompt in Studio.','/media/creative/creative50-20261021/13-liquid-porcelain.webp','image','A white porcelain sneaker melts into a perfectly smooth ribbon of liquid ceramic','gemini-3.1-flash-image','[]'::jsonb,'{"ratio":"4:5"}'::jsonb,TRUE,TRUE,40,'owned','Approved owner creative template'),
        ('creative50-prism-hair','Prism Hair','creative50-prism-hair','Creative Effects','Explore the effect and adapt its original prompt in Studio.','/media/creative/creative50-20261021/14-prism-hair.webp','image','Sleek dark hair transforms at its tips into hundreds of tiny floating optical prisms','gemini-3.1-flash-image','[]'::jsonb,'{"ratio":"16:9"}'::jsonb,TRUE,TRUE,50,'owned','Approved owner creative template'),
        ('creative50-botanical-audio','Botanical Audio','creative50-botanical-audio','Creative Effects','Explore the effect and adapt its original prompt in Studio.','/media/creative/creative50-20261021/15-botanical-audio.webp','image','A pair of unbranded matte-ivory headphones with delicate sculptural sound wave of orange orchids','gemini-3.1-flash-image','[]'::jsonb,'{"ratio":"1:1"}'::jsonb,TRUE,TRUE,60,'owned','Approved owner creative template'),
        ('creative50-citrus-architecture','Citrus Architecture','creative50-citrus-architecture','Creative Effects','Explore the effect and adapt its original prompt in Studio.','/media/creative/creative50-20261021/16-citrus-architecture.webp','image','Modernist summer house inside the cross-section of a gigantic fresh blood orange','gemini-3.1-flash-image','[]'::jsonb,'{"ratio":"4:5"}'::jsonb,TRUE,TRUE,70,'owned','Approved owner creative template'),
        ('creative50-snow-globe-dress','Snow Globe Dress','creative50-snow-globe-dress','Creative Effects','Explore the effect and adapt its original prompt in Studio.','/media/creative/creative50-20261021/17-snow-globe-dress.webp','image','Silver couture coat with transparent panels containing a miniature snow-covered pine forest','gemini-3.1-flash-image','[]'::jsonb,'{"ratio":"16:9"}'::jsonb,TRUE,TRUE,80,'owned','Approved owner creative template')
      ON CONFLICT (slug) DO UPDATE SET
        thumbnail = EXCLUDED.thumbnail,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        prompt_template = EXCLUDED.prompt_template,
        default_settings = EXCLUDED.default_settings,
        active = TRUE,
        featured = TRUE
    `);
  }catch(e){console.error('[ai-seed]',e?.message||e);}
}

await initDb();await initToolAccess();await initRemindersDb();await seedStarterInspirationAndTemplates();app.listen(port,()=>{console.log(`Video Uniquifier running on ${appUrl}`);void registerTelegramWebhook?.();startReminderScheduler();generationStudio?.startRecovery?.();});
