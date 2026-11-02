import {randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {getUserByProvider,upsertUser,setPasswordHash,publicUser} from './db.js';

const scrypt=promisify(scryptCallback);
const attempts=new Map();
const WINDOW_MS=15*60*1000;
const MAX_ATTEMPTS=12;

function normalizeEmail(value){return String(value||'').trim().toLowerCase().slice(0,254);}
function validEmail(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}
function cleanName(value){const name=String(value||'').trim().replace(/\s+/g,' ').slice(0,80);return name||null;}
function rateKey(req){return String(req.ip||req.socket?.remoteAddress||'unknown');}
function allowAttempt(req){
  const key=rateKey(req),now=Date.now(),entry=attempts.get(key);
  if(!entry||now-entry.startedAt>WINDOW_MS){attempts.set(key,{startedAt:now,count:1});return true;}
  entry.count++;
  return entry.count<=MAX_ATTEMPTS;
}
function clearAttempts(req){attempts.delete(rateKey(req));}

async function hashPassword(password){
  const salt=randomBytes(16).toString('base64url');
  const derived=await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  return `scrypt$16384$8$1$${salt}$${Buffer.from(derived).toString('base64url')}`;
}
async function verifyPassword(password,encoded){
  try{
    const [kind,n,r,p,salt,digest]=String(encoded||'').split('$');
    if(kind!=='scrypt'||!salt||!digest)return false;
    const expected=Buffer.from(digest,'base64url');
    const derived=Buffer.from(await scrypt(password,salt,expected.length,{N:Number(n),r:Number(r),p:Number(p),maxmem:64*1024*1024}));
    return expected.length===derived.length&&timingSafeEqual(expected,derived);
  }catch(_){return false;}
}

export function installEmailAuth(app,{signAppToken}){
  const configured=()=>!!process.env.DATABASE_URL;
  app.get('/api/auth/email/status',(req,res)=>res.json({supported:true,configured:configured()}));

  app.post('/api/auth/email/register',async(req,res)=>{
    if(!configured())return res.status(503).json({error:'ACCOUNT_STORAGE_NOT_CONFIGURED'});
    if(!allowAttempt(req))return res.status(429).json({error:'TOO_MANY_AUTH_ATTEMPTS'});
    const email=normalizeEmail(req.body?.email),password=String(req.body?.password||''),name=cleanName(req.body?.name);
    if(!validEmail(email))return res.status(400).json({error:'INVALID_EMAIL'});
    if(password.length<8||password.length>128)return res.status(400).json({error:'INVALID_PASSWORD_LENGTH'});
    try{
      const existing=await getUserByProvider('email',email);
      if(existing)return res.status(409).json({error:'EMAIL_ALREADY_REGISTERED'});
      let user=await upsertUser({provider:'email',providerSub:email,email,name});
      user=await setPasswordHash(user.id,await hashPassword(password));
      clearAttempts(req);
      res.status(201).json({token:await signAppToken(user),user:publicUser(user)});
    }catch(e){console.error('[email register]',e);res.status(500).json({error:'EMAIL_REGISTRATION_FAILED'});}
  });

  app.post('/api/auth/email/login',async(req,res)=>{
    if(!configured())return res.status(503).json({error:'ACCOUNT_STORAGE_NOT_CONFIGURED'});
    if(!allowAttempt(req))return res.status(429).json({error:'TOO_MANY_AUTH_ATTEMPTS'});
    const email=normalizeEmail(req.body?.email),password=String(req.body?.password||'');
    if(!validEmail(email)||!password)return res.status(401).json({error:'INVALID_EMAIL_OR_PASSWORD'});
    try{
      const user=await getUserByProvider('email',email);
      if(!user||!await verifyPassword(password,user.password_hash))return res.status(401).json({error:'INVALID_EMAIL_OR_PASSWORD'});
      clearAttempts(req);
      res.json({token:await signAppToken(user),user:publicUser(user)});
    }catch(e){console.error('[email login]',e);res.status(500).json({error:'EMAIL_LOGIN_FAILED'});}
  });
}
