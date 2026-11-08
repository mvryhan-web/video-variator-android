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
  await context.addInitScript(()=>{localStorage.setItem('deepsyq_home_language','ru');});
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
    await page.locator('#jarvixActivityToggle').waitFor({state:'visible',timeout:20000});
    const expand=page.locator('#jarvixActivityToggle');
    if(await expand.getAttribute('aria-expanded')==='false')await expand.click();
    await page.locator('#jarvixActivityPanel').waitFor({state:'visible',timeout:7000});
    assert.equal(await page.locator('#jarvixActivityPanel h2').textContent(),'JARVIX Chat');
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
