import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';import {chromium} from '@playwright/test';
// Current owner contract: no overlay; dedicated Tour, pulsing intro before navigation,
// accessible Pause/Continue/Stop. This replaces the retired topJarvisTourBtn/HUD contract.
test('TEST guided tour greets before opening navigation and supports pause/continue/stop without AI jobs',async()=>{
 const base='http://127.0.0.1:32605';const child=spawn(process.execPath,['server/deepsyq-preview.js'],{env:{...process.env,PORT:'32605',NODE_ENV:'test',DATABASE_URL:'',STRIPE_SECRET_KEY:'',HF_TOKEN:'',FAL_KEY:'',OPENAI_API_KEY:'',JARVIX_AI_ENABLED:'false'},stdio:['ignore','pipe','pipe']});let browser;
 try{await new Promise((yes,no)=>{child.stdout.on('data',d=>{if(String(d).includes('design preview running'))yes();});child.on('exit',()=>no(Error('Preview exited')));});browser=await chromium.launch({headless:true});
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport});let submittedJobs=0;page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(billing|studio\/jobs|jarvix\/chat)/.test(r.url()))submittedJobs++;});
   await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'application/javascript',body:''}));
   await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});await page.locator('#dsTakeTour').click();
   await page.locator('.ds-tour-controls').waitFor({state:'visible'});
   assert.equal(await page.locator('#jarvixTourOverlay').count(),0);
   assert.equal(await page.locator('#topJarvisBtn').evaluate(e=>e.classList.contains('ds-tour-speaking')),true);
   await page.waitForTimeout(2500);
   assert.equal(new URL(page.url()).pathname,'/deepsyq.html','intro must remain on Home for at least three seconds');
   assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('ds-mobile-drawer-open')),false);
   await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).waitFor({state:'visible'});
   await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Stop',exact:true}).click();
   assert.equal(await page.locator('.ds-tour-controls').count(),0);assert.equal(await page.locator('#topJarvisBtn').evaluate(e=>e.classList.contains('ds-tour-speaking')),false);
   assert.equal(submittedJobs,0,'guide must never create AI/billing/chat jobs');await page.close();
  }
 }finally{if(browser)await browser.close();child.kill('SIGTERM');if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');}
});


test('synced guide announces navigation before clicking and tracks the exact spoken controls',async()=>{
 const base='http://127.0.0.1:32606';
 const child=spawn(process.execPath,['server/deepsyq-preview.js'],{env:{...process.env,PORT:'32606',NODE_ENV:'test',DATABASE_URL:'',STRIPE_SECRET_KEY:'',OPENAI_API_KEY:'',HF_TOKEN:'',FAL_KEY:'',JARVIX_AI_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
 let browser;
 try{
  await new Promise((resolve,reject)=>{child.stdout.on('data',d=>{if(String(d).includes('design preview running'))resolve();});child.on('exit',()=>reject(Error('Preview exited')));});
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{
   localStorage.setItem('deepsyq_home_language','en');
   const originalPlay=HTMLMediaElement.prototype.play,originalPause=HTMLMediaElement.prototype.pause;
   HTMLMediaElement.prototype.pause=function(){if(this.__tourTimer)clearInterval(this.__tourTimer);if(this.id==='dsTourAudio')return;return originalPause.call(this);};
   HTMLMediaElement.prototype.play=function(){
    if(this.id!=='dsTourAudio')return originalPlay.call(this);
    const element=this;let position=0;
    Object.defineProperty(element,'duration',{configurable:true,get:()=>10});
    Object.defineProperty(element,'currentTime',{configurable:true,get:()=>position,set:value=>{position=value;}});
    setTimeout(()=>{
     element.dispatchEvent(new Event('loadedmetadata'));
     element.dispatchEvent(new Event('play'));
     element.__tourTimer=setInterval(()=>{
      position=Math.min(10,position+2.5);
      element.dispatchEvent(new Event('timeupdate'));
      if(position===10&&!element.src.includes('_52.mp3')){
       clearInterval(element.__tourTimer);
       element.dispatchEvent(new Event('ended'));
      }
     },95);
    },20);
    return Promise.resolve();
   };
  });
  let paid=0;page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/api/'))paid++;});
  await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'application/javascript',body:''}));
  await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
  await page.locator('#dsTakeTour').click();
  await page.locator('.ds-tour-caption').filter({hasText:'JARVIS'}).waitFor();
  await page.waitForTimeout(2100);
  assert.equal(new URL(page.url()).pathname,'/deepsyq.html','intro remains on Home; no premature click');
  await page.waitForURL(/generate-studio\.html\?studio=image/,{timeout:15000});
  const spot=page.locator('#settingsButton.jarvis-tour-spotlight');
  await spot.waitFor({timeout:8000});
  assert.equal(await page.locator('.ds-tour-controls').count(),1);
  assert.match(await page.locator('.ds-tour-caption').textContent(),/Describe your idea/);
  await page.getByRole('button',{name:'Stop',exact:true}).click();
  assert.equal(await page.locator('.ds-tour-controls').count(),0);
  assert.equal(paid,0,'tour must not generate, pay, or upload');
  await page.close();
 }finally{if(browser)await browser.close();child.kill('SIGTERM');if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');}
});
