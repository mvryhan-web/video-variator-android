// Five free local video previews within Telegram; no paid Telegram services.
// Digital subscriptions and Stripe checkout stay on the independent website.
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {pool} from './db.js';

export const TELEGRAM_FREE_LIMIT=5;
const enabled=process.env.TELEGRAM_FREE_MINI_ENABLED==='true';

export function verifyTelegramInitData(raw,token,now=Math.floor(Date.now()/1000)){
 if(typeof raw!=='string'||raw.length<10||raw.length>8192||!token)return null;
 const params=new URLSearchParams(raw),hashes=params.getAll('hash'),users=params.getAll('user'),dates=params.getAll('auth_date');
 if(hashes.length!==1||users.length!==1||dates.length!==1||!/^[a-f0-9]{64}$/i.test(hashes[0]))return null;
 const data=[];
 for(const [key,value] of params){
  if(key==='hash')continue;
  if(!/^[a-z_][a-z0-9_]*$/i.test(key)||params.getAll(key).length!==1)return null;
  data.push(key+'='+value);
 }
 data.sort();
 const secret=createHmac('sha256','WebAppData').update(token).digest();
 const signed=createHmac('sha256',secret).update(data.join('\n')).digest();
 if(!timingSafeEqual(signed,Buffer.from(hashes[0],'hex')))return null;
 const timestamp=Number(dates[0]);
 if(!Number.isSafeInteger(timestamp)||timestamp>now+60||timestamp<now-3600)return null;
 try{
  const user=JSON.parse(users[0]),id=String(user.id||'');
  if(!/^[1-9][0-9]{0,19}$/.test(id))return null;
  return{id};
 }catch{return null;}
}
const activeJob=row=>!!(row?.active_job&&row?.active_started&&new Date(row.active_started).getTime()>Date.now()-20*60*1000);
const state=async(id)=>{
 const q=await pool.query('SELECT used,active_job,active_started FROM vv_telegram_free_trials WHERE telegram_id=$1',[id]);
 const v=q.rows[0]||{},used=Number(v.used||0);
 return{limit:TELEGRAM_FREE_LIMIT,used,remaining:Math.max(0,TELEGRAM_FREE_LIMIT-used),busy:activeJob(v)};
};
export function installTelegramFreeMini(app,{token}){
 if(!enabled||!token)return null;
 let ready=false;
 async function init(){
  if(!pool)throw Error('Telegram free previews require the existing Postgres database');
  await pool.query('CREATE TABLE IF NOT EXISTS vv_telegram_free_trials (telegram_id TEXT PRIMARY KEY,used INTEGER NOT NULL DEFAULT 0 CHECK(used>=0 AND used<=5),refunds INTEGER NOT NULL DEFAULT 0,active_job TEXT,active_started TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  ready=true;
 }
 const auth=fn=>async(req,res)=>{
  if(!ready)return res.status(503).json({error:'TELEGRAM_PREVIEW_NOT_READY'});
  const user=verifyTelegramInitData(req.get('X-Telegram-Init-Data'),token);
  if(!user)return res.status(401).json({error:'TELEGRAM_SESSION_REQUIRED'});
  try{
   await pool.query('INSERT INTO vv_telegram_free_trials(telegram_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);
   await fn(req,res,user.id);
  }catch(error){
   console.error('[telegram-free-preview]',error.message);
   if(!res.headersSent)res.status(503).json({error:'TELEGRAM_PREVIEW_UNAVAILABLE'});
  }
 };
 app.get('/api/telegram-preview/session',auth(async(req,res,id)=>res.json(await state(id))));
 app.post('/api/telegram-preview/reserve',auth(async(req,res,id)=>{
  const mode=String(req.body?.mode||''),duration=Number(req.body?.duration);
  if(!['gentle','balanced','dynamic'].includes(mode)||!Number.isFinite(duration)||duration<0.3||duration>45)
   return res.status(400).json({error:'VIDEO_LIMIT_45_SECONDS'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const row=(await client.query('SELECT used,active_job,active_started FROM vv_telegram_free_trials WHERE telegram_id=$1 FOR UPDATE',[id])).rows[0];
   if(activeJob(row)){await client.query('ROLLBACK');return res.status(409).json({error:'ALREADY_PROCESSING'});}
   if(Number(row.used)>=TELEGRAM_FREE_LIMIT){await client.query('ROLLBACK');return res.status(402).json({error:'FREE_TRIAL_COMPLETE'});}
   const job=randomUUID();
   await client.query('UPDATE vv_telegram_free_trials SET used=used+1,active_job=$2,active_started=NOW() WHERE telegram_id=$1',[id,job]);
   await client.query('COMMIT');
   res.json({job,...await state(id)});
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
 }));
 app.post('/api/telegram-preview/finish',auth(async(req,res,id)=>{
  const job=String(req.body?.job||'');
  if(!/^[a-f0-9-]{36}$/i.test(job))return res.status(400).json({error:'INVALID_JOB'});
  await pool.query('UPDATE vv_telegram_free_trials SET active_job=NULL,active_started=NULL WHERE telegram_id=$1 AND active_job=$2',[id,job]);
  res.json(await state(id));
 }));
 app.post('/api/telegram-preview/fail',auth(async(req,res,id)=>{
  const job=String(req.body?.job||'');
  if(!/^[a-f0-9-]{36}$/i.test(job))return res.status(400).json({error:'INVALID_JOB'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('UPDATE vv_telegram_free_trials SET used=CASE WHEN refunds<3 THEN GREATEST(0,used-1) ELSE used END,refunds=refunds+1,active_job=NULL,active_started=NULL WHERE telegram_id=$1 AND active_job=$2',[id,job]);
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
  res.json(await state(id));
 }));
 return{init};
}

