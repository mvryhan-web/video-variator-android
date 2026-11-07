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
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   try{
    await page.goto(base+'/'+l.page,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('#jPlus',{timeout:16000});
    await page.waitForSelector('.j-mode-rail a',{timeout:16000});
    assert.equal(await page.locator('.j-mode-rail a').count(),2,'one existing rail with two persistent links');
    assert.deepEqual(await page.locator('.j-mode-rail a').allTextContents().then(a=>a.map(s=>s.trim().replace(/^◉\s*/,''))),
      ['JARVIX','Video Uniquifier']);
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
    await page.locator('.j-settings-shortcut').click();
    assert.equal(await page.locator('#jSettingsMenu .j-settings-tile').count(),3);
    assert.equal(await page.locator('#jSettingsMenu').isVisible(),true);
    await page.screenshot({path:folder+'/'+l.name+'-settings.png',fullPage:false});
    // New owner rule: settings choice selects mode IN PLACE, never redirects.
    const pageBeforeSettings=new URL(page.url()).pathname;
    await page.locator('#jSettingsMenu .j-settings-tile').first().click();
    assert.equal(new URL(page.url()).pathname,pageBeforeSettings);
    assert.match(await page.locator('.j-active-mode').innerText(),/Image/);
    assert.equal(await page.locator('#jSettingsMenu').isVisible(),false);
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
    assert.equal(errors.length,0,'console runtime errors: '+errors.join('; '));
   }finally{await context.close();}
  });
 }
}finally{
 await browser?.close();server.kill('SIGTERM');if(server.exitCode===null&&server.signalCode===null)await once(server,'exit');
}
