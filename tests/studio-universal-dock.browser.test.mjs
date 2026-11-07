import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=32991,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server/deepsyq-preview.js'],{
 cwd:process.cwd(),env:{...process.env,PORT:String(port),NODE_ENV:'test',OPENAI_API_KEY:'',
 GEMINI_API_KEY:'',GROQ_API_KEY:'',DATABASE_URL:'',JARVIX_QUOTA_DATABASE_URL:'',
 JARVIX_FREE_LLM_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',x=>output+=String(x));server.stderr.on('data',x=>output+=String(x));
let browser;
const file='artifacts/studio-universal-dock';
try{
 let ready=false;
 for(let i=0;i<135;i++){
  if(server.exitCode!==null)break;
  try{const r=await fetch(base+'/generate-studio.html?studio=image');if(r.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,170));
 }
 assert.ok(ready,'Preview unavailable: '+output.slice(-900));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 await mkdir(file,{recursive:true});
 for(const layout of [{name:'desktop',w:1365,h:900,mobile:false},{name:'mobile-portrait',w:390,h:844,mobile:true}]){
  for(const kind of ['image','video','audio']){
   await test('Single Universal Hub Studio '+layout.name+' '+kind,async()=>{
    const context=await browser.newContext({viewport:{width:layout.w,height:layout.h},
     isMobile:layout.mobile,hasTouch:layout.mobile,deviceScaleFactor:1});
    await context.addInitScript(()=>{localStorage.setItem('deepsyq_lumina_terms_accepted','true');});
    const page=await context.newPage();
    const paid=[],errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|stripe|payments)\b/.test(r.url()))paid.push(r.url());});
    try{
     await page.goto(base+'/generate-studio.html?studio='+kind,{waitUntil:'domcontentloaded',timeout:30000});
     await page.waitForSelector('#studioUniversalDock #jPlus',{timeout:25000});
     const geometry=await page.evaluate(()=>{
      const rect=id=>{const el=document.querySelector(id),r=el?.getBoundingClientRect();return r?{l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height}:null;};
      return {vw:innerWidth,vh:innerHeight,dock:rect('#studioUniversalDock'),plus:rect('#studioUniversalDock #jPlus'),
       send:rect('#studioUniversalDock #generate'),prompt:rect('#studioUniversalDock #prompt'),
       composerDisplay:getComputedStyle(document.querySelector('#creator>.prompt-row')).display,
       inForm:document.getElementById('generate').form?.id,
       inputForm:document.getElementById('prompt').form?.id};
     });
     assert.ok(geometry.dock?.l>=-1&&geometry.dock?.r<=layout.w+1,'dock fits screen '+JSON.stringify(geometry));
     assert.ok(geometry.dock.b<=layout.h+1&&geometry.dock.b>layout.h-100,'dock pinned near bottom '+JSON.stringify(geometry));
     assert.equal(geometry.composerDisplay,'none','old Studio composer input row must be hidden');
     assert.equal(geometry.inForm,'creator','real generate remains tied to original form');
     assert.equal(geometry.inputForm,'creator','real prompt remains tied to original form');
     assert.ok(Math.abs(geometry.plus.w-geometry.plus.h)<2,'round +');
     assert.ok(Math.abs(geometry.send.w-geometry.send.h)<2,'round Send');
     assert.equal(await page.locator('#studioUniversalDock .j-mode-rail a').count(),2);
     assert.equal(await page.locator('#studioUniversalDock #jPlusMenu').isVisible(),false);
     await page.locator('#studioUniversalDock #jPlus').click();
     assert.equal(await page.locator('#studioUniversalDock #jPlusMenu .j-hub-tile').count(),8);
     await page.screenshot({path:file+'/'+layout.name+'-'+kind+'-hub.png',fullPage:false});
     const before=new URL(page.url()).pathname;
     const choice=kind==='image'?'video':'image';
     await page.locator('#studioUniversalDock #jPlusMenu [data-j-mode="'+choice+'"]').click();
     assert.equal(new URL(page.url()).pathname,before,'mode must switch in same existing Studio page');
     assert.equal(new URL(page.url()).searchParams.get('studio'),choice);
     assert.ok((await page.locator('#studioUniversalDock .j-active-mode').innerText()).toLowerCase().includes(choice));
     assert.equal(await page.locator('#studioUniversalDock #jPlus').innerText(),'+');
     await page.locator('#studioUniversalDock #studioSettingsToggle').click();
     assert.equal(await page.locator('#studioUniversalDock #jSettingsMenu .j-settings-tile').count(),3);
     assert.equal(await page.locator('#studioUniversalDock #jSettingsMenu').isVisible(),true);
     await page.screenshot({path:file+'/'+layout.name+'-'+kind+'-settings.png',fullPage:false});
     const settingsChoice=choice==='video'?'audio':'video';
     await page.locator('#studioUniversalDock #jSettingsMenu [data-j-mode="'+settingsChoice+'"]').click();
     assert.equal(new URL(page.url()).pathname,before);
     assert.equal(new URL(page.url()).searchParams.get('studio'),settingsChoice);
     assert.equal(await page.locator('#studioSettingsHub').isVisible(),true,'existing protected native Studio settings must open');
     await page.evaluate(()=>{const hub=document.getElementById('studioSettingsHub');if(hub?.open)hub.close();});
     await page.locator('#studioUniversalDock #prompt').fill('Owner interface-only smoke test prompt');
     assert.equal(await page.locator('#prompt').inputValue(),'Owner interface-only smoke test prompt');
     // Explicitly DO NOT submit or click Generate: no paid calls, no free generation.
     assert.equal(paid.length,0,'Never auto launch generation');
     assert.equal(errors.length,0,'No uncaught errors: '+errors.join('; '));
    }finally{await context.close();}
   });
  }
 }
 await test('Home gear opens previous existing Studio settings; Universal Hub rail remains unchanged',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
   const page=await context.newPage();await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#homeQuickForm .j-settings-shortcut',{timeout:16000});
   assert.equal(await page.locator('#homeQuickBar .j-mode-rail a').count(),2);
   assert.equal(await page.locator('#homeQuickForm #jSettingsMenu').count(),0);
   await page.locator('#homeQuickForm .j-settings-shortcut').click();
   await page.waitForURL('**/generate-studio.html?studio=image&settings=1',{timeout:16000});
   assert.equal(new URL(page.url()).searchParams.get('studio'),'image');
   assert.equal(new URL(page.url()).searchParams.get('settings'),'1');
  }finally{await context.close();}
 });
}finally{
 await browser?.close();server.kill('SIGTERM');
 if(server.exitCode===null&&server.signalCode===null)await once(server,'exit');
}
