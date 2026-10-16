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
 if(Object.hasOwn(body,'priority'))out.priority=integerOrNull(body.priority,0,10000);
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
 const current=await getModelControl(pool,modelId)||{enabledOverride:null,priority:100,markupBps:null,internalCostMicros:null,maintenance:false};
 const next={
  enabledOverride:Object.hasOwn(p,'enabled')?p.enabled:current.enabledOverride,
  priority:Object.hasOwn(p,'priority')?p.priority:current.priority,
  markupBps:Object.hasOwn(p,'markupBps')?p.markupBps:current.markupBps,
  internalCostMicros:Object.hasOwn(p,'internalCostMicros')?p.internalCostMicros:current.internalCostMicros,
  maintenance:Object.hasOwn(p,'maintenance')?p.maintenance:current.maintenance
 };
 await pool.query(`INSERT INTO vv_ai_model_control(model_id,enabled_override,priority,markup_bps,internal_cost_micros,maintenance,updated_by,updated_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,NOW())
 ON CONFLICT(model_id) DO UPDATE SET enabled_override=EXCLUDED.enabled_override,priority=EXCLUDED.priority,markup_bps=EXCLUDED.markup_bps,internal_cost_micros=EXCLUDED.internal_cost_micros,maintenance=EXCLUDED.maintenance,updated_by=EXCLUDED.updated_by,updated_at=NOW()`,
 [modelId,next.enabledOverride,next.priority,next.markupBps,next.internalCostMicros,next.maintenance,userId||null]);
 return getModelControl(pool,modelId);
}

export function applyModelControl(model,control){
 if(!control)return model;
 return {...model,enabled:!!model.enabled&&control.enabledOverride!==false&&!control.maintenance,priority:control.priority,maintenance:control.maintenance,markupBps:control.markupBps};
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
