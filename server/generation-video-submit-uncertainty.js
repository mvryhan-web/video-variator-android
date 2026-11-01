// BASE #5: A network/HTTP/storage failure during paid VIDEO submission can
// occur after the provider already accepted the request. No automatic retry,
// false "failed" status, premature wallet release or phantom operation ID.
// Keep the original immutable job visible for owner review and authenticated
// one-shot History status checks. This does not attempt provider reconciliation.
export const VIDEO_SUBMISSION_UNCERTAIN='STATUS_UNKNOWN_NO_AUTOMATIC_RETRY';
export async function quarantineUncertainVideoSubmit({pool,jobId,failure}){
 if(typeof jobId!=='string'||!jobId)throw Error('INVALID_JOB_ID');
 if(!pool||typeof pool.query!=='function')throw Error('STUDIO_STORAGE_UNAVAILABLE');
 const {rows,rowCount}=await pool.query(`UPDATE vv_generation_jobs
 SET status='processing',error=$2,error_message='AI_PROVIDER_SUBMISSION_UNCERTAIN',
     failed_at=NULL,metadata=COALESCE(metadata,'{}'::jsonb)||
       jsonb_build_object('providerSubmitUncertain',true,'failure',
         jsonb_build_object('category',$3::text,'stage',$4::text,'sourceCode',$5::text,'retryable',false))
 WHERE id=$1 AND kind='video' AND status IN ('queued','processing') AND operation IS NULL AND deleted=false
 RETURNING id`,[jobId,VIDEO_SUBMISSION_UNCERTAIN,
  String(failure?.category||'unknown').slice(0,64),
  'provider_submit',String(failure?.sourceCode||'UNKNOWN').slice(0,80)]);
 // A worker may already have persisted an operation or terminal result. Never
 // overwrite either or create a second provider call from this function.
 return {quarantined:Number(rowCount??rows?.length??0)===1};
}


// Present stale/ambiguous queued or processing VIDEO submissions in History without
// changing database/wallet state. Original server operation stays private.
export function videoHistoryPublicStatus(job,{nowMs=Date.now()}={}){
 const status=job?.status??null,error=job?.error??null;
 if(job?.kind!=='video'||!['queued','processing'].includes(status)||job.operation)
  return {status,error};
 const createdMs=Date.parse(job.created_at);
 const stale=Number.isFinite(createdMs)&&Number.isFinite(nowMs)&&
  nowMs-createdMs>180000;
 return {status,error:error===VIDEO_SUBMISSION_UNCERTAIN||stale?
  VIDEO_SUBMISSION_UNCERTAIN:error};
}
