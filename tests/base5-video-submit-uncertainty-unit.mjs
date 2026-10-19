import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {quarantineUncertainVideoSubmit,VIDEO_SUBMISSION_UNCERTAIN,videoHistoryPublicStatus} from '../server/generation-video-submit-uncertainty.js';

const fail={category:'provider_transport',sourceCode:'PROVIDER_TIMEOUT'};
function db(rowCount=1){
 const calls=[];return {calls,pool:{async query(sql,args){calls.push({sql,args});return {rows:rowCount?[{id:'video-id'}]:[],rowCount};}}};
}
test('BASE #5: uncertain provider operation quarantines the existing Video job, never fails it',async()=>{
 const {pool,calls}=db();
 assert.deepEqual(await quarantineUncertainVideoSubmit({pool,jobId:'video-id',failure:fail}),{quarantined:true});
 assert.equal(calls.length,1);
 assert.match(calls[0].sql,/status='processing'/);
 assert.match(calls[0].sql,/error_message='AI_PROVIDER_SUBMISSION_UNCERTAIN'/);
 assert.match(calls[0].sql,/operation IS NULL/);
 assert.match(calls[0].sql,/status IN \('queued','processing'\)/);
 assert.match(calls[0].sql,/deleted=false/);
 assert.doesNotMatch(calls[0].sql,/status='failed'|credits_reserved\s*=|UPDATE vv_ai_wallet|INSERT INTO vv_generation_jobs/);
 assert.deepEqual(calls[0].args,['video-id',VIDEO_SUBMISSION_UNCERTAIN,'provider_transport','provider_submit','PROVIDER_TIMEOUT']);
});

test('BASE #5: already terminal, deleted or provider-operation jobs cannot be overwritten or charged',async()=>{
 const {pool,calls}=db(0);
 assert.deepEqual(await quarantineUncertainVideoSubmit({pool,jobId:'video-id',failure:fail}),{quarantined:false});
 assert.equal(calls.length,1);
 assert.match(calls[0].sql,/AND operation IS NULL AND deleted=false/);
});

test('BASE #5: malformed identifiers and unavailable DB reject without a provider or credit call',async()=>{
 let n=0;const pool={async query(){n++;return {rowCount:1}}};
 for(const bad of ['',undefined,null,42])await assert.rejects(()=>quarantineUncertainVideoSubmit({pool,jobId:bad,failure:fail}),/INVALID_JOB_ID/);
 await assert.rejects(()=>quarantineUncertainVideoSubmit({pool:null,jobId:'video-id'}),/STUDIO_STORAGE_UNAVAILABLE/);
 assert.equal(n,0);
});

test('BASE #5: stored diagnostic fields are bounded and SQL-parameterized',async()=>{
 const {pool,calls}=db();
 await quarantineUncertainVideoSubmit({pool,jobId:"unsafe' OR true --",failure:{category:'c'.repeat(200),sourceCode:'s'.repeat(300)}});
 assert.equal(calls[0].sql.includes("unsafe' OR true"),false);
 assert.equal(calls[0].args[0],"unsafe' OR true --");
 assert.equal(calls[0].args[2].length,64);
 assert.equal(calls[0].args[4].length,80);
});

test('BASE #5: DB outage fails closed and never claims a successful quarantine',async()=>{
 const failure=Error('database unavailable');
 await assert.rejects(()=>quarantineUncertainVideoSubmit({pool:{async query(){throw failure;}},jobId:'video-id',failure:fail}),e=>e===failure);
});

async function runtime({
 kind='video',providerError=Error('PROVIDER_TIMEOUT'),
 finishError=null,walletOn=true,settleError=null,denyBeforeProvider=false
}={}){
 const source=await readFile(new URL('../server/generation-studio.js',import.meta.url),'utf8');
 const start=source.indexOf('async function run(');
 const stop=source.indexOf("app.post('/api/studio/estimate'",start);
 assert.ok(start>=0&&stop>start,'Exact current Studio dispatch function exists');
 const fnSource=source.slice(start,stop);
 const purchasedBoundary=fnSource.includes('submitPurchasedProviderRequest(');
 // Pull-request Actions checkout the GitHub synthetic merge, whose D-owned
 // purchased-only guard has a longer run(...) signature than the B feature
 // head. Mock that guard; never remove it or directly call a real provider.
 if(purchasedBoundary){
  assert.match(fnSource,/submitPurchasedProviderRequest\(/);
  assert.doesNotMatch(fnSource,/await provider\(request,\{env\}\)/);
 }
 const trace={provider:0,finish:0,quarantine:0,settle:0,authorization:0,denied:0,updates:[]};
 const provider=async()=>{trace.provider++;if(providerError)throw providerError;return {operation:'byteplus:task_1'};};
 const finish=async()=>{trace.finish++;if(finishError)throw finishError;};
 const quarantine=async obj=>{trace.quarantine++;assert.equal(obj.jobId,'video-id');return {quarantined:true};};
 const wallet={async settle(x){trace.settle++;assert.equal(x.outcome,'unknown');if(settleError)throw settleError;}};
 const pool={async query(sql,args){
  trace.updates.push({sql,args});
  if(sql.startsWith('SELECT user_id,kind,model,provider,status,operation,deleted,request_fingerprint')){
   assert.deepEqual(args,['video-id','owner-id']);
   return {rows:[{user_id:'owner-id',kind,model:'fixture-model',provider:'BytePlus',
    status:'processing',operation:null,deleted:false,request_fingerprint:'fixture',
    credits_reserved:1,settings:{},estimated_cost:1,cost_currency:'USD'}]};
  }
  return {rowCount:1};
 }};
 const normalize=()=>({code:'PROVIDER_TIMEOUT',category:'transport',stage:'provider_submit',sourceCode:'NETWORK',retryable:true});
 class PurchasedDispatchDenied extends Error {}
 const purchasedDispatcher=async args=>{
  trace.authorization++;
  assert.equal(args.user?.id,'owner-id');
  assert.equal(args.job?.userId,'owner-id');
  assert.equal(args.request?.kind,kind);
  if(denyBeforeProvider)throw new PurchasedDispatchDenied('PRE_PROVIDER_DENIED');
  return args.provider(args.request,{env:args.env});
 };
 const failDenied=async()=>{trace.denied++;};
 const factory=new Function('finish','provider','env','normalizeGenerationError','quarantineUncertainVideoSubmit',
  'pool','walletEnabled','wallet','submitPurchasedProviderRequest','PurchasedDispatchDenied',
  'estimateGenerationPricing','isOwner','failTerminalProviderJob',
  fnSource+';return run;');
 const run=factory(finish,provider,{},normalize,quarantine,pool,()=>walletOn,wallet,
  purchasedDispatcher,PurchasedDispatchDenied,()=>({credits:1}),()=>false,failDenied);
 if(purchasedBoundary)await run('video-id',{kind},{id:'owner-id',email:'fixture@example.invalid'},
  {id:'fixture-model'},{credits:1},'fixture');
 else{
  assert.equal(denyBeforeProvider,false,'Purchased-only denial requires the modern guard');
  await run('video-id',{kind},'owner-id');
 }
 return {...trace,updates:trace.updates.filter(x=>!x.sql.startsWith('SELECT user_id,kind,model,provider,status,operation,deleted,request_fingerprint'))};
}

test('BASE #5: network-ambiguous Video submission never creates second provider call or marks failed',async()=>{
 const trace=await runtime();
 assert.deepEqual({provider:trace.provider,quarantine:trace.quarantine,settle:trace.settle},{
  provider:1,quarantine:1,settle:1
 });
 assert.deepEqual(trace.updates,[]);
});

test('BASE #5: Video provider completed remotely but local finish failed stays uncertain, never resubmits',async()=>{
 const trace=await runtime({providerError:null,finishError:Error('object storage/db outage'),walletOn:false});
 assert.equal(trace.provider,1);
 assert.equal(trace.finish,1);
 assert.equal(trace.quarantine,1);
 assert.equal(trace.settle,0);
 assert.equal(trace.updates.length,0);
});

test('BASE #5: wallet unknown settlement errors keep held reservations, still no fake failure',async()=>{
 const trace=await runtime({settleError:Error('wallet unavailable')});
 assert.equal(trace.provider,1);
 assert.equal(trace.quarantine,1);
 assert.equal(trace.settle,1);
 assert.equal(trace.updates.length,0);
});

test('BASE #5: non-Video generation preserves existing error state behavior',async()=>{
 const trace=await runtime({kind:'image'});
 assert.equal(trace.quarantine,0);
 assert.equal(trace.provider,1);
 assert.equal(trace.updates.length,1);
 assert.match(trace.updates[0].sql,/status='failed'/);
});


test('BASE #5: current purchased-only guard denies Video before provider dispatch',async()=>{
 const source=await readFile(new URL('../server/generation-studio.js',import.meta.url),'utf8');
 if(!source.includes('submitPurchasedProviderRequest('))return; // Original B feature head predates D guard; PR merge must contain it.
 const trace=await runtime({denyBeforeProvider:true});
 assert.equal(trace.authorization,1);
 assert.equal(trace.denied,1);
 assert.equal(trace.provider,0);
 assert.equal(trace.quarantine,0);
 assert.equal(trace.settle,0);
});

async function recoveredVideoLookup({userId='u-1',requestId='11111111-1111-4111-8111-111111111111',
 poolQuery=async()=>({rows:[{id:'existing-original-video',kind:'video',status:'processing'}]})}={}){
 const source=await readFile(new URL('../server/generation-studio.js',import.meta.url),'utf8');
 const start=source.indexOf("app.get('/api/studio/jobs/by-request/:requestId'");
 const end=source.indexOf(" const getJob=async",start);
 assert.ok(start>=0&&end>start,'Exact owner-scoped read-only Video request lookup exists');
 const body=source.slice(start,end);
 const calls=[],auth=()=>{},generationUser=()=>{};
 const app={get(path,...handlers){calls.push({path,handlers});}};
 let queries=0,params;
 const pool={async query(sql,args){queries++;params=args;
  assert.match(sql,/WHERE user_id=\$1 AND client_request_id=\$2 AND kind='video' AND deleted=false/);
  assert.match(sql,/SELECT id,kind,status FROM/);
  assert.doesNotMatch(sql,/INSERT|UPDATE|DELETE|provider|Stripe|credits_reserved|output_assets/);
  return poolQuery(sql,args);
 }};
 const readOnly=new Function('app','auth','generationUser','init','pool','generationRequestId',
  body);
 const validateId=id=>{if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw Error('INVALID_GENERATION_REQUEST_ID');return id;};
 readOnly(app,auth,generationUser,async()=>{},pool,validateId);
 assert.equal(calls.length,1);
 assert.equal(calls[0].path,'/api/studio/jobs/by-request/:requestId');
 assert.equal(calls[0].handlers.length,3);
 assert.equal(calls[0].handlers[0],auth);
 assert.equal(calls[0].handlers[1],generationUser);
 const result={status:200,body:null};
 const res={set(name,value){assert.equal(name,'Cache-Control');assert.equal(value,'private, no-store');return this;},status(n){result.status=n;return this;},json(payload){result.body=payload;return this;}};
 await calls[0].handlers[2]({params:{requestId},user:{id:userId}},res);
 return {result,queries,params};
}

test('BASE #5: lost Video POST response is resolved read-only to original user-owned job, no charges',async()=>{
 const {result,queries,params}=await recoveredVideoLookup();
 assert.deepEqual(result,{status:200,body:{id:'existing-original-video',kind:'video',status:'processing'}});
 assert.equal(queries,1);
 assert.deepEqual(params,['u-1','11111111-1111-4111-8111-111111111111']);
});

test('BASE #5: unknown/cross-account Video request returns 404, never searches other users',async()=>{
 const response=await recoveredVideoLookup({userId:'unrelated-user',poolQuery:async(_sql,args)=>{
  assert.equal(args[0],'unrelated-user');
  return {rows:[]};
 }});
 assert.deepEqual(response.result,{status:404,body:{error:'NOT_FOUND'}});
 assert.equal(response.queries,1);
});

test('BASE #5: malformed client request UUID is rejected before database access',async()=>{
 const response=await recoveredVideoLookup({requestId:"' OR true --"});
 assert.deepEqual(response.result,{status:400,body:{error:'INVALID_GENERATION_REQUEST_ID'}});
 assert.equal(response.queries,0);
});

test('BASE #5: unavailable read-only lookup never falls back to a new paid provider operation',async()=>{
 const response=await recoveredVideoLookup({poolQuery:async()=>{throw Error('database down');}});
 assert.deepEqual(response.result,{status:503,body:{error:'STUDIO_STORAGE_UNAVAILABLE'}});
 assert.equal(response.queries,1);
});


test('BASE #5: stale Video without remote task id appears uncertain in History, not safely regeneratable',()=>{
 const item={kind:'video',status:'processing',operation:null,created_at:'2026-10-17T08:00:00.000Z',error:null};
 assert.deepEqual(videoHistoryPublicStatus(item,{nowMs:Date.parse(item.created_at)+180001}),{
  status:'processing',error:VIDEO_SUBMISSION_UNCERTAIN
 });
 assert.deepEqual(videoHistoryPublicStatus(item,{nowMs:Date.parse(item.created_at)+180000}),{
  status:'processing',error:null
 });
});

test('BASE #5: ambiguous Video submission is immediately marked uncertain even before timeout',()=>{
 const item={kind:'video',status:'processing',operation:null,error:VIDEO_SUBMISSION_UNCERTAIN,created_at:'2026-10-17T08:00:00.000Z'};
 assert.deepEqual(videoHistoryPublicStatus(item,{nowMs:Date.parse(item.created_at)+3000}),{
  status:'processing',error:VIDEO_SUBMISSION_UNCERTAIN
 });
});

test('BASE #5: provider-operation Video and ready/failed jobs remain untouched',()=>{
 const base={kind:'video',status:'processing',operation:'byteplus:remote_123',created_at:'2026-10-17T08:00:00.000Z',error:null};
 for(const value of [
  base,{...base,status:'ready',operation:null},
  {...base,status:'failed',operation:null,error:'PROVIDER_ERROR'},
  {...base,kind:'image',operation:null},
  {...base,kind:'music',operation:null}
 ])assert.deepEqual(videoHistoryPublicStatus(value,{nowMs:Date.parse(base.created_at)+500000}),{
  status:value.status,error:value.error
 });
});

test('BASE #5: stale untracked QUEUED video receives review-only status without DB or wallet mutation',()=>{
 const created_at='2026-10-17T08:00:00.000Z';
 const base={kind:'video',status:'queued',operation:null,created_at,error:null};
 const start=Date.parse(created_at);
 assert.deepEqual(videoHistoryPublicStatus(base,{nowMs:start+179999}),{status:'queued',error:null});
 assert.deepEqual(videoHistoryPublicStatus(base,{nowMs:start+180001}),{
  status:'queued',error:VIDEO_SUBMISSION_UNCERTAIN
 });
 assert.deepEqual(videoHistoryPublicStatus({...base,operation:'operations/saved'},{nowMs:start+360000}),{
  status:'queued',error:null
 });
 // Only the outgoing History representation changes; preserve actual DB state.
 assert.equal(base.status,'queued');assert.equal(base.error,null);
});

test('BASE #5: authenticated single-job GET leaves fresh queued video queued and reports stale untracked video as unknown',async()=>{
 const source=await readFile(new URL('../server/generation-studio.js',import.meta.url),'utf8');
 const start=source.indexOf("app.get('/api/studio/jobs/:id',auth,generationUser");
 const end=source.indexOf("app.get('/api/studio/jobs/:id/media'",start);
 assert.ok(start>=0&&end>start,'Existing Video job GET route preserved');
 const handlers=[];
 const auth=()=>{},generationUser=()=>{};
 const app={get(path,...middleware){handlers.push({path,middleware});}};
 let charges=0,providerCalls=0,dbUpdates=0;
 const pool={async query(){dbUpdates++;throw Error('should remain read-only')}};
 const walletEnabled=()=>false;
 const claimProviderPoll=async()=>{providerCalls++;return false;};
 const poller=async()=>{providerCalls++;throw Error('unexpected provider poll')};
 const finish=async()=>{providerCalls++;throw Error('unexpected finish')};
 const failTerminalProviderJob=async()=>{charges++;throw Error('unexpected terminal wallet settlement')};
 const factory=new Function('app','auth','generationUser','getJob','walletEnabled',
  'videoHistoryPublicStatus','VIDEO_SUBMISSION_UNCERTAIN','pool','claimProviderPoll','poller',
  'finish','failTerminalProviderJob','publicGenerationError',
  source.slice(start,end));
 let job;
 factory(app,auth,generationUser,async()=>job,walletEnabled,videoHistoryPublicStatus,
  VIDEO_SUBMISSION_UNCERTAIN,pool,claimProviderPoll,poller,finish,failTerminalProviderJob,()=>({error:'err'}));
 assert.equal(handlers.length,1);
 assert.equal(handlers[0].path,'/api/studio/jobs/:id');
 assert.equal(handlers[0].middleware[0],auth);
 assert.equal(handlers[0].middleware[1],generationUser);
 const respond=async()=>{
  const result={status:200,body:null};
  const res={set(name,value){assert.equal(name,'Cache-Control');assert.equal(value,'private, no-store');return this;},status(code){result.status=code;return this;},json(body){result.body=body;return this;}};
  await handlers[0].middleware[2]({params:{id:'owned-job'},user:{id:'owned-user'}},res);
  return result;
 };
 job={id:'owned-job',kind:'video',status:'queued',operation:null,error:null,
  created_at:new Date(Date.now()-181000).toISOString()};
 assert.deepEqual(await respond(),{
  status:200,body:{id:'owned-job',kind:'video',status:'unknown',
   error:VIDEO_SUBMISSION_UNCERTAIN,retryAfterSeconds:0}
 });
 job={...job,created_at:new Date(Date.now()-1000).toISOString()};
 const recent=await respond();
 assert.equal(recent.status,200);assert.equal(recent.body.status,'queued');
 assert.equal(recent.body.retryAfterSeconds,5);
 assert.equal(providerCalls,0);assert.equal(charges,0);assert.equal(dbUpdates,0);
});

test('BASE #5: missing/invalid Video timestamps fail closed without inventing a settled status',()=>{
 for(const created_at of [null,'','garbage']){
  const item={kind:'video',status:'processing',operation:null,created_at,error:null};
  assert.deepEqual(videoHistoryPublicStatus(item,{nowMs:Date.now()}),{
   status:'processing',error:null
  });
 }
});

test('BASE #5: owner History projection selects provider task operation only internally, never serializes it',async()=>{
 const source=await readFile(new URL('../server/generation-studio.js',import.meta.url),'utf8');
 const begin=source.indexOf("app.get('/api/studio/jobs',auth,generationUser");
 const end=source.indexOf("app.get('/api/studio/jobs/:id'",begin);
 assert.ok(begin>=0&&end>begin);
 const handler=source.slice(begin,end);
 assert.match(handler,/SELECT id,kind,status,operation,provider/);
 assert.match(handler,/WHERE \$\{where.join\(' AND '\)\}/);
 assert.match(handler,/\.\.\.videoHistoryPublicStatus\(j\)/);
 // Provider operation must be used solely for safe status classification, not
 // exposed to clients alongside personal prompt, S3 metadata or billing.
 const projection=handler.slice(handler.indexOf('res.json({filter,items:'));
 assert.doesNotMatch(projection,/operation\s*:\s*j\.operation/);
 assert.doesNotMatch(projection,/\bproviderTaskId\s*:/);
});


async function simulateS3Failure(kind,{dbOutage=false,alreadyHasOperation=false}={}){
 const source=await readFile(new URL('../server/generation-studio.js',import.meta.url),'utf8');
 const start=source.indexOf('async function finish(id,result,userId){');
 const end=source.indexOf('async function run(',start);
 assert.ok(start>=0&&end>start);
 const body=source.slice(start,end);
 let released=0,walletSettled=0,quarantines=0,puts=0;
 const statements=[];
 const pool={async query(sql,args){
  statements.push({sql,args});
  if(sql==='SELECT kind FROM vv_generation_jobs WHERE id=$1'){
   if(dbOutage)throw Error('db unavailable');
   return {rows:[{kind}]};
  }
  if(sql.includes("operation IS NULL")){
   assert.equal(kind,'video');
   assert.match(sql,/kind='video'/);
   return {rows:alreadyHasOperation?[]:[{id:'video-existing'}],rowCount:alreadyHasOperation?0:1};
  }
  throw Error('Unexpected non-video DB query '+sql.slice(0,60));
 }};
 const storage={configured:true,async putGeneration(){puts++;throw Error('S3_STORAGE_OFFLINE')}};
 const wallet={async settle(){walletSettled++;throw Error('wallet must not settle uncertain storage')}};
 const quarantiner=async arg=>{
  quarantines++;
  assert.equal(arg.jobId,'video-existing');
  assert.equal(arg.failure?.category,'storage');
  assert.equal(arg.failure?.sourceCode,'OBJECT_STORAGE_FAILED');
  const update=await pool.query("UPDATE vv_generation_jobs SET kind='video' WHERE id=$1 AND kind='video' AND operation IS NULL",['video-existing']);
  return {quarantined:!!update.rowCount};
 };
 const finish=new Function('pool','objectStorage','walletEnabled','wallet','failTerminalProviderJob','quarantineUncertainVideoSubmit',
  body+';return finish;')(pool,storage,()=>true,wallet,async(_id,_user,error,stage)=>{
   assert.equal(kind,'image');
   assert.equal(error.message,'OBJECT_STORAGE_FAILED');
   assert.equal(stage,'storage');released++;
  },quarantiner);
 const execution=finish('video-existing',{mime:kind==='video'?'video/mp4':'image/png',bytes:Buffer.from('mock-output')},'owner-id');
 let error=null;
 try{await execution;}catch(e){error=e}
 return {error,released,walletSettled,quarantines,puts,statements};
}

test('BASE #5: S3 outage after Video provider success never labels provider failed or releases held funds',async()=>{
 const x=await simulateS3Failure('video');
 assert.equal(x.error,null);
 assert.deepEqual({released:x.released,walletSettled:x.walletSettled,quarantines:x.quarantines,puts:x.puts},
  {released:0,walletSettled:0,quarantines:1,puts:1});
 assert.equal(x.statements[0].sql,'SELECT kind FROM vv_generation_jobs WHERE id=$1');
 assert.equal(x.statements.some(c=>/status='failed'|credits_reserved=|captured/.test(c.sql)),false);
});

test('BASE #5: failed S3 after polled Video keeps saved operation for result retrieval, never a new AI charge',async()=>{
 const x=await simulateS3Failure('video',{alreadyHasOperation:true});
 assert.equal(x.error,null);
 assert.equal(x.quarantines,1);
 assert.equal(x.released,0);
 assert.equal(x.walletSettled,0);
 assert.ok(x.statements[1].sql.includes('operation IS NULL'));
});

test('BASE #5: old Image storage-failure handling stays unchanged (B touches only Video)',async()=>{
 const x=await simulateS3Failure('image');
 assert.equal(x.error,null);
 assert.equal(x.quarantines,0);
 assert.equal(x.released,1);
 assert.equal(x.walletSettled,0);
});

test('BASE #5: S3 and database both down cannot invent a captured/refunded Video result',async()=>{
 const x=await simulateS3Failure('video',{dbOutage:true});
 assert.equal(x.error?.message,'db unavailable');
 assert.equal(x.released,0);
 assert.equal(x.quarantines,0);
 assert.equal(x.walletSettled,0);
});
