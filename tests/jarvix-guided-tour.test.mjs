import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {tourV3Plan} from '../app/src/main/assets/jarvix-tour-v3-script.js';
const manifest=JSON.parse(readFileSync(new URL('../app/src/main/assets/media/jarvix/tour-v3/manifest.json',import.meta.url),'utf8'));
const words=new Map(manifest.clips.map(c=>[c.filename,c.text]));

// Real Playwright clicks + deterministic local silent WAV fixtures.
// No AI keys, paid provider, voice clone, user data, or network billing.
function makeWav(seconds=1.5){
 const rate=16000,samples=Math.round(rate*seconds);
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
   const spoken=[],idleBetweenClips=[];let paid=0;
   page.on('request',req=>{
    if(req.method()==='POST'&&/\/api\/(?:billing|checkout|studio\/jobs|wallet|generation)/.test(new URL(req.url()).pathname))paid++;
   });
   await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
   await page.route('**/media/jarvix/tour-v3/*.mp3',async route=>{
    const name=route.request().url().split('/').pop().split('?')[0],phrase=words.get(name);
    spoken.push(phrase);
    if(phrase==='Создавайте по описанию или добавьте фотографию.')
     idleBetweenClips.push(await page.locator('#topJarvisBtn').evaluate(el=>({speaking:el.classList.contains('is-speaking'),tourSpeaking:el.classList.contains('ds-tour-speaking')})));
    return route.fulfill({status:200,contentType:'audio/wav',body:makeWav(.25)});
   });
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
    assert.equal(spoken[0],'Привет! Я JARVIX. Смотрите, что я умею.');
    assert.ok(spoken.includes('Изображения.'),'Navigation announces Image before real click');
    await page.locator('#creator.jarvis-tour-spotlight').waitFor({timeout:15000});
    assert.ok(spoken.includes('Создавайте по описанию или добавьте фотографию.'));
    assert.ok(spoken.every(Boolean),'All recorded phrases must be present in manifest');
    assert.deepEqual(idleBetweenClips,[{speaking:false,tourSpeaking:false}], 'JARVIX orb must be idle between the destination title and its first voice beat');
    await page.locator('[data-tour="stop"]').click();
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
   assert.equal(await page.locator('[data-tour="continue"]').evaluate(el=>el.hidden),false,'Continue must be enabled after a safe pause');
   assert.equal(await page.locator('.ds-tour-caption').count(),0);
   assert.equal(new URL(page.url()).pathname,'/deepsyq.html');
   await page.locator('[data-tour="stop"]').click();
  }finally{await page.close();}
 });
});


test('full V3 19-step route stays synchronized and never sends paid requests',async()=>{
 await preview(32607,async(browser,base)=>{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const paid=[];
  const expectedNav=new Map(tourV3Plan('ru').filter(step=>step.navText).map(step=>{
   const u=new URL(step.url,base+'/');
   return [step.navText,u.pathname+u.search];
  }));
  const heardOn=[];
  page.on('request',req=>{
   if(req.method()==='POST'&&/\/api\/(?:billing|checkout|studio\/jobs|wallet|generation)/.test(new URL(req.url()).pathname))paid.push(req.url());
   if(/\/media\/jarvix\/tour-v3\/t3_.*\.mp3(?:\?|$)/.test(req.url())){
    const phrase=words.get(new URL(req.url()).pathname.split('/').pop());
    if(expectedNav.has(phrase)){
     const here=new URL(page.url());
     heardOn.push({phrase,actual:here.pathname+here.search,expected:expectedNav.get(phrase)});
    }
   }
  });
  await page.addInitScript(()=>{localStorage.setItem('deepsyq_home_language','ru');});
  await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
  await page.route('**/media/jarvix/tour-v3/*.mp3',route=>route.fulfill({status:200,contentType:'audio/wav',body:makeWav(.18)}));
  await page.route('**/api/jarvix/voice-config',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({configured:true,speechModelInstalled:true,speechSource:'self-hosted',engine:'VoxCPM2'})}));
  await page.route('**/api/jarvix/tts',route=>route.fulfill({status:200,contentType:'audio/wav',body:makeWav(0.19)}));
  let maxStage=0,last='none',finished=false;
  try{
   await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
   await page.locator('#dsTakeTour').focus();await page.keyboard.press('Enter');
   const until=Date.now()+85000;
   while(Date.now()<until){
    let status=null;
    try{
     status=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('deepsyq_guided_tour_v6')||'null'));
    }catch{await new Promise(resolve=>setTimeout(resolve,180));continue;}
    if(status){
     maxStage=Math.max(maxStage,status.index);
     last=status.index+' '+status.phase+(status.error?' '+status.error:'')+' @ '+page.url();
     if(status.phase==='paused')throw Error('V3 stalled at '+last);
    }else if(maxStage>=18){finished=true;break;}
    await new Promise(resolve=>setTimeout(resolve,200));
   }
   assert.equal(finished,true,'Tour never reached normal completion: '+last);
   assert.equal(maxStage,18,'Tour must visit the concluding Home stage');
   assert.equal(heardOn.length,expectedNav.size,'Each destination title must play exactly once');
   for(const x of heardOn)assert.equal(x.actual,x.expected,x.phrase+' must begin only on its destination');
   assert.deepEqual(paid,[],'Tour must not spend credits, upload or trigger payment');
  }finally{await page.close();}
 });
});


test('real owner MP3 continues after document navigation to Image without a second tap',async()=>{
 await preview(32608,async(browser,base)=>{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport});
   const playback=[],pageErrors=[];
   page.on('console',m=>{if(m.text().startsWith('TOUR_AUDIO_DIAG'))playback.push(m.text());});
   page.on('pageerror',e=>pageErrors.push(e.message));
   try{
    await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
    await page.addInitScript(()=>{
     localStorage.setItem('deepsyq_home_language','ru');
     const original=HTMLMediaElement.prototype.play;
     HTMLMediaElement.prototype.play=function(...args){
      const isOwnerTour=String(this.currentSrc||this.src||'').includes('/media/jarvix/tour-v3/');
      const result=original.apply(this,args);
      if(isOwnerTour)Promise.resolve(result).then(
       ()=>console.log('TOUR_AUDIO_DIAG PLAY_OK '+location.pathname+location.search),
       err=>console.log('TOUR_AUDIO_DIAG PLAY_REJECTED '+location.pathname+location.search+' '+err.name)
      );
      return result;
     };
    });
    const pageResponse=await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
    try{await page.locator('#dsTakeTour').waitFor({state:'attached',timeout:12000});}
    catch{
     throw Error('Tour button never mounted: '+JSON.stringify({
      status:pageResponse?.status(),url:page.url(),
      scripts:await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')).slice(0,12)),
      pageErrors,
      pageTitle:await page.title()
     }));
    }
    if(viewport.width>760){await page.locator('#dsTakeTour').focus();await page.keyboard.press('Enter');}
    else await page.locator('#dsTakeTour').click();
    await page.waitForURL(/generate-studio\.html\?studio=image/,{timeout:30000});
    let heard=false;
    try{
     await page.waitForFunction(()=>{
      const a=document.querySelector('#dsTourAudio');
      return a&&a.currentTime>0.10&&!a.paused;
     },null,{timeout:12000});
     heard=true;
    }catch{}
    const state=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('deepsyq_guided_tour_v6')||'null'));
    assert.equal(heard,true,'Owner MP3 did not actually play on Image after navigation: '+JSON.stringify({viewport,state,playback,pageErrors}));
    await page.locator('[data-tour="stop"]').click();
   }finally{await page.close();}
  }
 });
});


test('all 19 Tour V3 stages play every original Russian MP3, never a silent placeholder',async()=>{
 await preview(32609,async(browser,base)=>{
  const page=await browser.newPage({viewport:{width:1365,height:900}});
  const actual=[],paid=[],pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('request',req=>{
   const url=new URL(req.url());
   if(req.method()==='POST'&&/\/api\/(?:billing|checkout|studio\/jobs|wallet|generation)/.test(url.pathname))paid.push(url.pathname);
   if(url.pathname.includes('/media/jarvix/tour-v3/')&&url.pathname.endsWith('.mp3'))
    actual.push(words.get(url.pathname.split('/').pop()));
  });
  try{
   await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
   await page.addInitScript(()=>{
    localStorage.setItem('deepsyq_home_language','ru');
    const native=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(...args){
     // Exercise the REAL encoded files and onended events, but accelerate QA.
     if(String(this.src||'').includes('/media/jarvix/tour-v3/'))this.playbackRate=4;
     return native.apply(this,args);
    };
   });
   await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
   await page.locator('#dsTakeTour').waitFor({state:'attached',timeout:12000});
   await page.locator('#dsTakeTour').focus();
   await page.keyboard.press('Enter');
   let furthest=0,finished=false,last='none';
   const deadline=Date.now()+195000;
   while(Date.now()<deadline){
    let current;
    try{current=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('deepsyq_guided_tour_v6')||'null'));}
    catch{await new Promise(resolve=>setTimeout(resolve,180));continue;}
    if(current){
     furthest=Math.max(furthest,current.index);
     last=current.index+' beat '+current.beat+' '+current.phase+' '+(current.error||'')+' @ '+page.url();
     if(current.phase==='paused')throw Error('Real owner MP3 stopped: '+last);
    }else if(furthest>=18){finished=true;break;}
    await new Promise(resolve=>setTimeout(resolve,180));
   }
   assert.ok(finished,'Real MP3 19-stage tour did not finish: '+last+' errors '+JSON.stringify(pageErrors));
   const expected=manifest.clips.filter(c=>c.language==='ru').map(c=>c.text);
   assert.equal(expected.length,48);
   assert.equal(actual.length,48,'Tour must load every one of its 48 RU voice lines exactly once');
   assert.deepEqual(new Set(actual),new Set(expected),'Every distinct official MP3 must be used');
   assert.deepEqual(paid,[],'Tour may never generate or spend paid credits');
  }finally{await page.close();}
 });
});


test('Video and Audio Tour use the actual + menu, real Settings gear and X, without reloading Studio',async()=>{
 await preview(32610,async(browser,base)=>{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport});
   const paid=[];
   page.on('request',req=>{
    if(req.method()==='POST'&&/\/api\/(?:billing|checkout|studio\/jobs|wallet|generation)/.test(new URL(req.url()).pathname))paid.push(req.url());
   });
   await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
   await page.route('**/media/jarvix/tour-v3/*.mp3',route=>route.fulfill({status:200,contentType:'audio/wav',body:makeWav(.65)}));
   await page.route('**/api/jarvix/voice-config',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({configured:true,speechModelInstalled:true,speechSource:'self-hosted',engine:'VoxCPM2'})}));
   await page.addInitScript(()=>localStorage.setItem('deepsyq_home_language','ru'));
   try{
    await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
    await page.locator('#dsTakeTour').click();
    await page.waitForURL(/generate-studio\.html\?studio=image/,{timeout:20000});
    await page.locator('#jPlus').waitFor({state:'visible',timeout:10000});
    await page.evaluate(()=>{
     window.__tourSameDocument=Symbol('studio-document');
     window.__tourStudioEvents=[];
     document.addEventListener('click',event=>{
      const match=event.target.closest('#jPlus,[data-j-mode],#studioSettingsToggle,[data-close],#studioSettingsHub button[aria-label]');
      if(!match)return;
      const hub=document.getElementById('studioSettingsHub');
      window.__tourStudioEvents.push({
       target:match.dataset.jMode?'choose-'+match.dataset.jMode:match.id||match.dataset.close||match.getAttribute('aria-label'),
       at:location.search,
       parentHidden:hub?.style.visibility==='hidden'
      });
     },true);
    });
    await page.waitForURL(/generate-studio\.html\?studio=video/,{timeout:25000});
    assert.equal(await page.locator('.studio-nav [data-kind="video"]').getAttribute('aria-pressed'),'true');
    await page.waitForURL(/generate-studio\.html\?studio=audio/,{timeout:25000});
    assert.equal(await page.locator('.studio-nav [data-kind="music"]').getAttribute('aria-pressed'),'true');
    const persistent=await page.evaluate(()=>Boolean(window.__tourSameDocument));
    assert.equal(persistent,true,'Video/Audio must change using Universal Hub without a document navigation');
    await page.waitForFunction(()=>{
     const s=JSON.parse(sessionStorage.getItem('deepsyq_guided_tour_v6')||'null');
     return s?.index===3&&s.beat>=3;
    },null,{timeout:25000});
    const events=await page.evaluate(()=>window.__tourStudioEvents);
    assert.ok(events.filter(e=>e.target==='jPlus').length>=2,'Both Video and Audio transitions must click the genuine +');
    assert.ok(events.some(e=>e.target==='choose-video'),'Video must come from the actual + menu');
    assert.ok(events.some(e=>e.target==='choose-audio'),'Audio must come from the actual + menu');
    assert.ok(events.filter(e=>e.target==='studioSettingsToggle').length>=2,'Settings gear must be clicked on both sections');
    assert.ok(events.some(e=>e.target==='modelDialog'),'Model panel must close through its real X');
    assert.ok(events.some(e=>e.target==='settingsDialog'),'Settings panel must close through its real X before changing mode');
    assert.ok(events.filter(e=>['modelDialog','settingsDialog'].includes(e.target)).every(e=>e.parentHidden),
      'Tour must hide parent hub while one nested model/settings child is visible; no stacked windows');
    assert.equal(await page.locator('#studioSettingsHub').evaluate(h=>h.open),false,
      'Audio Studio must close the settings parent with X before leaving the section');
    assert.deepEqual(paid,[],'Demonstration must not submit paid generation or checkout');
    await page.locator('[data-tour="stop"]').click();
   }finally{await page.close();}
  }
 });
});
