// Real Cloudflare Pages branch-preview acceptance; never triggers AI generation or checkout.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.JARVIX_TEST_PREVIEW_URL;
if(!base||!/^https:\/\/[a-z0-9-]+\.deepsyq\.pages\.dev$/i.test(base))
 throw Error('JARVIX_TEST_PREVIEW_URL must be an isolated deepsyq.pages.dev branch preview host');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const folder='artifacts/jarvix-live-preview';
await mkdir(folder,{recursive:true});
const failures=[];
try{
 for(const viewport of [
  {name:'desktop',width:1365,height:900,mobile:false},
  {name:'mobile',width:390,height:844,mobile:true}
 ]){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},
   isMobile:viewport.mobile,hasTouch:viewport.mobile,deviceScaleFactor:1});
  await context.addInitScript(()=>{localStorage.setItem('deepsyq_home_language','ru');localStorage.setItem('deepsyq_lumina_terms_accepted','true');});
  const page=await context.newPage();
  const paid=[];
  page.on('request',request=>{if(request.method()==='POST'&&/\/api\/(?:studio\/jobs|stripe|payments|checkout)/i.test(request.url()))paid.push(request.url());});
  for(const route of [
   'jarvix-chat.html','generate-studio.html?studio=image',
   'generate-studio.html?studio=video','generate-studio.html?studio=audio'
  ]){
   const name=route==='jarvix-chat.html'?'chat':new URLSearchParams(route.split('?')[1]).get('studio');
   try{
    const response=await page.goto(base+'/'+route,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(response?.status(),200,route+' HTTP status');
    try {
     await page.locator('#jarvixActivityToggle').waitFor({state:'visible',timeout:6000});
    } catch (absence) {
     const debug=await page.evaluate(async()=>{
      const paths=['deepsyq-site-shell.js','jarvix-activity-drawer.js','jarvix-chat.css'];
      const assets=await Promise.all(paths.map(async path=>{
       try{const r=await fetch(path,{cache:'no-store',signal:AbortSignal.timeout(3500)}),body=await r.text();
        return{path,status:r.status,mime:r.headers.get('content-type'),
         length:body.length,snippet:body.slice(0,90),
         hasDrawer:body.includes('jarvix-activity-drawer.js')||body.includes('jarvix-activity-toggle')};
       }catch(e){return{path,error:String(e)}}
      }));
      return{title:document.title,url:location.href,
       mainText:document.body?.innerText?.slice(0,250),
       scripts:[...document.scripts].map(x=>x.src||'[inline]').slice(0,30),
       htmlHasJarvixChat:document.documentElement.outerHTML.includes('jHistory'),
       htmlHasStudio:document.documentElement.outerHTML.includes('historyList'),
       hasSiteSidebar:!!document.querySelector('#dsSiteSidebar'),
       assets};
     });
     console.error('CLOUDFLARE_DIAGNOSTICS',JSON.stringify({route,viewport:viewport.name,debug}));
     throw absence;
    }
    const expand=page.locator('#jarvixActivityToggle');
    if(await expand.getAttribute('aria-expanded')==='false')await expand.click();
    await page.locator('#jarvixActivityPanel').waitFor({state:'visible',timeout:7000});
    assert.equal(await page.locator('#jarvixActivityPanel h2').textContent(),'JARVIX Chat');
    if (name==='chat') assert.equal(await page.locator('.j-chat-toolbar h1').textContent(),'JARVIX Chat', 'same title inside chat');
    const headingBox=await page.locator('#jarvixActivityPanel h2').boundingBox();
    const arrowBox=await expand.boundingBox();
    assert.ok(headingBox&&arrowBox&&arrowBox.y>=headingBox.y+headingBox.height+12,
      'Shared drawer arrow must stay below JARVIX Chat heading on '+viewport.name+' '+route+
      ' heading='+JSON.stringify(headingBox)+' arrow='+JSON.stringify(arrowBox));
    console.log('JARVIX_ARROW_BELOW_TITLE',viewport.name,route,Math.round(arrowBox.y-(headingBox.y+headingBox.height))+'px');
    const viewportFit=await page.locator('#jarvixActivityPanel').boundingBox();
    assert.ok(viewportFit&&viewportFit.x>=-1&&viewportFit.x+viewportFit.width<=viewport.width+1,'drawer inside viewport');
    await page.screenshot({path:`${folder}/${viewport.name}-${name}.png`,fullPage:false});
    console.log('CLOUDFLARE_PREVIEW_OK',viewport.name,route,response.status());
    await expand.click();
   }catch(e){
    console.error('CLOUDFLARE_PREVIEW_FAILED',viewport.name,route,String(e));
    failures.push({route,viewport:viewport.name,error:String(e)});
   }
  }
  assert.deepEqual(paid,[],'No paid POST calls during live preview QA');
  await context.close();
 }
 assert.deepEqual(failures,[],'Live preview routes must all load');
}finally{await browser.close();}
