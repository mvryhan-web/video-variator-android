import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import http from 'node:http';
import {readFile} from 'node:fs/promises';

test('isolated Deepsyq preview serves the current Canvas UI and disables paid endpoints',async()=>{
 const port=31896,base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server/deepsyq-preview.js'],{
  env:{...process.env,PORT:String(port),DATABASE_URL:'',APP_JWT_SECRET:'',STRIPE_SECRET_KEY:'',GEMINI_API_KEY:'',BYTEPLUS_API_KEY:''},
  stdio:['ignore','pipe','pipe']
 });
 let stderr='';
 child.stderr.on('data',chunk=>{stderr+=String(chunk);});
 try{
  await Promise.race([
   new Promise((resolve,reject)=>{
    child.stdout.on('data',d=>{if(String(d).includes('design preview running'))resolve();});
    child.on('exit',code=>reject(Error('Preview exited: '+code+' '+stderr)));
   }),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('Preview server startup timed out: '+stderr)),10000))
  ]);
  const home=await fetch(base+'/');
  assert.equal(home.status,200);assert.match(home.headers.get('x-robots-tag')||'',/noindex/);
  const html=await home.text();
  assert.match(html,/<title>Deepsyq/);
  assert.doesNotMatch(html,/id="quickCreatePrompt"/);
  assert.match(html,/id="canvasExampleGrid"/);
  const canvas=await fetch(base+'/canvas.html');
  assert.equal(canvas.status,200);
  const canvasHtml=await canvas.text();
  assert.match(canvasHtml,/id="canvasWorkspace"/);
  assert.match(canvasHtml,/id="cwImageMode"/);
  assert.match(canvasHtml,/id="cwVideoMode"/);
  assert.doesNotMatch(canvasHtml,/id="quickCreatePrompt"|id="quickCreateFiles"/);
  // Owner removed the visual banner; endpoint isolation remains enforced below.
  assert.doesNotMatch(html,/deepsyq-preview-notice|Deepsyq design preview · Work in progress/);
  assert.match(html,/<body class="home-neon">/);
  assert.match(html,/id="createWithDeepsyq"/);
  for(const name of ['audio','agent','apps','canvas']){
   const art=await fetch(base+'/media/home/neon-20261018/'+name+'.webp');
   assert.equal(art.status,200);assert.match(art.headers.get('content-type'),/image\/webp/);
   assert.equal(art.headers.get('cache-control'),'public, max-age=3600, must-revalidate');
   assert.match(art.headers.get('x-robots-tag')||'',/noindex/);
  }
  const js=await fetch(base+'/home-experience.js');
  assert.equal(js.status,200);assert.equal(js.headers.get('cache-control'),'no-cache');
  const etag=js.headers.get('etag');assert.ok(etag,'UI JavaScript should include validator');
  const unchanged=await new Promise((resolve,reject)=>{
   // Node's fetch auto-adds no-cache on conditional requests and disables
   // RFC freshness handling; exercise a browser-equivalent raw HTTP validator.
   const request=http.get(base+'/home-experience.js',{headers:{'If-None-Match':etag}},response=>{
    response.resume();response.on('end',()=>resolve(response));
   });request.on('error',reject);
  });
  assert.equal(unchanged.statusCode,304,'unchanged UI JS should return ETag/304 without a full response body');
  assert.equal((await fetch(base+'/deepsyq.html')).headers.get('cache-control'),'no-store','do not cache HTML');
  assert.equal((await fetch(base+'/api/config')).headers.get('cache-control'),'no-store','do not cache API JSON');
  const cfg=await(await fetch(base+'/api/config')).json();
  assert.equal(cfg.billingConfigured,false);
  assert.equal(cfg.googleClientId,'');
  assert.equal(cfg.features.aiApps,true);
  const models=await(await fetch(base+'/api/studio/config')).json();
  assert.equal(models.enabled,false);
  assert.ok(models.catalog.length>0);
  assert.ok(models.catalog.every(m=>m.enabled===false));
  const jarvixMap=await(await fetch(base+'/api/jarvix/site-map')).json();
  assert.equal(jarvixMap.ok,true);
  assert.ok(jarvixMap.pages.some(page=>page.path==='/generate-studio.html'));
  assert.ok(jarvixMap.pages.some(page=>page.path==='/jarvix-studio.html'));
  const dialog=await(await fetch(base+'/api/jarvix/chat',{method:'POST',headers:{'content-type':'application/json',cookie:'ds_jarvix_visitor=11111111-1111-1111-1111-111111111111'},body:JSON.stringify({sessionId:'preview-memory-test',message:'Хочу создать изображение Порше',language:'ru'})})).json();
  assert.equal(dialog.provider,'jarvix-mock-brain');
  assert.equal(dialog.audioUrl,null);
  assert.match(dialog.compiledPrompt,/Porsche/i);
  const followup=await(await fetch(base+'/api/jarvix/chat',{method:'POST',headers:{'content-type':'application/json',cookie:'ds_jarvix_visitor=11111111-1111-1111-1111-111111111111'},body:JSON.stringify({sessionId:'preview-memory-test',message:'Сделай его чёрным',language:'ru'})})).json();
  assert.match(followup.compiledPrompt,/Porsche/i,'memory must retain the prior concept');
  assert.equal(followup.entities.color,'black');
  const other=await(await fetch(base+'/api/jarvix/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:'preview-memory-test',message:'Сделай его чёрным',language:'ru'})})).json();
  assert.doesNotMatch(other.compiledPrompt,/Porsche/i,'another visitor cannot read a guessed conversation ID');
  assert.equal((await fetch(base+'/api/jarvix/reset',{method:'POST',headers:{'content-type':'application/json',cookie:'ds_jarvix_visitor=11111111-1111-1111-1111-111111111111'},body:JSON.stringify({sessionId:'preview-memory-test'})})).status,200);
  assert.equal((await fetch(base+'/api/jarvix/chat',{method:'POST',headers:{'content-type':'application/json',cookie:'ds_jarvix_visitor=11111111-1111-1111-1111-111111111111'},body:JSON.stringify({sessionId:'preview-memory-test',message:'Открой студию',language:'en'})})).status,200);
  assert.equal((await fetch(base+'/api/jarvix/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'x'.repeat(2001)})})).status,400);
  const templates=(await(await fetch(base+'/api/templates')).json()).items;
  assert.equal(templates.length,8,'the approved Creative50 catalog publishes eight AI Apps');
  assert.ok(templates.every(item=>item.active===true&&item.generationType==='image'&&item.defaultModel===null&&item.promptTemplate.length>80),'templates are editable prompts, not an enabled paid model');
  assert.equal((await fetch(base+'/ai-apps.html')).status,200);
  for(const path of ['/api/billing/checkout','/api/studio/jobs','/api/auth/google']){
   const response=await fetch(base+path,{method:'POST'});
   assert.equal(response.status,503,path);
   assert.equal((await response.json()).error,'PREVIEW_ONLY');
  }
  assert.equal((await fetch(base+'/api/me')).status,503);
  const feed=await(await fetch(base+'/api/inspiration?featured=true&kind=video&target=studio&limit=13')).json();
  assert.deepEqual(feed.items.map(item=>item.title),['Close-up woman','Futuristic portal','Underwater woman','Neon motorcycle','Whale among the clouds','Golden forest']);
  assert.equal(feed.items.some(item=>item.previewUrl.includes('red-gown')),false);
  for(const item of feed.items){
   assert.equal(item.sourceFilename,undefined,'do not expose private attachment metadata');
   const media=await fetch(base+item.previewUrl,{headers:{Range:'bytes=0-127'}});
   assert.equal(media.status,206);assert.match(media.headers.get('content-type'),/video\/mp4/);
   assert.equal(media.headers.get('cache-control'),'public, max-age=3600, must-revalidate','media caching must preserve byte-range playback');
   assert.equal((await media.arrayBuffer()).byteLength,128);
  }
  const gallery=await(await fetch(base+'/api/inspiration?featured=true&limit=60')).json();
  const nextGallery=await(await fetch(base+'/api/inspiration?featured=true&limit=60&offset=60')).json();
  assert.equal(gallery.pagination.hasMore,true,'the extended owner gallery must paginate without hiding original cards');
  const images=[...gallery.items,...nextGallery.items].filter(item=>item.kind==='image');
  assert.equal(images.length,87,'retain 38 original image cards plus the earlier 21 and current 28 owner-requested DEV-preview cards');
  assert.equal(images.some(image=>/focus|toast/i.test(image.title+' '+image.slug)),false,'duplicate Focus and clinking-glasses scene are excluded');
  for(const image of images){
   assert.equal(image.featured,true);
   assert.ok(image.prompt.length>80,'each image has a usable prompt');
   const asset=await fetch(base+image.previewUrl);
   assert.equal(asset.status,200,image.previewUrl);
   assert.match(asset.headers.get('content-type')||'',/image\/webp/,image.previewUrl);
   assert.ok((await asset.arrayBuffer()).byteLength>10000,image.previewUrl);
  }
  const retired=await fetch(base+'/inspiration.html',{redirect:'manual'});assert.equal(retired.status,302);assert.equal(retired.headers.get('location'),'/deepsyq.html#inspirationPreview');
  const approvedImages=JSON.parse(await readFile(new URL('../app/src/main/assets/media/inspiration/openai-20261021/manifest.json',import.meta.url),'utf8')).items;
  const newOwner=JSON.parse(await readFile(new URL('../app/src/main/assets/media/inspiration/owner-20261031/manifest.json',import.meta.url),'utf8')).items;
  const latestOwner=JSON.parse(await readFile(new URL('../app/src/main/assets/media/inspiration/owner-next-20261031/manifest.json',import.meta.url),'utf8')).items;
  assert.deepEqual(images.map(item=>item.slug).sort(),[...approvedImages.filter(item=>item.featured),...newOwner.filter(item=>item.featured),...latestOwner.filter(item=>item.featured)].map(item=>item.slug).sort(),'preserve approved originals and add both separately approved DEV-only owner collections');
  assert.equal((await(await fetch(base+'/api/inspiration?featured=true&target=agent')).json()).items.length,0);
  assert.equal((await fetch(base+'/api/inspiration',{method:'POST'})).status,503);


  // A design preview must stay safe even after production adds new payment,
  // generation, admin or signup endpoints. Exercise representative surfaces
  // through the real isolated HTTP server (no Stripe/provider/database).
  const health=await fetch(base+'/api/health');
  assert.equal(health.status,200);
  assert.deepEqual(await health.json(),{
   ok:true,service:'deepsyq-design-preview',paymentsEnabled:false,aiGenerationEnabled:false
  });
  for(const route of ['/api/me','/api/ai-wallet/balance','/api/studio/admin/business',
                      '/api/studio/jobs','/api/billing/checkout','/api/auth/email/login']){
   const response=await fetch(base+route);
   assert.equal(response.status,503,'GET '+route);
   assert.equal((await response.json()).error,'PREVIEW_ONLY','GET '+route);
  }
  for(const route of ['/api/studio/generate','/api/ai-wallet/welcome',
                      '/api/studio/jobs','/api/auth/email/login',
                      '/api/billing/checkout','/api/webhooks/stripe']){
   const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
   assert.equal(response.status,503,'POST '+route);
   assert.equal((await response.json()).error,'PREVIEW_ONLY','POST '+route);
  }
  const robots=await fetch(base+'/robots.txt');
  assert.equal(robots.status,200);
  assert.match(await robots.text(),/Disallow:\s*\//);
  for(const route of ['/','/deepsyq.html','/deepsyq-logo.png','/deepsyq.webmanifest']){
   const response=await fetch(base+route);
   assert.equal(response.status,200,route);
   assert.match(response.headers.get('x-robots-tag')||'',/noindex/i,route);
   assert.equal(response.headers.get('cache-control'),'no-store',route);
   assert.equal(response.headers.get('x-content-type-options'),'nosniff',route);
  }
  const logo=await fetch(base+'/deepsyq-logo.png');
  assert.match(logo.headers.get('content-type')||'',/image\/png/);
  const magic=new Uint8Array(await logo.arrayBuffer()).slice(0,8);
  assert.deepEqual([...magic],[137,80,78,71,13,10,26,10],'approved original PNG must render');
  const manifestResponse=await fetch(base+'/deepsyq.webmanifest');
  assert.equal(manifestResponse.status,200);
  const manifest=await manifestResponse.json();
  assert.equal(manifest.short_name,'Deepsyq');
  assert.equal(manifest.start_url,'/deepsyq.html');
  for(const icon of manifest.icons){
   const response=await fetch(base+'/'+icon.src);
   assert.equal(response.status,200,'Missing PWA brand image: '+icon.src);
   assert.match(response.headers.get('content-type')||'',/image\/png/);
  }
  const legacy=await(await fetch(base+'/manifest.webmanifest')).json();
  // Both PWA manifest URLs now identify the approved DEEPSYQ app.
  // The legacy video tool still has its own public URL and title.
  assert.equal(legacy.short_name,'Deepsyq');
  assert.equal(legacy.start_url,'/');
  const videoTool=await fetch(base+'/video-uniquifier.html');
  assert.equal(videoTool.status,200);
  assert.match(await videoTool.text(),/<title>Video Uniquifier/);
  const forbidden=await fetch(base+'/.env');
  assert.equal(forbidden.status,404,'preview must not expose project-level secrets');

 }finally{
  child.kill();
  if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');
 }
});
