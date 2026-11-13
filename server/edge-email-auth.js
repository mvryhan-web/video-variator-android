/**
 * Isolated Cloudflare email/password authentication. Google login is not changed.
 * The existing production DATABASE_URL stays in Worker secrets, never in source.
 * Password hashes remain compatible with server/email-auth.js (scrypt format).
 */
import {randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {promisify} from 'node:util';

const scrypt=promisify(scryptCallback);
const MAX_BODY=4096;
const WINDOW_MS=15*60*1000;
const MAX_ATTEMPTS=10;
const attempts=new Map();
let availability=null;

function getStore(env) {
  const raw=String(env?.DATABASE_URL||'').trim();
  let db;
  try { db=new URL(raw); } catch { return null; }
  if(!['postgres:','postgresql:'].includes(db.protocol) ||
    !/^[a-z0-9.-]+\.neon\.tech$/.test(db.hostname) ||
    !db.username || !db.password || !db.pathname || db.pathname==='/')return null;
  // Neon's own serverless driver uses the regional API hostname, not the
  // PostgreSQL endpoint hostname: ep-foo.region.aws.neon.tech -> api.region.aws.neon.tech.
  const hostParts=db.hostname.split('.');
  if(hostParts.length<5 || !hostParts[0].startsWith('ep-'))return null;
  return {url:raw,endpoint:'https://api.'+hostParts.slice(1).join('.')+'/sql'};
}
async function query(store,statement,params=[],fetcher=fetch) {
  let response;
  try {
    response=await fetcher(store.endpoint,{
      method:'POST',
      redirect:'error',
      headers:{
        'Content-Type':'application/json',
        'Neon-Connection-String':store.url,
        'Neon-Raw-Text-Output':'true',
        'Neon-Array-Mode':'false'
      },
      body:JSON.stringify({query:statement,params:params.map(v=>v===null?null:String(v))}),
      signal:AbortSignal.timeout(10000)
    });
  } catch { throw new Error('ACCOUNT_STORAGE_UNAVAILABLE'); }
  if(!response.ok)throw new Error('ACCOUNT_STORAGE_UNAVAILABLE');
  let result;
  try { result=await response.json(); } catch { throw new Error('ACCOUNT_STORAGE_UNAVAILABLE'); }
  if(!Array.isArray(result?.rows))throw new Error('ACCOUNT_STORAGE_UNAVAILABLE');
  return result.rows;
}
function truth(value){return value===true||value==='true'||value==='t'||value===1||value==='1';}

export async function emailStorageDiagnostic(env,{fetcher=fetch}={}){
  const store=getStore(env);
  if(!store)return {configured:false,reason:'DATABASE_BINDING_INVALID'};
  if(!String(env?.JARVIX_QUOTA_HASH_SECRET||env?.APP_JWT_SECRET||'').trim())
    return {configured:false,reason:'AUTH_SECRET_MISSING'};
  try {
    const statement="SELECT to_regclass('public.vv_users') IS NOT NULL AS table_ready, "+
      "EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vv_users' "+
      "AND column_name='password_hash') AS password_ready, "+
      "EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='vv_users' "+
      "AND indexdef LIKE '%UNIQUE INDEX%provider%provider_sub%') AS unique_provider_ready";
    const [row={}]=await query(store,statement,[],fetcher);
    if(!truth(row.table_ready))return {configured:false,reason:'ACCOUNT_TABLE_MISSING'};
    if(!truth(row.password_ready))return {configured:false,reason:'PASSWORD_COLUMN_MISSING'};
    if(!truth(row.unique_provider_ready))return {configured:false,reason:'ACCOUNT_INDEX_MISSING'};
    return {configured:true};
  }catch{return {configured:false,reason:'DATABASE_QUERY_FAILED'};}
}
export async function emailStorageReady(env,{fetcher=fetch,cache=true}={}){
  const store=getStore(env);
  if(!store)return false;
  const now=Date.now();
  if(cache&&availability&&availability.url===store.url&&availability.until>now)return availability.value;
  const promise=emailStorageDiagnostic(env,{fetcher}).then(status=>status.configured);
  if(cache)availability={url:store.url,until:now+15000,value:promise};
  const value=await promise;
  if(cache)availability={url:store.url,until:Date.now()+15000,value};
  return value;
}
function normalizeEmail(value){
  if(typeof value!=='string')return null;
  const result=value.trim().toLowerCase();
  return result.length>=3&&result.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)?result:null;
}
function normalizeName(value){
  const result=typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,80):'';
  return result||null;
}
async function readJson(request){
  if(Number(request.headers.get('content-length')||0)>MAX_BODY)throw Error('INVALID_AUTH_REQUEST');
  const reader=request.body?.getReader();
  if(!reader)throw Error('INVALID_AUTH_REQUEST');
  const chunks=[];let count=0;
  while(true){
    const {value,done}=await reader.read();
    if(done)break;
    count+=value.byteLength;
    if(count>MAX_BODY){await reader.cancel();throw Error('INVALID_AUTH_REQUEST');}
    chunks.push(value);
  }
  const bytes=new Uint8Array(count);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let result;
  try{result=JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('INVALID_AUTH_REQUEST');}
  if(!result||typeof result!=='object'||Array.isArray(result))throw Error('INVALID_AUTH_REQUEST');
  return result;
}
function rateKey(request){return String(request.headers.get('cf-connecting-ip')||'unknown').slice(0,96);}
function allowAttempt(request){
  const now=Date.now(),key=rateKey(request);
  if(attempts.size>5000){
    for(const [k,v] of attempts)if(now-v.start>WINDOW_MS)attempts.delete(k);
    if(attempts.size>5000)attempts.clear();
  }
  const entry=attempts.get(key);
  if(!entry||now-entry.start>WINDOW_MS){attempts.set(key,{start:now,count:1});return true;}
  entry.count++;return entry.count<=MAX_ATTEMPTS;
}
function clearAttempt(request){attempts.delete(rateKey(request));}
async function encodePassword(password){
  const salt=randomBytes(16).toString('base64url');
  const derived=await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  return 'scrypt$16384$8$1$'+salt+'$'+Buffer.from(derived).toString('base64url');
}
async function comparePassword(password,encoded){
  try {
    const [algo,n,r,p,salt,digest]=String(encoded||'').split('$');
    if(algo!=='scrypt'||n!=='16384'||r!=='8'||p!=='1'||!salt||!digest)return false;
    const expected=Buffer.from(digest,'base64url');
    if(expected.length!==64)return false;
    const actual=Buffer.from(await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024}));
    return timingSafeEqual(expected,actual);
  }catch{return false;}
}
function cleanUser(row){
  return {
    id:String(row.id),email:String(row.email||''),name:row.name?String(row.name):null,
    provider:'email',plan:row.plan||'trial',plan_limit:Number(row.plan_limit||100),
    subscription_status:row.subscription_status||'inactive'
  };
}
const userColumns='id,email,name,plan,plan_limit,subscription_status';

export async function performEmailAuth(request,env,kind,{fetcher=fetch}={}){
  if(kind!=='login'&&kind!=='register')return {status:404,error:'NOT_FOUND'};
  if(!await emailStorageReady(env,{fetcher}))return {status:503,error:'ACCOUNT_STORAGE_NOT_CONFIGURED'};
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return {status:403,error:'INVALID_AUTH_ORIGIN'};
  if(!allowAttempt(request))return {status:429,error:'TOO_MANY_AUTH_ATTEMPTS'};
  let body;
  try{body=await readJson(request);}catch{return {status:400,error:'INVALID_AUTH_REQUEST'};}
  const email=normalizeEmail(body.email),password=body.password;
  if(!email)return {status:kind==='register'?400:401,error:kind==='register'?'INVALID_EMAIL':'INVALID_EMAIL_OR_PASSWORD'};
  if(typeof password!=='string'||password.length<8||password.length>128)
    return {status:kind==='register'?400:401,error:kind==='register'?'INVALID_PASSWORD_LENGTH':'INVALID_EMAIL_OR_PASSWORD'};
  const store=getStore(env);
  try{
    if(kind==='register'){
      const id=crypto.randomUUID(),hash=await encodePassword(password);
      const rows=await query(store,
        "INSERT INTO public.vv_users (id,provider,provider_sub,email,name,password_hash) "+
        "VALUES($1,'email',$2,$2,$3,$4) ON CONFLICT (provider,provider_sub) DO NOTHING RETURNING "+userColumns,
        [id,email,normalizeName(body.name),hash],fetcher);
      if(!rows[0])return {status:409,error:'EMAIL_ALREADY_REGISTERED'};
      clearAttempt(request);
      return {status:201,user:cleanUser(rows[0]),newAccount:true};
    }
    const users=await query(store,
      "SELECT "+userColumns+",password_hash FROM public.vv_users "+
      "WHERE provider='email' AND provider_sub=$1 LIMIT 1",[email],fetcher);
    const user=users[0];
    if(!user||!await comparePassword(password,user.password_hash))
      return {status:401,error:'INVALID_EMAIL_OR_PASSWORD'};
    clearAttempt(request);
    return {status:200,user:cleanUser(user),newAccount:false};
  }catch{return {status:503,error:'ACCOUNT_STORAGE_UNAVAILABLE'};}
}

export const _emailAuthTest={encodePassword,comparePassword,normalizeEmail,allowAttempt,clearAttempt};
