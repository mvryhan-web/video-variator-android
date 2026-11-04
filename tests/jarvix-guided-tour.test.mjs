import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from '@playwright/test';

test('TEST owner Jarvix header Tour button starts and closes the real guided tour',async()=>{
 const port=32605,base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server/deepsyq-preview.js'],{
  env:{...process.env,PORT:String(port),NODE_ENV:'test',DATABASE_URL:'',STRIPE_SECRET_KEY:'',
    HF_TOKEN:'',FAL_KEY:'',OPENAI_API_KEY:'',JARVIX_AI_ENABLED:'false'},
  stdio:['ignore','pipe','pipe']
 });
 let stderr='',browser;
 child.stderr.on('data',chunk=>{stderr+=String(chunk)});
 try{
  let ready=false;
  for(let i=0;i<100;i++){
   if(child.exitCode!==null)throw Error('Preview exited: '+stderr);
   try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch(_){}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(ready,'isolated TEST server should start: '+stderr);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900},locale:'ru-RU'});
  await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
  let paidRequests=0;
  page.on('request',request=>{if(/\/api\/(?:billing|studio\/jobs|jarvix\/chat)/.test(request.url())&&request.method()==='POST')paidRequests++;});
  await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
  const tourBtn=page.locator('#topJarvisTourBtn');
  await tourBtn.waitFor({state:'visible'});
  await page.waitForFunction(()=>document.getElementById('topJarvisTourBtn')?.__jarvixTourBound===true,null,{timeout:15000});
  await tourBtn.click();
  const overlay=page.locator('#jarvixTourOverlay');
  await overlay.waitFor({state:'visible',timeout:10000});
  assert.equal(await overlay.evaluate(el=>el.classList.contains('is-active')),true);
  assert.ok((await overlay.locator('#jarvixTourText').innerText()).length>20,'the tour must render its narrated first step');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.getElementById('jarvixTourOverlay')?.classList.contains('is-active'),null,{timeout:10000});
  await tourBtn.click();
  await page.waitForFunction(()=>document.getElementById('jarvixTourOverlay')?.classList.contains('is-active'),null,{timeout:10000});
  await page.locator('#jarvixTourSkip').click();
  await page.waitForFunction(()=>!document.getElementById('jarvixTourOverlay')?.classList.contains('is-active'),null,{timeout:10000});
  assert.equal(paidRequests,0,'tour clicks cannot submit AI or billing jobs');
 }finally{
  if(browser)await browser.close();
  child.kill('SIGTERM');
  if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');
 }
});
