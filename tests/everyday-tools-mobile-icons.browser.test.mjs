// Everyday Tools mobile-only presentation acceptance: no paid generation or payments.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const port=32988,live=process.env.EVERYDAY_TEST_URL||'';
if(live&&!/^https:\/\/[a-z0-9-]+\.deepsyq\.pages\.dev$/i.test(live))throw Error('TEST must be an isolated Pages preview');
const base=live||'http://127.0.0.1:'+port;
test('Everyday Tools: mobile tiles have names without prefix icons, desktop unchanged',async()=>{
 const server=live?null:spawn(process.execPath,['server/deepsyq-preview.js'],{
  cwd:process.cwd(),env:{...process.env,PORT:String(port),NODE_ENV:'test',
   DATABASE_URL:'',OPENAI_API_KEY:'',STRIPE_SECRET_KEY:'',AI_BILLING_MODE:'test',
   JARVIX_FREE_LLM_ENABLED:'false'},stdio:['ignore','pipe','pipe']
 });
 let browser;let output='';
 if(server){
  server.stdout.on('data',b=>output+=String(b));
  server.stderr.on('data',b=>output+=String(b));
 }
 try{
  let ready=false;
  for(let i=0;i<110;i++){try{if((await fetch(base+'/free-tools.html')).ok){ready=true;break;}}catch{}
   await new Promise(r=>setTimeout(r,150));
  }
  assert.ok(ready,'Everyday Tools preview unavailable '+output.slice(-1000));
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const viewport of [{name:'phone',width:390,height:844},{name:'tablet',width:820,height:1180},{name:'desktop',width:1365,height:900}]){
   const ctx=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
   const page=await ctx.newPage(),posts=[];
   page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio|checkout|billing|stripe|wallet|generate)/.test(r.url()))posts.push(r.url());});
   try{
    const response=await page.goto(base+'/free-tools.html',{waitUntil:'domcontentloaded'});
    assert.equal(response?.status(),200);
    await page.locator('#mobileUtilityGrid a.et-photo-card').first().waitFor({state:'attached'});
    assert.equal(await page.locator('#mobileUtilityGrid a.et-photo-card').count(),19,'19 utility cards preserved');
    assert.equal(await page.locator('#etGallery .et-card').count(),9,'showcase preserved');
    assert.equal(await page.locator('.et-owner-voices .et-owner-voice-card').count(),2,'speech cards preserved');
    const selectors=[
     '.quick-tool-list .hub-tile > .hub-icon',
     '#etGallery .et-card > .et-icon',
     '#mobileUtilityGrid .et-photo-card > .utility-tile-icon',
     '.et-owner-voices .et-owner-voice-card > .hub-icon',
     '.et-owner-voices .et-owner-voice-card > .utility-tile-icon'
    ];
    let checked=0;
    for(const selector of selectors){
     const el=page.locator(selector);
     const count=await el.count();
     if(!count)continue;
     const states=await el.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).display));
     assert.ok(states.length===count);
     for(const state of states){
      assert.equal(state,viewport.width<=900?'none':'grid',
       viewport.name+' '+selector+' icon display='+state);
     }
     checked+=count;
    }
    assert.ok(checked>=28,'Expected prefix icons in multiple card groups, checked '+checked);
    const firstUtility=page.locator('#mobileUtilityGrid .et-photo-card').first();
    assert.ok((await firstUtility.locator('strong').textContent()).trim().length>0);
    assert.equal(await firstUtility.getAttribute('href'),'mobile-utility.html?tool=scan-pdf');
    if(viewport.width<=900){
     const offsets=await firstUtility.evaluate(card=>{
       const label=card.querySelector('strong'),r=card.getBoundingClientRect(),t=label.getBoundingClientRect();
       return {labelX:t.x-card.getBoundingClientRect().x,cardWidth:r.width};
     });
     assert.ok(offsets.labelX<35,'Title moved left to use freed icon space '+JSON.stringify(offsets));
    }
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(overflow<=1,'No horizontal mobile/desktop overflow: '+overflow);
    assert.deepEqual(posts,[],'No paid requests');
    console.log('EVERYDAY_MOBILE_PREFIX_ICONS_OK',JSON.stringify({viewport:viewport.name,width:viewport.width,iconsVerified:checked,hidden:viewport.width<=900,overflow}));
   }finally{await ctx.close();}
  }
 }finally{await browser?.close();server?.kill('SIGTERM');}
});
