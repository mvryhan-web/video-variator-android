// Optional Telegram video queue. Disabled unless TELEGRAM_VIDEO_ENABLED=true.
// Telegram hosts input/output files; Render only stores lightweight job metadata.
import {randomUUID} from 'node:crypto';
import {pool} from './db.js';
import {VIDEO_MODES,VIDEO_MAX_BYTES,VIDEO_MAX_DURATION,WORKER_NEXT,WORKER_REPORT,acceptedTelegramVideo,verifyWorkerSignature} from './telegram-video-core.js';
const enabled=process.env.TELEGRAM_VIDEO_ENABLED==='true';
const DAILY_LIMIT=Math.max(1,Math.min(20,Number(process.env.TELEGRAM_DAILY_FREE_LIMIT)||3));
const msgBytes=Math.round(VIDEO_MAX_BYTES/1048576);

async function tg(token,method,body){
 const res=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12_000)});
 const data=await res.json();if(!res.ok||!data.ok)throw Error(`Telegram ${method}: HTTP ${res.status}`);return data.result;
}
function keyboard(id,mode){
 const chosen=m=>`${mode===m?'✅ ':'▫️ '}${m[0].toUpperCase()}${m.slice(1)}`;
 return {inline_keyboard:[
  VIDEO_MODES.map(m=>({text:chosen(m),callback_data:`tv:m:${id}:${m}`})),
  [{text:'▶️ Start processing',callback_data:`tv:s:${id}`}],
  [{text:'🌐 Open website',url:'https://video-variator-android.onrender.com/'}]
 ]};
}
function workerAuth(token,req,res){
 const t=req.get('x-tg-worker-time')||'',sig=req.get('x-tg-worker-signature')||'';
 if(!verifyWorkerSignature(token,req.method,req.path,t,req.body||{},sig)){
  res.status(403).json({error:'WORKER_AUTH_FAILED'});return false;
 }return true;
}
export function installTelegramVideo(app,{appUrl,token}){
 if(!enabled||!token)return null;
 let ready=false;
 async function init(){
  if(!pool)throw Error('Telegram video requires DATABASE_URL');
  await pool.query(`
   CREATE TABLE IF NOT EXISTS vv_tg_video_jobs (
    id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, telegram_user_id TEXT NOT NULL,
    file_id TEXT NOT NULL, file_size BIGINT NOT NULL, duration_seconds INTEGER,
    mode TEXT, status TEXT NOT NULL DEFAULT 'choosing', error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
   );
   CREATE INDEX IF NOT EXISTS vv_tg_jobs_queue_idx ON vv_tg_video_jobs(status,created_at);
   CREATE INDEX IF NOT EXISTS vv_tg_jobs_user_idx ON vv_tg_video_jobs(telegram_user_id,created_at DESC);
   CREATE TABLE IF NOT EXISTS vv_tg_video_worker (id INTEGER PRIMARY KEY, last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW());
  `);
  ready=true;
 }
 async function hasWorker(){
  const r=await pool.query("SELECT 1 FROM vv_tg_video_worker WHERE id=1 AND last_seen>NOW()-INTERVAL '45 seconds'");
  return !!r.rowCount;
 }
 // Polls over HTTPS; worker pulls files directly from Telegram, not through Render.
 app.post(WORKER_NEXT,async(req,res)=>{
  if(!workerAuth(token,req,res))return;
  if(!ready)return res.status(503).json({error:'WORKER_NOT_READY'});
  try{
   const client=await pool.connect();try{
    await client.query('BEGIN');
    await client.query("INSERT INTO vv_tg_video_worker(id,last_seen) VALUES(1,NOW()) ON CONFLICT(id) DO UPDATE SET last_seen=NOW()");
    const result=await client.query(`WITH next AS (
     SELECT id FROM vv_tg_video_jobs WHERE status='queued' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED
    ) UPDATE vv_tg_video_jobs j SET status='processing',started_at=NOW(),updated_at=NOW() FROM next
    WHERE j.id=next.id RETURNING j.id,j.chat_id AS "chatId",j.file_id AS "fileId",j.mode,j.file_size AS "fileSize",j.duration_seconds AS "durationSeconds"`);
    await client.query('COMMIT');
    if(!result.rowCount)return res.status(204).end();
    return res.json({job:result.rows[0]});
   }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{client.release()}
  }catch(e){console.error('[telegram-video] worker next:',e.message);res.status(500).json({error:'WORKER_QUEUE_FAILED'})}
 });
 app.post(WORKER_REPORT,async(req,res)=>{
  if(!workerAuth(token,req,res))return;
  if(!ready)return res.status(503).json({error:'WORKER_NOT_READY'});
  const {id,ok,error}=req.body||{};
  if(typeof id!=='string'||!/^[-a-f0-9]{36}$/i.test(id)||typeof ok!=='boolean')return res.status(400).json({error:'INVALID_JOB_REPORT'});
  try{
   const r=await pool.query(`UPDATE vv_tg_video_jobs SET status=$2,error=$3,finished_at=NOW(),updated_at=NOW()
    WHERE id=$1 AND status='processing' RETURNING chat_id`,[id,ok?'done':'failed',ok?null:String(error||'PROCESSING_FAILED').slice(0,150)]);
   if(!r.rowCount)return res.status(409).json({error:'JOB_NOT_PROCESSING'});
   if(!ok)await tg(token,'sendMessage',{chat_id:r.rows[0].chat_id,text:'⚠️ Video processing failed. Please try a shorter clip or use the website: '+appUrl}).catch(e=>console.error('[telegram-video] failure notice:',e.message));
   return res.json({ok:true});
  }catch(e){console.error('[telegram-video] worker report:',e.message);return res.status(500).json({error:'REPORT_FAILED'})}
 });
 async function handle(update){
  if(!ready)return false;
  const message=update?.message;
  if(message&&(message.video||message.document)){
   if(message.chat?.type!=='private')return false;
   const file=acceptedTelegramVideo(message);
   if(file.error==='NOT_VIDEO')return false;
   if(file.error){
    await tg(token,'sendMessage',{chat_id:message.chat.id,text:file.error==='SIZE'?`⚠️ Max video size: ${msgBytes} MB. Open the website for larger videos: ${appUrl}`:`⚠️ Max duration: ${VIDEO_MAX_DURATION} seconds. Open the website: ${appUrl}`});return true;
   }
   if(!await hasWorker()){
    await tg(token,'sendMessage',{chat_id:message.chat.id,text:'💻 Telegram processing is temporarily offline. The Windows worker must be running. You can process your video on our website: '+appUrl});return true;
   }
   const chat=String(message.chat.id),usr=String(message.from?.id||message.chat.id);
   const active=await pool.query("SELECT 1 FROM vv_tg_video_jobs WHERE telegram_user_id=$1 AND status IN ('queued','processing') LIMIT 1",[usr]);
   if(active.rowCount){await tg(token,'sendMessage',{chat_id:chat,text:'⏳ Your previous video is still being processed. Please wait.'});return true;}
   const used=await pool.query("SELECT COUNT(*)::int AS n FROM vv_tg_video_jobs WHERE telegram_user_id=$1 AND status IN ('queued','processing','done') AND created_at>NOW()-INTERVAL '24 hours'",[usr]);
   if(used.rows[0].n>=DAILY_LIMIT){await tg(token,'sendMessage',{chat_id:chat,text:`🎬 Free Telegram test limit reached (${DAILY_LIMIT} per 24h). Continue on our website: ${appUrl}`});return true;}
   await pool.query("UPDATE vv_tg_video_jobs SET status='cancelled',updated_at=NOW() WHERE telegram_user_id=$1 AND status='choosing'",[usr]);
   const id=randomUUID();
   await pool.query('INSERT INTO vv_tg_video_jobs(id,chat_id,telegram_user_id,file_id,file_size,duration_seconds) VALUES($1,$2,$3,$4,$5,$6)',[id,chat,usr,file.fileId,file.fileSize,file.duration]);
   await tg(token,'sendMessage',{chat_id:chat,text:'🎬 Video received! Choose Gentle, Balanced or Dynamic, then press Start.',reply_markup:keyboard(id)});
   return true;
  }
  const cb=update?.callback_query;
  if(!cb?.data?.startsWith('tv:'))return false;
  const chat=cb.message?.chat?.id;
  const parts=cb.data.split(':');
  if(!chat||!['m','s'].includes(parts[1])||!/^[-a-f0-9]{36}$/i.test(parts[2]||'')){
   await tg(token,'answerCallbackQuery',{callback_query_id:cb.id,text:'Invalid action'});return true;
  }
  const id=parts[2],usr=String(cb.from?.id),chatStr=String(chat);
  const result=await pool.query('SELECT id,chat_id,telegram_user_id,status,mode FROM vv_tg_video_jobs WHERE id=$1',[id]);
  const job=result.rows[0];
  if(!job||job.telegram_user_id!==usr||job.chat_id!==chatStr||job.status!=='choosing'){
   await tg(token,'answerCallbackQuery',{callback_query_id:cb.id,text:'This video selection has expired.'});return true;
  }
  if(parts[1]==='m'){
   const mode=parts[3];if(!VIDEO_MODES.includes(mode)){await tg(token,'answerCallbackQuery',{callback_query_id:cb.id,text:'Invalid mode'});return true;}
   await pool.query("UPDATE vv_tg_video_jobs SET mode=$2,updated_at=NOW() WHERE id=$1 AND status='choosing'",[id,mode]);
   await tg(token,'answerCallbackQuery',{callback_query_id:cb.id,text:`Selected: ${mode}`});
   await tg(token,'editMessageReplyMarkup',{chat_id:chat,message_id:cb.message.message_id,reply_markup:keyboard(id,mode)});
   return true;
  }
  if(!job.mode){await tg(token,'answerCallbackQuery',{callback_query_id:cb.id,text:'Choose a processing mode first.'});return true;}
  if(!await hasWorker()){await tg(token,'answerCallbackQuery',{callback_query_id:cb.id,text:'Windows worker is offline. Try later.',show_alert:true});return true;}
  const count=await pool.query("SELECT COUNT(*)::int AS n FROM vv_tg_video_jobs WHERE telegram_user_id=$1 AND status IN ('queued','processing','done') AND created_at>NOW()-INTERVAL '24 hours'",[usr]);
  if(count.rows[0].n>=DAILY_LIMIT){await tg(token,'answerCallbackQuery',{callback_query_id:cb.id,text:'Free Telegram limit reached. Open the website.',show_alert:true});return true;}
  const changed=await pool.query("UPDATE vv_tg_video_jobs SET status='queued',updated_at=NOW() WHERE id=$1 AND status='choosing' RETURNING id",[id]);
  await tg(token,'answerCallbackQuery',{callback_query_id:cb.id,text:changed.rowCount?'Added to processing queue.':'Already started.'});
  if(changed.rowCount){
   await tg(token,'editMessageReplyMarkup',{chat_id:chat,message_id:cb.message.message_id,reply_markup:{inline_keyboard:[[{text:'🌐 Open website',url:appUrl}]]}}).catch(()=>{});
   await tg(token,'sendMessage',{chat_id:chat,text:`⏳ Processing your video (${job.mode}). I will send the MP4 here when ready.`});
  }
  return true;
 }
 return {init,handle};
}
