// Consent-bound read-only polling of a PREEXISTING purchased provider operation.
// Do not create/retry provider generation, refund an uncertain charge or run DDL.
import {withCurrentGenerationConsent} from './generation-consent.js';

export async function pollWithCurrentGenerationConsent({pool,userId,poll,timeoutMs=30000}={}){
 if(typeof poll!=='function')throw Error('PROVIDER_POLL_UNAVAILABLE');
 const maxMs=Number.isFinite(Number(timeoutMs))&&Number(timeoutMs)>=100&&Number(timeoutMs)<=30000?Number(timeoutMs):30000;
 return withCurrentGenerationConsent(pool,userId,async client=>{
  const controller=new AbortController();
  let timer,drainTimer;
  const transport=Promise.resolve().then(()=>{
   controller.signal.throwIfAborted();
   return poll({client,signal:controller.signal});
  });
  try{
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{
    const reason=Error('PROVIDER_POLL_TIMEOUT_UNCERTAIN');
    controller.abort(reason);reject(reason);
   },maxMs);});
   const result=await Promise.race([transport,timeout]);
   controller.signal.throwIfAborted();
   return result;
  }catch(error){
   if(controller.signal.aborted){
    // Native HTTP and media stream must consume the same signal. Never keep
    // the per-user PG advisory lock indefinitely if the remote peer stalls.
    await Promise.race([transport.then(()=>{},()=>{}),new Promise(resolve=>{
     drainTimer=setTimeout(resolve,250);
    })]);
    throw Error('PROVIDER_POLL_TIMEOUT_UNCERTAIN');
   }
   throw error;
  }finally{
   clearTimeout(timer);clearTimeout(drainTimer);
  }
 });
}
