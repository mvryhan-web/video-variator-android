import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
for(const enabled of [false,true])test(`platform flag ${enabled}: preserves legacy tool, auth and checkout routes`,async()=>{
 const port=enabled?31792:31791,base=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server/server.js'],{env:{...process.env,PORT:String(port),APP_URL:base,NODE_ENV:'test',DATABASE_URL:'',TELEGRAM_BOT_TOKEN:'',DEEPSYQ_HOME_ENABLED:String(enabled)},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([new Promise((resolve,reject)=>{child.stdout.on('data',d=>{if(String(d).includes('running on'))resolve();});child.on('exit',()=>reject(Error('Server exited before readiness')));}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timeout')),10000).unref())]);
  const get=async path=>{const r=await fetch(base+path);assert.equal(r.status,200);return r.text();};
  // The approved DEEPSYQ Home is the physical index in both flag modes.
  // Legacy checkout/auth return URLs stay reachable without replacing Home.
  for(const route of ['/','/index.html','/?mobileAuth=google','/?checkout=success'])
   assert.match(await get(route),/<title>Deepsyq/);
  // Video Uniquifier remains reachable at its dedicated, owner-approved URL.
  assert.match(await get('/video-uniquifier.html'),/<title>Video Uniquifier/);
  const retired=await fetch(base+'/inspiration.html?kind=video',{redirect:'manual'});assert.equal(retired.status,302);assert.equal(retired.headers.get('location'),'/deepsyq.html#inspirationPreview');
  const dashboard=await get('/dashboard');assert.match(dashboard,/<title>Deepsyq/);
  assert.doesNotMatch(dashboard,/<form id="quickCreateForm"/);
  assert.match(dashboard,/id="canvasExampleGrid"/);
  const canvas=await get('/canvas.html');
  // Canvas uses the existing Canvas Workspace controls, not the retired quick-create form.
  assert.match(canvas,/id="canvasWorkspace"/);
  assert.match(canvas,/id="cwImageMode"/);
  assert.match(canvas,/id="cwVideoMode"/);
  assert.doesNotMatch(canvas,/<form id="quickCreateForm"/);
  assert.equal((await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
 }finally{child.kill();await once(child,'exit');}
});
