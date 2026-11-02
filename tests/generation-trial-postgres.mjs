import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {AI_MIGRATION_FILES} from '../server/ai-migrations.js';
import {previewTrialWindow} from '../server/generation-trial-policy.js';
const connString=process.env.AI_TEST_DATABASE_URL;
const start=Date.parse('2026-10-15T12:00:00Z');
const purchase=(id,extra={})=>({userId:'trial-'+id,hash:createHmac('sha256','STAGING_FIXTURE_ONLY_NONPRODUCTION').update('fixture-'+id).digest('hex'),session:'cs_trial_'+id,intent:'pi_trial_'+id,verifiedWebhook:true,paymentStatus:'paid',amountCents:99,currency:'usd',checkoutMode:'payment',oneTime:true,autoRenew:false,...extra});
async function insert(pool,p){
 const review=previewTrialWindow({userId:p.userId,sessionId:p.session,paymentIntent:p.intent,verifiedWebhook:p.verifiedWebhook,
   paymentStatus:p.paymentStatus,checkoutMode:p.checkoutMode,amountCents:p.amountCents,currency:p.currency,
   oneTime:p.oneTime,autoRenew:p.autoRenew,paidAtMs:start,refundedCents:0,revoked:false},start);
 if(review.status!=='ACTIVE_WINDOW_PREVIEW')throw Error('NOT_VERIFIED_PAID_RECEIPT');
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const args=[p.userId,p.hash,p.session,p.intent,start,start+259200000];
  const saved=await c.query(`INSERT INTO vv_ai_trial_purchase_staging(user_id,payment_identity_digest,stripe_session_id,stripe_payment_intent_id,verified_payment_at_ms,expires_at_ms)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING user_id`,args);
  if(!saved.rowCount){
   const {rows}=await c.query('SELECT * FROM vv_ai_trial_purchase_staging WHERE user_id=$1 OR payment_identity_digest=$2 OR stripe_session_id=$3 OR stripe_payment_intent_id=$4',args.slice(0,4));
   if(rows.length!==1||rows[0].user_id!==p.userId||rows[0].payment_identity_digest!==p.hash||
      rows[0].stripe_session_id!==p.session||rows[0].stripe_payment_intent_id!==p.intent)throw Error('DUPLICATE_CUSTOMER_OR_PAYMENT');
  }
  await c.query('COMMIT');return {created:!!saved.rowCount,accessGranted:false};
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
}
test('isolated PostgreSQL trial payment staging never mutates live schemas or grants credits',{skip:!connString},async t=>{
 const u=new URL(connString);
 assert.equal(process.env.NODE_ENV,'test');
 assert.ok(['localhost','127.0.0.1'].includes(u.hostname));
 assert.equal(u.pathname,'/vv_ai_test');
 assert.ok(!AI_MIGRATION_FILES.some(x=>/trial/.test(x)));
 const sql=await readFile(new URL('../docs/DEEPSYQ_TRIAL_099_STAGING_ONLY.sql',import.meta.url),'utf8');
 const pool=new pg.Pool({connectionString:connString,max:16});
 const db=await pool.connect();
 await db.query('SELECT pg_advisory_lock(991015099)');
 try{
  await db.query('DROP TABLE IF EXISTS vv_ai_trial_purchase_staging');
  await db.query(sql);await db.query(sql);
  await t.test('12 simultaneous verified events create exactly one purchase',async()=>{
   const p=purchase('repeat');
   const out=await Promise.all(Array.from({length:12},()=>insert(pool,p)));
   assert.equal(out.filter(x=>x.created).length,1);
   assert.ok(out.every(x=>!x.accessGranted));
   assert.equal(Number((await db.query('SELECT count(*) AS n FROM vv_ai_trial_purchase_staging')).rows[0].n),1);
  });
  await t.test('different user with same payment identity or same user new payment is blocked',async()=>{
   const p=purchase('identity');await insert(pool,p);
   await assert.rejects(()=>insert(pool,{...purchase('other'),hash:p.hash}),/DUPLICATE_CUSTOMER_OR_PAYMENT/);
   await assert.rejects(()=>insert(pool,{...p,session:'cs_trial_new'}),/DUPLICATE_CUSTOMER_OR_PAYMENT/);
  });
  await t.test('unpaid, recurring, unverified, wrong-amount and browser-return events cannot create a trial',async()=>{
   for(const change of [{verifiedWebhook:false},{paymentStatus:'unpaid'},{checkoutMode:'subscription'},
     {autoRenew:true},{amountCents:100},{currency:'eur'}]){
    await assert.rejects(()=>insert(pool,purchase('blocked',{...change})),/NOT_VERIFIED_PAID_RECEIPT/);
   }
   const {rows}=await db.query('SELECT COUNT(*)::int AS n FROM vv_ai_trial_purchase_staging WHERE user_id=$1',['trial-blocked']);
   assert.equal(rows[0].n,0);
  });
  await t.test('72-hour expiry starts at paid time; no actual access granted',async()=>{
   const p=purchase('window');await insert(pool,p);
   const row=(await db.query('SELECT * FROM vv_ai_trial_purchase_staging WHERE user_id=$1',[p.userId])).rows[0];
   const policy=at=>previewTrialWindow({userId:row.user_id,sessionId:row.stripe_session_id,paymentIntent:row.stripe_payment_intent_id,
     verifiedWebhook:true,paymentStatus:'paid',checkoutMode:row.checkout_mode,amountCents:row.amount_cents,currency:row.currency,
     oneTime:row.one_time,autoRenew:row.auto_renew,paidAtMs:Number(row.verified_payment_at_ms),refundedCents:row.refunded_cents,revoked:row.revoked},at);
   assert.equal(policy(start+259200000-1).status,'ACTIVE_WINDOW_PREVIEW');
   assert.equal(policy(start+259200000).status,'EXPIRED_WINDOW');
   assert.equal(policy(start+1000).accessGranted,false);
   assert.equal(Number(row.expires_at_ms-row.verified_payment_at_ms),259200000);
  });
  await t.test('refund revisions are monotonic; refund never re-enables trial',async()=>{
   const p=purchase('refund');await insert(pool,p);
   for(const n of [70,20,99,10]){
    const out=await pool.query('UPDATE vv_ai_trial_purchase_staging SET refunded_cents=GREATEST(refunded_cents,$3) WHERE stripe_session_id=$1 AND stripe_payment_intent_id=$2 RETURNING refunded_cents',[p.session,p.intent,n]);
    assert.equal(out.rows.length,1);assert.equal(out.rows[0].refunded_cents,n===70?70:n===20?70:99);
   }
   await assert.rejects(()=>insert(pool,{...p,intent:'pi_new'}),/DUPLICATE_CUSTOMER_OR_PAYMENT/);
   assert.equal((await db.query('SELECT refunded_cents FROM vv_ai_trial_purchase_staging WHERE user_id=$1',[p.userId])).rows[0].refunded_cents,99);
  });
  await t.test('transaction rollback frees one-time eligibility and no secret columns stored',async()=>{
   const p=purchase('rollback'),c=await pool.connect();
   try{await c.query('BEGIN');
    await c.query('INSERT INTO vv_ai_trial_purchase_staging(user_id,payment_identity_digest,stripe_session_id,stripe_payment_intent_id,verified_payment_at_ms,expires_at_ms) VALUES($1,$2,$3,$4,$5,$6)',[p.userId,p.hash,p.session,p.intent,start,start+259200000]);
    await c.query('ROLLBACK');}finally{c.release();}
   assert.equal((await insert(pool,p)).created,true);
   const cols=(await db.query('SELECT column_name FROM information_schema.columns WHERE table_name=$1',['vv_ai_trial_purchase_staging'])).rows.map(r=>r.column_name);
   assert.ok(cols.every(x=>!/raw_identity|credit|wallet|secret|card_number/.test(x)));
  });
 }finally{
  await db.query('DROP TABLE IF EXISTS vv_ai_trial_purchase_staging').catch(()=>{});
  await db.query('SELECT pg_advisory_unlock(991015099)').catch(()=>{});db.release();await pool.end();
 }
});
