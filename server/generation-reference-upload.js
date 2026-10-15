// BASE #5: isolated, owner-only HTTP pilot for private MP4/PCM-WAV staging.
// No media is exposed to any AI provider, generation job, or public URL.
import express from 'express';
import {createGenerationReferenceLedger} from './generation-reference-ledger.js';
import {inspectStudioReferenceMedia,STUDIO_REFERENCE_MEDIA_LIMITS} from './generation-reference-media.js';
import {probeStudioReferenceMedia} from './generation-reference-probe.js';

const RAW_TYPES=new Set(Object.keys(STUDIO_REFERENCE_MEDIA_LIMITS));
const raw=express.raw({type:['video/mp4','audio/wav'],limit:'20mb',inflate:false});
const rawBody=(req,res,next)=>raw(req,res,error=>{
 if(!error)return next();
 return res.status(error.status===413?413:400).json({error:error.status===413?'REFERENCE_MEDIA_TOO_LARGE':'REFERENCE_UPLOAD_BODY_INVALID'});
});

export function installGenerationReferenceUpload(app,{auth,owner,pool,storage,env=process.env,ledger,probe=probeStudioReferenceMedia}={}){
 if(typeof auth!=='function'||typeof owner!=='function')throw Error('REFERENCE_UPLOAD_AUTH_REQUIRED');
 const references=ledger||createGenerationReferenceLedger({pool,storage,env,maxActiveUploads:2});
 // Bound in-flight intake BEFORE buffering up to 20 MiB or launching ffprobe.
 // This is per-process admission control, not the durable cross-worker quota in
 // PostgreSQL. No global middleware or unauthenticated API routes are changed.
 const activeByOwner=new Map();
 function admitReferenceUpload(req,res,next){
  const userId=req.user?.id;
  if(typeof userId!=='string'||!userId||userId.length>256)
   return res.status(403).json({error:'REFERENCE_MEDIA_ACCESS_DENIED'});
  const active=activeByOwner.get(userId)||0;
  if(active>=2)return res.status(429).json({error:'REFERENCE_UPLOAD_BUSY'});
  activeByOwner.set(userId,active+1);
  let released=false;
  const release=()=>{
   if(released)return;
   released=true;
   const n=(activeByOwner.get(userId)||1)-1;
   if(n>0)activeByOwner.set(userId,n);else activeByOwner.delete(userId);
  };
  // A client abort during body parsing must release its slot. A disconnect
  // during FFprobe/S3 must NOT release it until the work actually completes.
  req.releaseReferenceUpload=release;
  res.once('finish',()=>{if(!req.referenceUploadWorkStarted)release();});
  res.once('close',()=>{if(!req.referenceUploadWorkStarted)release();});
  next();
 }
 // This is NOT a public uploader: owner-only until independent codec/malware
 // scanning, trusted provider transport and commercial pricing are verified.
 app.post('/api/studio/references',auth,owner,(req,res,next)=>{
  if(env.AI_STUDIO_REFERENCE_UPLOAD_ENABLED!=='true'||env.AI_STUDIO_ENABLED!=='true')
   return res.status(503).json({error:'REFERENCE_UPLOAD_DISABLED'});
  const mime=String(req.headers['content-type']||'').toLowerCase().trim();
  if(!RAW_TYPES.has(mime))return res.status(415).json({error:'REFERENCE_MEDIA_TYPE_UNSUPPORTED'});
  const encoding=String(req.headers['content-encoding']||'identity').toLowerCase();
  if(encoding!=='identity')return res.status(415).json({error:'REFERENCE_COMPRESSION_UNSUPPORTED'});
  const length=req.headers['content-length'];
  if(length!=null&&(!/^\d+$/.test(length)||Number(length)>STUDIO_REFERENCE_MEDIA_LIMITS[mime]))
   return res.status(413).json({error:'REFERENCE_MEDIA_TOO_LARGE'});
  req.referenceMime=mime;
  next();
 },admitReferenceUpload,rawBody,async(req,res)=>{
  if(!Buffer.isBuffer(req.body)||!req.body.length)return res.status(400).json({error:'REFERENCE_MEDIA_INVALID'});
  if(req.body.length>STUDIO_REFERENCE_MEDIA_LIMITS[req.referenceMime])
   return res.status(413).json({error:'REFERENCE_MEDIA_TOO_LARGE'});
  req.referenceUploadWorkStarted=true;
  try{
   // Parse the actual bytes before any database or object-storage write.
   inspectStudioReferenceMedia({mime:req.referenceMime,bytes:req.body});
   // Fail closed if ffprobe is missing or the actual codec is unsupported.
   await probe({mime:req.referenceMime,bytes:req.body});
   const asset=await references.stage({userId:String(req.user?.id||''),mime:req.referenceMime,bytes:req.body});
   // Never return a signed URL or begin a provider call.
   res.status(201).json({asset,stagedOnly:true,providerReady:false});
  }catch(e){
   const error=e?.message||'';
   if(error==='REFERENCE_MEDIA_INVALID')return res.status(400).json({error});
   if(error==='REFERENCE_MEDIA_CODEC_UNSUPPORTED')return res.status(415).json({error});
   if(error==='REFERENCE_UPLOAD_LIMIT')return res.status(429).json({error});
   res.status(503).json({error:'REFERENCE_UPLOAD_UNAVAILABLE'});
  }finally{
   // The request may be gone; the scarce probe/S3 slot stays occupied until
   // this operation is actually finished, including failure paths.
   req.releaseReferenceUpload?.();
  }
 });
 return {references};
}
