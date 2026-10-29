// Agent D / original BASE #38. No production credentials, Stripe, provider or user data.
// Real signed production-format app JWT, real Studio admin routes, disposable localhost PostgreSQL16.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import express from 'express';
import pg from 'pg';
import {SignJWT,jwtVerify} from 'jose';
import {installGenerationStudio} from '../server/generation-studio.js';

const connectionString=process.env.P0_PURCHASED_TEST_DB_URL||'';
if(connectionString){
 const url=new URL(connectionString);
 if(!['postgres:','postgresql:'].includes(url.protocol)||
    !['127.0.0.1','localhost','::1'].includes(url.hostname)||
    url.pathname!=='/deepsyq_purchased_test')throw Error('DISPOSABLE_PG16_ONLY');
}
function realProductionAuth(pool,secret){
 const source=readFileSync(new URL('../server/server.js',import.meta.url),'utf8');
 const start=source.indexOf('async function signAppToken(user){');
 const end=source.indexOf('installEmailAuth(app,{signAppToken});',start);
 assert.ok(start>=0&&end>start,'real server auth functions must be found');
 const selected=source.slice(start,end);
 assert.match(selected,/jwtVerify\(token,key,\{issuer:'video-variator',audience:'video-variator-client'\}\)/);
 const context={
  jwtSecret:secret,SignJWT,jwtVerify,TextEncoder,
  requireServerConfig(){if(!secret)throw Error('MISSING_JWT_SECRET');},
  async getUser(id){
   const r=await pool.query('SELECT * FROM vv_users WHERE id=$1',[id]);
   return r.rows[0]||null;
  }
 };
 runInNewContext(selected+';globalThis.testExports={auth,signAppToken};',context);
 return context.testExports;
}
test('BASE38: real signed owner+foreign JWT cannot bypass admin/credit feature gates', {timeout:45000},async()=>{
 assert.ok(connectionString,'this security test REQUIRES a disposable localhost PostgreSQL16; no silent skips');
 const schema='d38_'+randomUUID().replaceAll('-','');
 const db=new pg.Client({connectionString});
 await db.connect();
 let pool,server,providerCalls=0,walletWrites=0,walletInits=0;
 try{
  await db.query('CREATE SCHEMA '+schema);
  pool=new pg.Pool({connectionString,options:'-c search_path='+schema,max:2,connectionTimeoutMillis:3000});
  await pool.query('CREATE TABLE vv_users(id TEXT PRIMARY KEY,provider TEXT NOT NULL,email TEXT NOT NULL,plan TEXT NOT NULL,subscription_status TEXT NOT NULL,has_subscribed BOOLEAN NOT NULL DEFAULT false)');
  const owner={id:'d38-owner',provider:'google',email:'owner@example.test',plan:'basic',subscription_status:'active'};
  const other={id:'d38-other',provider:'email',email:'other@example.test',plan:'basic',subscription_status:'active'};
  const impersonator={id:'d38-lookalike',provider:'email',email:'owner@example.test',plan:'basic',subscription_status:'active'};
  for(const u of [owner,other,impersonator])await pool.query(
   'INSERT INTO vv_users(id,provider,email,plan,subscription_status) VALUES($1,$2,$3,$4,$5)',
   [u.id,u.provider,u.email,u.plan,u.subscription_status]);
  const secret='offline-only-'+randomBytes(32).toString('base64url');
  const {auth,signAppToken}=realProductionAuth(pool,secret);
  const [ownerJwt,otherJwt,lookalikeJwt]=await Promise.all([owner,other,impersonator].map(signAppToken));
  const env={
   AI_STUDIO_ENABLED:'true',DATABASE_URL:'fixture-only-no-external',
   ADMIN_EMAIL:owner.email,AI_STUDIO_MAX_CALLS:'3',
   GEMINI_API_KEY:'never-a-real-provider-key',AI_STUDIO_ALLOWED_KINDS:'image,video',
   AI_PROVIDER_ADMIN_ENABLED:'false',AI_OWNER_CREDIT_ADJUSTMENTS:'false',
   AI_SMART_ROUTING_ENABLED:'false',AI_STUDIO_WALLET_ENABLED:'false',
   AI_PUBLIC_GENERATION_ENABLED:'false',AI_PURCHASED_ONLY_DISPATCH_ENABLED:'false'
  };
  const wallet={async init(){walletInits++},async adjust(){walletWrites++;throw Error('NEVER_ADJUST')},
   async settle(){walletWrites++;throw Error('NEVER_SETTLE')}};
  const app=express();app.use(express.json());
  installGenerationStudio(app,{auth,pool,env,wallet,
   provider:async()=>{providerCalls++;throw Error('PAID_PROVIDER_FORBIDDEN')},
   poller:async()=>{providerCalls++;throw Error('POLL_FORBIDDEN')}});
  server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const call=(token,route,method='GET',body=null)=>fetch(origin+route,{
   method,headers:{...(token?{Authorization:'Bearer '+token}:{}),
    ...(body?{'Content-Type':'application/json'}:{}),'X-User-Role':'admin','X-Owner':'true'},
   ...(body?{body:JSON.stringify(body)}:{})
  });
  const protectedRoutes=[
   ['GET','/api/studio/admin/readiness'],
   ['GET','/api/studio/admin/models'],
   ['GET','/api/studio/admin/users'],
   ['GET','/api/studio/admin/jobs'],
   ['GET','/api/studio/admin/purchases'],
   ['GET','/api/studio/admin/audit'],
   ['GET','/api/studio/admin/billing-review'],
   ['PATCH','/api/studio/admin/providers/Google'],
   ['PATCH','/api/studio/admin/models/fixture'],
   ['POST','/api/studio/admin/users/'+other.id+'/credits/adjust'],
   ['POST','/api/studio/admin/billing-review/fakejob/release']
  ];
  const body={requestId:randomUUID(),confirmUserId:other.id,delta:5,reason:'test only',confirmJobId:'fakejob',note:'test only'};
  for(const token of [otherJwt,lookalikeJwt]){
   for(const [method,route] of protectedRoutes){
    const res=await call(token,route,method,method==='GET'?null:body);
    assert.equal(res.status,403,'unprivileged signed user must not access '+route);
    const json=await res.json();
    assert.equal(json.error,'OWNER_PILOT_ONLY');
    assert.ok(!JSON.stringify(json).includes(ownerJwt));
   }
  }
  const wrongAudience=await new SignJWT({}).setProtectedHeader({alg:'HS256'})
   .setSubject(owner.id).setIssuer('video-variator').setAudience('untrusted')
   .setExpirationTime('1h').sign(new TextEncoder().encode(secret));
  const wrongSignature=await new SignJWT({}).setProtectedHeader({alg:'HS256'})
   .setSubject(owner.id).setIssuer('video-variator').setAudience('video-variator-client')
   .setExpirationTime('1h').sign(new TextEncoder().encode('wrong-secret'));
  for(const token of [null,wrongAudience,wrongSignature]){
   for(const route of ['/api/studio/admin/users','/api/studio/admin/readiness']){
    const res=await call(token,route);
    assert.equal(res.status,401,'unsigned/bad JWT must be rejected');
   }
  }
  // A valid Google owner token is distinguishable from a merely matching email.
  const readiness=await call(ownerJwt,'/api/studio/admin/readiness');
  assert.equal(readiness.status,200);
  assert.ok(!JSON.stringify(await readiness.json()).includes('never-a-real-provider-key'));
  for(const invalid of [undefined,'false','0','TRUE','']){
   for(const flag of ['AI_PROVIDER_ADMIN_ENABLED','AI_OWNER_CREDIT_ADJUSTMENTS','AI_SMART_ROUTING_ENABLED'])
    env[flag]=invalid;
   const cases=[
    ['GET','/api/studio/admin/models','MODEL_ADMIN_NOT_ENABLED'],
    ['PATCH','/api/studio/admin/providers/Google','MODEL_ADMIN_NOT_ENABLED'],
    ['PATCH','/api/studio/admin/models/fixture','MODEL_ADMIN_NOT_ENABLED'],
    ['POST','/api/studio/admin/users/'+other.id+'/credits/adjust','OWNER_CREDIT_ADJUSTMENTS_DISABLED'],
    ['POST','/api/studio/admin/route-preview','SMART_ROUTING_NOT_ENABLED']
   ];
   for(const [method,route,error] of cases){
    const r=await call(ownerJwt,route,method,method==='GET'?null:body);
    assert.equal(r.status,503,'disabled owner-only feature must fail closed '+route+' '+String(invalid));
    assert.equal((await r.json()).error,error);
   }
  }
  const release=await call(ownerJwt,'/api/studio/admin/billing-review/fakejob/release','POST',body);
  // With an explicit wallet stub, release is NOT permitted without durable SQL eligibility:
  // missing job cannot release credits, and any failure must not settle or dispatch.
  assert.ok([409,503].includes(release.status));
  assert.equal(providerCalls,0);
  // No admin credits were granted; release attempts may only fail before or at SQL.
  assert.equal(walletWrites,0,'owner only kill-switch tests never touch a wallet');
 }finally{
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
  if(pool)await pool.end();
  await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{});
  await db.end();
 }
});
