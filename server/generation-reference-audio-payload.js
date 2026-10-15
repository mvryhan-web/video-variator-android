// BASE #5: server-private, inert audio payload preparation for future ModelArk review.
// NEVER register this as an HTTP route or pass its output to a paid provider without
// separate authenticated visual proof, approved model pricing and wallet reservation.
// BytePlus docs: audio_url.url supports data:audio/wav;base64,... ; role=reference_audio.
// Video media transfer stays unsupported here (no public/guessable S3 URLs).
import {probeStudioReferenceMedia} from './generation-reference-probe.js';
import {seedance20ReferenceCompatibility} from './generation-reference-compatibility.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MAX_AUDIO_BYTES=1024*1024; // 1 MiB per WAV, stricter than ModelArk's 15 MB.
const MAX_JSON_BYTES=5*1024*1024; // Headroom below ModelArk's total 64 MB request cap.
const reject=reason=>{throw Error(reason);};
export function seedanceAudioPayloadEnabled(env={}){
 return env.AI_STUDIO_REFERENCE_AUDIO_PAYLOAD_ENABLED==='true'&&
  env.AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED==='true';
}
export function createSeedanceAudioPayloadPreparer({ledger,probe=probeStudioReferenceMedia,verifyVisualContext,env=process.env}={}){
 if(typeof ledger?.get!=='function'||typeof probe!=='function'||typeof verifyVisualContext!=='function')reject('REFERENCE_AUDIO_PREPARER_NOT_CONFIGURED');
 async function prepare({userId,model,audioAssetIds=[]}={}){
  if(!seedanceAudioPayloadEnabled(env))reject('REFERENCE_AUDIO_PAYLOAD_DISABLED');
  if(typeof userId!=='string'||!userId||userId.length>256)reject('REFERENCE_MEDIA_ACCESS_DENIED');
  if(model!=='byteplus-seedance-2')reject('REFERENCE_MODEL_NOT_SUPPORTED');
  // Visual proof must be looked up server-side, not accepted as client input.
  const verifiedImageCount=await verifyVisualContext({userId,model});
  if(!Number.isInteger(verifiedImageCount)||verifiedImageCount<1||verifiedImageCount>3)
   reject('REFERENCE_VISUAL_PROOF_REQUIRED');
  if(!Array.isArray(audioAssetIds)||audioAssetIds.length<1||audioAssetIds.length>3||
    audioAssetIds.some(id=>typeof id!=='string'||!UUID.test(id))||
    new Set(audioAssetIds).size!==audioAssetIds.length)
   reject('REFERENCE_MEDIA_INVALID');

  const contents=[],metadata=[];
  let estimatedBytes=0;
  for(const id of audioAssetIds){
   // The ledger enforces this owner's UUID, ready status and non-expired TTL.
   // No client URL, user-provided MIME/codec, storage key or audio bytes accepted.
   const bytes=await ledger.get({userId,id});
   if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>MAX_AUDIO_BYTES)
    reject('REFERENCE_AUDIO_TOO_LARGE_FOR_BASE64');
   const inspected=await probe({mime:'audio/wav',bytes});
   metadata.push({mime:'audio/wav',size:bytes.length,...inspected});
   const verdict=seedance20ReferenceCompatibility({model,imageCount:verifiedImageCount,audios:metadata});
   if(!verdict.compatible)reject(verdict.reason);
   const base64Length=Math.ceil(bytes.length/3)*4;
   estimatedBytes+=base64Length+128;
   if(estimatedBytes>MAX_JSON_BYTES)reject('REFERENCE_AUDIO_PAYLOAD_TOO_LARGE');
   contents.push({type:'audio_url',audio_url:{url:'data:audio/wav;base64,'+bytes.toString('base64')},role:'reference_audio'});
  }
  const verdict=seedance20ReferenceCompatibility({model,imageCount:verifiedImageCount,audios:metadata});
  if(!verdict.compatible)reject(verdict.reason);
  const serializedBytes=Buffer.byteLength(JSON.stringify(contents));
  if(serializedBytes>MAX_JSON_BYTES)reject('REFERENCE_AUDIO_PAYLOAD_TOO_LARGE');
  // This object is sensitive: never expose it in API responses, history or logs.
  return {content:contents,estimatedJsonBytes:serializedBytes,transport:'server-only-base64',providerSubmitted:false};
 }
 return {prepare};
}
