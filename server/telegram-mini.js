// Opt-in Telegram Mini App. Video bytes stay on the user's device.
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {pool} from './db.js';
import {initStars,starsAccess,starsPlans,createStarsInvoice,processStarsUpdate} from './telegram-stars.js';
import {initTelegramAccountTables,linkedStripeAccess,linkedAccountId,createAccountLink} from './telegram-account.js';
import {jwtVerify} from 'jose';
import {getUser} from './db.js';
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
 const used=Number(u.trial_used||0),paid=(await linkedStripeAccess(id))||(await starsAccess(id));
 const priced=starsPlans();
 return{limit:5,used,remaining:Math.max(0,5-used),paid,busy:!!(u.active_job&&u.active_started&&new Date(u.active_started).getTime()>Date.now()-20*60*1000),plans:plans.map(p=>({...p,stars:priced.find(v=>v.id===p.id)?.stars??null}))};
}
export function installTelegramMini(app,{token}){
 if(!enabled||!token)return null;
 let ready=false;
 async function init(){
  if(!pool)throw Error('Telegram Mini App needs PostgreSQL');
  await pool.query('CREATE TABLE IF NOT EXISTS vv_tg_mini_trials(telegram_id TEXT PRIMARY KEY,trial_used INTEGER NOT NULL DEFAULT 0,active_job TEXT,active_started TIMESTAMPTZ,failed_refunds INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); ALTER TABLE vv_tg_mini_trials ADD COLUMN IF NOT EXISTS active_kind TEXT NOT NULL DEFAULT \'trial\'; ALTER TABLE vv_tg_mini_trials ADD COLUMN IF NOT EXISTS active_paid_cost INTEGER NOT NULL DEFAULT 0;');
  await initStars();
  await initTelegramAccountTables();
  ready=true;
 }
 const accountAuth=async(req,res,next)=>{
  try{
   if(!ready)return res.status(503).json({error:'TELEGRAM_MINI_NOT_READY'});
   const raw=String(req.get('Authorization')||'').replace(/^Bearer\s+/i,'');
   if(!raw||!process.env.APP_JWT_SECRET)return res.status(401).json({error:'AUTH_REQUIRED'});
   const secret=new TextEncoder().encode(process.env.APP_JWT_SECRET);
   const {payload}=await jwtVerify(raw,secret,{issuer:'video-variator',audience:'video-variator-client'});
   const account=await getUser(payload.sub);
   if(!account)return res.status(401).json({error:'INVALID_SESSION'});
   req.telegramLinkAccount=account;
   next();
  }catch(e){res.status(401).json({error:'INVALID_SESSION'});}
 };
 app.get('/api/telegram-mini/account-link',accountAuth,async(req,res)=>{
  try{const telegram=await pool.query('SELECT telegram_id FROM vv_tg_account_links WHERE user_id=$1',[req.telegramLinkAccount.id]);res.json({linked:telegram.rowCount>0});}
  catch(e){res.status(503).json({error:'ACCOUNT_LINK_UNAVAILABLE'});}
 });
 app.post('/api/telegram-mini/account-link',accountAuth,async(req,res)=>{
  try{res.json(await createAccountLink(req.telegramLinkAccount.id));}
  catch(e){console.error('[account-link]',e.message);res.status(503).json({error:'ACCOUNT_LINK_UNAVAILABLE'});}
 });
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
 app.post('/api/telegram-mini/checkout',auth(async(req,res,user)=>{const invoice=await createStarsInvoice(token,user.id,String(req.body?.plan||''));if(invoice.error)return res.status(invoice.status||400).json({error:invoice.error});res.json(invoice);}));
 app.post('/api/telegram-mini/reserve',auth(async(req,res,user)=>{
  const mode=String(req.body?.mode||''),duration=Number(req.body?.duration);
  if(!['gentle','balanced','dynamic'].includes(mode)||!Number.isFinite(duration)||duration<0.3||duration>45)return res.status(400).json({error:'VIDEO_LIMIT_45_SECONDS'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const q=await client.query('SELECT trial_used,active_job,active_started FROM vv_tg_mini_trials WHERE telegram_id=$1 FOR UPDATE',[user.id]);
   const u=q.rows[0],busy=u.active_job&&u.active_started&&new Date(u.active_started).getTime()>Date.now()-20*60*1000;
   if(busy){await client.query('ROLLBACK');return res.status(409).json({error:'VIDEO_ALREADY_PROCESSING'});}
   const linked=await client.query("SELECT u.id,u.plan,u.plan_limit,u.period_used,u.subscription_status FROM vv_tg_account_links l JOIN vv_users u ON u.id=l.user_id WHERE l.telegram_id=$1 FOR UPDATE OF u",[user.id]);
   const web=linked.rows[0],activeWeb=web&&(web.plan==='lifetime'&&web.subscription_status==='lifetime'||['active','trialing'].includes(web.subscription_status));
   const paidQ=activeWeb?{rows:[]}:await client.query("SELECT plan,period_used FROM vv_tg_star_access WHERE telegram_id=$1 AND (plan='lifetime' OR expires_at>NOW()) FOR UPDATE",[user.id]);
   const paid=paidQ.rows[0],tiers={basic:750,pro:2250,business:15000,lifetime:null};
   let kind='trial',cost=0;
   if(activeWeb){
    const allowed={basic:['gentle'],pro:['gentle','balanced'],business:['gentle','balanced','dynamic'],lifetime:['gentle','balanced','dynamic']};
    if(!allowed[web.plan]?.includes(mode)){await client.query('ROLLBACK');return res.status(403).json({error:'MODE_REQUIRES_HIGHER_PLAN'});}
    kind='stripe';cost=Math.max(1,Math.ceil(duration));
    if(web.plan!=='lifetime'){
     if(Number(web.period_used)+cost>Number(web.plan_limit)){await client.query('ROLLBACK');return res.status(402).json({error:'CREDITS_EXHAUSTED'});}
     await client.query('UPDATE vv_users SET period_used=period_used+$2 WHERE id=$1',[web.id,cost]);
    }else cost=0;
   }else if(paid&&Object.prototype.hasOwnProperty.call(tiers,paid.plan)){
    const allowed={basic:['gentle'],pro:['gentle','balanced'],business:['gentle','balanced','dynamic'],lifetime:['gentle','balanced','dynamic']};
    if(!allowed[paid.plan].includes(mode)){await client.query('ROLLBACK');return res.status(403).json({error:'MODE_REQUIRES_HIGHER_PLAN'});}
    kind='paid';cost=Math.max(1,Math.ceil(duration));
    if(tiers[paid.plan]!==null&&Number(paid.period_used)+cost>tiers[paid.plan]){await client.query('ROLLBACK');return res.status(402).json({error:'CREDITS_EXHAUSTED',plans});}
    if(tiers[paid.plan]!==null)await client.query('UPDATE vv_tg_star_access SET period_used=period_used+$2 WHERE telegram_id=$1',[user.id,cost]);
   }else{
    if(u.trial_used>=5){await client.query('ROLLBACK');return res.status(402).json({error:'TRIAL_EXHAUSTED',plans});}
    await client.query('UPDATE vv_tg_mini_trials SET trial_used=trial_used+1 WHERE telegram_id=$1',[user.id]);
   }
   const job=randomUUID();
   await client.query('UPDATE vv_tg_mini_trials SET active_job=$2,active_started=NOW(),active_kind=$3,active_paid_cost=$4 WHERE telegram_id=$1',[user.id,job,kind,cost]);
   await client.query('COMMIT');
   res.json({job,...await state(user.id)});
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
 }));
 app.post('/api/telegram-mini/finish',auth(async(req,res,user)=>{
  const job=String(req.body?.job||'');
  if(!/^[a-f0-9-]{36}$/i.test(job))return res.status(400).json({error:'INVALID_JOB'});
  await pool.query('UPDATE vv_tg_mini_trials SET active_job=NULL,active_started=NULL,active_paid_cost=0 WHERE telegram_id=$1 AND active_job=$2',[user.id,job]);
  res.json(await state(user.id));
 }));
 app.post('/api/telegram-mini/fail',auth(async(req,res,user)=>{
  const job=String(req.body?.job||'');
  if(!/^[a-f0-9-]{36}$/i.test(job))return res.status(400).json({error:'INVALID_JOB'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const q=await client.query('SELECT active_job,active_kind,active_paid_cost,failed_refunds FROM vv_tg_mini_trials WHERE telegram_id=$1 FOR UPDATE',[user.id]);
   const u=q.rows[0];
   if(u?.active_job===job){
    if(u.failed_refunds<3){
     if(u.active_kind==='paid'&&u.active_paid_cost>0)await client.query('UPDATE vv_tg_star_access SET period_used=GREATEST(0,period_used-$2) WHERE telegram_id=$1',[user.id,u.active_paid_cost]);
     if(u.active_kind==='stripe'&&u.active_paid_cost>0)await client.query('UPDATE vv_users SET period_used=GREATEST(0,period_used-$2) WHERE id=(SELECT user_id FROM vv_tg_account_links WHERE telegram_id=$1)',[user.id,u.active_paid_cost]);
     if(u.active_kind==='trial')await client.query('UPDATE vv_tg_mini_trials SET trial_used=GREATEST(0,trial_used-1) WHERE telegram_id=$1',[user.id]);
    }
    await client.query('UPDATE vv_tg_mini_trials SET failed_refunds=failed_refunds+1,active_job=NULL,active_started=NULL,active_paid_cost=0 WHERE telegram_id=$1',[user.id]);
   }
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
  res.json(await state(user.id));
 }));
 return {init,handlePaymentUpdate:update=>processStarsUpdate(update,token)};
}
