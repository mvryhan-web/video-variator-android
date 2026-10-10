import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import express from 'express';
import {pool,initDb,upsertUser,getUser,publicUser} from '../server/db.js';
import {initToolAccess,beginToolRun,finishToolRun,getToolAccess,installToolAccess} from '../server/tool-access.js';
assert.ok(pool,'Run with an isolated test PostgreSQL DATABASE_URL');
await initDb();await initToolAccess();
const ids=[];
async function account(plan='trial'){const u=await upsertUser({provider:'test-tools',providerSub:randomUUID(),email:null,name:'Tool integration fixture'});ids.push(u.id);if(plan!=='trial')await pool.query("UPDATE vv_users SET plan=$2,subscription_status=$3,plan_limit=$4 WHERE id=$1",[u.id,plan,plan==='lifetime'?'lifetime':'active',plan==='business'?15000:plan==='pro'?2250:750]);return u.id;}
after(async()=>{await pool.query('DELETE FROM vv_users WHERE id=ANY($1::text[])',[ids]);await pool.end();});
test('atomic concurrent reservation permits only five; retries and completion are idempotent',async()=>{
 const id=await account();const requests=Array.from({length:12},()=>({tool:'video',requestId:randomUUID()}));
 const results=await Promise.allSettled(requests.map(body=>beginToolRun(id,body)));
 const granted=results.filter(r=>r.status==='fulfilled').map(r=>r.value);assert.equal(granted.length,5);for(const r of results.filter(r=>r.status==='rejected'))assert.match(r.reason.message,/TOOL_TRIAL_EXHAUSTED/);
 assert.equal((await getToolAccess(id)).trial.remaining,0);
 const first=granted[0].run;assert.equal((await beginToolRun(id,{tool:first.tool,requestId:first.id})).run.id,first.id);
 await Promise.all([finishToolRun(id,first.id,'completed'),finishToolRun(id,first.id,'completed')]);assert.equal((await getToolAccess(id)).trial.used,1);
 await finishToolRun(id,granted[1].run.id,'canceled');const next=await beginToolRun(id,{tool:'photo_batch',requestId:randomUUID()});
 for(const run of [next.run,...granted.slice(2).map(x=>x.run)])await finishToolRun(id,run.id,'completed');
 assert.deepEqual((await getToolAccess(id)).trial,{limit:5,used:5,pending:0,remaining:0});
 const row=await getUser(id);assert.equal(row.trial_used,0);assert.equal(row.period_used,0);assert.equal(publicUser(row).usage.limit,100);
});
test('canceled/expired reservations release quota; one account cannot settle another run',async()=>{
 const a=await account(),b=await account();const run=(await beginToolRun(a,{tool:'clips',requestId:randomUUID()})).run;
 await assert.rejects(finishToolRun(b,run.id,'completed'),/RUN_NOT_FOUND/);
 await finishToolRun(a,run.id,'canceled');await assert.rejects(finishToolRun(a,run.id,'completed'),/RUN_ALREADY_FINISHED/);
 const expired=(await beginToolRun(a,{tool:'video',requestId:randomUUID()})).run;await pool.query("UPDATE vv_tool_runs SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",[expired.id]);
 assert.equal((await getToolAccess(a)).trial.remaining,5);await assert.rejects(finishToolRun(a,expired.id,'completed'),/RUN_ALREADY_FINISHED/);
});
test('active subscriptions inherit tools; Lifetime does not consume either trial or video credits',async()=>{
 for(const plan of ['basic','pro','business','lifetime']){const id=await account(plan),feature=plan==='basic'?'video':'tts',run=(await beginToolRun(id,{tool:feature,requestId:randomUUID()})).run;assert.equal(run.trialReserved,false);await finishToolRun(id,run.id,'completed');assert.equal((await getToolAccess(id)).trial.used,0);assert.equal((await getUser(id)).period_used,0);}
 const id=await account('basic'),run=(await beginToolRun(id,{tool:'clips',requestId:randomUUID()})).run;assert.equal(run.trialReserved,true);await finishToolRun(id,run.id,'completed');assert.equal((await getToolAccess(id)).trial.used,1);
});
test('HTTP API rejects invalid/anonymous requests and persists completed tasks across clients',async()=>{
 const id=await account(),app=express();app.use(express.json());installToolAccess(app,{auth(req,res,next){if(req.headers.authorization!=='Bearer integration-only')return res.status(401).json({error:'AUTH_REQUIRED'});req.user={id};next();}});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port,headers={'Content-Type':'application/json',Authorization:'Bearer integration-only'};
 try{assert.equal((await fetch(base+'/api/tools/access')).status,401);assert.equal((await fetch(base+'/api/tools/runs',{method:'POST',headers,body:'{"tool":"bad"}'})).status,400);
 const response=await fetch(base+'/api/tools/runs',{method:'POST',headers,body:JSON.stringify({tool:'stt',requestId:randomUUID()})});assert.equal(response.status,200);const data=await response.json();
 const done=await fetch(base+'/api/tools/runs/'+data.run.id,{method:'POST',headers,body:'{"outcome":"completed"}'});assert.equal(done.status,200);
 const reloaded=await (await fetch(base+'/api/tools/access',{headers})).json();assert.equal(reloaded.trial.used,1);assert.equal(reloaded.trial.remaining,4);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
