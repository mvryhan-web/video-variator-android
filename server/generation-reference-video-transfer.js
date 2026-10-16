// BASE #5: offline, server-only signed video URL PREPARATION, not dispatch.
// Presigned URLs are bearer secrets: never log, persist, or expose to users.
// No route imports this helper. No S3 bucket becomes public.
import {createSeedanceStagedReferenceInspector} from './generation-reference-inspector.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const reject=reason=>{throw Error(reason);};
export function referenceVideoTransferEnabled(env={}){
 return env.AI_STUDIO_REFERENCE_VIDEO_PRESIGN_ENABLED==='true'&&
  env.AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED==='true';
}
export function createSeedanceVideoTransferPlanner({
 ledger,storage,env=process.env
}={}){
 if(typeof ledger?.get!=='function'||typeof ledger?.getForVideoTransfer!=='function'||
  typeof storage?.presignStagedReferenceRead!=='function')
  reject('REFERENCE_VIDEO_PLANNER_NOT_CONFIGURED');
 // The signer must NEVER accept an injected/precomputed "compatible" verdict.
 // Always fetch owner-scoped private bytes and run the actual local ffprobe
 // through our internal inspector before minting a bearer S3 GET capability.
 const review=createSeedanceStagedReferenceInspector({ledger});
 async function prepare({userId,model,videoAssetIds=[]}={}){
  if(!referenceVideoTransferEnabled(env))reject('REFERENCE_VIDEO_TRANSFER_DISABLED');
  if(typeof userId!=='string'||!userId||userId.length>256)
   reject('REFERENCE_MEDIA_ACCESS_DENIED');
  if(model!=='byteplus-seedance-2')reject('REFERENCE_MODEL_NOT_SUPPORTED');
  if(!Array.isArray(videoAssetIds)||videoAssetIds.length<1||videoAssetIds.length>3||
     videoAssetIds.some(id=>typeof id!=='string'||!UUID.test(id))||
     new Set(videoAssetIds).size!==videoAssetIds.length)
   reject('REFERENCE_MEDIA_INVALID');
  // Only trusted bytes obtained via owner+ready+unexpired ledger.get can pass.
  const verdict=await review.inspect({userId,model,imageCount:0,videoAssetIds});
  if(!verdict.compatible)reject(verdict.reason);
  // Complete ALL asynchronous owner/state/TTL lookups before starting to
  // mint short-lived bearer URLs. A slow second/third database lookup must
  // never consume the first link's 30-second provider-fetch window.
  const candidates=[];
  for(const id of videoAssetIds){
   const asset=await ledger.getForVideoTransfer({userId,id});
   if(asset?.mime!=='video/mp4')reject('REFERENCE_MEDIA_ACCESS_DENIED');
   candidates.push(asset);
  }
  // Storage validates the owner-hashed key, approved HTTPS host, both gates,
  // and remaining asset lifetime again at the precise moment of signing.
  // No await between signs: links are created in one synchronous final phase.
  const content=[];
  let earliestExpiration=null;
  for(const asset of candidates){
   const link=storage.presignStagedReferenceRead({
    userId,key:asset.key,expiresAt:asset.expiresAt,seconds:30
   });
   if(!link?.url||!link?.expiresAt)reject('REFERENCE_VIDEO_URL_UNAVAILABLE');
   const expires=new Date(link.expiresAt);
   if(!Number.isFinite(expires.getTime()))reject('REFERENCE_VIDEO_URL_UNAVAILABLE');
   earliestExpiration=earliestExpiration===null||expires.getTime()<earliestExpiration.getTime()?
    expires:earliestExpiration;
   content.push({type:'video_url',video_url:{url:link.url},role:'reference_video'});
  }
  // NOTE: 30 seconds may be insufficient for provider-side asynchronous fetch.
  // Before any paid dispatch, test fetch timing and obtain consent/pricing and
  // short-lived transport approval. Do not reuse/persist this object.
  return {content,expiresAt:earliestExpiration.toISOString(),providerSubmitted:false,
   transport:'server-only-presigned-s3-get'};
 }
 return {prepare};
}
