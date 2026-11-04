import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from '@playwright/test';

test('TEST F4 Create button: zero-credit quote -> one job -> image displayed; no paid API',async()=>{
 const port=32593,base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server/deepsyq-preview.js'],{env:{
  ...process.env,PORT:String(port),NODE_ENV:'test',FREE_AI_STUDIO_ENABLED:'true',
  HF_TOKEN:'sentinel-no-network',FAL_KEY:'sentinel-no-network',
  STRIPE_SECRET_KEY:'',DATABASE_URL:'',GEMINI_API_KEY:'',BYTEPLUS_API_KEY:''
 },stdio:['ignore','pipe','pipe']});
 let stderr='',browser;child.stderr.on('data',d=>{stderr+=String(d)});
 try{
  let started=false;
  for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error('Server exited: '+stderr);
   try{if((await fetch(base+'/api/health')).ok){started=true;break}}catch(_){}
   await new Promise(resolve=>setTimeout(resolve,100));}
  assert.ok(started,'TEST server must start: '+stderr);
  const config=await(await fetch(base+'/api/studio/config')).json();
  assert.equal(config.freeTier,true);
  assert.equal(config.previewOnly,true);
  const quote=await fetch(base+'/api/studio/estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'image',model:'gemini-3.1-flash-image',quantity:1,ratio:'1:1'})});
  assert.equal(quote.status,200);
  const q=await quote.json();
  assert.equal(q.kind,'image');assert.equal(q.model,'gemini-3.1-flash-image');assert.equal(q.quantity,1);
  assert.equal(q.credits,0);assert.equal(q.freeTier,true);assert.equal(q.previewOnly,true);
  const invalid=await fetch(base+'/api/studio/estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'image',model:'unknown-paid-model',quantity:1})});
  assert.equal(invalid.status,400);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({locale:'ru-RU'});
  await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
  let posts=0,confirmed=false,confirmationText='';
  page.on('request',req=>{if(req.method()==='POST'&&req.url().endsWith('/api/studio/jobs'))posts++;});
  page.on('dialog',async dialog=>{confirmationText=dialog.message();confirmed=true;await dialog.accept()});
  await page.goto(base+'/generate-studio.html?studio=image',{waitUntil:'domcontentloaded'});
  await page.locator('#prompt').fill('Портрет кота в солнечном саду');
  await page.waitForFunction(()=>!document.querySelector('#generate')?.disabled,null,{timeout:15000});
  await page.locator('#generate').click();
  await page.locator('#media img').waitFor({state:'visible',timeout:20000});
  await page.waitForFunction(()=>{const img=document.querySelector('#media img');return img?.complete&&img.naturalWidth>0},null,{timeout:15000});
  assert.equal(posts,1,'exactly one free preview job must be submitted');
  assert.equal(confirmed,true,'user confirmation must still be explicit');
  assert.match(confirmationText,/SVG|демонстрац/i,'must disclose local fallback, not promise real photo');
  assert.match(await page.locator('#status').innerText(),/Готово|Ready/);
  assert.doesNotMatch(await page.locator('#status').innerText(),/изменились|changed/);
 }finally{if(browser)await browser.close();child.kill('SIGTERM');if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');}
});


test('TEST Studio separation: image only in Images, audio only in Audio, no shared results in Video',async()=>{
 const port=32594,base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server/deepsyq-preview.js'],{env:{
  ...process.env,PORT:String(port),NODE_ENV:'test',FREE_AI_STUDIO_ENABLED:'true',
  HF_TOKEN:'sentinel-no-network',FAL_KEY:'sentinel-no-network',STRIPE_SECRET_KEY:'',
  DATABASE_URL:'',GEMINI_API_KEY:'',BYTEPLUS_API_KEY:''
 },stdio:['ignore','pipe','pipe']});
 let stderr='',browser;child.stderr.on('data',d=>{stderr+=String(d)});
 try{
  let ready=false;
  for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error('Server exited: '+stderr);
   try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch(_){}
   await new Promise(r=>setTimeout(r,100));}
  assert.ok(ready,'preview server must start');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({locale:'ru-RU'});
  await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
  page.on('dialog',dialog=>dialog.accept());
  const go=async(section)=>page.goto(base+'/generate-studio.html?studio='+section,{waitUntil:'domcontentloaded'});
  const create=async(prompt)=>{
   await page.locator('#prompt').fill(prompt);
   await page.waitForFunction(()=>!document.querySelector('#generate')?.disabled,null,{timeout:15000});
   await page.locator('#generate').click();
  };
  const historyCount=async expected=>{
   await page.locator('#showHistory').click();
   await page.waitForFunction(()=>document.querySelector('#historyList')?.textContent&&!document.querySelector('#historyList')?.textContent.includes('Загружаем'),null,{timeout:15000});
   assert.equal(await page.locator('#historyList .history-card').count(),expected);
  };
  await go('image');
  await create('Фотография белого кота в саду');
  await page.locator('#media img').waitFor({state:'visible',timeout:25000});
  const imageId=await page.evaluate(()=>sessionStorage.getItem('vu_generation_job_image'));
  assert.match(imageId||'',/^job_/);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('vu_generation_job_video')),null);
  await page.locator('.studio-nav [data-kind="video"]').click();
  assert.equal(await page.locator('#media img').count(),0,'image result cleared on video switch');
  await historyCount(0);
  await page.locator('.studio-nav [data-kind="music"]').click();
  assert.equal(await page.locator('#media img').count(),0,'image result cleared on audio switch');
  await historyCount(0);
  await page.locator('#showCreate').click();
  await create('Короткий музыкальный сигнал приветствия');
  await page.locator('#media audio').waitFor({state:'visible',timeout:25000});
  assert.equal(await page.locator('#media img').count(),0,'Audio tab must render audio, not SVG image');
  const audioId=await page.evaluate(()=>sessionStorage.getItem('vu_generation_job_audio'));
  assert.match(audioId||'',/^job_/);
  assert.notEqual(imageId,audioId);
  await historyCount(1);
  assert.equal(await page.locator('#historyList .history-card .history-preview[data-kind="music"]').count(),1);
  await page.locator('.studio-nav [data-kind="image"]').click();
  assert.equal(await page.locator('#media audio').count(),0,'audio player cleared on Image switch');
  await historyCount(1);
  assert.equal(await page.locator('#historyList .history-card .history-preview[data-kind="image"]').count(),1);
  await go('video');
  assert.equal(await page.locator('#media img').count(),0,'new Video page does not auto-restore last image');
  await historyCount(0);
  await go('image');
  await page.locator('#media img').waitFor({state:'visible',timeout:25000});
  assert.equal(await page.locator('#media audio').count(),0);
  await go('audio');
  await page.locator('#media audio').waitFor({state:'visible',timeout:25000});
  assert.equal(await page.locator('#media img').count(),0);
  // A pre-upgrade shared job must migrate ONLY inside its real media section.
  await page.evaluate((id)=>{sessionStorage.removeItem('vu_generation_job_image');sessionStorage.setItem('vu_generation_job',id);},imageId);
  await go('video');
  assert.equal(await page.locator('#media img').count(),0,'legacy image must never restore inside Video');
  await go('image');
  await page.locator('#media img').waitFor({state:'visible',timeout:25000});
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('vu_generation_job_image')),imageId);
 }finally{if(browser)await browser.close();child.kill('SIGTERM');if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');}
});
