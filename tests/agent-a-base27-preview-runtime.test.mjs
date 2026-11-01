import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:net';

// Real no-spend isolated Render-style runtime: do not mock the FFmpeg paths.
async function unusedPort(){
 return await new Promise((resolve,reject)=>{
  const s=createServer();
  s.once('error',reject);
  s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});
 });
}
async function liveHealth(url,child){
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw new Error('Preview terminated early with '+child.exitCode);
  try{const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(1200)});if(r.ok)return;}catch(_){}
  await new Promise(resolve=>setTimeout(resolve,160));
 }
 throw new Error('Preview never became healthy');
}
test('A38 isolated DEV serves genuine local FFmpeg binaries without enabling paid APIs or forbidden legacy nav',async()=>{
 const port=await unusedPort(),origin='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server/deepsyq-preview.js'],{
  cwd:process.cwd(),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']
 });
 let output='';
 child.stdout.on('data',chunk=>output+=chunk.toString());
 child.stderr.on('data',chunk=>output+=chunk.toString());
 try{
  await liveHealth(origin,child);
  for(const [suffix,type] of [
   ['/vendor/ffmpeg/ffmpeg.js','javascript'],
   ['/vendor/ffmpeg/ffmpeg-core.js','javascript'],
   ['/vendor/ffmpeg/ffmpeg-core.wasm','wasm']
  ]){
   // HEAD probes actual Express sendFile paths without downloading the 30MB wasm.
   const head=await fetch(origin+suffix,{method:'HEAD'});
   assert.equal(head.status,200,suffix+' not served: '+output);
   assert.match(head.headers.get('content-type')||'',new RegExp(type));
   assert.match(head.headers.get('x-robots-tag')||'',/noindex/);
   assert.equal(head.headers.get('cache-control'),'no-store');
   assert.ok(Number(head.headers.get('content-length'))>1000,suffix+' unexpectedly empty');
  }
  const js=await fetch(origin+'/vendor/ffmpeg/ffmpeg.js');
  assert.equal(js.status,200);
  assert.match(await js.text(),/FFmpegWASM/);
  const html=await fetch(origin+'/index.html');
  assert.equal(html.status,200);
  assert.match(html.headers.get('x-robots-tag')||'',/noindex/);
  const api=await fetch(origin+'/api/studio/jobs',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.equal(api.status,503,'preview must not enable AI/provider paid job creation');
  assert.equal((await api.json()).error,'PREVIEW_ONLY');
  const menu=await readFile('app/src/main/assets/video-uniquifier-reference.js','utf8');
  assert.doesNotMatch(menu,/\['♡','Favorites',null\]/);
  assert.doesNotMatch(menu,/\['◇','Challenges',null\]/);
  assert.match(menu,/\['▤','My Creations'/);
 }finally{
  child.kill('SIGTERM');
 }
});
