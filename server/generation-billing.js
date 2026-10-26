import {quarantineSignedDispute} from './generation-dispute-quarantine.js';
import {createHash,createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {GenerationWallet} from './generation-wallet.js';
import {grantPaidSubscriptionInvoice,publicSubscriptionCreditGrants} from './generation-subscription-credits.js';
import {MODELS,validateGeneration} from './generation-provider.js';
import {retrieveStripeNetRevenue,stripeCheckoutTaxAmount} from './generation-stripe-net-revenue.js';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const positive = n => Number.isSafeInteger(n) && n>0 && n<=10_000_000;
export function billingCatalog(env={}) {
  try {
    const packs=JSON.parse(env.AI_CREDIT_PACKS_JSON||'[]'), rates=JSON.parse(env.AI_CREDIT_RATES_JSON||'[]');
    if (!Array.isArray(packs)||!Array.isArray(rates)||packs.length>10||rates.length>3) throw Error();
    if (packs.some(p=>!/^[a-z0-9_-]{1,40}$/.test(p.sku)||!/^price_[A-Za-z0-9]+$/.test(p.priceId)||!positive(p.credits)||!positive(p.amount)||!['eur','usd'].includes(p.currency))) throw Error();
    if (new Set(packs.map(p=>p.sku)).size!==packs.length||
        new Set(packs.map(p=>p.priceId)).size!==packs.length) throw Error();
    if (rates.some(r=>!MODELS[r.kind]||!positive(r.credits))||new Set(rates.map(r=>r.kind)).size!==rates.length) throw Error();
    return {packs,rates,revision:hash({packs,rates})};
  } catch (_) { return {packs:[],rates:[],revision:null}; }
}
// D01/D04: legacy environment flags alone NEVER authorize welcome AI grants.
// Paid purchases and confirmed subscription entitlements remain separate.
export function welcomeCreditConfig(_env={}){return {enabled:false,credits:0};}
// This checks configuration presence only. Real signed Stripe delivery still
// needs a controlled staging webhook/payment test before public activation.
export function stripeWebhookConfigured(env={}){
 const secret=env.STRIPE_WEBHOOK_SECRET;
 return typeof secret==='string'&&secret.startsWith('whsec_')&&secret.length>=16;
}
export function generationBillingRuntime(env={}){
  const mode=env.AI_BILLING_MODE==='live'?'live':'test',key=String(env.STRIPE_SECRET_KEY||'');
  const explicitMode=env.AI_BILLING_MODE==='test'||env.AI_BILLING_MODE==='live';
  const keyMatches=explicitMode&&(mode==='live'?/^(sk_live_|rk_live_)/.test(key):/^(sk_test_|rk_test_)/.test(key));
  const liveApproved=env.AI_LIVE_BILLING_APPROVED==='true';
  const activationRequested=env.AI_BILLING_ENABLED==='true';
  return {mode,livemode:mode==='live',keyMatches,liveApproved,activationRequested,livePaymentsEnabled:activationRequested&&mode==='live'&&liveApproved&&keyMatches};
}
// Idempotent Checkout retries must never return a stale, foreign or cross-mode
// Stripe URL. This is only validation of an existing Stripe session: it never
// grants credits; the signed, confirmed webhook remains the source of truth.
export function existingCheckoutResponse({order,pack,session,runtime,userId,nowSeconds=Math.floor(Date.now()/1000)}){
  const p=order?.snapshot;
  if(!p||order.user_id!==userId||order.sku!==pack?.sku||
     p.sku!==pack.sku||p.priceId!==pack.priceId||p.amount!==pack.amount||
     p.currency!==pack.currency||p.credits!==pack.credits||
     p.billingMode!==runtime?.mode)throw Error('CHECKOUT_REQUEST_CONFLICT');
  let checkoutUrl;
  try{checkoutUrl=new URL(session?.url);}catch(_){throw Error('CHECKOUT_SESSION_INVALID');}
  if(!session||session.id!==order.session_id||
     session.mode!=='payment'||session.status!=='open'||
     session.livemode!==runtime.livemode||
     session.client_reference_id!==userId||
     session.metadata?.aiWallet!=='v1'||session.metadata?.orderId!==order.id||
     session.amount_total!==p.amount||session.currency!==p.currency||
     !Number.isSafeInteger(session.expires_at)||session.expires_at<=nowSeconds||
     checkoutUrl.protocol!=='https:'||checkoutUrl.hostname!=='checkout.stripe.com'||
     !!checkoutUrl.port||!!checkoutUrl.username||!!checkoutUrl.password)
      throw Error('CHECKOUT_SESSION_INVALID');
  return {url:session.url,id:session.id,mode:runtime.mode};
}

// A single signed webhook endpoint also serves legacy subscriptions. This
// marker is *positive* evidence only: old AI charge events may lack charge
// metadata, so look up their intent in the AI wallet when modes match.
export function hasAiWalletRefundMarker(event){
 const c=event?.data?.object;
 return c?.metadata?.aiWallet==='v1'||c?.payment_intent?.metadata?.aiWallet==='v1';
}

export function stripeRefundData(event,{livemode}={}){
  if(event?.type!=='charge.refunded')return null;
  const charge=event.data?.object||{},eventLive=!!event.livemode,chargeLive=!!charge.livemode;
  if(eventLive!==!!livemode||chargeLive!==!!livemode)throw Error('AI_PAYMENT_MODE_MISMATCH');
  const paymentIntent=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;
  if(typeof paymentIntent!=='string'||!paymentIntent||paymentIntent.length>200||!Number.isSafeInteger(charge.amount_refunded)||charge.amount_refunded<=0)throw Error('INVALID_AI_REFUND_EVENT');
  if(typeof event.id!=='string'||!/^evt_[A-Za-z0-9]+$/.test(event.id)||
     typeof charge.id!=='string'||!/^ch_[A-Za-z0-9]+$/.test(charge.id))throw Error('INVALID_AI_REFUND_EVENT');
  return {paymentIntent,cumulativeAmount:charge.amount_refunded,eventId:event.id,
    chargeId:charge.id,livemode:eventLive};
}
export function makeQuote({userId,body,env,now=Date.now()}) {
  const request=validateGeneration(body),catalog=billingCatalog(env),rate=catalog.rates.find(r=>r.kind===request.kind);
  if (!rate||!env.APP_JWT_SECRET||request.model!==MODELS[request.kind].id) throw Error('AI_PRICING_NOT_APPROVED');
  const data={userId,fingerprint:hash(request),kind:request.kind,model:MODELS[request.kind].id,credits:rate.credits,revision:catalog.revision,expiresAt:now+300000};
  const payload=Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature=createHmac('sha256',env.APP_JWT_SECRET).update(payload).digest('base64url');
  return {...data,token:payload+'.'+signature};
}
export function verifyQuote({userId,body,token,env,now=Date.now()}) {
  if (typeof token!=='string'||token.length>3000) throw Error('INVALID_QUOTE');
  const [payload,sig,...rest]=token.split('.');
  const expected=createHmac('sha256',env.APP_JWT_SECRET||'').update(payload||'').digest();
  const supplied=Buffer.from(sig||'','base64url');
  if (rest.length||!env.APP_JWT_SECRET||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)) throw Error('INVALID_QUOTE');
  const q=JSON.parse(Buffer.from(payload,'base64url').toString()),current=makeQuote({userId,body,env,now});
  if (q.userId!==userId||q.fingerprint!==current.fingerprint||q.revision!==current.revision||q.credits!==current.credits||q.model!==current.model||q.expiresAt<=now) throw Error('QUOTE_EXPIRED_OR_CHANGED');
  return q;
}

export function installGenerationBilling(app,{auth,pool,stripe,appUrl,env=process.env}) {
  const wallet=new GenerationWallet(pool); let initializing;
  const runtime=()=>generationBillingRuntime(env);
  const enabled=()=>{const r=runtime();return r.activationRequested&&!!pool&&!!stripe&&!!env.DATABASE_URL&&!!env.APP_JWT_SECRET&&r.keyMatches&&(r.mode==='test'||(r.liveApproved&&stripeWebhookConfigured(env)));};
  const init=async()=>{
    await wallet.init();
    if (!initializing) initializing=pool.query(`CREATE TABLE IF NOT EXISTS vv_ai_order (
      id TEXT PRIMARY KEY,user_id TEXT NOT NULL,sku TEXT NOT NULL,snapshot JSONB NOT NULL,
      session_id TEXT UNIQUE,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`).catch(e=>{initializing=null;throw e;});
    await initializing;
  };
  app.get('/api/ai-wallet/config',(_req,res)=>{const c=welcomeCreditConfig(env);res.json({welcomeEnabled:c.enabled,welcomeCredits:c.credits});});
  app.get('/api/ai-wallet/balance',auth,async(req,res)=>{try{res.json(await wallet.balance(req.user.id));}catch(_){res.status(503).json({error:'WALLET_UNAVAILABLE'});}});
  app.get('/api/ai-wallet/history',auth,async(req,res)=>{try{res.json({items:await wallet.history(req.user.id)});}catch(_){res.status(503).json({error:'WALLET_UNAVAILABLE'});}});
  app.post('/api/ai-wallet/welcome',auth,async(req,res)=>{const c=welcomeCreditConfig(env);if(!c.enabled)return res.status(503).json({error:'AI_WELCOME_CREDITS_NOT_ENABLED'});try{const balance=await wallet.grantOnce({userId:req.user.id,kind:'welcome',credits:c.credits});res.json({ok:true,credits:c.credits,balance});}catch(_){res.status(503).json({error:'WALLET_UNAVAILABLE'});}});
  app.get('/api/ai-billing/config',(_req,res)=>{
    const c=billingCatalog(env);
    const r=runtime();res.json({enabled:enabled(),mode:r.mode,livePaymentsEnabled:enabled()&&r.livemode,unit:'AI credits',subscriptionCredits:publicSubscriptionCreditGrants(env),packs:c.packs.map(({priceId,...p})=>p),rates:c.rates,revision:c.revision,reason:enabled()?null:'PAYMENTS_NOT_ACTIVATED'});
  });
  app.use('/api/ai-billing',(_req,res,next)=>enabled()?next():res.status(503).json({error:'PAYMENTS_NOT_ACTIVATED'}));
  app.get('/api/ai-billing/balance',auth,async(req,res)=>{try{res.json(await wallet.balance(req.user.id));}catch(_){res.status(503).json({error:'WALLET_UNAVAILABLE'});}});
  app.get('/api/ai-billing/history',auth,async(req,res)=>{try{res.json({items:await wallet.history(req.user.id)});}catch(_){res.status(503).json({error:'WALLET_UNAVAILABLE'});}});
  app.post('/api/ai-billing/quote',auth,(req,res)=>{
    try{const q=makeQuote({userId:req.user.id,body:req.body,env}),r=runtime();res.json({...q,scope:r.mode,generationEnabled:env.AI_STUDIO_WALLET_ENABLED==='true'});}
    catch(_){res.status(400).json({error:'AI_PRICING_NOT_APPROVED_OR_INVALID_REQUEST'});}
  });
  app.post('/api/ai-billing/checkout',auth,async(req,res)=>{
    if (!uuid.test(req.body?.requestId||'')) return res.status(400).json({error:'REQUEST_ID_REQUIRED'});
    const pack=billingCatalog(env).packs.find(p=>p.sku===req.body.sku);
    if (!pack) return res.status(503).json({error:'AI_PRICING_NOT_APPROVED'});
    try {
      await init();
      const id=hash({userId:req.user.id,requestId:req.body.requestId}),r=runtime();
      const snapshot={...pack,billingMode:r.mode,email:req.user.email||'',identifier:'vvai_'+randomUUID().replaceAll('-','').slice(0,8).replace(/[0-9]/g,'a')};
      await pool.query('INSERT INTO vv_ai_order(id,user_id,sku,snapshot) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id,req.user.id,pack.sku,JSON.stringify(snapshot)]);
      const {rows}=await pool.query('SELECT * FROM vv_ai_order WHERE id=$1 AND user_id=$2',[id,req.user.id]); const order=rows[0],p=order.snapshot;
      if (order.sku!==pack.sku) return res.status(409).json({error:'CHECKOUT_REQUEST_CONFLICT'});
      if (order.session_id) {
        // Reopening a paid/expired, foreign or previously differently priced Checkout
        // is not a safe idempotent retry: ask the client to make a new request ID.
        const s=await stripe.checkout.sessions.retrieve(order.session_id);
        try{return res.json(existingCheckoutResponse({order,pack,session:s,runtime:r,userId:req.user.id}));}
        catch(_){return res.status(409).json({error:'CHECKOUT_SESSION_NOT_REUSABLE'});}
      }
      if (!order.snapshot||order.snapshot.billingMode!==r.mode||order.snapshot.priceId!==pack.priceId||order.snapshot.amount!==pack.amount||order.snapshot.credits!==pack.credits||order.snapshot.currency!==pack.currency)
        return res.status(409).json({error:'CHECKOUT_REQUEST_CONFLICT'});
      const price=await stripe.prices.retrieve(p.priceId);
      if (!price.active||price.type!=='one_time'||price.unit_amount!==p.amount||price.currency!==p.currency||!!price.livemode!==r.livemode) throw Error('PRICE_MISMATCH');
      const s=await stripe.checkout.sessions.create({
        mode:'payment',line_items:[{price:p.priceId,quantity:1}],client_reference_id:req.user.id,
        customer_email:p.email||undefined,metadata:{aiWallet:'v1',orderId:id},payment_intent_data:{metadata:{aiWallet:'v1',orderId:id}},
        integration_identifier:p.identifier,allow_promotion_codes:false,
        success_url:`${appUrl}/generate-studio.html?ai_checkout=returned`,cancel_url:`${appUrl}/generate-studio.html?ai_checkout=cancelled`
      },{idempotencyKey:'vv-ai-'+id});
      // The first Checkout creation must satisfy the same integrity contract as
      // an idempotent replay, before its session ID is persisted or URL shown.
      // A malformed upstream session must never be presented as payable.
      const verified=existingCheckoutResponse({order:{...order,session_id:s?.id},pack,session:s,runtime:r,userId:req.user.id});
      await pool.query('UPDATE vv_ai_order SET session_id=$2 WHERE id=$1',[id,s.id]);
      res.json(verified);
    } catch (_) {res.status(503).json({error:'AI_CHECKOUT_UNAVAILABLE'});}
  });
  async function handleEvent(event) {
    // Invoked only after the existing Stripe webhook signature check.
    const r=runtime();
    if(event.type?.startsWith('charge.dispute.'))return quarantineSignedDispute({event,pool,wallet});
    if(event.type==='invoice.paid'){
      await grantPaidSubscriptionInvoice({event,env,pool,wallet,stripe});
      // Preserve the established subscription-cycle usage reset in server.js.
      return false;
    }
    if(event.type==='charge.refunded'){
      const aiMarked=hasAiWalletRefundMarker(event),charge=event.data?.object||{};
      if(!enabled()&&env.AI_SUBSCRIPTION_CREDITS_ENABLED!=='true'&&!aiMarked){
        // Unrelated legacy refunds must not touch the disabled AI wallet.
        // AI-marked *historical* refunds must still revoke previously sold
        // credits after Checkout is switched OFF; this does not permit sales.
        return false;
      }
      // Even if one-time AI Checkout is OFF, signed subscription refunds
      // must reach the same durable wallet purchase ledger as paid invoices.
      if(!aiMarked&&(event.livemode!==r.livemode||charge.livemode!==r.livemode))
        return false; // unrelated Stripe product/mode, not an AI wallet refund
      const refund=stripeRefundData(event,{livemode:r.livemode});if(!refund)return false;
      const result=await wallet.refund(refund.paymentIntent,refund.cumulativeAmount,refund);
      // A clearly AI-tagged refund arriving before the grant must be retried,
      // not acknowledged and lost. No credit is created without the paid webhook.
      if(result?.ignored&&aiMarked)throw Error('AI_REFUND_PURCHASE_PENDING');
      return !result?.ignored;
    }
    if (!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) return false;
    const object=event.data.object;
    if (object.metadata?.aiWallet!=='v1') return false;
    // Turning OFF new Checkout must not strand an already-paid, signed event
    // for an order persisted before shutdown. Reconciliation still requires
    // matching Stripe credentials, mode, the original order and session.
    const historicalPaidSettlement=!r.activationRequested&&r.keyMatches&&!!pool&&
      !!stripe?.checkout?.sessions?.retrieve&&!!env.DATABASE_URL&&!!env.APP_JWT_SECRET;
    if (!enabled()&&!historicalPaidSettlement) throw Error('AI_BILLING_WEBHOOK_DISABLED');
    await init();
    const {rows}=await pool.query('SELECT * FROM vv_ai_order WHERE id=$1',[object.metadata.orderId]);
    if (!rows.length) throw Error('AI_ORDER_NOT_FOUND');
    const order=rows[0],p=order.snapshot;if((p.billingMode||'test')!==r.mode)throw Error('AI_PAYMENT_MODE_MISMATCH');
    const s=await stripe.checkout.sessions.retrieve(object.id,{expand:['line_items']});
    if (s.payment_status!=='paid') return true;
    const lines=s.line_items?.data||[];
    const taxAmount=stripeCheckoutTaxAmount(s);
    if (!!s.livemode!==r.livemode||!!event.livemode!==r.livemode||s.mode!=='payment'||s.metadata?.orderId!==order.id||s.metadata?.aiWallet!=='v1'||s.client_reference_id!==order.user_id||s.amount_subtotal!==p.amount||s.amount_total!==p.amount+taxAmount||s.currency!==p.currency||s.line_items?.has_more||lines.length!==1||lines[0].price?.id!==p.priceId||lines[0].quantity!==1||!s.payment_intent||(order.session_id&&order.session_id!==s.id)) throw Error('AI_PAYMENT_MISMATCH');
    const paymentIntent=typeof s.payment_intent==='string'?s.payment_intent:s.payment_intent.id;
    const settlement=await retrieveStripeNetRevenue({stripe,paymentIntentId:paymentIntent,
      expectedAmount:s.amount_total,expectedCurrency:s.currency,taxAmount,expectedLivemode:r.livemode});
    // Handles a webhook that raced the checkout response; snapshot is already durable.
    await pool.query('UPDATE vv_ai_order SET session_id=$2 WHERE id=$1 AND (session_id IS NULL OR session_id=$2)',[order.id,s.id]);
    await wallet.grant({userId:order.user_id,sessionId:s.id,paymentIntent,credits:p.credits,amount:s.amount_total,currency:p.currency,settlement});
    return true;
  }
  return {wallet,handleEvent};
}
