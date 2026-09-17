import pg from 'pg';
import { randomUUID } from 'node:crypto';

const {Pool}=pg;
const databaseUrl=process.env.DATABASE_URL||'';
const adminEmail=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
export const pool=databaseUrl?new Pool({connectionString:databaseUrl,ssl:process.env.DATABASE_SSL==='false'?false:{rejectUnauthorized:false}}):null;

function isAdminUser(user){
  return !!(user&&adminEmail&&user.provider==='google'&&String(user.email||'').trim().toLowerCase()===adminEmail);
}

export async function initDb(){
  if(!pool){console.warn('[db] DATABASE_URL is not configured; account persistence is disabled.');return;}
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
    ALTER TABLE vv_history ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE vv_history ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE vv_history ADD COLUMN IF NOT EXISTS aspect_ratio TEXT;
    CREATE INDEX IF NOT EXISTS vv_history_user_created_idx ON vv_history(user_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS vv_events (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES vv_users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      category TEXT,
      message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS vv_events_user_created_idx ON vv_events(user_id,created_at DESC);
  `);
}
function requireDb(){if(!pool)throw new Error('DATABASE_NOT_CONFIGURED');}

export async function upsertUser({provider,providerSub,email,name}){requireDb();const existing=await pool.query('SELECT * FROM vv_users WHERE provider=$1 AND provider_sub=$2',[provider,providerSub]);if(existing.rows[0]){const r=await pool.query(`UPDATE vv_users SET email=COALESCE($3,email),name=COALESCE($4,name),updated_at=NOW() WHERE provider=$1 AND provider_sub=$2 RETURNING *`,[provider,providerSub,email||null,name||null]);return r.rows[0];}const id=randomUUID();const r=await pool.query(`INSERT INTO vv_users(id,provider,provider_sub,email,name) VALUES($1,$2,$3,$4,$5) RETURNING *`,[id,provider,providerSub,email||null,name||null]);return r.rows[0];}
export async function getUser(id){requireDb();const r=await pool.query('SELECT * FROM vv_users WHERE id=$1',[id]);return r.rows[0]||null;}
export async function getUserByCustomer(customerId){requireDb();const r=await pool.query('SELECT * FROM vv_users WHERE stripe_customer_id=$1',[customerId]);return r.rows[0]||null;}
export async function getUserBySubscription(subscriptionId){requireDb();const r=await pool.query('SELECT * FROM vv_users WHERE stripe_subscription_id=$1',[subscriptionId]);return r.rows[0]||null;}

export function publicUser(user){
  if(!user)return null;
  const admin=isAdminUser(user);
  if(admin){
    return{id:user.id,email:user.email,name:user.name,isAdmin:true,usage:{plan:'business',limit:1000000000,used:0,remaining:1000000000,active:true,unlimited:true,unit:'credits',status:'admin',currentPeriodEnd:null}};
  }
  const active=['active','trialing'].includes(user.subscription_status),limit=active?user.plan_limit:2,used=active?user.period_used:user.trial_used;
  return{id:user.id,email:user.email,name:user.name,isAdmin:false,usage:{plan:active?user.plan:'trial',limit,used,remaining:Math.max(0,limit-used),active,unlimited:false,unit:active?'credits':'videos',status:user.subscription_status,currentPeriodEnd:user.current_period_end}};
}

export async function setStripeCustomer(userId,customerId){requireDb();await pool.query('UPDATE vv_users SET stripe_customer_id=$2,updated_at=NOW() WHERE id=$1',[userId,customerId]);}
export async function applySubscription({userId,customerId,subscriptionId,plan,status,currentPeriodEnd,markSubscribed=false}){requireDb();const limits={basic:750,pro:2250,business:15000};if(!limits[plan])throw new Error('INVALID_PLAN');await pool.query(`UPDATE vv_users SET stripe_customer_id=COALESCE($2,stripe_customer_id),stripe_subscription_id=COALESCE($3,stripe_subscription_id),plan=$4,plan_limit=$5,subscription_status=$6,current_period_end=$7,has_subscribed=CASE WHEN $8 THEN TRUE ELSE has_subscribed END,updated_at=NOW() WHERE id=$1`,[userId,customerId||null,subscriptionId||null,plan,limits[plan],status||'active',currentPeriodEnd||null,markSubscribed]);}
export async function updateSubscriptionByStripeId({subscriptionId,status,currentPeriodEnd}){requireDb();await pool.query('UPDATE vv_users SET subscription_status=$2,current_period_end=$3,updated_at=NOW() WHERE stripe_subscription_id=$1',[subscriptionId,status,currentPeriodEnd||null]);}
export async function resetPeriodUsageBySubscription(subscriptionId){requireDb();await pool.query('UPDATE vv_users SET period_used=0,updated_at=NOW() WHERE stripe_subscription_id=$1',[subscriptionId]);}

export async function consumeUsage(userId,{seconds=0,sourceCount=0}={}){
  requireDb();const safeSeconds=Math.max(0,Math.min(10000000,Math.ceil(Number(seconds)||0))),safeSources=Math.max(0,Math.min(1000,Math.ceil(Number(sourceCount)||0)));const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const q=await client.query('SELECT * FROM vv_users WHERE id=$1 FOR UPDATE',[userId]),u=q.rows[0];if(!u)throw new Error('USER_NOT_FOUND');
    if(isAdminUser(u)){await client.query('COMMIT');return u;}
    const active=['active','trialing'].includes(u.subscription_status),limit=active?u.plan_limit:2,used=active?u.period_used:u.trial_used,cost=active?safeSeconds:safeSources;
    if(cost<1)throw new Error('INVALID_USAGE');if(used+cost>limit){const e=new Error('CREDIT_LIMIT_REACHED');e.code='CREDIT_LIMIT_REACHED';throw e;}
    if(active)await client.query('UPDATE vv_users SET period_used=period_used+$2,updated_at=NOW() WHERE id=$1',[userId,cost]);else await client.query('UPDATE vv_users SET trial_used=trial_used+$2,updated_at=NOW() WHERE id=$1',[userId,cost]);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  return getUser(userId);
}

export async function addHistory(userId,item){requireDb();await pool.query(`INSERT INTO vv_history(id,user_id,name,source_name,resolution,saved,created_at,duration_seconds,credits,aspect_ratio) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO NOTHING`,[item.id||randomUUID(),userId,item.name,item.sourceName||null,item.resolution||null,item.saved!==false,item.createdAt||new Date(),Math.max(0,Number(item.durationSeconds)||0),Math.max(0,Number(item.credits)||0),item.aspectRatio||null]);}
export async function listHistory(userId){requireDb();const r=await pool.query('SELECT id,name,source_name AS "sourceName",resolution,saved,created_at AS "createdAt",duration_seconds AS "durationSeconds",credits,aspect_ratio AS "aspectRatio" FROM vv_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[userId]);return r.rows;}
export async function clearHistory(userId){requireDb();await pool.query('DELETE FROM vv_history WHERE user_id=$1',[userId]);}
export async function addEvent(userId,{type='event',category=null,message=null}={}){requireDb();await pool.query('INSERT INTO vv_events(id,user_id,event_type,category,message) VALUES($1,$2,$3,$4,$5)',[randomUUID(),userId||null,String(type).slice(0,40),category?String(category).slice(0,80):null,message?String(message).slice(0,240):null]);}
export async function getAnalytics(userId){requireDb();const [h,e]=await Promise.all([pool.query(`SELECT COUNT(*)::int AS outputs,COALESCE(SUM(credits),0)::int AS credits,COALESCE(SUM(duration_seconds),0)::int AS seconds FROM vv_history WHERE user_id=$1`,[userId]),pool.query(`SELECT COUNT(*) FILTER (WHERE event_type='processing_success')::int AS successes,COUNT(*) FILTER (WHERE event_type='processing_attempt')::int AS attempts,COUNT(*) FILTER (WHERE event_type='error')::int AS errors FROM vv_events WHERE user_id=$1`,[userId])]);return{outputs:h.rows[0].outputs||0,credits:h.rows[0].credits||0,seconds:h.rows[0].seconds||0,successes:e.rows[0].successes||0,attempts:e.rows[0].attempts||0,errors:e.rows[0].errors||0};}
