import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';

const key='deepsyq_guided_tour_v6';
test('Tour resumes at AI Apps and advances to Canvas without paid generation',async()=>{
 const child=spawn(process.execPath,['server/deepsyq-preview.js'],{
  env:{...process.env,PORT:'32744',NODE_ENV:'test',DATABASE_URL:'',STRIPE_SECRET_KEY:'',OPENAI_API_KEY:'',HF_TOKEN:'',FAL_KEY:'',JARVIX_AI_ENABLED:'false'},
  stdio:['ignore','pipe','pipe']
 });
 let browser;
 try{
  await Promise.race([
   new Promise((resolve,reject)=>{
    child.stdout.on('data',chunk=>{if(String(chunk).includes('design preview running'))resolve();});
    child.once('exit',()=>reject(Error('Preview exited before ready')));
   }),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('Preview did not start')),15000))
  ]);
  browser=await chromium.launch({headless:true});
  for(const scenario of ['already-on-ai-apps','fresh-cross-page-handoff','lost-checkpoint-route-marker','stale-image-checkpoint-with-route-marker']){
   for(const viewport of [{width:1365,height:850},{width:390,height:844}]){
   const page=await browser.newPage({viewport});
   const paid=[],errors=[],transitions=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('framenavigated',frame=>{if(frame===page.mainFrame())transitions.push(frame.url());});
   page.on('request',req=>{if(req.method()==='POST'&&/\/api\/(?:billing|checkout|studio\/jobs|wallet|generation)/.test(new URL(req.url()).pathname))paid.push(req.url());});
   await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
   await page.addInitScript(()=>{
    localStorage.setItem('deepsyq_home_language','ru');
    // This fixture tests the stage-transition logic, not speaker codecs.
    // It simulates precisely the playing/ended signals of the owner's clip.
    const native=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(...args){
     if(String(this.src||'').includes('/media/jarvix/')){
      const media=this;
      setTimeout(()=>media.dispatchEvent(new Event('playing')),40);
      setTimeout(()=>media.dispatchEvent(new Event('ended')),450);
      return Promise.resolve();
     }
     return native.apply(this,args);
    };
   });
   try{
    const base='http://127.0.0.1:32744/ai-apps.html';
    if(scenario==='stale-image-checkpoint-with-route-marker'){
      await page.goto(base,{waitUntil:'domcontentloaded'});
      await page.evaluate(k=>sessionStorage.setItem(k,JSON.stringify({
        index:1,language:'ru',phase:'playing',navAnnounced:1,
        beat:1,position:0
      })),key);
      await page.goto(base+'#jarvix-tour-resume-ru',{waitUntil:'domcontentloaded'});
      await page.reload({waitUntil:'domcontentloaded'});
    }else{
    await page.goto(base+(scenario==='lost-checkpoint-route-marker'?'#jarvix-tour-resume-ru':''),{waitUntil:'domcontentloaded'});
    if(scenario!=='lost-checkpoint-route-marker'){
    await page.evaluate(({key:k,scenario})=>sessionStorage.setItem(k,JSON.stringify({
      index:4,language:'ru',phase:'playing',
      navAnnounced:scenario==='already-on-ai-apps'?4:3,
      beat:0,position:0,
      ...(scenario==='fresh-cross-page-handoff'?{
        pendingRoute:{index:4,href:'http://127.0.0.1:32744/ai-apps.html'}
      }:{})
    })),{key,scenario});
    await page.reload({waitUntil:'domcontentloaded'});
    }
    }
    try{await page.waitForURL(/\/canvas\.html(?:\?|#|$)/,{timeout:22000});}
    catch{
      const here=await page.evaluate(k=>({url:location.href,state:sessionStorage.getItem(k),ui:document.querySelector('.ds-tour-controls')?.outerHTML.slice(0,600)}),key);
      throw Error('Tour did not advance AI Apps -> Canvas: '+JSON.stringify({viewport,here,transitions,errors}));
    }
    const saved=await page.evaluate(k=>JSON.parse(sessionStorage.getItem(k)||'null'),key);
    assert.equal(saved?.index,5,'Canvas is the next stage without resetting the approved first four stages');
    assert.deepEqual(paid,[],'Tour must not trigger paid generation');
   }finally{await page.close();}
   }
  }
  // Inspiration may finish its Clone narration while the Chat document is
  // loading. Pricing must resume from the already-advanced stage 12.
  for(const viewport of [{width:1365,height:850},{width:390,height:844}]){
   const page=await browser.newPage({viewport});
   await page.addInitScript(()=>{
    localStorage.setItem('deepsyq_home_language','ru');
    const native=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(...args){
     if(String(this.src||'').includes('/media/jarvix/')){
      const clip=this;
      setTimeout(()=>clip.dispatchEvent(new Event('playing')),25);
      setTimeout(()=>{if(clip.isConnected)clip.dispatchEvent(new Event('ended'));},250);
      return Promise.resolve();
     }
     return native.apply(this,args);
    };
   });
   try{
    await page.goto('http://127.0.0.1:32744/jarvix-chat.html?mode=image&from=inspiration&action=clone',{waitUntil:'domcontentloaded'});
    await page.evaluate(k=>sessionStorage.setItem(k,JSON.stringify({
     index:12,language:'ru',phase:'playing',beat:0,position:0,
     navAnnounced:11,cloneHandoff:true,
     pendingRoute:{index:12,href:'http://127.0.0.1:32744/pricing.html'}
    })),key);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForURL(/\/pricing\.html(?:\?|#|$)/,{timeout:15000});
    const checkpoint=await page.evaluate(k=>JSON.parse(sessionStorage.getItem(k)||'null'),key);
    assert.equal(checkpoint?.index,12,'Inspiration Clone handoff must not reset Pricing stage');
   }finally{await page.close();}
  }
 }finally{
  if(browser)await browser.close();
  child.kill('SIGTERM');
 }
});
