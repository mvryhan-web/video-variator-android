import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProviderGroupPatch,updateProviderGroupControls,updateModelControl,updateModelControlAudited,applyModelControl,publicModelCatalog} from '../server/generation-model-control.js';
import {MODEL_CATALOG} from '../app/src/main/assets/generate-models.js';

function mockPool({failAtModelInsert=0,failAudit=false}={}){
 const calls=[];
 let inserts=0,rows=new Map(),beforeTransaction=null;
 const clone=items=>new Map([...items].map(([id,row])=>[id,{...row}]));
 const query=async(sql,args=[])=>{
  calls.push({sql,args});
  if(sql==='BEGIN')beforeTransaction=clone(rows);
  if(sql==='ROLLBACK'&&beforeTransaction){rows=beforeTransaction;beforeTransaction=null;}
  if(sql==='COMMIT')beforeTransaction=null;
  if(sql.startsWith('INSERT INTO vv_ai_model_control')){
   if(++inserts===failAtModelInsert)throw Error('SIMULATED_DB_FAILURE');
   const id=args[0];
   const current=rows.get(id)||{model_id:id,enabled_override:args[1],priority:args[2],
    markup_bps:args[3],internal_cost_micros:args[4],maintenance:args[5],updated_at:null};
   if(rows.has(id))for(const [index,field] of [
    'enabled_override','priority','markup_bps','internal_cost_micros','maintenance'
   ].entries())if(args[7+index])current[field]=args[1+index];
   rows.set(id,current);
  }
  if(sql.startsWith('INSERT INTO vv_admin_audit')&&failAudit)throw Error('SIMULATED_AUDIT_FAILURE');
  if(sql.startsWith('SELECT model_id,enabled_override')&&sql.includes('WHERE model_id=$1'))
   return {rows:rows.has(args[0])?[{...rows.get(args[0])}]:[]};
  return {rows:[]};
 };
 return {calls,query,rows:()=>clone(rows),connect:async()=>({query,release:()=>{calls.push({sql:'RELEASE'});}})};
}
const googleVideo=MODEL_CATALOG.filter(m=>m.provider==='Google'&&m.kind==='video');
test('BASE #9: provider group patch permits only enable/maintenance/priority',()=>{
 assert.deepEqual(validateProviderGroupPatch({enabled:false,priority:50,maintenance:true}),{enabled:false,priority:50,maintenance:true});
 for(const bad of [null,{},[],{enabled:'yes'},{priority:-1},{priority:1.2},{priority:10001},{maintenance:'false'},
  {markupBps:3},{internalCostMicros:12},{enabled:true,model:'abc'}])assert.throws(()=>validateProviderGroupPatch(bad),/INVALID_PROVIDER_GROUP_PATCH/);
});

test('BASE #9: atomic group update writes all Google video models and one audit before COMMIT',async()=>{
 assert.equal(googleVideo.length,2);
 const pool=mockPool();
 const result=await updateProviderGroupControls(pool,{provider:'Google',kind:'video',userId:'owner-user',
  patch:{enabled:false,priority:200,maintenance:true},catalog:MODEL_CATALOG});
 assert.deepEqual(result.modelIds,googleVideo.map(x=>x.id));
 const sql=pool.calls.map(x=>x.sql);
 assert.equal(sql.filter(x=>x==='BEGIN').length,1);
 assert.equal(sql.filter(x=>x.startsWith('INSERT INTO vv_ai_model_control')).length,googleVideo.length);
 assert.equal(sql.filter(x=>x.startsWith('INSERT INTO vv_admin_audit')).length,1);
 assert.equal(sql.filter(x=>x==='COMMIT').length,1);
 assert.equal(sql.filter(x=>x==='ROLLBACK').length,0);
 assert.ok(sql.indexOf('COMMIT')>sql.indexOf('INSERT INTO vv_admin_audit'));
 assert.equal(sql.at(-1),'RELEASE');
});

test('BASE #9: an error on model 2 rolls back whole group and does not emit an audit',async()=>{
 const pool=mockPool({failAtModelInsert:2});
 await assert.rejects(()=>updateProviderGroupControls(pool,{provider:'Google',kind:'video',userId:'owner-user',
  patch:{enabled:false},catalog:MODEL_CATALOG}),/SIMULATED_DB_FAILURE/);
 const sql=pool.calls.map(x=>x.sql);
 assert.equal(sql.filter(x=>x==='BEGIN').length,1);
 assert.equal(sql.filter(x=>x==='ROLLBACK').length,1);
 assert.equal(sql.filter(x=>x==='COMMIT').length,0);
 assert.equal(sql.filter(x=>x.startsWith('INSERT INTO vv_admin_audit')).length,0);
 assert.equal(sql.at(-1),'RELEASE');
});

test('BASE #9: refuse unknown provider, unsafe kind or empty owner without a transaction',async()=>{
 const pool=mockPool();
 for(const attrs of [
  {provider:'Unlisted',kind:'video',userId:'owner-user'},
  {provider:'Google',kind:'voice',userId:'owner-user'},
  {provider:'Google',kind:'video',userId:''},
  {provider:'../Google',kind:'video',userId:'owner-user'}
 ])await assert.rejects(()=>updateProviderGroupControls(pool,{...attrs,patch:{enabled:true},catalog:MODEL_CATALOG}),/PROVIDER_NOT_FOUND|INVALID_PROVIDER_GROUP_PATCH/);
 assert.equal(pool.calls.some(x=>x.sql==='BEGIN'),false);
});

test('BASE #9: owner cannot override a model lacking configured provider credentials',()=>{
 const base={...googleVideo[0],enabled:false};
 assert.equal(applyModelControl(base,{enabledOverride:true,maintenance:false,priority:1}).enabled,false);
});

test('BASE #9: concurrent owner model edits preserve fields absent from each patch',async()=>{
 const pool=mockPool();
 const model={...googleVideo[0],priority:17};
 const edits=[
  [{enabled:false},[true,false,false,false,false]],
  [{markupBps:22500},[false,false,true,false,false]],
  [{priority:4,maintenance:true},[false,true,false,false,true]],
  [{internalCostMicros:12000},[false,false,false,true,false]]
 ];
 for(const [patch,flags] of edits){
  await updateModelControl(pool,{modelId:model.id,userId:'owner-user',patch,catalog:[model]});
  const writes=pool.calls.filter(x=>x.sql.startsWith('INSERT INTO vv_ai_model_control'));
  const {sql,args}=writes.at(-1);
  // Per-field CASE predicates are evaluated by PostgreSQL ON CONFLICT while
  // holding the row lock: a racing group edit cannot reset omitted settings.
  for(const [column,parameter] of [
   ['enabled_override',8],['priority',9],['markup_bps',10],
   ['internal_cost_micros',11],['maintenance',12]
  ])assert.ok(sql.includes(column+'=CASE WHEN $'+parameter+'::boolean THEN EXCLUDED.'+column+' ELSE vv_ai_model_control.'+column+' END'));
  assert.deepEqual(args.slice(7),flags);
  assert.equal(args[2],patch.priority??17); // correct default for first INSERT
 }
});

test('BASE #9: null priority fails as a client validation error before database',async()=>{
 const pool=mockPool();
 await assert.rejects(()=>updateModelControl(pool,{modelId:googleVideo[0].id,userId:'owner-user',
  patch:{priority:null},catalog:googleVideo}),/INVALID_MODEL_CONTROL/);
 assert.equal(pool.calls.some(x=>x.sql.startsWith('INSERT INTO vv_ai_model_control')),false);
});

test('BASE #9: individual owner edit and audit commit atomically',async()=>{
 const pool=mockPool(),model={...googleVideo[0],priority:9};
 await updateModelControlAudited(pool,{modelId:model.id,userId:'owner-user',patch:{enabled:false},catalog:[model]});
 const queries=pool.calls.map(x=>x.sql);
 assert.equal(queries.filter(x=>x==='BEGIN').length,1);
 assert.equal(queries.filter(x=>x.startsWith('INSERT INTO vv_ai_model_control')).length,1);
 assert.equal(queries.filter(x=>x.startsWith('INSERT INTO vv_admin_audit')).length,1);
 assert.equal(queries.filter(x=>x==='COMMIT').length,1);
 assert.equal(queries.filter(x=>x==='ROLLBACK').length,0);
 assert.ok(queries.indexOf('COMMIT')>queries.indexOf('INSERT INTO vv_admin_audit'));
 assert.equal(queries.at(-1),'RELEASE');
});

test('BASE #9: failed individual-model audit rolls back the model change',async()=>{
 const pool=mockPool({failAudit:true}),model={...googleVideo[0],priority:9};
 await assert.rejects(()=>updateModelControlAudited(pool,{modelId:model.id,userId:'owner-user',
  patch:{priority:7},catalog:[model]}),/SIMULATED_AUDIT_FAILURE/);
 const queries=pool.calls.map(x=>x.sql);
 assert.equal(queries.filter(x=>x==='BEGIN').length,1);
 assert.equal(queries.filter(x=>x.startsWith('INSERT INTO vv_ai_model_control')).length,1);
 assert.equal(queries.filter(x=>x.startsWith('INSERT INTO vv_admin_audit')).length,1);
 assert.equal(queries.filter(x=>x==='COMMIT').length,0);
 assert.equal(queries.filter(x=>x==='ROLLBACK').length,1);
 assert.ok(queries.indexOf('ROLLBACK')>queries.indexOf('INSERT INTO vv_admin_audit'));
 assert.equal(queries.at(-1),'RELEASE');
});

test('BASE #9: first admin toggle preserves configured default routing priority',async()=>{
 const pool=mockPool();
 const choice={...googleVideo[0],priority:17};
 await updateModelControl(pool,{modelId:choice.id,userId:'owner-user',patch:{enabled:false},catalog:[choice]});
 const insert=pool.calls.find(x=>x.sql.startsWith('INSERT INTO vv_ai_model_control'));
 assert.ok(insert);
 assert.equal(insert.args[0],choice.id);
 assert.equal(insert.args[1],false);
 assert.equal(insert.args[2],17);
});


test('BASE #9: public Studio catalog hides owner-only provider costs while preserving route controls',()=>{
 const ownerCatalog=[{id:'safe-video',kind:'video',provider:'Google',enabled:true,priority:6,
  markupBps:17500,internalCostMicros:120000,
  control:{enabledOverride:true,priority:6,maintenance:false,updatedAt:'2026-10-17',markupBps:17500,internalCostMicros:120000}}];
 const expectedOwner=JSON.parse(JSON.stringify(ownerCatalog));
 const publicCatalog=publicModelCatalog(ownerCatalog);
 assert.deepEqual(publicCatalog,[{id:'safe-video',kind:'video',provider:'Google',enabled:true,priority:6,
  control:{enabledOverride:true,priority:6,maintenance:false,updatedAt:'2026-10-17'}}]);
 assert.deepEqual(ownerCatalog,expectedOwner,'owner-only control must remain intact for admin views');
 assert.equal(JSON.stringify(publicCatalog).includes('17500'),false);
 assert.equal(JSON.stringify(publicCatalog).includes('120000'),false);
 assert.deepEqual(publicModelCatalog([{id:'uncontrolled',kind:'image',enabled:false}]),
  [{id:'uncontrolled',kind:'image',enabled:false}]);
});
