const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function generationRequestId(value,{required=false}={}){
 if(value==null||value===''){if(required)throw Error('GENERATION_REQUEST_ID_REQUIRED');return null;}
 const id=String(value);if(!UUID.test(id))throw Error('INVALID_GENERATION_REQUEST_ID');return id;
}
export async function findGenerationRequest(client,{userId,requestId,fingerprint}){
 if(!requestId)return null;
 const {rows}=await client.query('SELECT id,status,request_fingerprint,credits_reserved FROM vv_generation_jobs WHERE user_id=$1 AND client_request_id=$2 AND deleted=false',[userId,requestId]);
 if(!rows.length)return null;
 const job=rows[0];if(job.request_fingerprint!==fingerprint)throw Error('GENERATION_REQUEST_CONFLICT');
 return {id:job.id,status:job.status,creditsReserved:Number(job.credits_reserved||0)};
}
