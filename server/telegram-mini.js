// Opt-in Telegram Mini App. Video bytes stay on the user's device.
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {pool} from './db.js';
export const TELEGRAM_MINI_TRIAL_LIMIT=5;
const enabled=process.env.TELEGRAM_MINI_ENABLED==='true';
const plans=[
 {id:'basic',name:'Basic',price:'$9 / month',credits:750},
 {id:'pro',name:'Pro',price:'$24 / month',credits:2250},
 {id:'business',name:'Business',price:'$99 / month',credits:15000},
 {id:'lifetime',name:'Lifetime',price:'€2,999 one time',credits:null}
];
export function verifyTelegramMiniInitData(raw,botToken,nowSeconds=Math.floor(Date.now()/1000)){
 if(typeof raw!=='string'||raw.length<12||raw.length>8192||!botToken)return null;
 const params=new URLSearchParams(raw);
 const hashes=params.getAll('hash'),users=params.getAll('user'),dates=params.getAll('auth_date');
 if(hashes.length!==1||users.length!==1||dates.length!==1)return null;
 if(!/^[0-9a-f]{64}$/i.test(hashes[0]))return null;
 const pairs=[];
 for(const [k,v] of params){if(k==='hash')continue;if(!/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(k)||params.getAll(k).length!==1)return null;pairs.push(k+'='+v);}
 pairs.sort();
 const secret=createHmac('sha256','WebAppData').update(botToken).digest();
 const expected=createHmac('sha256',secret).update(pairs.join('\n')).digest();
 if(!timingSafeEqual(expected,Buffer.from(hashes[0],'hex')))return null;
 const when=Number(dates[0]);
 if(!Number.isSafeInteger(when)||when>nowSeconds+60||when<nowSeconds-3600)return null;
 try{
  const u=JSON.parse(users[0]),id=String(u.id||'');
  return /^[1-9][0-9]{0,19}$/.test(id)?{id,firstName:String(u.first_name||'').slice(0,80)}:null;
 }catch{return null;}
}
async function state(id){
 const r=await pool.query('SELECT trial_used,active_job,active_started FROM vv_tg_mini_trials WHERE telegram_id=$1',[id]);
 const u=r.rows[0]||{};
 const used=Number(u.trial_used||0);
 return{limit:5,used,remaining:Math.max(0,5-used),busy:!!(u.active_job&&u.active_started&&new Date(u.active_started).getTime()>Date.now()-20*60*1000),plans};
}
export function installTelegramMini(app,{token}){
 if(!enabled||!token)return null;
 let ready=false;
 async function init(){
  if(!pool)throw Error('Telegram Mini App needs PostgreSQL');
  await pool.query('CREATE TABLE IF NOT EXISTS vv_tg_mini_trials(telegram_id TEXT PRIMARY KEY,trial_used INTEGER NOT NULL DEFAULT 0,active_job TEXT,active_started TIMESTAMPTZ,failed_refunds INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  ready=true;
 }
 const auth=(fn)=>async(req,res)=>{
  if(!ready)return res.status(503).json({error:'TELEGRAM_MINI_NOT_READY'});
  const user=verifyTelegramMiniInitData(req.get('X-Telegram-Init-Data'),token);
  if(!user)return res.status(401).json({error:'INVALID_TELEGRAM_SESSION'});
  try{
   await pool.query('INSERT INTO vv_tg_mini_trials(telegram_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);
   await fn(req,res,user);
  }catch(error){console.error('[telegram-mini]',error.message);res.status(503).json({error:'TELEGRAM_MINI_UNAVAILABLE'});}
 };
 app.get('/api/telegram-mini/session',auth(async(_req,res,user)=>res.json({...await state(user.id),firstName:user.firstName})));
 app.post('/api/telegram-mini/reserve',auth(async(req,res,user)=>{
  const mode=String(req.body?.mode||''),duration=Number(req.body?.duration);
  if(!['gentle','balanced','dynamic'].includes(mode)||!Number.isFinite(duration)||duration<0.3||duration>45)return res.status(400).json({error:'VIDEO_LIMIT_45_SECONDS'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const q=await client.query('SELECT trial_used,active_job,active_started FROM vv_tg_mini_trials WHERE telegram_id=$1 FOR UPDATE',[user.id]);
   const u=q.rows[0],busy=u.active_job&&u.active_started&&new Date(u.active_started).getTime()>Date.now()-20*60*1000;
   if(busy){await client.query('ROLLBACK');return res.status(409).json({error:'VIDEO_ALREADY_PROCESSING'});}
   if(u.trial_used>=5){await client.query('ROLLBACK');return res.status(402).json({error:'TRIAL_EXHAUSTED',plans});}
   const job=randomUUID();
   await client.query('UPDATE vv_tg_mini_trials SET trial_used=trial_used+1,active_job=$2,active_started=NOW() WHERE telegram_id=$1',[user.id,job]);
   await client.query('COMMIT');
   res.json({job,...await state(user.id)});
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
 }));
 app.post('/api/telegram-mini/finish',auth(async(req,res,user)=>{
  const job=String(req.body?.job||'');
  if(!/^[a-f0-9-]{36}$/i.test(job))return res.status(400).json({error:'INVALID_JOB'});
  await pool.query('UPDATE vv_tg_mini_trials SET active_job=NULL,active_started=NULL WHERE telegram_id=$1 AND active_job=$2',[user.id,job]);
  res.json(await state(user.id));
 }));
 app.post('/api/telegram-mini/fail',auth(async(req,res,user)=>{
  const job=String(req.body?.job||'');
  if(!/^[a-f0-9-]{36}$/i.test(job))return res.status(400).json({error:'INVALID_JOB'});
  // Maximum three refunded failures per account limits trivial reset abuse.
  await pool.query('UPDATE vv_tg_mini_trials SET trial_used=CASE WHEN failed_refunds<3 THEN GREATEST(0,trial_used-1) ELSE trial_used END,failed_refunds=failed_refunds+1,active_job=NULL,active_started=NULL WHERE telegram_id=$1 AND active_job=$2',[user.id,job]);
  res.json(await state(user.id));
 }));
 return {init};
}
