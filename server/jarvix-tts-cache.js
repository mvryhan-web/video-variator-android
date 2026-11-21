// Server-private write-through cache for owner VoxCPM2 WAVs. Never exposed by express.static.
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,lstat,readFile,writeFile,link,unlink,readdir,utimes} from 'node:fs/promises';
import {resolve,join,isAbsolute,sep} from 'node:path';

const MAX_WAV_BYTES=12*1024*1024;
const LANGUAGES=new Set(['ru','en','fr','es']);
export const normalizeTtsText=text=>String(text||'').normalize('NFC').trim().toLowerCase().replace(/ё/g,'е').replace(/\s+/gu,' ');
export const validTtsWav=bytes=>Buffer.isBuffer(bytes)&&bytes.length>=44&&bytes.length<=MAX_WAV_BYTES&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE';

export function createJarvixTtsCache(env=process.env){
 const enabled=env.JARVIX_TTS_CACHE_ENABLED==='true';
 const dir=env.JARVIX_TTS_CACHE_DIR;
 const profile=String(env.JARVIX_TTS_VOICE_PROFILE||'').trim();
 if(enabled){
  if(!dir||!isAbsolute(dir)||!profile)throw Error('JARVIX_TTS_CACHE_REQUIRES_PRIVATE_ABSOLUTE_DIR_AND_VOICE_PROFILE');
  const target=resolve(dir),publicAssets=resolve('app/src/main/assets');
  if(target===publicAssets||target.startsWith(publicAssets+sep))throw Error('JARVIX_TTS_CACHE_PUBLIC_DIRECTORY_FORBIDDEN');
 }
 const location=enabled?resolve(dir):null;
 const parsedMax=Number(env.JARVIX_TTS_CACHE_MAX_BYTES);
 const maxBytes=Number.isSafeInteger(parsedMax)&&parsedMax>=44&&parsedMax<=1024**3?parsedMax:1024**3;
 function filename(text,language,subject){
  if(!LANGUAGES.has(language)||typeof text!=='string'||!text.trim()||text.length>300||!subject||!/^[a-f0-9]{64}$/.test(subject))throw Error('INVALID_TTS_CACHE_KEY');
  const value=[profile,subject,language,normalizeTtsText(text)].join('\0');
  return 'dyn_'+language+'_'+createHash('sha256').update(value).digest('hex').slice(0,16)+'.wav';
 }
 async function directory(){
  await mkdir(location,{recursive:true,mode:0o700});
  const s=await lstat(location);
  if(!s.isDirectory()||s.isSymbolicLink())throw Error('UNSAFE_TTS_CACHE_DIRECTORY');
 }
 async function read(text,language,subject){
  if(!enabled)return null;
  const dest=join(location,filename(text,language,subject));
  try{
   const st=await lstat(dest);
   if(!st.isFile()||st.isSymbolicLink()||st.size<44||st.size>MAX_WAV_BYTES)return null;
   const bytes=await readFile(dest);
   if(!validTtsWav(bytes))return null;
   const now=new Date(); await utimes(dest,now,now).catch(()=>{});
   return bytes;
  }catch{return null;}
 }
 async function makeRoom(required,protectedName){
  if(required>maxBytes)throw Error('TTS_CACHE_ITEM_EXCEEDS_CAPACITY');
  const entries=[]; let total=0;
  for(const name of await readdir(location)){
   if(!/^dyn_(ru|en|fr|es)_[a-f0-9]{16}\.wav$/.test(name))continue;
   const file=join(location,name);
   try{const st=await lstat(file);if(!st.isFile()||st.isSymbolicLink())continue;
    entries.push({name,file,size:st.size,lastUsed:st.mtimeMs});total+=st.size;
   }catch{}
  }
  entries.sort((a,b)=>a.lastUsed-b.lastUsed||a.name.localeCompare(b.name));
  for(const row of entries){
   if(total+required<=maxBytes)break;
   if(row.name===protectedName)continue;
   await unlink(row.file).catch(()=>{});total-=row.size;
  }
  if(total+required>maxBytes)throw Error('TTS_CACHE_CAPACITY_EXHAUSTED');
 }
 async function write(text,language,subject,bytes){
  if(!enabled)return false;
  if(!validTtsWav(bytes))throw Error('INVALID_TTS_CACHE_WAV');
  await directory();
  const dest=join(location,filename(text,language,subject));
  const prior=await read(text,language,subject);
  if(prior)return true;
  await makeRoom(bytes.length,filename(text,language,subject));
  const tmp=join(location,'.'+randomUUID()+'.tmp');
  try{
   await writeFile(tmp,bytes,{flag:'wx',mode:0o600});
   try{await link(tmp,dest);}catch(error){if(error.code!=='EEXIST')throw error;}
   return Boolean(await read(text,language,subject));
  }finally{await unlink(tmp).catch(()=>{});}
 }
 return {enabled,filename,read,write};
}
