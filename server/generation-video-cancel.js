// BASE #5: BytePlus queued-only cancellation *provider protocol*.
// NEVER call this without an authenticated, user-owned, locked Video job and
// an approved purchased-only settlement workflow. No public endpoint wired.
// BytePlus DELETE deletes succeeded/failed records; NEVER send it unless a
// fresh provider GET has established the task is still queued.
// GET -> DELETE races are expected. Only GET-confirmed 'cancelled' is proof.
// Source: https://ai.byteplus.com/ark/region:ap-southeast-1/docs/cancel-or-delete-video-generation-tasks-api
const ROOT='https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/';
const LIMIT=64*1024;
function taskId(operation){
 if(typeof operation!=='string'||!/^byteplus:[-A-Za-z0-9_]{1,160}$/.test(operation))
  throw Error('INVALID_OPERATION');
 return operation.slice('byteplus:'.length);
}
async function jsonBounded(response){
 if(!response.ok)throw Error('CANCEL_STATUS_UNVERIFIED');
 if(Number(response.headers?.get?.('content-length')||0)>LIMIT)throw Error('CANCEL_STATUS_UNVERIFIED');
 const reader=response.body?.getReader?.();
 if(!reader)throw Error('CANCEL_STATUS_UNVERIFIED');
 let length=0;const chunks=[];
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   length+=value.length;if(length>LIMIT)throw Error('CANCEL_STATUS_UNVERIFIED');
   chunks.push(Buffer.from(value));
  }
 }finally{await reader.cancel().catch(()=>{});}
 let data;
 try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
 catch{throw Error('CANCEL_STATUS_UNVERIFIED');}
 if(!data||!['queued','running','succeeded','failed','cancelled','expired'].includes(data.status))
  throw Error('CANCEL_STATUS_UNVERIFIED');
 return data.status;
}
export async function cancelQueuedBytePlusVideo(operation,{key,fetcher=fetch}={}){
 const id=taskId(operation);
 if(typeof key!=='string'||!key)throw Error('PROVIDER_KEY_REQUIRED');
 const url=ROOT+id,headers={Authorization:'Bearer '+key};
 const call=async method=>fetcher(url,{method,headers,redirect:'error',signal:AbortSignal.timeout(15000)});
 // First check. A finished task DELETE is destructive, not cancellation.
 const before=await jsonBounded(await call('GET'));
 if(before!=='queued')return {confirmed:false,reason:'PROVIDER_NOT_QUEUED'};
 // Not a guaranteed cancellation: task can start while request travels.
 const response=await call('DELETE');
 if(!response.ok)return {confirmed:false,reason:'CANCEL_NOT_ACCEPTED'};
 // An HTTP 2xx DELETE alone is NEVER permission to refund/mark cancelled.
 const after=await jsonBounded(await call('GET'));
 if(after!=='cancelled')return {confirmed:false,reason:'CANCEL_NOT_CONFIRMED'};
 return {confirmed:true,status:'cancelled'};
}
