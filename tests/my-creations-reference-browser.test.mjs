import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

test('My Creations screenshot-matched gallery, Audio filter and mobile details with no paid requests',async()=>{
 const port=32992,base='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,['server/deepsyq-preview.js'],{
  cwd:process.cwd(),env:{...process.env,PORT:String(port),NODE_ENV:'test',DATABASE_URL:'',OPENAI_API_KEY:'',GEMINI_API_KEY:'',STRIPE_SECRET_KEY:'',AI_BILLING_MODE:'test'},
  stdio:['ignore','pipe','pipe']
 });
 let browser;let logs='';
 server.stdout.on('data',data=>logs+=String(data));
 server.stderr.on('data',data=>logs+=String(data));
 try{
  let ready=false;
  for(let i=0;i<100;i++){
   try{if((await fetch(base+'/my-creations.html')).ok){ready=true;break}}catch{}
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  assert.ok(ready,'Local My Creations not ready: '+logs.slice(-600));
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  await mkdir('artifacts/my-creations',{recursive:true});
  const desktop=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const charged=[];desktop.on('request',request=>{
   if(request.method()==='POST'&&/\/api\/(?:studio\/jobs|billing|checkout)/.test(request.url()))charged.push(request.url());
  });
  await desktop.goto(base+'/my-creations.html',{waitUntil:'domcontentloaded'});
  await desktop.locator('.mc-card').first().waitFor({timeout:15000});
  assert.equal(await desktop.locator('.mc-card').count(),8);
  await desktop.waitForFunction(()=>document.querySelectorAll('.mc-card-image img').length===8,{timeout:20000});
  assert.equal(await desktop.locator('.mc-filter[data-filter=audio]').textContent().then(x=>x.includes('Audio')),true);
  assert.equal(await desktop.locator('#mcDetail').isVisible(),true);
  assert.equal((await desktop.locator('#mcDetailTitle').textContent()).trim(),'Crystal Bloom');
  const aside=await desktop.locator('#mcDetail').boundingBox(),grid=await desktop.locator('#mcGrid').boundingBox();
  assert.ok(aside&&grid&&aside.x>grid.x+grid.width-5,'Inspector appears to the right of tiles');
  await desktop.screenshot({path:'artifacts/my-creations/desktop.png',fullPage:true});
  await desktop.locator('[data-filter=audio]').click();
  assert.equal(await desktop.locator('.mc-card').count(),1,'Audio replaces Failed');
  assert.match(await desktop.locator('.mc-card').first().textContent(),/Sculpted Sound/);
  await desktop.locator('[data-filter=all]').click();
  await desktop.locator('.mc-card').filter({hasText:'Velvet Rain'}).locator('.mc-card-image').click();
  assert.equal((await desktop.locator('#mcDetailTitle').textContent()).trim(),'Velvet Rain');
  assert.deepEqual(charged,[],'No paid generation was requested');
  const mobile=await browser.newPage({...devices['iPhone 13'],viewport:{width:390,height:844}});
  await mobile.goto(base+'/my-creations.html',{waitUntil:'domcontentloaded'});
  await mobile.locator('.mc-card').first().waitFor({timeout:15000});
  assert.equal(await mobile.locator('.mc-card').count(),8);
  assert.equal(await mobile.locator('#mcDetail').isVisible(),false,'Mobile opens gallery, not blocking detail overlay');
  await mobile.screenshot({path:'artifacts/my-creations/mobile-grid.png',fullPage:true});
  await mobile.locator('.mc-card').first().locator('.mc-card-image').click();
  assert.equal(await mobile.locator('#mcDetail').isVisible(),true);
  await mobile.screenshot({path:'artifacts/my-creations/mobile-details.png',fullPage:false});
  await mobile.locator('#mcDetailClose').click();
  assert.equal(await mobile.locator('#mcDetail').isVisible(),false);
 }finally{
  await browser?.close();
  server.kill('SIGTERM');
 }
});
