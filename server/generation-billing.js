import {createHash,createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {GenerationWallet} from './generation-wallet.js';
import {MODELS,validateGeneration} from './generation-provider.js';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const positive = n => Number.isSafeInteger(n) && n>0 && n<=10_000_000;
export function billingCatalog(env={}) {
  try {
    const packs=JSON.parse(env.AI_CREDIT_PACKS_JSON||'[]'), rates=JSON.parse(env.AI_CREDIT_RATES_JSON||'[]');
    if (!Array.isArray(packs)||!Array.isArray(rates)||packs.length>10||rates.length>3) throw Error();
    if (packs.some(p=>!/^[a-z0-9_-]{1,40}$/.test(p.sku)||!/^price_[A-Za-z0-9]+$/.test(p.priceId)||!positive(p.credits)||!positive(p.amount)||!['eur','usd'].includes(p.currency))) throw Error();
    if (new Set(packs.map(p=>p.sku)).size!==packs.length) throw Error();
    if (rates.some(r=>!MODELS[r.kind]||!positive(r.credits))||new Set(rates.map(r=>r.kind)).size!==rates.length) throw Error();
    return {packs,rates,revision:hash({packs,rates})};
  } catch (_) { return {packs:[],rates:[],revision:null}; }
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

// Deliberately sandbox-only until live provider economics and purchase terms are approved.
export function installGenerationBilling(app,{auth,pool,stripe,appUrl,env=process.env}) {
  const wallet=new GenerationWallet(pool); let initializing;
  const enabled=()=>env.AI_BILLING_ENABLED==='true'&&!!pool&&!!stripe&&!!env.DATABASE_URL&&!!env.APP_JWT_SECRET&&/^sk_test_|^rk_test_/.test(env.STRIPE_SECRET_KEY||'');
  const init=async()=>{
    await wallet.init();
    if (!initializing) initializing=pool.query(`CREATE TABLE IF NOT EXISTS vv_ai_order (
      id TEXT PRIMARY KEY,user_id TEXT NOT NULL,sku TEXT NOT NULL,snapshot JSONB NOT NULL,
      session_id TEXT UNIQUE,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`).catch(e=>{initializing=null;throw e;});
    await initializing;
  };
  app.get('/api/ai-billing/config',(_req,res)=>{
    const c=billingCatalog(env);
    res.json({enabled:enabled(),mode:'test',livePaymentsEnabled:false,unit:'AI credits',packs:c.packs.map(({priceId,...p})=>p),rates:c.rates,revision:c.revision,reason:enabled()?null:'PAYMENTS_NOT_ACTIVATED'});
  });
  app.use('/api/ai-billing',(_req,res,next)=>enabled()?next():res.status(503).json({error:'PAYMENTS_NOT_ACTIVATED'}));
  app.get('/api/ai-billing/balance',auth,async(req,res)=>{try{res.json(await wallet.balance(req.user.id));}catch(_){res.status(503).json({error:'WALLET_UNAVAILABLE'});}});
  app.get('/api/ai-billing/history',auth,async(req,res)=>{try{res.json({items:await wallet.history(req.user.id)});}catch(_){res.status(503).json({error:'WALLET_UNAVAILABLE'});}});
  app.post('/api/ai-billing/quote',auth,(req,res)=>{
    try{const q=makeQuote({userId:req.user.id,body:req.body,env});res.json({...q,scope:'test',generationEnabled:false});}
    catch(_){res.status(400).json({error:'AI_PRICING_NOT_APPROVED_OR_INVALID_REQUEST'});}
  });
  app.post('/api/ai-billing/checkout',auth,async(req,res)=>{
    if (!uuid.test(req.body?.requestId||'')) return res.status(400).json({error:'REQUEST_ID_REQUIRED'});
    const pack=billingCatalog(env).packs.find(p=>p.sku===req.body.sku);
    if (!pack) return res.status(503).json({error:'AI_PRICING_NOT_APPROVED'});
    try {
      await init();
      const id=hash({userId:req.user.id,requestId:req.body.requestId});
      const snapshot={...pack,email:req.user.email||'',identifier:'vvai_'+randomUUID().replaceAll('-','').slice(0,8).replace(/[0-9]/g,'a')};
      await pool.query('INSERT INTO vv_ai_order(id,user_id,sku,snapshot) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id,req.user.id,pack.sku,JSON.stringify(snapshot)]);
      const {rows}=await pool.query('SELECT * FROM vv_ai_order WHERE id=$1 AND user_id=$2',[id,req.user.id]); const order=rows[0],p=order.snapshot;
      if (order.sku!==pack.sku) return res.status(409).json({error:'CHECKOUT_REQUEST_CONFLICT'});
      if (order.session_id) {const s=await stripe.checkout.sessions.retrieve(order.session_id);return res.json({url:s.url,id:s.id,mode:'test'});}
      const price=await stripe.prices.retrieve(p.priceId);
      if (!price.active||price.type!=='one_time'||price.unit_amount!==p.amount||price.currency!==p.currency||price.livemode!==false) throw Error('PRICE_MISMATCH');
      const s=await stripe.checkout.sessions.create({
        mode:'payment',line_items:[{price:p.priceId,quantity:1}],client_reference_id:req.user.id,
        customer_email:p.email||undefined,metadata:{aiWallet:'v1',orderId:id},payment_intent_data:{metadata:{aiWallet:'v1',orderId:id}},
        integration_identifier:p.identifier,allow_promotion_codes:false,
        success_url:`${appUrl}/generate-studio.html?ai_checkout=returned`,cancel_url:`${appUrl}/generate-studio.html?ai_checkout=cancelled`
      },{idempotencyKey:'vv-ai-'+id});
      if (s.livemode!==false||typeof s.url!=='string'||new URL(s.url).hostname!=='checkout.stripe.com') throw Error('CHECKOUT_MODE_MISMATCH');
      await pool.query('UPDATE vv_ai_order SET session_id=$2 WHERE id=$1',[id,s.id]);
      res.json({url:s.url,id:s.id,mode:'test'});
    } catch (_) {res.status(503).json({error:'AI_CHECKOUT_UNAVAILABLE'});}
  });
  async function handleEvent(event) {
    // Invoked only after the existing Stripe webhook signature check.
    if (!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) return false;
    const object=event.data.object;
    if (object.metadata?.aiWallet!=='v1') return false;
    if (!enabled()) throw Error('AI_BILLING_WEBHOOK_DISABLED');
    await init();
    const {rows}=await pool.query('SELECT * FROM vv_ai_order WHERE id=$1',[object.metadata.orderId]);
    if (!rows.length) throw Error('AI_ORDER_NOT_FOUND');
    const order=rows[0],p=order.snapshot;
    const s=await stripe.checkout.sessions.retrieve(object.id,{expand:['line_items']});
    if (s.payment_status!=='paid') return true;
    const lines=s.line_items?.data||[];
    if (s.livemode!==false||event.livemode!==false||s.mode!=='payment'||s.metadata?.orderId!==order.id||s.metadata?.aiWallet!=='v1'||s.client_reference_id!==order.user_id||s.amount_total!==p.amount||s.currency!==p.currency||s.line_items?.has_more||lines.length!==1||lines[0].price?.id!==p.priceId||lines[0].quantity!==1||!s.payment_intent||(order.session_id&&order.session_id!==s.id)) throw Error('AI_PAYMENT_MISMATCH');
    // Handles a webhook that raced the checkout response; snapshot is already durable.
    await pool.query('UPDATE vv_ai_order SET session_id=$2 WHERE id=$1 AND (session_id IS NULL OR session_id=$2)',[order.id,s.id]);
    await wallet.grant({userId:order.user_id,sessionId:s.id,paymentIntent:typeof s.payment_intent==='string'?s.payment_intent:s.payment_intent.id,credits:p.credits,amount:p.amount,currency:p.currency});
    return true;
  }
  return {wallet,handleEvent};
}
