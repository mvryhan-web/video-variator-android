// Optional Telegram customer support: durable tickets, admin replies and terms links.
// Enabled ONLY with TELEGRAM_MINI_ENABLED=true. No personal payment info requested.
import {randomUUID} from 'node:crypto';
import {jwtVerify} from 'jose';
import {pool} from './db.js';
import {getUser} from './db.js';
const enabled=process.env.TELEGRAM_MINI_ENABLED==='true';
async function tg(token,chatId,text){
 const r=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:true}),
  signal:AbortSignal.timeout(10000)
 });
 if(!r.ok||!(await r.json()).ok)throw Error('SUPPORT_MESSAGE_UNDELIVERED');
}
function isPrivate(message){
 return message?.chat?.type==='private'&&String(message.chat.id)===String(message.from?.id);
}
export function installTelegramSupport(app,{token,appUrl}){
 if(!enabled||!token)return null;
 let ready=false;
 async function init(){
  if(!pool)throw Error('Database unavailable for payment support');
  await pool.query("CREATE TABLE IF NOT EXISTS vv_tg_support_sessions(telegram_id TEXT PRIMARY KEY,category TEXT NOT NULL,started_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE IF NOT EXISTS vv_tg_support_tickets(id TEXT PRIMARY KEY,telegram_id TEXT NOT NULL,category TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',created_at TIMESTAMPTZ DEFAULT NOW(),responded_at TIMESTAMPTZ); CREATE INDEX IF NOT EXISTS vv_tg_support_open_idx ON vv_tg_support_tickets(status,created_at DESC);");
  await pool.query("DELETE FROM vv_tg_support_sessions WHERE started_at<NOW()-INTERVAL '2 days'");
  await pool.query("DELETE FROM vv_tg_support_tickets WHERE created_at<NOW()-INTERVAL '180 days' AND status='closed'");
  ready=true;
 }
 async function handle(update){
  const msg=update?.message;
  if(!msg||!isPrivate(msg)||typeof msg.text!=='string')return false;
  const text=msg.text.trim(),id=String(msg.from.id);
  const command=/^\/(paysupport|support|terms|privacy)(?:@[A-Za-z0-9_]+)?(?:\s|$)/i.exec(text)?.[1]?.toLowerCase();
  if(!ready){
   if(command){await tg(token,id,'Customer support is temporarily unavailable. Please try again shortly.');return true;}
   return false;
  }
  if(command==='terms'){await tg(token,id,'Video Uniquifier purchasing terms: '+appUrl+'/telegram-terms.html');return true;}
  if(command==='privacy'){await tg(token,id,'Video Uniquifier Mini App privacy information: '+appUrl+'/telegram-privacy.html');return true;}
  if(command==='support'||command==='paysupport'){
   const category=command==='paysupport'?'payment':'general';
   await pool.query("INSERT INTO vv_tg_support_sessions(telegram_id,category,started_at) VALUES($1,$2,NOW()) ON CONFLICT(telegram_id) DO UPDATE SET category=$2,started_at=NOW()",[id,category]);
   await tg(token,id,'✉️ Video Uniquifier support\nPlease reply with a brief description of your '+(category==='payment'?'payment issue':'question')+'. For payments include your plan and approximate date. Do NOT send passwords, bank details, or your Telegram login code.\nSend /cancel to abandon.');
   return true;
  }
  if(/^\/cancel(?:\s|$)/i.test(text)){
   const r=await pool.query('DELETE FROM vv_tg_support_sessions WHERE telegram_id=$1',[id]);
   if(r.rowCount){await tg(token,id,'Support request cancelled.');return true;}
   return false;
  }
  if(text.startsWith('/'))return false;
  const session=await pool.query("DELETE FROM vv_tg_support_sessions WHERE telegram_id=$1 AND started_at>NOW()-INTERVAL '2 days' RETURNING category",[id]);
  const category=session.rows[0]?.category;
  if(!category)return false;
  const message=text.slice(0,2000);
  if(message.length<5){await tg(token,id,'Please send at least five characters. Use /paysupport to start a new request.');return true;}
  const ticket=randomUUID();
  await pool.query('INSERT INTO vv_tg_support_tickets(id,telegram_id,category,message) VALUES($1,$2,$3,$4)',[ticket,id,category,message]);
  await tg(token,id,'✅ Request received. Reference: '+ticket.slice(0,8)+'. We will reply in this Telegram chat. Send /paysupport for another payment issue.');
  const notify=process.env.TELEGRAM_SUPPORT_ADMIN_CHAT_ID||'';
  if(/^[1-9][0-9]{1,19}$/.test(notify)){
   try{await tg(token,notify,'New Video Uniquifier '+category+' support ticket '+ticket.slice(0,8)+'. Reply in the admin panel.');}catch(err){console.error('[support] admin notification:',err.message);}
  }
  return true;
 }
 async function admin(req,res,next){
  try{
   if(!ready)return res.status(503).json({error:'SUPPORT_NOT_READY'});
   const raw=String(req.get('Authorization')||'').replace(/^Bearer\s+/i,'');
   const secret=process.env.APP_JWT_SECRET,adminEmail=String(process.env.ADMIN_EMAIL||'').toLowerCase();
   if(!raw||!secret||!adminEmail)return res.status(403).json({error:'ADMIN_ONLY'});
   const {payload}=await jwtVerify(raw,new TextEncoder().encode(secret),{issuer:'video-variator',audience:'video-variator-client'});
   const user=await getUser(payload.sub);
   if(user?.provider!=='google'||String(user.email||'').toLowerCase()!==adminEmail)return res.status(403).json({error:'ADMIN_ONLY'});
   next();
  }catch(_){return res.status(403).json({error:'ADMIN_ONLY'});}
 }
 app.get('/api/telegram-support/tickets',admin,async(req,res)=>{
  try{
   const r=await pool.query("SELECT id,category,message,status,created_at,telegram_id,responded_at FROM vv_tg_support_tickets ORDER BY (status='open') DESC,created_at DESC LIMIT 100");
   res.json({tickets:r.rows});
  }catch(err){res.status(503).json({error:'SUPPORT_FETCH_FAILED'});}
 });
 app.post('/api/telegram-support/reply',admin,async(req,res)=>{
  const ticket=String(req.body?.ticket||''),message=String(req.body?.message||'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(ticket)||message.length<3||message.length>1800)return res.status(400).json({error:'INVALID_REPLY'});
  try{
   const item=await pool.query('SELECT telegram_id FROM vv_tg_support_tickets WHERE id=$1',[ticket]);
   if(!item.rowCount)return res.status(404).json({error:'NOT_FOUND'});
   await tg(token,item.rows[0].telegram_id,'Video Uniquifier support:\n'+message);
   await pool.query("UPDATE vv_tg_support_tickets SET status='closed',responded_at=NOW() WHERE id=$1",[ticket]);
   res.json({ok:true});
  }catch(err){console.error('[support] reply failed:',err.message);res.status(503).json({error:'REPLY_NOT_DELIVERED'});}
 });
 return{init,handle};
}
