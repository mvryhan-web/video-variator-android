// Telegram Stars: optional Mini App checkout, zero Stripe changes.
import {randomUUID} from 'node:crypto';
import {pool} from './db.js';
const specs={
 basic:{name:'Basic',credits:750,monthly:true,env:'TG_STARS_BASIC'},
 pro:{name:'Pro',credits:2250,monthly:true,env:'TG_STARS_PRO'},
 business:{name:'Business',credits:15000,monthly:true,env:'TG_STARS_BUSINESS'},
 lifetime:{name:'Lifetime',credits:null,monthly:false,env:'TG_STARS_LIFETIME'}
};
const validId=x=>/^[1-9][0-9]{0,19}$/.test(String(x||''));
function priceOf(plan){
 const raw=process.env[specs[plan]?.env||'']||'';
 if(!/^[1-9][0-9]{0,4}$/.test(raw))return null;
 const n=Number(raw);return n>0&&n<=10000?n:null;
}
export function starsPlans(){
 return Object.entries(specs).map(([id,v])=>({id,name:v.name,credits:v.credits,period:v.monthly?'30 days':'lifetime',stars:priceOf(id)}));
}
function orderId(payload){return /^vu2:([0-9a-f-]{36})$/i.exec(String(payload||''))?.[1]||null;}
async function tg(token,method,body){
 const resp=await fetch('https://api.telegram.org/bot'+token+'/'+method,{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(9000)
 });
 const result=await resp.json();if(!resp.ok||!result.ok)throw Error('Telegram '+method+' HTTP '+resp.status);
 return result.result;
}
export async function initStars(){
 if(!pool)throw Error('PostgreSQL is required for Stars');
 await pool.query("CREATE TABLE IF NOT EXISTS vv_tg_star_orders(id TEXT PRIMARY KEY,telegram_id TEXT NOT NULL,plan TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TIMESTAMPTZ DEFAULT NOW(),paid_at TIMESTAMPTZ,charge_id TEXT UNIQUE); CREATE INDEX IF NOT EXISTS vv_tg_star_orders_user_idx ON vv_tg_star_orders(telegram_id,created_at DESC); CREATE TABLE IF NOT EXISTS vv_tg_star_payments(charge_id TEXT PRIMARY KEY,telegram_id TEXT NOT NULL,order_id TEXT NOT NULL,plan TEXT NOT NULL,amount INTEGER NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE IF NOT EXISTS vv_tg_star_access(telegram_id TEXT PRIMARY KEY,plan TEXT NOT NULL,period_used INTEGER NOT NULL DEFAULT 0,expires_at TIMESTAMPTZ,updated_at TIMESTAMPTZ DEFAULT NOW());");
}
export async function starsAccess(id){
 if(!validId(id))return null;
 const r=await pool.query("SELECT plan,period_used,expires_at FROM vv_tg_star_access WHERE telegram_id=$1 AND (plan='lifetime' OR expires_at>NOW())",[String(id)]);
 const v=r.rows[0],s=specs[v?.plan];if(!s)return null;
 return{plan:v.plan,credits:s.credits,used:Number(v.period_used),remaining:s.credits===null?null:Math.max(0,s.credits-Number(v.period_used)),expiresAt:v.expires_at};
}
export async function createStarsInvoice(token,id,plan){
 if(!validId(id)||!specs[plan])return{error:'UNKNOWN_PLAN',status:400};
 const amount=priceOf(plan);if(amount===null)return{error:'STARS_PRICE_NOT_CONFIGURED',status:409};
 const existing=await starsAccess(id);
 if(existing)return{error:'SUBSCRIPTION_ALREADY_ACTIVE',status:409};
 const pending=await pool.query("SELECT COUNT(*)::int AS n FROM vv_tg_star_orders WHERE telegram_id=$1 AND status='pending' AND created_at>NOW()-INTERVAL '1 hour'",[String(id)]);
 if(pending.rows[0].n>=5)return{error:'TOO_MANY_PENDING_INVOICES',status:429};
 const order=randomUUID(),s=specs[plan];
 await pool.query('INSERT INTO vv_tg_star_orders(id,telegram_id,plan,amount) VALUES($1,$2,$3,$4)',[order,String(id),plan,amount]);
 try{
  const url=await tg(token,'createInvoiceLink',{
   title:'Video Uniquifier '+s.name,
   description:s.monthly?s.credits+' video credits every 30 days':'Lifetime Telegram Mini video processing',
   payload:'vu2:'+order,provider_token:'',currency:'XTR',
   prices:[{label:s.name,amount}],...(s.monthly?{subscription_period:2592000}:{})
  });
  return{url,plan,stars:amount};
 }catch(e){console.error('[stars] invoice:',e.message);return{error:'INVOICE_CREATE_FAILED',status:502};}
}
export async function processStarsUpdate(update,token){
 const q=update?.pre_checkout_query;
 if(q){
  const id=orderId(q.invoice_payload);if(!id)return false;
  try{
   const r=await pool.query("SELECT * FROM vv_tg_star_orders WHERE id=$1 AND status='pending' AND created_at>NOW()-INTERVAL '2 hours'",[id]);
   const o=r.rows[0],ok=!!o&&o.telegram_id===String(q.from?.id)&&q.currency==='XTR'&&o.amount===q.total_amount;
   await tg(token,'answerPreCheckoutQuery',{pre_checkout_query_id:q.id,ok,...(!ok?{error_message:'This invoice has expired. Please open the Mini App again.'}:{})});
  }catch(e){
   console.error('[stars] precheckout:',e.message);
   try{await tg(token,'answerPreCheckoutQuery',{pre_checkout_query_id:q.id,ok:false,error_message:'Payment temporarily unavailable.'});}catch(_){}
  }
  return true;
 }
 const message=update?.message,paid=message?.successful_payment,id=orderId(paid?.invoice_payload);
 if(paid&&id){
  const user=String(message.from?.id||''),charge=String(paid.telegram_payment_charge_id||'');
  if(!validId(user)||!charge||paid.currency!=='XTR'||!Number.isSafeInteger(paid.total_amount))throw Error('Invalid Stars proof');
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const r=await client.query('SELECT * FROM vv_tg_star_orders WHERE id=$1 FOR UPDATE',[id]);
   const order=r.rows[0];
   if(!order||order.telegram_id!==user||order.amount!==paid.total_amount||!specs[order.plan])throw Error('Stars payment/order mismatch');
   const saved=await client.query("INSERT INTO vv_tg_star_payments(charge_id,telegram_id,order_id,plan,amount) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING charge_id",[charge,user,id,order.plan,order.amount]);
   if(saved.rowCount){
    await client.query("UPDATE vv_tg_star_orders SET status='paid',paid_at=NOW(),charge_id=$2 WHERE id=$1",[id,charge]);
    let expires=null;
    if(specs[order.plan].monthly){
     const seconds=Number(paid.subscription_expiration_date);
     expires=Number.isSafeInteger(seconds)&&seconds>Date.now()/1000?new Date(seconds*1000):new Date(Date.now()+2592000000);
    }
    await client.query("INSERT INTO vv_tg_star_access(telegram_id,plan,period_used,expires_at) VALUES($1,$2,0,$3) ON CONFLICT(telegram_id) DO UPDATE SET plan=CASE WHEN vv_tg_star_access.plan='lifetime' THEN 'lifetime' ELSE EXCLUDED.plan END,period_used=CASE WHEN vv_tg_star_access.plan='lifetime' THEN vv_tg_star_access.period_used ELSE 0 END,expires_at=CASE WHEN vv_tg_star_access.plan='lifetime' THEN vv_tg_star_access.expires_at ELSE EXCLUDED.expires_at END,updated_at=NOW()",[user,order.plan,expires]);
   }
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK').catch(()=>{});console.error('[stars] fulfill:',e.message);throw e;}
  finally{client.release();}
  return true;
 }
 if(update?.subscription&&orderId(update.subscription.invoice_payload))return true;
 return false;
}
