import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=32685,base='http://127.0.0.1:'+port,folder='artifacts/jarvix-universal-hub';
const server=spawn(process.execPath,['server/deepsyq-preview.js'],{
 cwd:process.cwd(),
 env:{...process.env,PORT:String(port),NODE_ENV:'test',OPENAI_API_KEY:'',GEMINI_API_KEY:'',
  GROQ_API_KEY:'',JARVIX_FREE_LLM_ENABLED:'false',JARVIX_QUOTA_DATABASE_URL:'',DATABASE_URL:''},
 stdio:['ignore','pipe','pipe']
});
let logs='';server.stdout.on('data',v=>logs+=String(v));server.stderr.on('data',v=>logs+=String(v));
let browser;
try{
 let running=false;
 for(let i=0;i<115;i++){if(server.exitCode!==null)break;try{const res=await fetch(base+'/deepsyq.html');if(res.ok){running=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 assert.ok(running,'Existing preview server did not start: '+logs.slice(-1100));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 await mkdir(folder,{recursive:true});
 for(const l of [
 {name:'desktop-home-1365x900',page:'deepsyq.html',w:1365,h:900,mobile:false},
 {name:'mobile-home-390x844',page:'deepsyq.html',w:390,h:844,mobile:true},
 {name:'mobile-chat-390x844',page:'jarvix-chat.html',w:390,h:844,mobile:true}
 ]){
  await test(l.name,async()=>{
   const context=await browser.newContext({viewport:{width:l.w,height:l.h},isMobile:l.mobile,
    deviceScaleFactor:1,hasTouch:l.mobile});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e.stack||e)));
   try{
    await page.goto(base+'/'+l.page,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('#jPlus',{timeout:16000});
    await page.waitForSelector('.j-mode-rail a',{state:'attached',timeout:16000});
    assert.equal(await page.locator('.j-mode-rail a').count(),1,'one JARVIX link in shared chat rail');
    assert.deepEqual(await page.locator('.j-mode-rail a').allTextContents().then(a=>a.map(s=>s.trim().replace(/^◉\s*/,''))),
      ['JARVIX']);
    assert.equal(await page.locator('.j-mode-rail a[href="index.html"]').count(),0,'Video Uniquifier is not a chat-mode link');
    assert.equal(await page.locator('.j-active-mode').isVisible(),false);
    assert.equal(await page.locator('.j-image-shortcut,.j-attach-shortcut').count(),0,'no duplicate image and clip');
    await page.locator('#jPlus').click();
    await page.waitForSelector('#jPlusMenu:not([hidden])');
    assert.equal(await page.locator('#jPlusMenu .j-hub-tile').count(),8);
    const dimensions=await page.evaluate(()=>{
     const menu=document.querySelector('#jPlusMenu').getBoundingClientRect();
     const cells=[...document.querySelectorAll('#jPlusMenu .j-hub-tile')].map(e=>e.getBoundingClientRect());
     return {vw:innerWidth,menu:{left:menu.left,right:menu.right,top:menu.top,bottom:menu.bottom,width:menu.width},
      cellWidth:Math.min(...cells.map(c=>c.width)),cellsSecondRow:cells[4].top>cells[0].top+20};
    });
    assert.ok(dimensions.menu.left>=-2&&dimensions.menu.right<=dimensions.vw+2,'popover inside viewport '+JSON.stringify(dimensions));
    assert.ok(dimensions.cellWidth>45&&dimensions.cellsSecondRow,'4-column, two-row Hub');
    await page.screenshot({path:folder+'/'+l.name+'-hub.png',fullPage:false});
    await page.locator('#jPlusMenu [data-j-mode="video"]').click();
    assert.equal(await page.locator('.j-active-mode').isVisible(),true);
    assert.match(await page.locator('.j-active-mode').innerText(),/Video/);
    assert.equal(await page.locator('#jPlus').innerText(),'+');
    assert.equal(await page.locator('#jPlusMenu').isVisible(),false);
    // Both Home and JARVIX Chat must open native Studio Settings in place,
    // never the discarded three-card mode selector, never a redirect.
    assert.equal(await page.locator('#jSettingsMenu').count(),0);
    const chatOrHomeBefore=new URL(page.url()).pathname;
    await page.locator('.j-settings-shortcut').click();
    const inlineNative=page.frameLocator('#homeStudioSettingsFrame');
    await inlineNative.locator('#studioSettingsHub[open]').waitFor({timeout:22000});
    await page.locator('#homeStudioSettingsHost[data-ready="true"]').waitFor({timeout:22000});
    assert.equal(new URL(page.url()).pathname,chatOrHomeBefore);
    assert.match(await page.locator('#homeStudioSettingsFrame').getAttribute('src'),/studio=video&settings=1/);
    for(const id of ['studioTypePicker','modelButton','settingsButton'])
      assert.equal(await inlineNative.locator('#studioSettingsHub #'+id).count(),1,id+' native control');
    await page.screenshot({path:folder+'/'+l.name+'-settings.png',fullPage:false});
    await inlineNative.locator('#studioSettingsHub > button:nth-child(2)').click();
    await page.locator('#homeStudioSettingsHost').waitFor({state:'hidden',timeout:12000});
    await page.locator('#jPlus').click();
    const chooserPromise=page.waitForEvent('filechooser');
    await page.locator('#jAttach').click();
    const chooser=await chooserPromise;
    await chooser.setFiles({name:'owner-test-video.mp4',mimeType:'video/mp4',buffer:Buffer.from('small test attachment')});
    await page.waitForSelector('#jAttachments button');
    assert.match(await page.locator('#jAttachments').innerText(),/owner-test-video.mp4/);
    await page.locator('#jPlus').click();
    const assets=page.locator('#jPlusMenu a[href="my-creations.html"]');
    assert.equal(await assets.count(),1);
    await assets.click();
    await page.waitForURL('**/my-creations.html',{timeout:12000});
    assert.ok((await page.title()).includes('My Creations'));
    if(l.page==='deepsyq.html'){
     await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded',timeout:30000});
     await page.waitForSelector('#homeQuickForm .j-settings-shortcut',{timeout:16000});
     // Mode chosen with Universal Hub is preserved; the old Home gear opens real Studio Settings.
     const beforeSettings=new URL(page.url()).pathname;
     await page.locator('#homeQuickForm .j-settings-shortcut').click();
     await page.locator('#homeStudioSettingsFrame').waitFor({timeout:20000});
     const native=page.frameLocator('#homeStudioSettingsFrame');
     await native.locator('#studioSettingsHub[open]').waitFor({timeout:22000});
     await page.locator('#homeStudioSettingsHost[data-ready="true"]').waitFor({timeout:22000});
     assert.equal(new URL(page.url()).pathname,beforeSettings,'settings popup must stay on Home');
     assert.equal(await page.locator('#homeQuickForm #jSettingsMenu').count(),0,'no old three-card selector');
     assert.match(await page.locator('#homeStudioSettingsFrame').getAttribute('src'),/studio=video&settings=1/);
     for(const id of ['studioTypePicker','modelButton','settingsButton'])
       assert.equal(await native.locator('#studioSettingsHub #'+id).count(),1,'real native Studio control: '+id);
     // Use the existing native model and format dialogs: this must not be a
     // static copy of Studio Settings or a fake intermediate chooser.
     await native.locator('#studioSettingsHub #modelButton').click();
     await native.locator('#modelDialog[open]').waitFor({timeout:12000});
     await native.locator('#modelDialog [data-close="modelDialog"]').click();
     await native.locator('#modelDialog[open]').waitFor({state:'hidden',timeout:12000});
     await native.locator('#studioSettingsHub #settingsButton').click();
     await native.locator('#settingsDialog[open]').waitFor({timeout:12000});
     await native.locator('#settingsDialog [data-t="done"]').click();
     await native.locator('#settingsDialog[open]').waitFor({state:'hidden',timeout:12000});
     assert.equal(await native.locator('#studioSettingsHub[open]').count(),1,'parent hub stays open after model and format panels');
     const embeddedHeader=await native.locator('body>.topbar').evaluate(el=>({
      display:getComputedStyle(el).display,style:el.getAttribute('style'),
      bodyId:document.body.id,hasPresentation:!!document.getElementById('homeNativeStudioSettingsPresentation')
     }));
     assert.equal(embeddedHeader.display,'none','embedded Studio header must not duplicate Home: '+JSON.stringify(embeddedHeader));
     assert.equal(await native.locator('body>.studio-shell').evaluate(el=>getComputedStyle(el).display),'none','embedded Studio layout and second bottom dock must be hidden');
     await page.screenshot({path:folder+'/'+l.name+'-native-studio-settings.png',fullPage:false});
     await native.locator('#studioSettingsHub > button:nth-child(2)').click();
     await page.locator('#homeStudioSettingsHost').waitFor({state:'hidden',timeout:12000});
     assert.equal(new URL(page.url()).pathname,beforeSettings,'closing popup must preserve Home');
     await page.locator('#homeQuickForm .j-settings-shortcut').click();
     await page.locator('#homeStudioSettingsHost').waitFor({state:'visible',timeout:12000});
     await page.locator('#homeQuickForm .j-settings-shortcut').click();
     await page.locator('#homeStudioSettingsHost').waitFor({state:'hidden',timeout:12000});
    }
    assert.equal(errors.length,0,'console runtime errors: '+errors.join('; '));
   }finally{await context.close();}
  });
 }
}finally{
 await browser?.close();server.kill('SIGTERM');if(server.exitCode===null&&server.signalCode===null)await once(server,'exit');
}
