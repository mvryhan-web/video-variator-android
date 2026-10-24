// BASE #5: no-network, read-only server reinspection of private staged inputs.
// NOT an AI provider transport, provider-ready URL, billed quote or generation job.
import {createHash} from 'node:crypto';
import {probeStudioReferenceMedia} from './generation-reference-probe.js';
import {seedance20ReferenceCompatibility} from './generation-reference-compatibility.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const denied=()=>{throw Error('REFERENCE_MEDIA_ACCESS_DENIED');};
const invalid=()=>{throw Error('REFERENCE_MEDIA_INVALID');};
const validUser=id=>typeof id==='string'&&id.length>0&&id.length<=256;
function validAssetIds(ids){
 if(!Array.isArray(ids)||ids.length>3||ids.some(id=>typeof id!=='string'||!UUID.test(id)))invalid();
}
export function createSeedanceStagedReferenceInspector({ledger,probe=probeStudioReferenceMedia}={}){
 if(typeof ledger?.get!=='function'||typeof probe!=='function')throw Error('REFERENCE_INSPECTOR_NOT_CONFIGURED');
 async function inspectInternal({userId,model,imageCount=0,videoAssetIds=[],audioAssetIds=[]}={},captureDigests=false){
  if(!validUser(userId))denied();
  if(model!=='byteplus-seedance-2')return {compatible:false,reason:'REFERENCE_MODEL_NOT_SUPPORTED'};
  validAssetIds(videoAssetIds);validAssetIds(audioAssetIds);
  if(!Number.isInteger(imageCount)||imageCount<0||imageCount>3)invalid();
  const ids=[...videoAssetIds,...audioAssetIds];
  if(!ids.length||new Set(ids).size!==ids.length)invalid();
  const videos=[],audios=[],videoDigests=[];
  // Sequential, bounded GET + ffprobe: never hold six untrusted video buffers at once.
  // Ledger enforces owner, ready state and TTL on every read, never accepts client URLs.
  for(const id of videoAssetIds){
   const bytes=await ledger.get({userId,id});
   if(!Buffer.isBuffer(bytes))denied();
   const metadata=await probe({mime:'video/mp4',bytes});
   if(captureDigests)videoDigests.push(createHash('sha256').update(bytes).digest('hex'));
   videos.push({mime:'video/mp4',size:bytes.length,...metadata});
  }
  for(const id of audioAssetIds){
   const bytes=await ledger.get({userId,id});
   if(!Buffer.isBuffer(bytes))denied();
   const metadata=await probe({mime:'audio/wav',bytes});
   audios.push({mime:'audio/wav',size:bytes.length,...metadata});
  }
  // Return only summarized compatibility metadata, never media bytes, S3 keys,
  // signed fetch links, raw file IDs, or provider request fragments.
  const verdict=seedance20ReferenceCompatibility({model,imageCount,videos,audios});
  return captureDigests?{verdict,videoDigests}:verdict;
 }
 // The ordinary inspector API never reveals media fingerprints. The internal
 // snapshot form is only for our disabled, server-only transfer planner, which
 // rechecks the private bytes before minting any short-lived bearer links.
 const inspect=args=>inspectInternal(args,false);
 const inspectVideoSnapshot=args=>inspectInternal(args,true);
 return {inspect,inspectVideoSnapshot};
}
