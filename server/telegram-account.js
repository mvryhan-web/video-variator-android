// One-time opt-in account link: authenticated web account -> private Telegram user.
// No Stripe customer details or payment secrets are changed.
import {createHash,randomBytes} from 'node:crypto';
import {pool} from './db.js';
export function stripeIsActive(u){
 return !!u && (u.plan==='lifetime'&&u.subscription_status==='lifetime'||['active','trialing'].includes(u.subscription_status));
}
export async function initTelegramAccountTables(){
 if(!pool)throw Error('Missing database');
 await pool.query("CREATE TABLE IF NOT EXISTS vv_tg_account_links(telegram_id TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE REFERENCES vv_users(id) ON DELETE CASCADE,linked_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE IF NOT EXISTS vv_tg_account_link_tokens(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES vv_users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL); CREATE INDEX IF NOT EXISTS vv_tg_account_link_tokens_expiry_idx ON vv_tg_account_link_tokens(expires_at);");
}
export async function linkedStripeAccess(telegramId){
 const r=await pool.query("SELECT u.plan,u.plan_limit,u.period_used,u.subscription_status,u.current_period_end FROM vv_tg_account_links l JOIN vv_users u ON u.id=l.user_id WHERE l.telegram_id=$1",[String(telegramId)]);
 const u=r.rows[0];if(!stripeIsActive(u))return null;
 const lifetime=u.plan==='lifetime'&&u.subscription_status==='lifetime';
 return {plan:u.plan,credits:lifetime?null:Number(u.plan_limit),used:lifetime?0:Number(u.period_used),remaining:lifetime?null:Math.max(0,Number(u.plan_limit)-Number(u.period_used)),expiresAt:u.current_period_end,source:'stripe'};
}
export async function linkedStarsAccess(userId){
 const r=await pool.query("SELECT a.plan,a.period_used,a.expires_at FROM vv_tg_account_links l JOIN vv_tg_star_access a ON a.telegram_id=l.telegram_id WHERE l.user_id=$1 AND (a.plan='lifetime' OR a.expires_at>NOW())",[userId]);
 const u=r.rows[0];if(!u)return null;
 const limit={basic:750,pro:2250,business:15000,lifetime:null}[u.plan];
 if(limit===undefined)return null;
 return{plan:u.plan,credits:limit,used:Number(u.period_used),remaining:limit===null?null:Math.max(0,limit-Number(u.period_used)),expiresAt:u.expires_at,source:'telegram'};
}
export async function linkedAccountId(telegramId){
 const q=await pool.query('SELECT user_id FROM vv_tg_account_links WHERE telegram_id=$1',[String(telegramId)]);
 return q.rows[0]?.user_id||null;
}
export async function createAccountLink(userId){
 const check=await pool.query('SELECT telegram_id FROM vv_tg_account_links WHERE user_id=$1',[userId]);
 if(check.rowCount)return {linked:true};
 const secret=randomBytes(24).toString('hex');
 const hash=createHash('sha256').update(secret).digest('hex');
 await pool.query("INSERT INTO vv_tg_account_link_tokens(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '10 minutes')",[hash,userId]);
 return {linked:false,url:'https://t.me/VideoUniqAppBot?start=a_'+secret};
}
export async function finishAccountLink(secret,telegramId){
 if(!/^[0-9a-f]{48}$/i.test(secret)||!/^[1-9][0-9]{0,19}$/.test(String(telegramId)))return false;
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const hash=createHash('sha256').update(secret).digest('hex');
  const item=await client.query("DELETE FROM vv_tg_account_link_tokens WHERE token_hash=$1 AND expires_at>NOW() RETURNING user_id",[hash]);
  const userId=item.rows[0]?.user_id;
  if(!userId){await client.query('ROLLBACK');return false;}
  const acc=await client.query('SELECT * FROM vv_users WHERE id=$1 FOR UPDATE',[userId]);
  if(!acc.rowCount){await client.query('ROLLBACK');return false;}
  const existing=await client.query('SELECT user_id,telegram_id FROM vv_tg_account_links WHERE telegram_id=$1 OR user_id=$2',[String(telegramId),userId]);
  if(existing.rowCount){await client.query('ROLLBACK');return false;}
  const stars=await client.query("SELECT 1 FROM vv_tg_star_access WHERE telegram_id=$1 AND (plan='lifetime' OR expires_at>NOW())",[String(telegramId)]);
  if(stripeIsActive(acc.rows[0])&&stars.rowCount){await client.query('ROLLBACK');return false;}
  await client.query('INSERT INTO vv_tg_account_links(telegram_id,user_id) VALUES($1,$2)',[String(telegramId),userId]);
  await client.query('COMMIT');return true;
 }catch(err){await client.query('ROLLBACK').catch(()=>{});console.error('[account-link]',err.message);return false;}
 finally{client.release();}
}
export function installTelegramAccountRoutes(app,{auth}){
 if(process.env.TELEGRAM_MINI_ENABLED!=='true')return;
 app.get('/api/telegram-mini/account-link',auth,async(req,res)=>{
  try{const q=await pool.query('SELECT telegram_id FROM vv_tg_account_links WHERE user_id=$1',[req.user.id]);res.json({linked:!!q.rowCount});}
  catch(err){res.status(503).json({error:'ACCOUNT_LINK_UNAVAILABLE'});}
 });
 app.post('/api/telegram-mini/account-link',auth,async(req,res)=>{
  try{res.json(await createAccountLink(req.user.id));}
  catch(err){console.error('[account-link]',err.message);res.status(503).json({error:'ACCOUNT_LINK_UNAVAILABLE'});}
 });
}
