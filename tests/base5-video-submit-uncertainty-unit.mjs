import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {quarantineUncertainVideoSubmit,VIDEO_SUBMISSION_UNCERTAIN} from '../server/generation-video-submit-uncertainty.js';

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
 finishError=null,walletOn=true,settleError=null
}={}){
 const source=await readFile(new URL('../server/generation-studio.js',import.meta.url),'utf8');
 const start=source.indexOf('async function run(id,request,userId)');
 const stop=source.indexOf(" app.post('/api/studio/estimate'",start);
 assert.ok(start>=0&&stop>start,'Exact server Video dispatch catch function exists');
 const fnSource=source.slice(start,stop);
 const trace={provider:0,finish:0,quarantine:0,settle:0,updates:[]};
 const provider=async()=>{trace.provider++;if(providerError)throw providerError;return {operation:'byteplus:task_1'};};
 const finish=async()=>{trace.finish++;if(finishError)throw finishError;};
 const quarantine=async obj=>{trace.quarantine++;assert.equal(obj.jobId,'video-id');return {quarantined:true};};
 const wallet={async settle(x){trace.settle++;assert.equal(x.outcome,'unknown');if(settleError)throw settleError;}};
 const pool={async query(sql,args){trace.updates.push({sql,args});return {rowCount:1}}};
 const errorNormalize=()=>({code:'PROVIDER_TIMEOUT',category:'transport',stage:'provider_submit',sourceCode:'NETWORK',retryable:true});
 const factory=new Function('finish','provider','env','normalizeGenerationError','quarantineUncertainVideoSubmit','pool','walletEnabled','wallet',
   fnSource+';return run;');
 const run=factory(finish,provider,{},errorNormalize,quarantine,pool,()=>walletOn,wallet);
 await run('video-id',{kind},'owner-id');
 return trace;
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
