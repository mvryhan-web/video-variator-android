// Real Chromium geometry and screenshot regression for owner's canonical bottom dock.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=32627,base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['server/deepsyq-preview.js'],{cwd:process.cwd(),
 env:{...process.env,PORT:String(port),NODE_ENV:'test',OPENAI_API_KEY:'',GEMINI_API_KEY:'',
  GROQ_API_KEY:'',JARVIX_FREE_LLM_ENABLED:'false',JARVIX_QUOTA_DATABASE_URL:'',DATABASE_URL:''},
 stdio:['ignore','pipe','pipe']});
let output='';
child.stdout.on('data',d=>output+=String(d));child.stderr.on('data',d=>output+=String(d));
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){
  if(child.exitCode!==null)break;
  try{const r=await fetch(base+'/deepsyq.html');if(r.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 assert.ok(ready,'preview must start: '+output.slice(-500));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 await mkdir('artifacts/jarvix-bottom-dock',{recursive:true});
 for(const layout of [
  {name:'desktop-1670x941',width:1670,height:941,mobile:false},
  {name:'mobile-portrait-430x765',width:430,height:765,mobile:true},
  {name:'mobile-portrait-390x693',width:390,height:693,mobile:true}
 ]){
  await test(layout.name+' Home stable two-row dock and real circles',async()=>{
   const context=await browser.newContext({viewport:{width:layout.width,height:layout.height},isMobile:layout.mobile,
    deviceScaleFactor:1,hasTouch:layout.mobile});
   try{
    const page=await context.newPage();
    await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForSelector('#homeQuickBar .j-mode-rail',{timeout:15000});
    await page.evaluate(()=>document.fonts.ready);
    const measure=await page.evaluate(()=>{
     const rect=s=>{const r=document.querySelector(s)?.getBoundingClientRect();
      return r?{x:r.x,y:r.y,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null;};
     const rail=document.querySelector('#homeQuickBar .j-mode-rail');
     return {viewport:{w:innerWidth,h:innerHeight},dock:rect('#homeQuickBar'),form:rect('#homeQuickForm'),
      plus:rect('#homeQuickForm #jPlus'),send:rect('#homeQuickForm #homeQuickSubmit'),rail:rect('#homeQuickBar .j-mode-rail'),
      pills:rail?.querySelectorAll('a').length,sendBorder:getComputedStyle(document.querySelector('#homeQuickSubmit')).borderRadius};
    });
    const {viewport,dock,form,plus,send,rail}=measure;
    for(const [name,rectVal] of Object.entries({dock,form,plus,send,rail}))assert.ok(rectVal&&rectVal.width>10&&rectVal.height>10,layout.name+': '+name+' '+JSON.stringify(measure));
    assert.ok(dock.x>=-2&&dock.right<=viewport.w+2,'dock must stay inside viewport '+JSON.stringify(measure));
    assert.ok(dock.bottom<=viewport.h+2&&dock.bottom>=viewport.h-(layout.mobile?90:100),'dock should be anchored near bottom '+JSON.stringify(measure));
    assert.ok(plus.left>=form.left-1&&plus.right<=form.right+1,'plus stays inside top composer');
    assert.ok(send.left>=form.left-1&&send.right<=form.right+1,'send stays inside top composer');
    assert.ok(Math.abs(send.width-send.height)<1.5&&Math.abs(plus.width-plus.height)<1.5,'plus/send must be circular');
    assert.ok(Math.abs(plus.width-send.width)<1.5,'plus/send must be same diameter');
    assert.ok(Math.abs((send.y+send.height/2)-(plus.y+plus.height/2))<5,'send and plus horizontally aligned');
    assert.ok(plus.right<send.left,'send is right side');
    assert.ok(rail.top>=form.bottom-3,'navigation pills must remain below text/input row');
    assert.ok(rail.bottom<=dock.bottom+1,'navigation pills remain inside frame');
    assert.equal(measure.pills,6);
    assert.equal(measure.sendBorder,'50%');
    await page.screenshot({path:'artifacts/jarvix-bottom-dock/'+layout.name+'.png',fullPage:false});
    await page.locator('#jPlus').click();
    assert.equal(await page.locator('#jPlusMenu').isVisible(),true,'plus menu still works');
    await page.locator('#jPlus').click();
    assert.equal(await page.locator('#jPlusMenu').isVisible(),false);
   }finally{await context.close();}
  });
 }
 await test('the separate JARVIX Chat reuses the same six-mode two-row dock',async()=>{
  const context=await browser.newContext({viewport:{width:430,height:765},isMobile:true,hasTouch:true});
  try{
   const page=await context.newPage();
   await page.goto(base+'/jarvix-chat.html',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('.j-chat-bottom .j-mode-rail',{timeout:12000});
   assert.equal(await page.locator('.j-chat-bottom .j-mode-rail a').count(),6);
   const measurements=await page.evaluate(()=>{
    const form=document.querySelector('#jChatForm')?.getBoundingClientRect();
    const s=document.querySelector('#jSend')?.getBoundingClientRect();
    return {form:form?{left:form.left,right:form.right,bottom:form.bottom}:null,
     send:s?{left:s.left,right:s.right,width:s.width,height:s.height}:null};
   });
   assert.ok(measurements.send?.left>=measurements.form?.left&&measurements.send?.right<=measurements.form?.right);
   assert.ok(Math.abs(measurements.send.width-measurements.send.height)<1.5);
   await page.screenshot({path:'artifacts/jarvix-bottom-dock/mobile-jarvix-chat-430x765.png',fullPage:false});
  }finally{await context.close();}
 });
}finally{
 await browser?.close();
 child.kill('SIGTERM');
 if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');
}
