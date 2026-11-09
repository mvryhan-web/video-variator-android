// Owner-specific JARVIX Chat mobile title/dock QA, no paid requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

test('JARVIX Chat mobile: Chat not ???; original composer fully visible with keyboard-sized viewport',async()=>{
 const port=32947,base='http://127.0.0.1:'+port;
 const proc=spawn(process.execPath,['server/deepsyq-preview.js'],{
  cwd:process.cwd(),env:{...process.env,PORT:String(port),NODE_ENV:'test',DATABASE_URL:'',
    JARVIX_QUOTA_DATABASE_URL:'',OPENAI_API_KEY:'',GEMINI_API_KEY:'',GROQ_API_KEY:'',
    STRIPE_SECRET_KEY:'',AI_BILLING_MODE:'test',JARVIX_FREE_LLM_ENABLED:'false'},
  stdio:['ignore','pipe','pipe']});
 let browser;
 try {
  let ready=false;
  for(let i=0;i<100;i++){
    try{if((await fetch(base+'/jarvix-chat.html')).ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  assert(ready,'local preview unavailable');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const sz of [{w:320,h:568},{w:360,h:640},{w:390,h:844},{w:430,h:932}]){
   const context=await browser.newContext({viewport:{width:sz.w,height:sz.h},isMobile:true,hasTouch:true,deviceScaleFactor:2});
   await context.addInitScript(()=>{
    localStorage.setItem('deepsyq_home_language','ru');
    localStorage.setItem('deepsyq_lumina_terms_accepted','true');
   });
   const page=await context.newPage();
   const paid=[];
   page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|checkout|stripe|payments)/i.test(r.url()))paid.push(r.url());});
   try {
    await page.goto(base+'/jarvix-chat.html',{waitUntil:'domcontentloaded'});
    await page.locator('#jChatForm').waitFor({state:'visible'});
    await page.waitForFunction(()=>!!document.querySelector('main.jarvix-chat')?.style.getPropertyValue('--j-mobile-visible-height'));
    await page.waitForFunction(()=>document.getElementById('jActiveModeLabel')?.textContent?.trim()==='Чат');
    async function verifyDock(label){
     const geom=await page.evaluate(()=>{
       const r=id=>{let e=document.querySelector(id);if(!e)return null;let q=e.getBoundingClientRect();return {x:q.x,y:q.y,left:q.left,top:q.top,right:q.right,bottom:q.bottom,height:q.height,width:q.width};};
       return {form:r('#jChatForm'),main:r('main.jarvix-chat'),input:r('#jInput'),btn:r('#jSend'),plus:r('#jPlus'),
         bottom:r('.j-chat-bottom'),viewport:{w:innerWidth,h:innerHeight,visual:visualViewport?.height},
         caption:document.getElementById('jActiveModeLabel').textContent};
     });
     assert.equal(geom.caption.trim(),'Чат',label+' must not render ???');
     assert(geom.form && geom.form.top>=-1,label+' composer top offscreen '+JSON.stringify(geom));
     assert(geom.form.bottom<=geom.viewport.h-2,label+' composer cut off below screen '+JSON.stringify(geom));
     assert(geom.form.left>=0&&geom.form.right<=geom.viewport.w+1,label+' composer overflows horizontally '+JSON.stringify(geom));
     assert(geom.input.width>=22,label+' message input must be usable '+JSON.stringify(geom));
     assert(geom.btn.right<=geom.viewport.w+1&&geom.plus.left>=0,label+' original controls clipped '+JSON.stringify(geom));
     assert(geom.bottom.bottom<=geom.viewport.h+2,label+' bottom area out of viewport '+JSON.stringify(geom));
     return geom;
    }
    const opened=await verifyDock('open '+sz.w+'x'+sz.h);
    assert.equal(await page.locator('#jarvixActivityPanel').count(),0,'no duplicate JARVIX activity');
    await page.locator('#jInput').focus();
    await page.setViewportSize({width:sz.w,height:Math.max(380,sz.h-260)});
    await page.waitForTimeout(180);
    const keyboard=await verifyDock('keyboard '+sz.w);
    assert.equal(await page.locator('#jChatForm #jPlus').count(),1,'original plus preserved');
    assert.equal(await page.locator('#jChatForm #jMic').count(),1,'original mic preserved');
    assert.equal(await page.locator('#jChatForm .j-settings-shortcut').count(),1,'original settings preserved');
    assert.deepEqual(paid,[],'QA must not request paid calls');
    console.log('JARVIX_MOBILE_VISIBLE_PASS',JSON.stringify({width:sz.w,open:opened.form,keyboard:keyboard.form}));
   }finally{await context.close();}
  }
 }finally{await browser?.close();proc.kill('SIGTERM');}
});
