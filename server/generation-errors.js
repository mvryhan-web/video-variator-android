import {publicExistingJobRetryable} from './generation-retry-policy.js';

const KNOWN=new Map([
 ['PROVIDER_BUSY',{code:'AI_PROVIDER_BUSY',retryable:true,category:'capacity'}],
 ['PROVIDER_KEY_REQUIRED',{code:'AI_PROVIDER_NOT_CONFIGURED',retryable:false,category:'configuration'}],
 ['MODEL_NOT_CONNECTED',{code:'AI_MODEL_NOT_AVAILABLE',retryable:false,category:'configuration'}],
 ['MODEL_NOT_ENABLED',{code:'AI_MODEL_NOT_AVAILABLE',retryable:false,category:'configuration'}],
 ['MODEL_MAINTENANCE',{code:'AI_MODEL_MAINTENANCE',retryable:true,category:'maintenance'}],
 ['PROVIDER_TASK_FAILED',{code:'AI_GENERATION_REJECTED',retryable:false,category:'provider_terminal'}],
 ['EMPTY_OPERATION',{code:'AI_PROVIDER_RESPONSE_INVALID',retryable:false,category:'provider_response'}],
 ['EMPTY_GENERATION',{code:'AI_RESULT_UNAVAILABLE',retryable:false,category:'provider_output'}],
 ['UNSUPPORTED_PROVIDER_MEDIA',{code:'AI_RESULT_UNAVAILABLE',retryable:false,category:'provider_output'}],
 ['INVALID_PROVIDER_MEDIA',{code:'AI_RESULT_UNAVAILABLE',retryable:false,category:'provider_output'}],
 ['RESULT_TOO_LARGE',{code:'AI_RESULT_TOO_LARGE',retryable:false,category:'provider_output'}],
 ['VIDEO_DOWNLOAD_FAILED',{code:'AI_RESULT_DOWNLOAD_FAILED',retryable:true,category:'provider_download'}],
 ['INVALID_PROVIDER_STATUS',{code:'AI_PROVIDER_STATUS_INVALID',retryable:true,category:'provider_status'}],
 ['UNSAFE_PROVIDER_URL',{code:'AI_PROVIDER_RESULT_BLOCKED',retryable:false,category:'security'}],
 ['OBJECT_STORAGE_FAILED',{code:'AI_STORAGE_FAILED',retryable:true,category:'storage'}]
]);
const SAFE=/^[A-Z0-9_]{2,80}$/;
export function normalizeGenerationError(error,{stage='generation'}={}){
 const raw=String(error?.message||error||'');
 if(error?.name==='AbortError'||raw==='TimeoutError'||/timed out|timeout/i.test(raw))return {code:'AI_PROVIDER_TIMEOUT',retryable:true,category:'timeout',stage,sourceCode:'TIMEOUT'};
 const known=KNOWN.get(raw);
 if(known)return {...known,stage,sourceCode:raw};
 if(raw==='PROVIDER_ERROR')return {code:'AI_PROVIDER_FAILED',retryable:true,category:'provider',stage,sourceCode:raw};
 return {code:'AI_GENERATION_FAILED',retryable:false,category:'unknown',stage,sourceCode:SAFE.test(raw)?raw:'UNKNOWN'};
}
export function publicGenerationError(error,options){const n=normalizeGenerationError(error,options);return {error:n.code,retryable:publicExistingJobRetryable(n)};}
