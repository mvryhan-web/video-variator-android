import pg from 'pg';
import { randomUUID } from 'node:crypto';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL || '';
export const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
}) : null;

export async function initDb(){
  if(!pool){ console.warn('[db] DATABASE_URL is not configured; account persistence is disabled.'); return; }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vv_users (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_sub TEXT NOT NULL,
      email TEXT,
      name TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      plan TEXT NOT NULL DEFAULT 'trial',
      plan_limit INTEGER NOT NULL DEFAULT 2,
      period_used INTEGER NOT NULL DEFAULT 0,
      trial_used INTEGER NOT NULL DEFAULT 0,
      subscription_status TEXT NOT NULL DEFAULT 'inactive',
      current_period_end TIMESTAMPTZ,
      has_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, provider_sub)
    );
    CREATE TABLE IF NOT EXISTS vv_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES vv_users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      source_name TEXT,
      resolution TEXT,
      saved BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS vv_history_user_created_idx ON vv_history(user_id, created_at DESC);
  `);
}

function requireDb(){ if(!pool) throw new Error('DATABASE_NOT_CONFIGURED'); }

export async function upsertUser({provider,providerSub,email,name}){
  requireDb();
  const existing=await pool.query('SELECT * FROM vv_users WHERE provider=$1 AND provider_sub=$2',[provider,providerSub]);
  if(existing.rows[0]){
    const r=await pool.query(`UPDATE vv_users SET email=COALESCE($3,email),name=COALESCE($4,name),updated_at=NOW() WHERE provider=$1 AND provider_sub=$2 RETURNING *`,[provider,providerSub,email||null,name||null]);
    return r.rows[0];
  }
  const id=randomUUID();
  const r=await pool.query(`INSERT INTO vv_users(id,provider,provider_sub,email,name) VALUES($1,$2,$3,$4,$5) RETURNING *`,[id,provider,providerSub,email||null,name||null]);
  return r.rows[0];
}

export async function getUser(id){requireDb();const r=await pool.query('SELECT * FROM vv_users WHERE id=$1',[id]);return r.rows[0]||null;}
export async function getUserByCustomer(customerId){requireDb();const r=await pool.query('SELECT * FROM vv_users WHERE stripe_customer_id=$1',[customerId]);return r.rows[0]||null;}
export async function getUserBySubscription(subscriptionId){requireDb();const r=await pool.query('SELECT * FROM vv_users WHERE stripe_subscription_id=$1',[subscriptionId]);return r.rows[0]||null;}

export function publicUser(user){
  if(!user)return null;
  const active=['active','trialing'].includes(user.subscription_status);
  const limit=active?user.plan_limit:2;
  const used=active?user.period_used:user.trial_used;
  return {id:user.id,email:user.email,name:user.name,usage:{plan:active?user.plan:'trial',limit,used,remaining:Math.max(0,limit-used),active,status:user.subscription_status,currentPeriodEnd:user.current_period_end}};
}

export async function setStripeCustomer(userId,customerId){requireDb();await pool.query('UPDATE vv_users SET stripe_customer_id=$2,updated_at=NOW() WHERE id=$1',[userId,customerId]);}

export async function applySubscription({userId,customerId,subscriptionId,plan,status,currentPeriodEnd,markSubscribed=false}){
  requireDb();
  const limits={basic:50,pro:150,business:1000};
  if(!limits[plan])throw new Error('INVALID_PLAN');
  await pool.query(`UPDATE vv_users SET stripe_customer_id=COALESCE($2,stripe_customer_id),stripe_subscription_id=COALESCE($3,stripe_subscription_id),plan=$4,plan_limit=$5,subscription_status=$6,current_period_end=$7,has_subscribed=CASE WHEN $8 THEN TRUE ELSE has_subscribed END,updated_at=NOW() WHERE id=$1`,[userId,customerId||null,subscriptionId||null,plan,limits[plan],status||'active',currentPeriodEnd||null,markSubscribed]);
}

export async function updateSubscriptionByStripeId({subscriptionId,status,currentPeriodEnd}){
  requireDb();
  await pool.query('UPDATE vv_users SET subscription_status=$2,current_period_end=$3,updated_at=NOW() WHERE stripe_subscription_id=$1',[subscriptionId,status,currentPeriodEnd||null]);
}

export async function resetPeriodUsageBySubscription(subscriptionId){requireDb();await pool.query('UPDATE vv_users SET period_used=0,updated_at=NOW() WHERE stripe_subscription_id=$1',[subscriptionId]);}

export async function consumeUsage(userId,count){
  requireDb();count=Math.max(1,Math.min(1000,Number(count)||1));
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const q=await client.query('SELECT * FROM vv_users WHERE id=$1 FOR UPDATE',[userId]);const u=q.rows[0];if(!u)throw new Error('USER_NOT_FOUND');
    const active=['active','trialing'].includes(u.subscription_status);
    const limit=active?u.plan_limit:2,used=active?u.period_used:u.trial_used;
    if(used+count>limit){const e=new Error('CREDIT_LIMIT_REACHED');e.code='CREDIT_LIMIT_REACHED';throw e;}
    if(active)await client.query('UPDATE vv_users SET period_used=period_used+$2,updated_at=NOW() WHERE id=$1',[userId,count]);
    else await client.query('UPDATE vv_users SET trial_used=trial_used+$2,updated_at=NOW() WHERE id=$1',[userId,count]);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  return getUser(userId);
}

export async function addHistory(userId,item){
  requireDb();
  await pool.query(`INSERT INTO vv_history(id,user_id,name,source_name,resolution,saved,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,[item.id||randomUUID(),userId,item.name,item.sourceName||null,item.resolution||null,item.saved!==false,item.createdAt||new Date()]);
}

export async function listHistory(userId){requireDb();const r=await pool.query('SELECT id,name,source_name AS "sourceName",resolution,saved,created_at AS "createdAt" FROM vv_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[userId]);return r.rows;}
export async function clearHistory(userId){requireDb();await pool.query('DELETE FROM vv_history WHERE user_id=$1',[userId]);}
