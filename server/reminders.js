/* Smart Reminders: user-scoped cloud sync, server-side scheduling, Telegram + Web Push.
 * Video/media are not uploaded by these endpoints. */
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {DateTime,IANAZone} from 'luxon';
import webpush from 'web-push';
import {pool} from './db.js';

const vapidPublic=process.env.VAPID_PUBLIC_KEY||'';
const vapidPrivate=process.env.VAPID_PRIVATE_KEY||'';
const pushEnabled=!!(vapidPublic&&vapidPrivate);
if(pushEnabled)webpush.setVapidDetails('https://video-variator-android.onrender.com',vapidPublic,vapidPrivate);
const validFrequency=new Set(['none','daily','weekly','monthly']);
const validChannel=new Set(['push','telegram','both']);
const leads=new Set([0,5,15,30,60,120,1440]);
const sha=s=>createHash('sha256').update(s).digest('hex');

function requireDb(){if(!pool)throw Error('DATABASE_NOT_CONFIGURED');}
function bad(message,status=400){const err=new Error(message);err.status=status;return err;}
function cleanSpec(src){
 const title=String(src?.title||'').trim();
 const date=String(src?.date||''),time=String(src?.time||'');
 const timezone=String(src?.timezone||''),recurrence=String(src?.recurrence||'none');
 const channel=String(src?.channel||'push'),advanceMinutes=Number(src?.advanceMinutes);
 if(!title||title.length>180)throw bad('INVALID_TITLE');
 if(!/^\d{4}-\d\d-\d\d$/.test(date)||!/^\d\d:\d\d$/.test(time))throw bad('INVALID_LOCAL_DATE_TIME');
 if(!IANAZone.isValidZone(timezone))throw bad('INVALID_TIMEZONE');
 if(!validFrequency.has(recurrence)||!validChannel.has(channel)||!leads.has(advanceMinutes))throw bad('INVALID_REMINDER_OPTIONS');
 const weekdays=Array.isArray(src?.weekdays)?[...new Set(src.weekdays.map(Number))].sort():[];
 if(weekdays.some(x=>!Number.isInteger(x)||x<1||x>7)||(recurrence==='weekly'&&!weekdays.length))throw bad('INVALID_WEEKDAYS');
 const start=DateTime.fromISO(date+'T'+time,{zone:timezone});
 if(!start.isValid||start.toFormat('yyyy-MM-dd')!==date||start.toFormat('HH:mm')!==time)throw bad('INVALID_DATE_TIME');
 if(start.diffNow('milliseconds').milliseconds<=0)throw bad('REMINDER_MUST_BE_IN_FUTURE');
 if(start.diffNow('years').years>8)throw bad('REMINDER_TOO_FAR_AHEAD');
 return {title,date,time,timezone,recurrence,channel,advanceMinutes,weekdays};
}
export function nextOccurrence(spec,after=DateTime.utc()){
 const {date,time,timezone,recurrence,weekdays,advanceMinutes}=spec;
 const start=DateTime.fromISO(date+'T'+time,{zone:timezone});
 const now=after.setZone(timezone);
 const [h,m]=time.split(':').map(Number);
 const alert=(occurrence)=>occurrence.minus({minutes:advanceMinutes});
 if(recurrence==='none'){
  if(start<=now)return null;
  const when=alert(start);
  return {eventAt:start.toUTC().toISO(),triggerAt:(when>now?when:now.plus({seconds:10})).toUTC().toISO()};
 }
 for(let n=0;n<3000;n++){
  let candidate;
  if(recurrence==='daily')candidate=start.startOf('day').plus({days:n}).set({hour:h,minute:m});
  else if(recurrence==='weekly'){
   candidate=start.startOf('day').plus({days:n}).set({hour:h,minute:m});
   if(!weekdays.includes(candidate.weekday))continue;
  }else if(recurrence==='monthly'){
   const month=start.startOf('month').plus({months:n});
   candidate=month.set({day:Math.min(start.day,month.daysInMonth),hour:h,minute:m});
  }else return null;
  if(!candidate.isValid||candidate<start)continue;
  if(alert(candidate)>now)return {eventAt:candidate.toUTC().toISO(),triggerAt:alert(candidate).toUTC().toISO()};
 }
 throw Error('NO_FUTURE_OCCURRENCE');
}
function safeJson(fn){return async(req,res)=>{try{requireDb();await fn(req,res);}catch(e){console.error('[reminders]',e.message);res.status(e.status||500).json({error:e.status?e.message:'REMINDER_SERVICE_ERROR'});}};}
const own=(req)=>req.user.id;
const fields='id,title,event_at,timezone,date_local,time_local,recurrence,weekdays,advance_minutes,channel,enabled,created_at';
const insertColumns='user_id,title,date_local,time_local,timezone,recurrence,weekdays,advance_minutes,channel,event_at,trigger_at';
function queryArgs(spec,next,userId){return [userId,spec.title,spec.date,spec.time,spec.timezone,spec.recurrence,spec.weekdays,spec.advanceMinutes,spec.channel,next.eventAt,next.triggerAt];}
async function ensureNotificationChannel(userId,channel){
 const wantsPush=channel==='push'||channel==='both';
 const wantsTelegram=channel==='telegram'||channel==='both';
 if(wantsPush){
  if(!pushEnabled)throw bad('PUSH_NOT_CONFIGURED',503);
  const r=await pool.query('SELECT 1 FROM vv_push_subscriptions WHERE user_id=$1 LIMIT 1',[userId]);
  if(!r.rowCount)throw bad('ENABLE_APP_NOTIFICATIONS_FIRST',409);
 }
 if(wantsTelegram){
  if(!process.env.TELEGRAM_BOT_TOKEN)throw bad('TELEGRAM_UNAVAILABLE',503);
  const r=await pool.query('SELECT 1 FROM vv_telegram_links WHERE user_id=$1 LIMIT 1',[userId]);
  if(!r.rowCount)throw bad('CONNECT_TELEGRAM_FIRST',409);
 }
}

export async function initRemindersDb(){
 if(!pool){console.info('[reminders] No database configured; skipping reminder storage initialization.');return;}
 await pool.query(`
 CREATE TABLE IF NOT EXISTS vv_reminders (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES vv_users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  date_local TEXT NOT NULL,
  time_local TEXT NOT NULL,
  timezone TEXT NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'none',
  weekdays INTEGER[] NOT NULL DEFAULT '{}',
  advance_minutes INTEGER NOT NULL DEFAULT 60,
  channel TEXT NOT NULL DEFAULT 'push',
  event_at TIMESTAMPTZ NOT NULL,
  trigger_at TIMESTAMPTZ NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS vv_reminders_due_idx ON vv_reminders(trigger_at) WHERE enabled;
 CREATE INDEX IF NOT EXISTS vv_reminders_user_idx ON vv_reminders(user_id,created_at DESC);
 CREATE TABLE IF NOT EXISTS vv_push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES vv_users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS vv_push_user_idx ON vv_push_subscriptions(user_id);
 CREATE TABLE IF NOT EXISTS vv_telegram_links (
  user_id TEXT PRIMARY KEY REFERENCES vv_users(id) ON DELETE CASCADE,
  chat_id BIGINT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS vv_telegram_link_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES vv_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
 );
 CREATE TABLE IF NOT EXISTS vv_notes (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES vv_users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE INDEX IF NOT EXISTS vv_notes_user_idx ON vv_notes(user_id,updated_at DESC);
 `);
}
export async function linkTelegramChat(payload,chatId){
 if(!pool||!/^r_[0-9a-f]{40}$/.test(String(payload)))return false;
 const hash=sha(payload.slice(2));
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const t=await client.query('DELETE FROM vv_telegram_link_tokens WHERE token_hash=$1 AND expires_at>NOW() RETURNING user_id',[hash]);
  if(!t.rows.length){await client.query('ROLLBACK');return false;}
  const uid=t.rows[0].user_id;
  await client.query('DELETE FROM vv_telegram_links WHERE user_id=$1 OR chat_id=$2',[uid,chatId]);
  await client.query('INSERT INTO vv_telegram_links(user_id,chat_id) VALUES($1,$2)',[uid,chatId]);
  await client.query('COMMIT');
  return true;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export function installReminders(app,{auth}){
 app.get('/api/reminders/config',auth,safeJson(async(req,res)=>{
  const [push,telegram]=await Promise.all([
   pool.query('SELECT COUNT(*)::int AS count FROM vv_push_subscriptions WHERE user_id=$1',[own(req)]),
   pool.query('SELECT 1 FROM vv_telegram_links WHERE user_id=$1',[own(req)])
  ]);
  res.json({publicKey:pushEnabled?vapidPublic:null,pushSubscriptions:push.rows[0].count,telegramConnected:!!telegram.rowCount});
 }));
 app.get('/api/reminders',auth,safeJson(async(req,res)=>{
  const q=await pool.query(`SELECT ${fields} FROM vv_reminders WHERE user_id=$1 ORDER BY enabled DESC,event_at ASC LIMIT 200`,[own(req)]);
  res.json({items:q.rows});
 }));
 app.post('/api/reminders',auth,safeJson(async(req,res)=>{
  const spec=cleanSpec(req.body),next=nextOccurrence(spec);
  if(!next)throw bad('NO_NEXT_REMINDER');
  await ensureNotificationChannel(own(req),spec.channel);
  const id=randomUUID();
  const args=[id,...queryArgs(spec,next,own(req))];
  const q=await pool.query(`INSERT INTO vv_reminders(id,${insertColumns}) VALUES (${args.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING ${fields}`,args);
  res.status(201).json({item:q.rows[0]});
 }));
 app.put('/api/reminders/:id',auth,safeJson(async(req,res)=>{
  const spec=cleanSpec(req.body),next=nextOccurrence(spec);
  if(!next)throw bad('NO_NEXT_REMINDER');
  await ensureNotificationChannel(own(req),spec.channel);
  const args=[...queryArgs(spec,next,own(req)),req.params.id];
  const q=await pool.query(`UPDATE vv_reminders SET title=$2,date_local=$3,time_local=$4,timezone=$5,recurrence=$6,weekdays=$7,advance_minutes=$8,channel=$9,event_at=$10,trigger_at=$11,enabled=true WHERE user_id=$1 AND id=$12 RETURNING ${fields}`,args);
  if(!q.rows.length)throw bad('NOT_FOUND',404);
  res.json({item:q.rows[0]});
 }));
 app.delete('/api/reminders/:id',auth,safeJson(async(req,res)=>{
  const q=await pool.query('DELETE FROM vv_reminders WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,own(req)]);
  if(!q.rows.length)throw bad('NOT_FOUND',404);res.json({ok:true});
 }));
 app.post('/api/reminders/:id/snooze',auth,safeJson(async(req,res)=>{
  const q=await pool.query("UPDATE vv_reminders SET trigger_at=NOW()+INTERVAL '10 minutes',enabled=true WHERE id=$1 AND user_id=$2 RETURNING id",[req.params.id,own(req)]);
  if(!q.rowCount)throw bad('NOT_FOUND',404);res.json({ok:true});
 }));
 app.post('/api/reminders/:id/done',auth,safeJson(async(req,res)=>{
  const q=await pool.query('UPDATE vv_reminders SET enabled=false WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,own(req)]);
  if(!q.rowCount)throw bad('NOT_FOUND',404);res.json({ok:true});
 }));
 app.post('/api/reminders/subscriptions',auth,safeJson(async(req,res)=>{
  if(!pushEnabled)throw bad('PUSH_NOT_CONFIGURED',503);
  const sub=req.body,endpoint=String(sub?.endpoint||'');
  if(!endpoint.startsWith('https://')||endpoint.length>2000||!sub?.keys?.p256dh||!sub?.keys?.auth)throw bad('INVALID_PUSH_SUBSCRIPTION');
  await pool.query('INSERT INTO vv_push_subscriptions(endpoint,user_id,subscription) VALUES($1,$2,$3) ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,subscription=EXCLUDED.subscription',[endpoint,own(req),JSON.stringify(sub)]);
  res.json({ok:true});
 }));
 app.post('/api/reminders/telegram-link',auth,safeJson(async(req,res)=>{
  if(!process.env.TELEGRAM_BOT_TOKEN)throw bad('TELEGRAM_UNAVAILABLE',503);
  const token=randomBytes(20).toString('hex');
  await pool.query("INSERT INTO vv_telegram_link_tokens(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '15 minutes')",[sha(token),own(req)]);
  res.json({url:'https://t.me/VideoUniqAppBot?start=r_'+token});
 }));
 app.get('/api/reminders/notes',auth,safeJson(async(req,res)=>{
  const q=await pool.query('SELECT id,body,created_at,updated_at FROM vv_notes WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100',[own(req)]);
  res.json({items:q.rows});
 }));
 app.post('/api/reminders/notes',auth,safeJson(async(req,res)=>{
  const body=String(req.body?.body||'').trim();
  if(!body||body.length>2000)throw bad('INVALID_NOTE');
  const q=await pool.query('INSERT INTO vv_notes(id,user_id,body) VALUES($1,$2,$3) RETURNING id,body,created_at,updated_at',[randomUUID(),own(req),body]);
  res.status(201).json({item:q.rows[0]});
 }));
 app.put('/api/reminders/notes/:id',auth,safeJson(async(req,res)=>{
  const body=String(req.body?.body||'').trim();
  if(!body||body.length>2000)throw bad('INVALID_NOTE');
  const q=await pool.query('UPDATE vv_notes SET body=$1,updated_at=NOW() WHERE user_id=$2 AND id=$3 RETURNING id,body,created_at,updated_at',[body,own(req),req.params.id]);
  if(!q.rowCount)throw bad('NOT_FOUND',404);res.json({item:q.rows[0]});
 }));
 app.delete('/api/reminders/notes/:id',auth,safeJson(async(req,res)=>{
  const q=await pool.query('DELETE FROM vv_notes WHERE user_id=$1 AND id=$2 RETURNING id',[own(req),req.params.id]);
  if(!q.rowCount)throw bad('NOT_FOUND',404);res.json({ok:true});
 }));
}
async function notifyTelegram(chatId,text){
 const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)return false;
 const r=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:true}),
  signal:AbortSignal.timeout(10000)
 });if(!r.ok)throw Error('TELEGRAM_SEND_'+r.status);return true;
}
async function dispatchReminder(client,r){
 const info=r.title+'\n'+new Date(r.event_at).toISOString();
 if(['push','both'].includes(r.channel)&&pushEnabled){
  const q=await client.query('SELECT endpoint,subscription FROM vv_push_subscriptions WHERE user_id=$1',[r.user_id]);
  for(const sub of q.rows){
   try{await webpush.sendNotification(sub.subscription,JSON.stringify({
    title:'Video Uniquifier · Reminder',body:r.title,tag:'vv-reminder-'+r.id,
    id:r.id,url:'/smart-reminders.html',actions:[{action:'done',title:'Done'},{action:'snooze',title:'Snooze 10 min'}]
   }),{TTL:3600});}
   catch(e){if([404,410].includes(e.statusCode))await client.query('DELETE FROM vv_push_subscriptions WHERE endpoint=$1',[sub.endpoint]);else console.error('[reminders] push:',e.statusCode||e.message);}
  }
 }
 if(['telegram','both'].includes(r.channel)){
  const q=await client.query('SELECT chat_id FROM vv_telegram_links WHERE user_id=$1',[r.user_id]);
  if(q.rows[0])try{await notifyTelegram(q.rows[0].chat_id,'⏰ Reminder / Напоминание\n'+r.title+'\n'+new Date(r.event_at).toISOString());}catch(e){console.error('[reminders] telegram:',e.message);}
 }
}
let busy=false;
export async function dispatchDueReminders(){
 if(!pool||busy)return;busy=true;
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const q=await client.query('SELECT * FROM vv_reminders WHERE enabled=true AND trigger_at<=NOW() ORDER BY trigger_at ASC LIMIT 30 FOR UPDATE SKIP LOCKED');
  for(const r of q.rows){
   await dispatchReminder(client,r);
   const spec={date:r.date_local,time:r.time_local,timezone:r.timezone,recurrence:r.recurrence,weekdays:r.weekdays,advanceMinutes:r.advance_minutes};
   const next=r.recurrence==='none'?null:nextOccurrence(spec,DateTime.fromJSDate(new Date(r.event_at)).plus({seconds:1}));
   if(next)await client.query('UPDATE vv_reminders SET event_at=$1,trigger_at=$2 WHERE id=$3',[next.eventAt,next.triggerAt,r.id]);
   else await client.query('UPDATE vv_reminders SET enabled=false WHERE id=$1',[r.id]);
  }
  await client.query('COMMIT');
 }catch(e){try{await client.query('ROLLBACK');}catch(_){}console.error('[reminders] scheduler:',e.message);}
 finally{client.release();busy=false;}
}
export function startReminderScheduler(){
 const timer=setInterval(()=>void dispatchDueReminders(),30000);timer.unref?.();void dispatchDueReminders();
}
