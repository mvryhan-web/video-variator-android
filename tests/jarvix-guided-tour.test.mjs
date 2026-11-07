import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from '@playwright/test';

// Real Playwright clicks + deterministic local silent WAV fixtures.
// No AI keys, paid provider, voice clone, user data, or network billing.
function makeWav(){
 const rate=16000,samples=rate*0.27;
 const out=Buffer.alloc(44+samples*2);
 out.write('RIFF',0);out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);
 out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);
 out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);out.writeUInt16LE(2,32);
 out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(samples*2,40);
 return out;
}
async function preview(testPort,fn){
 const child=spawn(process.execPath,['server/deepsyq-preview.js'],{
  env:{...process.env,PORT:String(testPort),NODE_ENV:'test',DATABASE_URL:'',STRIPE_SECRET_KEY:'',OPENAI_API_KEY:'',HF_TOKEN:'',FAL_KEY:'',JARVIX_AI_ENABLED:'false'},
  stdio:['ignore','pipe','pipe']
 });
 let browser;
 try{
  await Promise.race([new Promise((resolve,reject)=>{
   child.stdout.on('data',d=>{if(String(d).includes('design preview running'))resolve();});
   child.on('exit',()=>reject(Error('Preview exited early')));
  }),new Promise((_,reject)=>setTimeout(()=>reject(Error('Preview timeout')),12000))]);
  browser=await chromium.launch({headless:true});
  await fn(browser,'http://127.0.0.1:'+testPort);
 }finally{
  if(browser)await browser.close();
  child.kill('SIGTERM');
  if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');
 }
}

test('V3 tour voice and real actions: spoken Photo section matches opened Image Studio (desktop + mobile)',async()=>{
 await preview(32605,async(browser,base)=>{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport});
   const spoken=[];let paid=0;
   page.on('request',req=>{
    if(req.method()==='POST'&&/\/api\/(?:billing|checkout|studio\/jobs|wallet|generation)/.test(new URL(req.url()).pathname))paid++;
   });
   await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
   await page.route('**/media/jarvix/tour-v3/manifest.json',route=>route.fulfill({status:404,body:''}));
   await page.route('**/api/jarvix/voice-config',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({configured:true,speechModelInstalled:true,speechSource:'self-hosted',engine:'VoxCPM2'})}));
   await page.route('**/api/jarvix/tts',route=>{
    const payload=route.request().postDataJSON();
    spoken.push(payload.text);
    route.fulfill({status:200,contentType:'audio/wav',body:makeWav()});
   });
   try{
    await page.addInitScript(()=>{localStorage.setItem('deepsyq_home_language','ru');});
   await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
    if(viewport.width>760){await page.locator('#dsTakeTour').focus();await page.keyboard.press('Enter');}
    else await page.locator('#dsTakeTour').click();
    await page.locator('.ds-tour-controls').waitFor({state:'visible'});
    assert.equal(await page.locator('.ds-tour-caption,.ds-tour-label').count(),0,'No overlaid transcript or step label');
    assert.equal(await page.locator('#jarvixTourOverlay').count(),0);
    await page.waitForURL(/generate-studio\.html\?studio=image/,{timeout:20000});
    assert.equal(spoken[0],'Привет! Я JARVIX, ваш AI-помощник. Добро пожаловать в DEEPSYQ. Покажу основные возможности платформы.');
    assert.ok(spoken.includes('Изображения.'),'Navigation announces Image before real click');
    await page.locator('#creator.jarvis-tour-spotlight').waitFor({timeout:15000});
    assert.ok(spoken.includes('Создавайте по описанию или добавьте фотографию.'));
    await page.getByRole('button',{name:'Stop',exact:true}).click();
    assert.equal(await page.locator('.ds-tour-controls').count(),0);
    assert.equal(paid,0,'Tour must not submit any paid generation, Stripe or billing request');
   }finally{await page.close();}
  }
 });
});

test('V3 missing owner voice pauses safely; never switches to a different narrator',async()=>{
 await preview(32606,async(browser,base)=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try{
   await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
   await page.route('**/media/jarvix/tour-v3/manifest.json',route=>route.fulfill({status:404,body:''}));
   await page.route('**/api/jarvix/voice-config',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({configured:false,speechModelInstalled:false})}));
   await page.addInitScript(()=>{localStorage.setItem('deepsyq_home_language','ru');});
   await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
   await page.locator('#dsTakeTour').click();
   await page.locator('.ds-tour-controls[data-error*="unavailable"]').waitFor({timeout:12000});
   assert.equal(await page.getByRole('button',{name:'Continue',exact:true}).isVisible(),true);
   assert.equal(await page.locator('.ds-tour-caption').count(),0);
   assert.equal(new URL(page.url()).pathname,'/deepsyq.html');
   await page.getByRole('button',{name:'Stop',exact:true}).click();
  }finally{await page.close();}
 });
});
