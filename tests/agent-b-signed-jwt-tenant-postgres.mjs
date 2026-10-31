// Actual production-format signed JWTs, production auth middleware source,
// Express routes and disposable localhost PostgreSQL16. Zero provider spend.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import express from 'express';
import pg from 'pg';
import {SignJWT,jwtVerify} from 'jose';
import {installGenerationStudio} from '../server/generation-studio.js';
import {installGenerationBilling} from '../server/generation-billing.js';

const connectionString=process.env.P0_PURCHASED_TEST_DB_URL||'';
if(connectionString){
 const u=new URL(connectionString);
 if(!['postgres:','postgresql:'].includes(u.protocol)||
    !['127.0.0.1','localhost','::1'].includes(u.hostname)||
    u.pathname!=='/deepsyq_purchased_test')throw Error('DISPOSABLE_POSTGRES_ONLY');
}
const config={
 AI_STUDIO_ENABLED:'true',AI_STUDIO_MAX_CALLS:'3',
 AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_WALLET_ENABLED:'true',
 AI_PURCHASED_ONLY_DISPATCH_ENABLED:'false',AI_FREE_GENERATION_ENABLED:'false',
 AI_WELCOME_CREDITS_ENABLED:'false',
 AI_STUDIO_ALLOWED_KINDS:'image,video,music',
 GEMINI_API_KEY:'synthetic-test-value-NOT-a-provider-key',
 DATABASE_URL:'test-fixture-only',ADMIN_EMAIL:'unmatched-owner@example.test',
 AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'basic',maxConcurrent:2,maxPerHour:12}]),
 AI_MODEL_PRICING_JSON:JSON.stringify([{model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:7,providerCostMicros:1200,currency:'usd'}])
};
function realProductionAuth(pool,secret){
 // Execute the exact functions in server/server.js, never substitute req.user.
 const source=readFileSync(new URL('../server/server.js',import.meta.url),'utf8');
 const start=source.indexOf('async function signAppToken(user){');
 const end=source.indexOf('installEmailAuth(app,{signAppToken});',start);
 assert.ok(start>=0&&end>start,'production auth must be located');
 const selected=source.slice(start,end);
 assert.match(selected,/jwtVerify\(token,key,\{issuer:'video-variator',audience:'video-variator-client'\}\)/);
 const context={
  jwtSecret:secret,SignJWT,jwtVerify,TextEncoder,
  requireServerConfig(){if(!secret)throw Error('APP_JWT_SECRET is not configured');},
  async getUser(id){const r=await pool.query('SELECT * FROM vv_users WHERE id=$1',[id]);return r.rows[0]||null;}
 };
 runInNewContext(selected+';globalThis.testExports={auth,signAppToken};',context);
 return context.testExports;
}
async function closeServer(server){
 if(!server)return;
 server.closeAllConnections();
 await new Promise(resolve=>server.close(resolve));
}
test('real signed JWT A/B HTTP privacy: jobs, media, History, wallet, POST', {skip:!connectionString,timeout:45000}, async()=>{
 const schema='jwt_b_'+randomUUID().replaceAll('-','');
 const admin=new pg.Client({connectionString});
 await admin.connect();
 let pool,server,providerCalls=0;
 try{
  await admin.query('CREATE SCHEMA '+schema);
  pool=new pg.Pool({connectionString,options:'-c search_path='+schema,max:2,connectionTimeoutMillis:3000});
  await pool.query('CREATE TABLE vv_users(id TEXT PRIMARY KEY,provider TEXT NOT NULL,email TEXT NOT NULL,plan TEXT NOT NULL,subscription_status TEXT NOT NULL,has_subscribed BOOLEAN NOT NULL DEFAULT false)');
  const users=[
   {id:'jwt-user-a',provider:'email',email:'a@example.test',plan:'basic',subscription_status:'active'},
   {id:'jwt-user-b',provider:'email',email:'b@example.test',plan:'basic',subscription_status:'active'}
  ];
  for(const u of users)await pool.query('INSERT INTO vv_users(id,provider,email,plan,subscription_status) VALUES($1,$2,$3,$4,$5)',[u.id,u.provider,u.email,u.plan,u.subscription_status]);
  const secret='test-only-'+randomBytes(32).toString('base64url');
  const {auth,signAppToken}=realProductionAuth(pool,secret);
  const [tokenA,tokenB]=await Promise.all(users.map(signAppToken));
  assert.notEqual(tokenA,tokenB);
  const app=express();app.use(express.json());
  const billing=installGenerationBilling(app,{auth,pool,stripe:null,appUrl:'http://127.0.0.1',env:config});
  await billing.wallet.init();
  installGenerationStudio(app,{auth,pool,env:config,wallet:billing.wallet,
   provider:async()=>{providerCalls++;throw Error('PAID_PROVIDER_FORBIDDEN');},
   poller:async()=>{providerCalls++;throw Error('POLL_FORBIDDEN');}
  });
  await pool.query(readFileSync(new URL('../server/migrations/20261015-generation-jobs.sql',import.meta.url),'utf8'));
  const ids={a:'job-a-'+randomUUID(),b:'job-b-'+randomUUID()};
  const requests={a:randomUUID(),b:randomUUID()};
  const secrets={a:'PRIVATE_A_PROMPT_'+randomUUID(),b:'PRIVATE_B_PROMPT_'+randomUUID()};
  const media={a:Buffer.from('PRIVATE_MEDIA_A_'+randomUUID()),b:Buffer.from('PRIVATE_MEDIA_B_'+randomUUID())};
  for(const [index,key] of ['a','b'].entries()){
   await pool.query("INSERT INTO vv_generation_jobs(id,user_id,kind,status,provider,model,prompt,mime,media,client_request_id,credits_charged) VALUES($1,$2,'video','ready','Google','veo-3.1',$3,'video/mp4',$4,$5,2)",[ids[key],users[index].id,secrets[key],media[key],requests[key]]);
   await pool.query('INSERT INTO vv_ai_wallet(user_id,available,reserved,debt) VALUES($1,$2,0,0)',[users[index].id,key==='a'?19:41]);
   await pool.query('INSERT INTO vv_ai_ledger(user_id,reference,kind,available_delta,reserved_delta,debt_delta) VALUES($1,$2,$3,$4,0,0)',[users[index].id,'secret-ledger-'+key,'fixture_'+key,key==='a'?19:41]);
  }
  server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const http=(token,path,options={})=>fetch(origin+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})}});
  const own=async(token,key,other)=>{
   const list=await http(token,'/api/studio/jobs?filter=all&userId='+users[other==='a'?0:1].id);
   assert.equal(list.status,200);
   assert.match(list.headers.get('cache-control')||'',/no-store/);
   const history=await list.json();
   assert.deepEqual(history.items.map(x=>x.id),[ids[key]]);
   assert.equal(history.items[0].prompt,secrets[key]);
   assert.ok(!JSON.stringify(history).includes(secrets[other]));
   const job=await http(token,'/api/studio/jobs/'+ids[key]);
   assert.equal(job.status,200);
   assert.equal((await job.json()).prompt,secrets[key]);
   const stream=await http(token,'/api/studio/jobs/'+ids[key]+'/media');
   assert.equal(stream.status,200);
   assert.deepEqual(Buffer.from(await stream.arrayBuffer()),media[key]);
   const balance=await http(token,'/api/ai-wallet/balance');
   assert.equal(balance.status,200);
   assert.equal((await balance.json()).available,key==='a'?19:41);
   const ledger=await http(token,'/api/ai-wallet/history');
   assert.equal(ledger.status,200);
   const entries=(await ledger.json()).items;
   assert.equal(entries.length,1);
   assert.equal(entries[0].kind,'fixture_'+key);
   assert.ok(!JSON.stringify(entries).includes('secret-ledger-'+other));
  };
  await own(tokenA,'a','b');await own(tokenB,'b','a');
  for(const [token,other,request] of [[tokenA,'b',requests.b],[tokenB,'a',requests.a]]){
   for(const endpoint of ['/api/studio/jobs/'+ids[other],'/api/studio/jobs/'+ids[other]+'/media','/api/studio/jobs/by-request/'+request]){
    const response=await http(token,endpoint);
    assert.equal(response.status,404,'cross-account GET must hide '+endpoint);
    assert.ok(!JSON.stringify(await response.json()).includes(secrets[other]));
   }
   const removed=await http(token,'/api/studio/jobs/'+ids[other],{method:'DELETE'});
   assert.equal(removed.status,404);
  }
  const invalidSignature=await new SignJWT({}).setProtectedHeader({alg:'HS256'}).setSubject(users[1].id).setIssuer('video-variator').setAudience('video-variator-client').setExpirationTime('1h').sign(new TextEncoder().encode('different-key'));
  const wrongAudience=await new SignJWT({}).setProtectedHeader({alg:'HS256'}).setSubject(users[1].id).setIssuer('video-variator').setAudience('wrong-audience').setExpirationTime('1h').sign(new TextEncoder().encode(secret));
  for(const token of [null,invalidSignature,wrongAudience]){
   assert.equal((await http(token,'/api/studio/jobs')).status,401);
   assert.equal((await http(token,'/api/ai-wallet/balance')).status,401);
  }
  const count=async()=>Number((await pool.query('SELECT count(*)::int AS n FROM vv_generation_jobs')).rows[0].n);
  const before=await count();
  for(const [token,other] of [[tokenA,users[1].id],[tokenB,users[0].id]]){
   const res=await http(token,'/api/studio/jobs',{method:'POST',body:JSON.stringify({userId:other,requestId:randomUUID(),kind:'image',model:'gemini-3.1-flash-image',prompt:'synthetic only',ratio:'1:1',expectedCredits:7,consent:true})});
   assert.ok(res.status>=400,'no paid POST or foreign identity override');
  }
  assert.equal(await count(),before);
  assert.equal(providerCalls,0);
  for(const key of ['a','b']){
   const row=(await pool.query('SELECT deleted,prompt FROM vv_generation_jobs WHERE id=$1',[ids[key]])).rows[0];
   assert.equal(row.deleted,false);
   assert.equal(row.prompt,secrets[key]);
  }
 }finally{
  await closeServer(server);
  if(pool)await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{});
  await admin.end();
 }
});
