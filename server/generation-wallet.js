import {claimPurchasedGeneration} from './generation-purchased-proof.js';
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
        currency TEXT NOT NULL, refunded_amount INTEGER NOT NULL DEFAULT 0 CHECK(refunded_amount>=0));
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
  async grant({userId,sessionId,paymentIntent,credits,amount,currency,allowHistoricalSubscriptionReplay=false}) {
    identifier(sessionId); identifier(paymentIntent); integer(credits,'CREDITS',10_000_000); integer(amount,'AMOUNT',100_000_000);
    if (!/^[a-z]{3}$/.test(currency)) throw new Error('INVALID_CURRENCY');
    return this.transaction(userId, async(c,w) => {
      const old = await c.query('SELECT * FROM vv_ai_purchase WHERE session_id=$1', [sessionId]);
      if (old.rows.length) {
        const p=old.rows[0];
        if (p.user_id!==userId || p.payment_intent!==paymentIntent || p.amount!==amount || p.currency!==currency ||
            (p.credits!==credits && !(allowHistoricalSubscriptionReplay && sessionId.startsWith('in_')))) throw new Error('PURCHASE_CONFLICT');
        return {...w, duplicate:true};
      }
      await c.query('INSERT INTO vv_ai_purchase(session_id,user_id,payment_intent,credits,amount,currency) VALUES($1,$2,$3,$4,$5,$6)', [sessionId,userId,paymentIntent,credits,amount,currency]);
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
  async refund(paymentIntent, cumulativeAmount) {
    identifier(paymentIntent); integer(cumulativeAmount,'AMOUNT',100_000_000); await this.init();
    const lookup=await this.pool.query('SELECT user_id FROM vv_ai_purchase WHERE payment_intent=$1',[paymentIntent]);
    if (!lookup.rows.length) return {ignored:true};
    const userId=lookup.rows[0].user_id;
    return this.transaction(userId,async(c,w) => {
      const {rows}=await c.query('SELECT * FROM vv_ai_purchase WHERE payment_intent=$1',[paymentIntent]); const p=rows[0];
      if (cumulativeAmount>p.amount) throw new Error('REFUND_AMOUNT_MISMATCH');
      if (cumulativeAmount<=p.refunded_amount) return {...w,duplicate:true};
      const revoke=Math.ceil(p.credits*cumulativeAmount/p.amount)-Math.ceil(p.credits*p.refunded_amount/p.amount);
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
  async claimPurchasedDispatch({userId,jobId,kind,credits,fingerprint,modelId,provider},{env=process.env}={}) {
    try {
      return await this.transaction(userId,async(c,w)=>claimPurchasedGeneration(c,{
        env,userId,jobId,kind,credits,fingerprint,modelId,provider,wallet:w
      }));
    } catch (_) { throw Error('AI_PURCHASED_DISPATCH_NOT_AUTHORIZED'); }
  }
  // Agent B's trusted server-only P0 gate supplies requestFingerprint, while
  // the existing D wallet proof expects fingerprint. Keep one explicit,
  // privileged projection: never infer authorization from the user's JSON.
  // The B gate must validate user, consent, model and server quote first.
  purchasedDispatchVerifier({env=process.env}={}) {
    return async ({userId,jobId,kind,modelId,provider,requestFingerprint,credits}={}) => {
      if (typeof requestFingerprint!=='string' || !requestFingerprint)
        throw Error('AI_PURCHASED_DISPATCH_NOT_AUTHORIZED');
      return this.claimPurchasedDispatch({
        userId,jobId,kind,modelId,provider,credits,fingerprint:requestFingerprint
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
