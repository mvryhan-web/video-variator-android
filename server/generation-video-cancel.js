// BASE #5 Video cancellation safety (server-only and NOT publicly wired).
// BytePlus task DELETE has dual semantics: queued -> cancelled,
// succeeded/failed -> permanently DELETE result record.
// A GET queued immediately before DELETE is not atomic: task can complete in
// between. The published API has no documented expected-status precondition.
// Therefore this module is READ-ONLY. NEVER attempt provider DELETE or issue
// a customer credit refund based on this preflight result.
// Reference: https://ai.byteplus.com/ark/region:ap-southeast-1/docs/cancel-or-delete-video-generation-tasks-api
const ROOT='https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/';
const LIMIT=64*1024;
function taskId(operation){
 if(typeof operation!=='string'||!/^byteplus:[-A-Za-z0-9_]{1,160}$/.test(operation))
  throw Error('INVALID_OPERATION');
 return operation.slice('byteplus:'.length);
}
async function jsonBounded(response){
 if(!response?.ok)throw Error('CANCEL_STATUS_UNVERIFIED');
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
export async function inspectBytePlusVideoCancellation(operation,{key,fetcher=fetch}={}){
 const id=taskId(operation);
 if(typeof key!=='string'||!key)throw Error('PROVIDER_KEY_REQUIRED');
 const response=await fetcher(ROOT+id,{method:'GET',headers:{Authorization:'Bearer '+key},
  redirect:'error',signal:AbortSignal.timeout(15000)});
 const status=await jsonBounded(response);
 // Even if status=queued, never give callers a false guarantee: BytePlus's
 // DELETE would destroy a terminal result if the status changed in transit.
 return {canCancel:false,status,reason:status==='queued'?
  'PROVIDER_DELETE_NOT_ATOMIC':'PROVIDER_NOT_QUEUED'};
}
