import test from 'node:test';
import assert from 'node:assert/strict';
import {emailStorageReady,emailStorageDiagnostic,performEmailAuth,_emailAuthTest} from '../server/edge-email-auth.js';

const env={
  DATABASE_URL:'postgresql://test-only:never-use@ep-example.eu-central-1.aws.neon.tech/neondb',
  JARVIX_QUOTA_HASH_SECRET:'unit-test-not-a-real-secret'
};
function fakeResponse(rows){return {ok:true,json:async()=>({rows})};}
function req(kind,email,password,ip='198.51.100.22',origin='https://deepsyq.app'){
  return new Request('https://deepsyq.app/api/auth/email/'+kind,{
    method:'POST',headers:{'Content-Type':'application/json','cf-connecting-ip':ip,'Origin':origin},
    body:JSON.stringify({email,password,name:'Test Creator'})
  });
}
function fakeDb(){
  const users=new Map(),calls=[];
  async function fetcher(_url,options){
    assert.match(_url,/^https:\/\/api\.eu-central-1\.aws\.neon\.tech\/sql$/);
    assert.equal(options.headers['Neon-Connection-String'],env.DATABASE_URL);
    const {query,params}=JSON.parse(options.body);
    calls.push({query,params:query.includes('INSERT')?params.slice(0,3):params});
    if(query.includes('to_regclass'))return fakeResponse([{table_ready:true,password_ready:true,unique_provider_ready:true}]);
    if(query.includes('INSERT INTO public.vv_users')){
      const [id,email,name,hash]=params;
      if(users.has(email))return fakeResponse([]);
      const row={id,email,name,provider:'email',plan:'trial',plan_limit:100,subscription_status:'inactive',password_hash:hash};
      users.set(email,row);
      return fakeResponse([row]);
    }
    if(query.includes("WHERE provider='email'")){
      const row=users.get(params[0]);
      return fakeResponse(row?[row]:[]);
    }
    throw Error('Unexpected query');
  }
  return {fetcher,calls,users};
}

test('storage fail-closed without database and only accepts Neon TLS URL',async()=>{
  const db=fakeDb();
  assert.equal(await emailStorageReady({}, {fetcher:db.fetcher,cache:false}),false);
  assert.equal(await emailStorageReady({...env,DATABASE_URL:'postgresql://anything@localhost/db'}, {fetcher:db.fetcher,cache:false}),false);
  const denied=await performEmailAuth(req('login','test@example.org','passwordlong','198.51.100.90'),{},'login',{fetcher:db.fetcher});
  assert.equal(denied.status,503);
  assert.equal(denied.error,'ACCOUNT_STORAGE_NOT_CONFIGURED');
});
test('registered password uses the exact legacy Node scrypt format and constant-time check',async()=>{
  const encoded=await _emailAuthTest.encodePassword('StrongPass123#');
  assert.match(encoded,/^scrypt\$16384\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  assert.equal(await _emailAuthTest.comparePassword('StrongPass123#',encoded),true);
  assert.equal(await _emailAuthTest.comparePassword('WrongPass123#',encoded),false);
  assert.equal(await _emailAuthTest.comparePassword('StrongPass123#','malformed'),false);
});
test('register, persistence, duplicate, and re-login preserve account id and password security',async()=>{
  const db=fakeDb();
  assert.equal(await emailStorageReady(env,{fetcher:db.fetcher,cache:false}),true);
  const reg=await performEmailAuth(req('register','Creator@Example.ORG','StrongPass123#','198.51.100.31'),env,'register',{fetcher:db.fetcher});
  assert.equal(reg.status,201);
  assert.equal(reg.newAccount,true);
  assert.equal(reg.user.provider,'email');
  assert.equal(reg.user.email,'creator@example.org');
  assert.equal(reg.user.password_hash,undefined);
  assert.equal(db.users.size,1);
  const stored=db.users.get('creator@example.org');
  assert.ok(stored.password_hash.startsWith('scrypt$'));
  assert.equal(stored.password_hash.includes('StrongPass123#'),false);
  const login=await performEmailAuth(req('login','CREATOR@example.org','StrongPass123#','198.51.100.32'),env,'login',{fetcher:db.fetcher});
  assert.equal(login.status,200);
  assert.equal(login.user.id,reg.user.id);
  assert.equal(login.newAccount,false);
  const denied=await performEmailAuth(req('login','creator@example.org','BadPass123#','198.51.100.33'),env,'login',{fetcher:db.fetcher});
  assert.equal(denied.status,401);
  assert.equal(denied.error,'INVALID_EMAIL_OR_PASSWORD');
  const duplicate=await performEmailAuth(req('register','creator@example.org','AnotherPass123#','198.51.100.34'),env,'register',{fetcher:db.fetcher});
  assert.equal(duplicate.status,409);
  assert.equal(db.users.size,1);
  assert.equal(db.calls.some(c=>c.query.includes('VALUES($1,')),true);
});
test('invalid email/origin rejected and per-IP throttling is enforced',async()=>{
  const db=fakeDb();
  const originDenied=await performEmailAuth(req('register','ok@example.org','StrongPass123#','198.51.100.51','https://attacker.invalid'),env,'register',{fetcher:db.fetcher});
  assert.equal(originDenied.status,403);
  const invalid=await performEmailAuth(req('register','wrong-email','StrongPass123#','198.51.100.52'),env,'register',{fetcher:db.fetcher});
  assert.equal(invalid.status,400);
  for(let i=0;i<10;i++)await performEmailAuth(req('login','none@example.org','StrongPass123#','203.0.113.250'),env,'login',{fetcher:db.fetcher});
  const blocked=await performEmailAuth(req('login','none@example.org','StrongPass123#','203.0.113.250'),env,'login',{fetcher:db.fetcher});
  assert.equal(blocked.status,429);
});

test('Neon HTTP failures return only a fixed diagnostic reason without credentials',async()=>{
  for(const http of [400,401,403,404,422,429,500,503]){
    const response=await emailStorageDiagnostic(env,{fetcher:async()=>({ok:false,status:http})});
    assert.deepEqual(response,{configured:false,reason:'DATABASE_HTTP_'+http});
    assert.equal(JSON.stringify(response).includes('test-only'),false);
  }
  const response=await emailStorageDiagnostic(env,{fetcher:async()=>{throw new Error('secret password leaked');}});
  assert.deepEqual(response,{configured:false,reason:'DATABASE_NETWORK_FAILED'});
});
