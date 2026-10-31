#!/usr/bin/env node
// Manual owner-approved disposable S3 protocol check, NEVER a deployment step.
// Default '--plan' mode is purely offline and does not read fixture files,
// access S3, call BytePlus, create jobs or access the existing production DB.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
 assessReferenceS3CloudAcceptance,executeReferenceS3CloudAcceptance
} from '../server/generation-reference-cloud-acceptance.js';

const execFileAsync=promisify(execFile);
async function makeFixture(){
 const dir=await mkdtemp(join(tmpdir(),'deepsyq-s3-accept-'));
 try{
  const file=join(dir,'acceptance.mp4');
  await execFileAsync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=320x180:r=24',
   '-t','2','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an','-y',file],
   {timeout:20000,maxBuffer:16*1024,windowsHide:true});
  return await readFile(file);
 }finally{await rm(dir,{recursive:true,force:true});}
}
const args=process.argv.slice(2);
if(args.length>1||!['--plan','--execute'].includes(args[0]||'--plan')){
 process.stdout.write(JSON.stringify({status:'invalid-argument',allowed:['--plan','--execute']})+'\n');
 process.exitCode=2;
}else if(args[0]!=='--execute'){
 // Do not interpolate env vars in output; errors are opaque codes only.
 process.stdout.write(JSON.stringify(assessReferenceS3CloudAcceptance(process.env))+'\n');
}else{
 try{
  const result=await executeReferenceS3CloudAcceptance({env:process.env,fixture:makeFixture});
  process.stdout.write(JSON.stringify(result)+'\n');
 }catch(e){
  // NEVER include signed URLs, full error objects, fetch errors, credentials,
  // S3 response XML or object names in CI logs/stdout.
  const reason=typeof e?.message==='string'&&/^REFERENCE_S3_ACCEPTANCE_[A-Z_]+$/.test(e.message)?
   e.message:'REFERENCE_S3_ACCEPTANCE_FAILED';
  process.stdout.write(JSON.stringify({status:'blocked-or-failed',reason})+'\n');
  process.exitCode=1;
 }
}
