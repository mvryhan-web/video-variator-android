import {randomUUID} from 'node:crypto';
import {MODELS,validateGeneration,generateGoogle,pollGoogle} from './generation-provider.js';
export function studioConfig(env=process.env){
 const calls=Number(env.AI_STUDIO_MAX_CALLS||0);
 const enabled=env.AI_STUDIO_ENABLED==='true'&&!!env.GEMINI_API_KEY&&!!env.DATABASE_URL&&!!env.ADMIN_EMAIL&&Number.isInteger(calls)&&calls>0&&calls<=20;
 const allowed=(env.AI_STUDIO_ALLOWED_KINDS||'').split(',');
 return {pilot:true,ownerOnly:true,enabled,reason:enabled?null:'OWNER_SETUP_REQUIRED',models:Object.entries(MODELS).map(([kind,m])=>({kind,...m,enabled:enabled&&allowed.includes(kind)})),translation:{enabled:false,reason:'PROVIDER_NOT_CONNECTED'}};
}
export function installGenerationStudio(app,{auth,pool,env=process.env,provider=generateGoogle,poller=pollGoogle}){
 let ready;
 const init=()=>ready??=(pool.query(`CREATE TABLE IF NOT EXISTS vv_generation_pilot(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,operation TEXT,mime TEXT,media BYTEA,result_text TEXT,error TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),deleted BOOLEAN NOT NULL DEFAULT false)`));
 const owner=(req,res,next)=>{if(req.user.provider!=='google'||String(req.user.email||'').toLowerCase()!==String(env.ADMIN_EMAIL||'').trim().toLowerCase())return res.status(403).json({error:'OWNER_PILOT_ONLY'});next();};
 app.get('/api/studio/config',(_req,res)=>res.json(studioConfig(env)));
 app.use('/api/studio',(_req,res,next)=>{if(!studioConfig(env).enabled)return res.status(503).json({error:'OWNER_SETUP_REQUIRED'});next();});
 async function finish(id,result){await pool.query('UPDATE vv_generation_pilot SET status=$2,operation=$3,mime=$4,media=$5,result_text=$6 WHERE id=$1',[id,result.operation?'processing':'ready',result.operation||null,result.mime||null,result.bytes||null,result.text||'']);}
 async function run(id,request){try{await finish(id,await provider(request,{key:env.GEMINI_API_KEY}));}catch(e){await pool.query('UPDATE vv_generation_pilot SET status=$2,error=$3 WHERE id=$1',[id,'failed','GENERATION_FAILED_NO_AUTOMATIC_RETRY']);}}
 app.post('/api/studio/jobs',auth,owner,async(req,res)=>{
  let request;try{request=validateGeneration(req.body);}catch(e){return res.status(400).json({error:e.message});}
  if(!studioConfig(env).models.find(m=>m.kind===request.kind)?.enabled)return res.status(503).json({error:'MODEL_NOT_ENABLED'});
  // No consumer credits or existing subscription entitlements are reused in this owner-only pilot.
  let c,id;try{
   await init();c=await pool.connect();await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(84920115)');
   const count=await c.query('SELECT count(*)::int AS n FROM vv_generation_pilot');
   if(count.rows[0].n>=Number(env.AI_STUDIO_MAX_CALLS)){await c.query('ROLLBACK');return res.status(429).json({error:'PILOT_LIMIT_REACHED'});}
   id=randomUUID();await c.query('INSERT INTO vv_generation_pilot(id,user_id,kind,status) VALUES($1,$2,$3,$4)',[id,req.user.id,request.kind,'processing']);await c.query('COMMIT');
  }catch(_){if(c)await c.query('ROLLBACK').catch(()=>{});return res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}finally{c?.release();}
  res.status(202).json({id,status:'processing'});void run(id,request).catch(()=>{});
 });
 const getJob=async(req)=>{await init();const r=await pool.query('SELECT * FROM vv_generation_pilot WHERE id=$1 AND user_id=$2 AND deleted=false',[req.params.id,req.user.id]);return r.rows[0];};
 app.get('/api/studio/jobs/:id',auth,owner,async(req,res)=>{try{
  let j=await getJob(req);if(!j)return res.status(404).json({error:'NOT_FOUND'});
  if(j.status==='processing'&&j.operation){try{const result=await poller(j.operation,{key:env.GEMINI_API_KEY});if(!result.pending){await finish(j.id,result);j=await getJob(req);}}catch(_){return res.status(502).json({error:'PROVIDER_POLL_FAILED',retryable:true});}}
  if(j.status==='processing'&&!j.operation&&Date.now()-new Date(j.created_at).getTime()>180000)return res.json({id:j.id,status:'unknown',error:'STATUS_UNKNOWN_NO_AUTOMATIC_RETRY'});
  res.json({id:j.id,kind:j.kind,status:j.status,error:j.error,text:j.result_text||'',mime:j.mime});
 }catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.get('/api/studio/jobs/:id/media',auth,owner,async(req,res)=>{try{const j=await getJob(req);if(!j||j.status!=='ready'||!j.media)return res.status(404).json({error:'RESULT_UNAVAILABLE'});res.type(j.mime).send(j.media);}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.delete('/api/studio/jobs/:id',auth,owner,async(req,res)=>{try{const j=await getJob(req);if(!j)return res.status(404).json({error:'NOT_FOUND'});if(j.status==='processing')return res.status(409).json({error:'PROCESSING_CANNOT_BE_CANCELLED'});await pool.query('UPDATE vv_generation_pilot SET deleted=true,media=null,result_text=null WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);res.json({ok:true});}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
}
