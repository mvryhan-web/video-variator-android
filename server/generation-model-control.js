import {readFile} from 'node:fs/promises';
import {initAdminAudit,recordAdminAudit} from './admin-audit.js';

let initPromise;
export async function initModelControls(pool){
 if(!pool)throw Error('DATABASE_NOT_CONFIGURED');
 if(!initPromise)initPromise=readFile(new URL('./migrations/20261015-ai-model-control.sql',import.meta.url),'utf8').then(sql=>pool.query(sql)).catch(e=>{initPromise=null;throw e;});
 await initPromise;
}

function validModelId(value){return typeof value==='string'&&/^[A-Za-z0-9._:-]{1,120}$/.test(value);}
function integerOrNull(value,min,max){if(value==null)return null;if(!Number.isSafeInteger(value)||value<min||value>max)throw Error('INVALID_MODEL_CONTROL');return value;}

export function validateModelControlPatch(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('INVALID_MODEL_CONTROL');
 const allowed=new Set(['enabled','priority','markupBps','internalCostMicros','maintenance']);
 if(Object.keys(body).some(k=>!allowed.has(k)))throw Error('INVALID_MODEL_CONTROL');
 const out={};
 if(Object.hasOwn(body,'enabled')){
  if(body.enabled!==null&&typeof body.enabled!=='boolean')throw Error('INVALID_MODEL_CONTROL');
  out.enabled=body.enabled;
 }
 // PostgreSQL priority is NOT NULL. Treat invalid null as an owner input error,
 // rather than issuing a write that fails as a misleading 503 DB outage.
 if(Object.hasOwn(body,'priority')){
  if(body.priority===null)throw Error('INVALID_MODEL_CONTROL');
  out.priority=integerOrNull(body.priority,0,10000);
 }
 if(Object.hasOwn(body,'markupBps'))out.markupBps=integerOrNull(body.markupBps,0,100000);
 if(Object.hasOwn(body,'internalCostMicros'))out.internalCostMicros=integerOrNull(body.internalCostMicros,0,1_000_000_000_000);
 if(Object.hasOwn(body,'maintenance')){
  if(typeof body.maintenance!=='boolean')throw Error('INVALID_MODEL_CONTROL');
  out.maintenance=body.maintenance;
 }
 if(!Object.keys(out).length)throw Error('INVALID_MODEL_CONTROL');
 return out;
}

export async function listModelControls(pool,catalog){
 await initModelControls(pool);
 const {rows}=await pool.query('SELECT model_id,enabled_override,priority,markup_bps,internal_cost_micros,maintenance,updated_at FROM vv_ai_model_control');
 const map=new Map(rows.map(r=>[r.model_id,r]));
 return catalog.map(model=>{
  const row=map.get(model.id),control={
   enabledOverride:row?.enabled_override??null,
   priority:Number(row?.priority??model.priority??100),
   markupBps:row?.markup_bps==null?null:Number(row.markup_bps),
   internalCostMicros:row?.internal_cost_micros==null?null:Number(row.internal_cost_micros),
   maintenance:!!row?.maintenance,
   updatedAt:row?.updated_at||null
  };
  return {...applyModelControl(model,control),baseEnabled:!!model.enabled,control};
 });
}

// Public studio configuration must never expose owner-only model economics.
// Retain routing/capability flags and priorities needed by the client, but
// keep price inputs exclusive to authenticated owner admin endpoints.
export function publicModelCatalog(catalog){
 return catalog.map(model=>{
  const {internalCostMicros:_internalCost,markupBps:_markup,control,...visible}=model;
  if(!control)return visible;
  const {internalCostMicros:_controlInternalCost,markupBps:_controlMarkup,...publicControl}=control;
  return {...visible,control:publicControl};
 });
}

export async function getModelControl(pool,modelId){
 if(!validModelId(modelId))throw Error('INVALID_MODEL_CONTROL');
 await initModelControls(pool);
 const {rows}=await pool.query('SELECT model_id,enabled_override,priority,markup_bps,internal_cost_micros,maintenance,updated_at FROM vv_ai_model_control WHERE model_id=$1',[modelId]);
 const row=rows[0];
 return row?{enabledOverride:row.enabled_override??null,priority:Number(row.priority),markupBps:row.markup_bps==null?null:Number(row.markup_bps),internalCostMicros:row.internal_cost_micros==null?null:Number(row.internal_cost_micros),maintenance:!!row.maintenance,updatedAt:row.updated_at}:null;
}

export async function updateModelControl(pool,{modelId,userId,patch,catalog}){
 if(!validModelId(modelId)||!catalog.some(m=>m.id===modelId))throw Error('MODEL_NOT_FOUND');
 const p=validateModelControlPatch(patch);await initModelControls(pool);
 const modelDefault=catalog.find(m=>m.id===modelId);
 const defaultPriority=Number(modelDefault?.control?.priority??modelDefault?.priority??100);
 // A group update and an individual owner edit can run concurrently.
 // Read-then-write of every field would overwrite unrelated changes made by
 // the other request. One PostgreSQL UPSERT locks the row and updates ONLY
 // the fields explicitly present in this validated owner patch.
 const present=key=>Object.hasOwn(p,key);
 await pool.query(`INSERT INTO vv_ai_model_control(model_id,enabled_override,priority,markup_bps,internal_cost_micros,maintenance,updated_by,updated_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,NOW())
 ON CONFLICT(model_id) DO UPDATE SET
 enabled_override=CASE WHEN $8::boolean THEN EXCLUDED.enabled_override ELSE vv_ai_model_control.enabled_override END,
 priority=CASE WHEN $9::boolean THEN EXCLUDED.priority ELSE vv_ai_model_control.priority END,
 markup_bps=CASE WHEN $10::boolean THEN EXCLUDED.markup_bps ELSE vv_ai_model_control.markup_bps END,
 internal_cost_micros=CASE WHEN $11::boolean THEN EXCLUDED.internal_cost_micros ELSE vv_ai_model_control.internal_cost_micros END,
 maintenance=CASE WHEN $12::boolean THEN EXCLUDED.maintenance ELSE vv_ai_model_control.maintenance END,
 updated_by=EXCLUDED.updated_by,updated_at=NOW()`,
 [modelId,p.enabled??null,present('priority')?p.priority:defaultPriority,
  p.markupBps??null,p.internalCostMicros??null,p.maintenance??false,userId||null,
  present('enabled'),present('priority'),present('markupBps'),
  present('internalCostMicros'),present('maintenance')]);
 return getModelControl(pool,modelId);
}

export function applyModelControl(model,control){
 if(!control)return model;
 return {...model,enabled:!!model.enabled&&control.enabledOverride!==false&&!control.maintenance,priority:control.priority,maintenance:control.maintenance,markupBps:control.markupBps};
}

// Individual and group edits must share the same atomic audit guarantee.
// Schema initialization happens outside BEGIN, so a failed audit cannot roll
// back CREATE TABLE while leaving module-level initialization marked ready.
export async function updateModelControlAudited(pool,{modelId,userId,patch,catalog}={}){
 if(!validModelId(modelId)||!Array.isArray(catalog)||!catalog.some(m=>m.id===modelId))throw Error('MODEL_NOT_FOUND');
 const validated=validateModelControlPatch(patch);
 await initModelControls(pool);
 await initAdminAudit(pool);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const control=await updateModelControl(client,{modelId,userId,patch:validated,catalog});
  await recordAdminAudit(client,{actorUserId:userId,action:'model_control.update',targetType:'model',targetId:modelId,
   details:{enabledOverride:control.enabledOverride,priority:control.priority,
    markupBps:control.markupBps,internalCostMicros:control.internalCostMicros,maintenance:control.maintenance}});
  await client.query('COMMIT');
  return control;
 }catch(error){
  await client.query('ROLLBACK').catch(()=>{});
  throw error;
 }finally{client.release();}
}

// BASE #9: owner-only route calls this bounded bulk edit. Existing per-model
// controls stay the source of truth, so no second provider config table exists.
// One SQL transaction + audit record protects partial provider-group updates.
export function validateProviderGroupPatch(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('INVALID_PROVIDER_GROUP_PATCH');
 const keys=Object.keys(body),allowed=new Set(['enabled','priority','maintenance']);
 if(!keys.length||keys.some(k=>!allowed.has(k)))throw Error('INVALID_PROVIDER_GROUP_PATCH');
 const patch={};
 if(Object.hasOwn(body,'enabled')){
  if(body.enabled!==null&&typeof body.enabled!=='boolean')throw Error('INVALID_PROVIDER_GROUP_PATCH');
  patch.enabled=body.enabled;
 }
 if(Object.hasOwn(body,'priority')){
  if(!Number.isSafeInteger(body.priority)||body.priority<0||body.priority>10000)throw Error('INVALID_PROVIDER_GROUP_PATCH');
  patch.priority=body.priority;
 }
 if(Object.hasOwn(body,'maintenance')){
  if(typeof body.maintenance!=='boolean')throw Error('INVALID_PROVIDER_GROUP_PATCH');
  patch.maintenance=body.maintenance;
 }
 return patch;
}
export async function updateProviderGroupControls(pool,{provider,kind,userId,patch,catalog=[]}={}){
 const p=validateProviderGroupPatch(patch);
 if(!['image','video'].includes(kind)||typeof provider!=='string'||!/^[A-Za-z0-9._:-]{1,120}$/.test(provider)||
    !userId||!Array.isArray(catalog))throw Error('INVALID_PROVIDER_GROUP_PATCH');
 const models=catalog.filter(m=>m.provider===provider&&m.kind===kind&&m.adapter===true);
 if(!models.length||models.length>25)throw Error('PROVIDER_NOT_FOUND');
 await initModelControls(pool);
 await initAdminAudit(pool);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['ai-provider-group:'+kind+':'+provider]);
  for(const model of models)await updateModelControl(client,{modelId:model.id,userId,patch:p,catalog});
  await recordAdminAudit(client,{actorUserId:userId,action:'provider_control.group_update',targetType:'provider',
   targetId:kind+':'+provider,details:{kind,provider,models:models.map(m=>m.id),patch:p}});
  await client.query('COMMIT');
  return {kind,provider,modelIds:models.map(m=>m.id),applied:p};
 }catch(error){
  await client.query('ROLLBACK').catch(()=>{});
  throw error;
 }finally{client.release();}
}
