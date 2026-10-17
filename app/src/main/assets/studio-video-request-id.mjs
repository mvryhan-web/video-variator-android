// BASE #5: never rotate Video requestId after a lost HTTP reply.
// The server's original (user,requestId,fingerprint) idempotency is effective
// only if an identical retry reuses the same id. Store no prompt/media/token.
// Pending claims are per authenticated session and never auto-expire: provider
// submission may remain billable even after a page/browser timeout.
const PREFIX='deepsyq_video_pending_request_v1_';
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function hex(bytes){return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');}
async function digest(value,cryptoApi){
 if(!cryptoApi?.subtle?.digest||typeof TextEncoder!=='function')throw Error('VIDEO_SUBMISSION_SAFETY_UNAVAILABLE');
 return hex(await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(value)));
}
export async function claimVideoRequestId({payload,token,storage,cryptoApi=crypto}={}){
 if(typeof token!=='string'||!token||!storage||typeof payload!=='object'||!payload||
    Array.isArray(payload)||payload.kind!=='video')
  throw Error('VIDEO_SUBMISSION_SAFETY_UNAVAILABLE');
 const scope=await digest(token,cryptoApi);
 const fingerprint=await digest(JSON.stringify(payload),cryptoApi);
 const key=PREFIX+scope.slice(0,32);
 let prior;
 try{
  const raw=storage.getItem(key);
  if(raw){
   if(raw.length>300)throw Error('VIDEO_SUBMISSION_UNRESOLVED');
   prior=JSON.parse(raw);
  }
 }catch(_){throw Error('VIDEO_SUBMISSION_UNRESOLVED');}
 if(prior){
  if(typeof prior!=='object'||!ID.test(prior.requestId||'')||
    !/^[0-9a-f]{64}$/i.test(prior.fingerprint||''))
   throw Error('VIDEO_SUBMISSION_UNRESOLVED');
  if(prior.fingerprint!==fingerprint)throw Error('VIDEO_SUBMISSION_UNRESOLVED');
  return {requestId:prior.requestId,key,reused:true};
 }
 if(typeof cryptoApi.randomUUID!=='function')throw Error('VIDEO_SUBMISSION_SAFETY_UNAVAILABLE');
 const requestId=cryptoApi.randomUUID();
 if(!ID.test(requestId))throw Error('VIDEO_SUBMISSION_SAFETY_UNAVAILABLE');
 try{storage.setItem(key,JSON.stringify({requestId,fingerprint}));}
 catch(_){throw Error('VIDEO_SUBMISSION_SAFETY_UNAVAILABLE');}
 return {requestId,key,reused:false};
}
export function acknowledgeVideoRequestId({storage,key,requestId,jobId}={}){
 if(!storage||typeof key!=='string'||!key.startsWith(PREFIX)||!ID.test(requestId||'')||
    typeof jobId!=='string'||!jobId)return false;
 try{
  const raw=storage.getItem(key);
  if(!raw)return false;
  const prior=JSON.parse(raw);
  if(prior.requestId!==requestId)return false;
  storage.removeItem(key);return true;
 }catch(_){return false;}
}
