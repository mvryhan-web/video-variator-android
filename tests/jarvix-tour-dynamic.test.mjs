import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from '@playwright/test';

const key='deepsyq_guided_tour_v6';
async function inPreview(port,callback){
 const proc=spawn(process.execPath,['server/deepsyq-preview.js'],{
  env:{...process.env,PORT:String(port),NODE_ENV:'test',DATABASE_URL:'',STRIPE_SECRET_KEY:'',
   OPENAI_API_KEY:'',HF_TOKEN:'',FAL_KEY:'',JARVIX_AI_ENABLED:'false'},
  stdio:['ignore','pipe','pipe']
 });
 let browser;
 try{
  await Promise.race([
   new Promise((resolve,reject)=>{
    proc.stdout.on('data',data=>{if(String(data).includes('design preview running'))resolve()});
    proc.once('exit',()=>reject(new Error('Preview died')))
   }),
   new Promise((_,reject)=>setTimeout(()=>reject(new Error('Preview startup timeout')),15000))
  ]);
  browser=await chromium.launch({headless:true});
  await callback(browser,'http://127.0.0.1:'+port);
 }finally{
  if(browser)await browser.close();
  proc.kill('SIGTERM');
  if(proc.exitCode===null&&proc.signalCode===null)await Promise.race([once(proc,'exit'),new Promise(r=>setTimeout(r,1500))]);
 }
}
async function instrument(page){
 await page.addInitScript(()=>{
  localStorage.setItem('deepsyq_home_language','ru');
  window.__tourClipCalls=[];
  window.__tourClickAt=null;
  document.addEventListener('click',e=>{
   if(e.target?.closest?.('#dsTakeTour'))window.__tourClickAt=performance.now();
  },true);
  // Simulate precisely the HTML media callbacks, preserving the REAL DOM actions,
  // navigation, state machine and private Studio iframe; no credit purchases.
  const native=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(...args){
   if(/\/media\/jarvix\//.test(this.src||'')){
    const clip=this,src=clip.src;
    window.__tourClipCalls.push({src,t:performance.now()});
    queueMicrotask(()=>clip.dispatchEvent(new Event('playing')));
    setTimeout(()=>{if(clip.isConnected)clip.dispatchEvent(new Event('ended'));},280);
    return Promise.resolve();
   }
   return native.apply(this,args);
  };
 });
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
}
test('JARVIX greeting starts from the click immediately, even away from Home',async()=>{
 await inPreview(32783,async(browser,base)=>{
  for(const path of ['/deepsyq.html','/ai-apps.html']){
   const page=await browser.newPage({viewport:{width:1365,height:850}});
   await instrument(page);
   try{
    await page.goto(base+path,{waitUntil:'domcontentloaded'});
    await page.locator('#dsTakeTour').waitFor({state:'visible',timeout:15000});
    await page.locator('#dsTakeTour').click();
    await page.waitForFunction(()=>window.__tourClipCalls?.length>0,null,{timeout:3000});
    const result=await page.evaluate(()=>({
      delta:window.__tourClipCalls[0].t-window.__tourClickAt,
      first:window.__tourClipCalls[0].src.split('/').pop(),
      state:JSON.parse(sessionStorage.getItem('deepsyq_guided_tour_v6')||'null')
    }));
    assert.ok(result.delta>=0&&result.delta<650,'First audio play must begin within 650ms on '+path+': '+JSON.stringify(result));
    assert.equal(result.state?.index,0,'First spoken stage is always Home');
    console.log('INSTANT_AUDIO',path,Math.round(result.delta)+'ms',result.first);
   }finally{await page.close();}
  }
 });
});
test('JARVIX completes all 19 sections through AI Apps, Canvas and Pricing, no paid calls',async()=>{
 await inPreview(32784,async(browser,base)=>{
  const page=await browser.newPage({viewport:{width:1365,height:850}});
  await instrument(page);
  const paid=[],errors=[],visited=new Set();
  page.on('request',req=>{
   if(req.method()==='POST'&&/\/api\/(?:billing|checkout|studio\/jobs|wallet|generation|payments)/.test(new URL(req.url()).pathname))paid.push(req.url());
  });
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
   await page.locator('#dsTakeTour').waitFor({state:'visible',timeout:15000});
   await page.locator('#dsTakeTour').click();
   let last='not started',furthest=-1,finished=false;
   const deadline=Date.now()+215000;
   while(Date.now()<deadline){
    let s=null;
    try{s=await page.evaluate(k=>JSON.parse(sessionStorage.getItem(k)||'null'),key)}catch{}
    if(s){
     if(!visited.has(s.index)){
      visited.add(s.index);
      console.log('TOUR_REACHED',s.index,page.url());
     }
     furthest=Math.max(furthest,s.index);
     last='step '+s.index+' beat '+s.beat+' phase '+s.phase+' error '+String(s.error||'')+' url '+page.url();
     if(s.phase==='paused'){
      const dom=await page.evaluate(()=>({
       title:document.title,ready:document.readyState,
       plus:!!document.getElementById('jPlus'),
       menu:!!document.getElementById('jPlusMenu'),
       choices:[...document.querySelectorAll('[data-j-mode]')].map(e=>e.getAttribute('data-j-mode')),
       chat:!!document.getElementById('jChatForm'),
       bodySize:document.body.innerHTML.length,
       status:document.querySelector('.ds-tour-controls')?.dataset.error||'',
       formHTML:document.querySelector('#jChatForm')?.outerHTML.slice(0,1800)
      }));
      throw new Error('Tour unexpectedly paused: '+last+' DOM '+JSON.stringify(dom)+' browser errors '+JSON.stringify(errors.slice(-8)));
     }
    }else if(furthest>=18){finished=true;break;}
    await new Promise(resolve=>setTimeout(resolve,100));
   }
   assert.ok(finished,'19-step tour did not finish; last '+last+' visited '+[...visited].join(',')+' browser errors '+JSON.stringify(errors.slice(-8)));
   assert.deepEqual([...visited].sort((a,b)=>a-b),Array.from({length:19},(_,i)=>i),'No stage may be silently skipped');
   assert.deepEqual(paid,[],'No paid APIs called by guided tour');
  }finally{await page.close();}
 });
});
