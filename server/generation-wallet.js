import {claimPurchasedGeneration,checkPurchasedGenerationMargin} from './generation-purchased-proof.js';
// Separate prepaid AI ledger. Existing subscription/trial credits are never read here.
export const MAX_CREDITS = 1_000_000_000;
function integer(value, name, max = MAX_CREDITS) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > max) throw new Error(`INVALID_${name}`);
  return value;
}
function identifier(value) {
  if (typeof value !== 'string' || !value || value.length > 200) throw new Error('INVALID_IDENTIFIER');
  return value;
}
export class GenerationWallet {
  constructor(pool) { this.pool = pool; }
  async init() {
    if (!this.initializing) this.initializing = this.pool.query(`
      CREATE TABLE IF NOT EXISTS vv_ai_wallet (
        user_id TEXT PRIMARY KEY, available BIGINT NOT NULL DEFAULT 0 CHECK(available BETWEEN 0 AND 1000000000),
        reserved BIGINT NOT NULL DEFAULT 0 CHECK(reserved BETWEEN 0 AND 1000000000),
        debt BIGINT NOT NULL DEFAULT 0 CHECK(debt BETWEEN 0 AND 1000000000));
      CREATE TABLE IF NOT EXISTS vv_ai_purchase (
        session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, payment_intent TEXT NOT NULL UNIQUE,
        credits INTEGER NOT NULL CHECK(credits>0), amount INTEGER NOT NULL CHECK(amount>0),
        currency TEXT NOT NULL, refunded_amount INTEGER NOT NULL DEFAULT 0 CHECK(refunded_amount>=0),
        processor_fee_amount BIGINT, tax_amount BIGINT, net_revenue_micros BIGINT,
        settlement_verified_at TIMESTAMPTZ, stripe_charge_id TEXT,
        stripe_balance_transaction_id TEXT, settlement_livemode BOOLEAN,
        CHECK ((net_revenue_micros IS NULL AND processor_fee_amount IS NULL AND tax_amount IS NULL AND
          settlement_verified_at IS NULL AND stripe_charge_id IS NULL AND
          stripe_balance_transaction_id IS NULL AND settlement_livemode IS NULL) OR
          (net_revenue_micros IS NOT NULL AND processor_fee_amount IS NOT NULL AND tax_amount IS NOT NULL AND
          settlement_verified_at IS NOT NULL AND stripe_charge_id IS NOT NULL AND
          stripe_balance_transaction_id IS NOT NULL AND settlement_livemode IS NOT NULL AND
          processor_fee_amount>=0 AND tax_amount>=0 AND net_revenue_micros>0 AND
          amount::bigint>processor_fee_amount+tax_amount AND
          net_revenue_micros=(amount::bigint-processor_fee_amount-tax_amount)*10000::bigint));
      ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS processor_fee_amount BIGINT;
      ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS tax_amount BIGINT;
      ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS net_revenue_micros BIGINT;
      ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS settlement_verified_at TIMESTAMPTZ;
      ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;
      ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS stripe_balance_transaction_id TEXT;
      ALTER TABLE vv_ai_purchase ADD COLUMN IF NOT EXISTS settlement_livemode BOOLEAN;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='vv_ai_purchase_settlement_complete') THEN
          ALTER TABLE vv_ai_purchase ADD CONSTRAINT vv_ai_purchase_settlement_complete CHECK (
            (net_revenue_micros IS NULL AND processor_fee_amount IS NULL AND tax_amount IS NULL AND
             settlement_verified_at IS NULL AND stripe_charge_id IS NULL AND
             stripe_balance_transaction_id IS NULL AND settlement_livemode IS NULL) OR
            (net_revenue_micros IS NOT NULL AND processor_fee_amount IS NOT NULL AND tax_amount IS NOT NULL AND
             settlement_verified_at IS NOT NULL AND stripe_charge_id IS NOT NULL AND
             stripe_balance_transaction_id IS NOT NULL AND settlement_livemode IS NOT NULL AND
             processor_fee_amount>=0 AND tax_amount>=0 AND net_revenue_micros>0 AND
             amount::bigint>processor_fee_amount+tax_amount AND
             net_revenue_micros=(amount::bigint-processor_fee_amount-tax_amount)*10000::bigint));
        END IF;
      END; $$;
      CREATE TABLE IF NOT EXISTS vv_ai_reservation (
        job_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, credits INTEGER NOT NULL CHECK(credits>0),
        fingerprint TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('held','captured','released')));
      CREATE TABLE IF NOT EXISTS vv_ai_ledger (
        id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, reference TEXT NOT NULL, kind TEXT NOT NULL,
        available_delta BIGINT NOT NULL, reserved_delta BIGINT NOT NULL, debt_delta BIGINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS vv_ai_adjustment (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, owner_user_id TEXT NOT NULL,
        delta BIGINT NOT NULL CHECK(delta<>0 AND delta BETWEEN -1000000 AND 1000000),
        reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS vv_ai_grant (
        user_id TEXT NOT NULL, kind TEXT NOT NULL, credits INTEGER NOT NULL CHECK(credits>0 AND credits<=10000000),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(user_id,kind));
      CREATE TABLE IF NOT EXISTS vv_ai_refund_event (
        event_id TEXT PRIMARY KEY, payment_intent TEXT NOT NULL, stripe_charge_id TEXT NOT NULL,
        cumulative_amount BIGINT NOT NULL CHECK(cumulative_amount>0), livemode BOOLEAN NOT NULL,
        received_at TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS vv_ai_refund_event_payment_intent
        ON vv_ai_refund_event(payment_intent,received_at DESC);
      CREATE INDEX IF NOT EXISTS vv_ai_ledger_user ON vv_ai_ledger(user_id,id DESC);
    `).catch(e => { this.initializing = null; throw e; });
    await this.initializing;
  }
  async transaction(userId, fn) {
    identifier(userId); await this.init(); const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('INSERT INTO vv_ai_wallet(user_id) VALUES($1) ON CONFLICT DO NOTHING', [userId]);
      const {rows} = await c.query('SELECT * FROM vv_ai_wallet WHERE user_id=$1 FOR UPDATE', [userId]);
      const w = {available:Number(rows[0].available), reserved:Number(rows[0].reserved), debt:Number(rows[0].debt)};
      const value = await fn(c, w); await c.query('COMMIT'); return value;
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
  }
  async change(c, userId, w, reference, kind, a, r, d = 0) {
    const next = {available:w.available+a, reserved:w.reserved+r, debt:w.debt+d};
    if (Object.values(next).some(n => !Number.isSafeInteger(n) || n<0 || n>MAX_CREDITS)) throw new Error('WALLET_LIMIT');
    await c.query('UPDATE vv_ai_wallet SET available=$2,reserved=$3,debt=$4 WHERE user_id=$1', [userId,next.available,next.reserved,next.debt]);
    await c.query('INSERT INTO vv_ai_ledger(user_id,reference,kind,available_delta,reserved_delta,debt_delta) VALUES($1,$2,$3,$4,$5,$6)', [userId,reference,kind,a,r,d]);
    return next;
  }
  async grant({userId,sessionId,paymentIntent,credits,amount,currency,settlement=null,allowHistoricalSubscriptionReplay=false}) {
    identifier(sessionId); identifier(paymentIntent); integer(credits,'CREDITS',10_000_000); integer(amount,'AMOUNT',100_000_000);
    if (!['eur','usd'].includes(currency)) throw new Error('INVALID_CURRENCY');
    const verified=settlement&&settlement.currency===currency&&
      Number.isSafeInteger(settlement.processorFeeAmount)&&settlement.processorFeeAmount>=0&&
      Number.isSafeInteger(settlement.taxAmount)&&settlement.taxAmount>=0&&
      Number.isSafeInteger(settlement.netRevenueMicros)&&settlement.netRevenueMicros>0&&
      settlement.processorFeeAmount+settlement.taxAmount<amount&&
      settlement.netRevenueMicros===(amount-settlement.processorFeeAmount-settlement.taxAmount)*10_000&&
      typeof settlement.stripeChargeId==='string'&&/^ch_[A-Za-z0-9]+$/.test(settlement.stripeChargeId)&&
      typeof settlement.stripeBalanceTransactionId==='string'&&/^txn_[A-Za-z0-9]+$/.test(settlement.stripeBalanceTransactionId)&&
      typeof settlement.livemode==='boolean'&&
      ((sessionId.startsWith('cs_live_')&&settlement.livemode===true)||
       (sessionId.startsWith('cs_test_')&&settlement.livemode===false)||sessionId.startsWith('in_'));
    if(settlement&&!verified)throw new Error('AI_SETTLEMENT_UNVERIFIED');
    return this.transaction(userId, async(c,w) => {
      const old = await c.query('SELECT * FROM vv_ai_purchase WHERE session_id=$1', [sessionId]);
      if (old.rows.length) {
        const p=old.rows[0];
        if (p.user_id!==userId || p.payment_intent!==paymentIntent || p.amount!==amount || p.currency!==currency ||
            (p.credits!==credits && !(allowHistoricalSubscriptionReplay && sessionId.startsWith('in_')))) throw new Error('PURCHASE_CONFLICT');
        if(verified){
          if(p.net_revenue_micros==null){
            await c.query(`UPDATE vv_ai_purchase SET processor_fee_amount=$2,tax_amount=$3,net_revenue_micros=$4,
              settlement_verified_at=NOW(),stripe_charge_id=$5,stripe_balance_transaction_id=$6,settlement_livemode=$7
              WHERE session_id=$1 AND net_revenue_micros IS NULL`,[sessionId,settlement.processorFeeAmount,
              settlement.taxAmount,settlement.netRevenueMicros,settlement.stripeChargeId,
              settlement.stripeBalanceTransactionId,settlement.livemode]);
          }else if(Number(p.processor_fee_amount)!==settlement.processorFeeAmount||Number(p.tax_amount)!==settlement.taxAmount||
            Number(p.net_revenue_micros)!==settlement.netRevenueMicros||p.stripe_charge_id!==settlement.stripeChargeId||
            p.stripe_balance_transaction_id!==settlement.stripeBalanceTransactionId||p.settlement_livemode!==settlement.livemode)
            throw new Error('PURCHASE_SETTLEMENT_CONFLICT');
        }
        return {...w, duplicate:true};
      }
      await c.query(`INSERT INTO vv_ai_purchase(session_id,user_id,payment_intent,credits,amount,currency,
        processor_fee_amount,tax_amount,net_revenue_micros,settlement_verified_at,stripe_charge_id,
        stripe_balance_transaction_id,settlement_livemode)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $9::bigint IS NULL THEN NULL ELSE NOW() END,$10,$11,$12)`,
        [sessionId,userId,paymentIntent,credits,amount,currency,verified?settlement.processorFeeAmount:null,
         verified?settlement.taxAmount:null,verified?settlement.netRevenueMicros:null,
         verified?settlement.stripeChargeId:null,verified?settlement.stripeBalanceTransactionId:null,
         verified?settlement.livemode:null]);
      const paidDebt=Math.min(w.debt,credits);
      return this.change(c,userId,w,sessionId,sessionId.startsWith('in_')?'subscription_grant':'purchase',credits-paidDebt,0,-paidDebt);
    });
  }
  async grantOnce({userId,kind='welcome',credits}) {
    identifier(userId); identifier(kind); integer(credits,'CREDITS',10_000_000);
    return this.transaction(userId,async(c,w)=>{
      const old=await c.query('SELECT * FROM vv_ai_grant WHERE user_id=$1 AND kind=$2',[userId,kind]);
      if(old.rows.length)return {...w,duplicate:true,granted:Number(old.rows[0].credits)};
      await c.query('INSERT INTO vv_ai_grant(user_id,kind,credits) VALUES($1,$2,$3)',[userId,kind,credits]);
      const debtPaid=Math.min(w.debt,credits),ledgerKind=kind.startsWith('subscription:')?'subscription_grant':'welcome_grant',next=await this.change(c,userId,w,kind,ledgerKind,credits-debtPaid,0,-debtPaid);
      return {...next,duplicate:false,granted:credits};
    });
  }
  async reserve({userId,jobId,credits,fingerprint}) {
    identifier(jobId); identifier(fingerprint); integer(credits,'CREDITS',10_000_000);
    return this.transaction(userId,async(c,w) => {
      const old = await c.query('SELECT * FROM vv_ai_reservation WHERE job_id=$1', [jobId]);
      if (old.rows.length) {
        const p=old.rows[0];
        if (p.user_id!==userId || p.credits!==credits || p.fingerprint!==fingerprint) throw new Error('RESERVATION_CONFLICT');
        return {...w,duplicate:true,status:p.status};
      }
      if (w.debt || w.available<credits) throw new Error('INSUFFICIENT_AI_CREDITS');
      await c.query('INSERT INTO vv_ai_reservation(job_id,user_id,credits,fingerprint,status) VALUES($1,$2,$3,$4,$5)', [jobId,userId,credits,fingerprint,'held']);
      return this.change(c,userId,w,jobId,'reserve',-credits,credits);
    });
  }
  async settle({userId,jobId,outcome,actualCredits}) {
    identifier(jobId);
    if (!['success','confirmed_failure','unknown'].includes(outcome)) throw new Error('INVALID_OUTCOME');
    // Only a trusted server-side final usage quote may supply actualCredits.
    // Older callers omit it and still capture the full reservation.
    if (actualCredits!==undefined&&(outcome!=='success'||!Number.isSafeInteger(actualCredits)||actualCredits<1))
      throw new Error('INVALID_ACTUAL_CREDITS');
    return this.transaction(userId,async(c,w) => {
      const {rows} = await c.query('SELECT * FROM vv_ai_reservation WHERE job_id=$1 AND user_id=$2', [jobId,userId]);
      if (!rows.length) throw new Error('RESERVATION_NOT_FOUND');
      const p=rows[0],reserved=Number(p.credits);
      if (actualCredits!==undefined&&actualCredits>reserved) throw new Error('INVALID_ACTUAL_CREDITS');
      if (outcome==='unknown') return {...w,status:p.status};
      if (p.status!=='held') {
        // A failed job has already returned its reserved credits. Never let
        // a delayed success/recovery callback report a second paid capture:
        // Studio marks the result ready when this promise resolves. This also
        // applies when older callers omit the optional actualCredits amount.
        if (outcome==='success'&&p.status==='released') throw new Error('SETTLEMENT_ALREADY_RELEASED');
        // An explicit retry at a different final amount must never silently
        // accept a prior capture. The existing captured ledger row durably
        // records returned surplus (available_delta - debt_delta), even when
        // a concurrent Stripe refund left the user in debt.
        if (outcome==='success'&&actualCredits!==undefined) {
          if (p.status!=='captured') throw new Error('SETTLEMENT_ALREADY_RELEASED');
          const prior=await c.query("SELECT available_delta,debt_delta FROM vv_ai_ledger WHERE user_id=$1 AND reference=$2 AND kind='captured' ORDER BY id DESC LIMIT 2",[userId,jobId]);
          if (prior.rows.length!==1) throw new Error('SETTLEMENT_AUDIT_MISSING');
          const returned=Number(prior.rows[0].available_delta)-Number(prior.rows[0].debt_delta);
          if (!Number.isSafeInteger(returned)||returned<0||returned>reserved||actualCredits!==reserved-returned)
            throw new Error('SETTLEMENT_AMOUNT_CONFLICT');
        }
        return {...w,status:p.status};
      }
      const refund=outcome==='confirmed_failure';
      const charge=refund?0:(actualCredits===undefined?reserved:actualCredits);
      const remainder=reserved-charge;
      // Refund surplus first against any outstanding payment debt. Otherwise
      // a disputed/refunded checkout could manufacture spendable credits.
      const debtPaid=Math.min(w.debt,remainder),status=refund?'released':'captured';
      await c.query('UPDATE vv_ai_reservation SET status=$2 WHERE job_id=$1', [jobId,status]);
      const balance=await this.change(c,userId,w,jobId,status,remainder-debtPaid,-reserved,-debtPaid);
      return {...balance,status,...(refund?{}:{capturedCredits:charge,returnedCredits:remainder})};
    });
  }
  // Stripe cumulative refunded amount makes out-of-order / duplicate events harmless.
  async refund(paymentIntent, cumulativeAmount, evidence={}) {
    identifier(paymentIntent); integer(cumulativeAmount,'AMOUNT',100_000_000);
    if(typeof evidence.eventId!=='string'||!/^evt_[A-Za-z0-9]+$/.test(evidence.eventId)||
       typeof evidence.chargeId!=='string'||!/^ch_[A-Za-z0-9]+$/.test(evidence.chargeId)||
       typeof evidence.livemode!=='boolean')throw new Error('AI_REFUND_EVIDENCE_REQUIRED');
    await this.init();
    const lookup=await this.pool.query('SELECT user_id FROM vv_ai_purchase WHERE payment_intent=$1',[paymentIntent]);
    if (!lookup.rows.length) return {ignored:true};
    const userId=lookup.rows[0].user_id;
    return this.transaction(userId,async(c,w) => {
      const {rows}=await c.query('SELECT * FROM vv_ai_purchase WHERE payment_intent=$1',[paymentIntent]); const p=rows[0];
      if (cumulativeAmount>p.amount) throw new Error('REFUND_AMOUNT_MISMATCH');
      if(p.settlement_livemode!=null&&p.settlement_livemode!==evidence.livemode)throw new Error('AI_REFUND_MODE_MISMATCH');
      if(p.stripe_charge_id&&p.stripe_charge_id!==evidence.chargeId)throw new Error('AI_REFUND_CHARGE_MISMATCH');
      const inserted=await c.query(`INSERT INTO vv_ai_refund_event(event_id,payment_intent,stripe_charge_id,cumulative_amount,livemode)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id) DO NOTHING RETURNING event_id`,
        [evidence.eventId,paymentIntent,evidence.chargeId,cumulativeAmount,evidence.livemode]);
      if(!inserted.rows.length)return {...w,duplicate:true};
      if (cumulativeAmount<=p.refunded_amount) return {...w,duplicate:true,outOfOrder:true};
      const ceilShare=amount=>Number((BigInt(p.credits)*BigInt(amount)+BigInt(p.amount)-1n)/BigInt(p.amount));
      const revoke=ceilShare(cumulativeAmount)-ceilShare(p.refunded_amount);
      await c.query('UPDATE vv_ai_purchase SET refunded_amount=$2 WHERE payment_intent=$1',[paymentIntent,cumulativeAmount]);
      return this.change(c,userId,w,p.session_id,'payment_refund',-Math.min(w.available,revoke),0,Math.max(0,revoke-w.available));
    });
  }
  async adjust({userId,adjustmentId,ownerUserId,delta,reason}) {
    identifier(userId); identifier(adjustmentId); identifier(ownerUserId);
    if (!Number.isSafeInteger(delta) || delta===0 || Math.abs(delta)>1_000_000) throw new Error('INVALID_ADJUSTMENT');
    const note=String(reason||'').trim();
    if (note.length<3 || note.length>200) throw new Error('INVALID_ADJUSTMENT_REASON');
    return this.transaction(userId,async(c,w)=>{
      const old=await c.query('SELECT * FROM vv_ai_adjustment WHERE id=$1',[adjustmentId]);
      if(old.rows.length){
        const a=old.rows[0];
        if(a.user_id!==userId||a.owner_user_id!==ownerUserId||Number(a.delta)!==delta||a.reason!==note)throw new Error('ADJUSTMENT_CONFLICT');
        return {...w,duplicate:true};
      }
      if(delta<0&&w.available<Math.abs(delta))throw new Error('INSUFFICIENT_AVAILABLE_AI_CREDITS');
      await c.query('INSERT INTO vv_ai_adjustment(id,user_id,owner_user_id,delta,reason) VALUES($1,$2,$3,$4,$5)',[adjustmentId,userId,ownerUserId,delta,note]);
      return this.change(c,userId,w,adjustmentId,'owner_adjustment',delta,0,0);
    });
  }
  // Only the privileged provider-dispatch path may request a single-use proof.
  // It MUST be used together with the B-owned consent/model/quote authorization.
  // No call to this method starts or pays a provider. Existing reserve() is NOT proof.
  async preflightPurchasedMargin({userId,credits,providerCostMicros,currency}={}){
    if(!Number.isSafeInteger(credits)||credits<1||!Number.isSafeInteger(providerCostMicros)||providerCostMicros<1||
       !['eur','usd'].includes(currency))return false;
    await this.init();const c=await this.pool.connect();
    try{return await checkPurchasedGenerationMargin(c,{userId,credits,providerCostMicros,currency});}
    finally{c.release();}
  }
  async claimPurchasedDispatch({userId,jobId,kind,credits,fingerprint,modelId,provider,providerCostMicros,currency},{env=process.env}={}) {
    try {
      return await this.transaction(userId,async(c,w)=>claimPurchasedGeneration(c,{
        env,userId,jobId,kind,credits,fingerprint,modelId,provider,providerCostMicros,currency,wallet:w
      }));
    } catch (_) { throw Error('AI_PURCHASED_DISPATCH_NOT_AUTHORIZED'); }
  }
  // Agent B's trusted server-only P0 gate supplies requestFingerprint, while
  // the existing D wallet proof expects fingerprint. Keep one explicit,
  // privileged projection: never infer authorization from the user's JSON.
  // The B gate must validate user, consent, model and server quote first.
  purchasedDispatchVerifier({env=process.env}={}) {
    return async ({userId,jobId,kind,modelId,provider,requestFingerprint,credits,providerCostMicros,currency}={}) => {
      if (typeof requestFingerprint!=='string' || !requestFingerprint)
        throw Error('AI_PURCHASED_DISPATCH_NOT_AUTHORIZED');
      return this.claimPurchasedDispatch({
        userId,jobId,kind,modelId,provider,credits,fingerprint:requestFingerprint,providerCostMicros,currency
      },{env});
    };
  }
  async balance(userId) {
    identifier(userId); await this.init();
    const {rows}=await this.pool.query('SELECT available,reserved,debt FROM vv_ai_wallet WHERE user_id=$1',[userId]);
    return rows.length?{available:Number(rows[0].available),reserved:Number(rows[0].reserved),debt:Number(rows[0].debt)}:{available:0,reserved:0,debt:0};
  }
  async history(userId) {
    identifier(userId); await this.init();
    // Keep Stripe checkout/session refs and job IDs in the durable internal
    // ledger for idempotency/audit; expose only amounts/type/time to customers.
    const {rows}=await this.pool.query('SELECT kind,available_delta,reserved_delta,debt_delta,created_at FROM vv_ai_ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 50',[userId]);
    return rows.map(row=>({
      kind:row.kind,available_delta:row.available_delta,reserved_delta:row.reserved_delta,
      debt_delta:row.debt_delta,created_at:row.created_at
    }));
  }
}
