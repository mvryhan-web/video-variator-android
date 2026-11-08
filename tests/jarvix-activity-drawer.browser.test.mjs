// Owner acceptance: one collapsible recent drawer across JARVIX Chat + three Studios.
// Read-only private history, no new generations, no Stripe or paid calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

test('JARVIX recent drawer parity, account scope, original New Chat handler and no paid jobs',async()=>{
  const port=32986,base='http://127.0.0.1:'+port;
  const server=spawn(process.execPath,['server/deepsyq-preview.js'],{
    cwd:process.cwd(),env:{...process.env,PORT:String(port),NODE_ENV:'test',DATABASE_URL:'',
      JARVIX_QUOTA_DATABASE_URL:'',OPENAI_API_KEY:'',GEMINI_API_KEY:'',
      GROQ_API_KEY:'',STRIPE_SECRET_KEY:'',AI_BILLING_MODE:'test',
      JARVIX_FREE_LLM_ENABLED:'false'},stdio:['ignore','pipe','pipe']
  });
  let browser;let output='';
  server.stdout.on('data',chunk=>output+=String(chunk));
  server.stderr.on('data',chunk=>output+=String(chunk));
  try{
    let ready=false;
    for(let i=0;i<135;i++){
      try{if((await fetch(base+'/jarvix-chat.html')).ok){ready=true;break;}}catch{}
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    assert.ok(ready,'Local preview unavailable '+output.slice(-800));
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:1365,height:850}});
    await context.addInitScript(()=>{
      localStorage.setItem('deepsyq_home_language','ru');
      localStorage.setItem('deepsyq_lumina_terms_accepted','true');
    });
    const page=await context.newPage(),paid=[];
    page.on('request',req=>{
      if(req.method()==='POST'&&/\/api\/(?:studio\/jobs|stripe|payments|checkout)/i.test(req.url()))paid.push(req.url());
    });
    await page.goto(base+'/jarvix-chat.html',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#jarvixActivityToggle',{timeout:15000});
    assert.equal(await page.locator('#jarvixActivityPanel').isVisible(),false,'drawer starts collapsed');
    await page.locator('#jarvixActivityToggle').click();
    assert.equal(await page.locator('#jarvixActivityPanel').isVisible(),true);
    assert.equal(await page.locator('#jarvixActivityPanel #jNew').count(),1,'existing New chat moved, not duplicated');
    assert.equal(await page.locator('#jNew').evaluate(e=>getComputedStyle(e).borderTopWidth),'0px','no blue new-chat frame');
    assert.equal(await page.locator('#jHistory').isVisible(),false,'old select hidden only when drawer mounted');
    assert.equal(await page.locator('#jarvixActivityPanel h2').textContent(),'JARVIX Chat');
    assert.equal(await page.locator('#jarvixActivityPanel h3').first().textContent(),'Недавние чаты');

    await page.evaluate(async()=>{
      const {conversationStore}=await import('./jarvix-conversations.js');
      const store=await conversationStore();
      const record=store.create('qa-mock');
      record.title='QA saved conversation';
      record.messages=[{id:'qa-msg',role:'user',text:'QA saved message',status:'sent',createdAt:Date.now()}];
      await store.save(record);
      window.dispatchEvent(new Event('jarvix:history-changed'));
    });
    await page.waitForFunction(()=>[...document.querySelectorAll('.jarvix-activity-item')].some(x=>x.textContent==='QA saved conversation'));
    assert.equal(await page.locator('.jarvix-activity-list .jarvix-activity-item').filter({hasText:'QA saved conversation'}).count(),1);

    // Same private chat index appears from Image/Video/Audio, without duplicating it.
    for(const kind of ['image','video','audio']){
      await page.goto(base+'/generate-studio.html?studio='+kind,{waitUntil:'domcontentloaded'});
      await page.waitForSelector('#jarvixActivityToggle',{timeout:15000});
      assert.equal(await page.locator('#jarvixActivityPanel').isVisible(),true,'drawer stays open in '+kind);
      await page.waitForFunction(()=>[...document.querySelectorAll('.jarvix-activity-item')].some(x=>x.textContent==='QA saved conversation'));
      assert.equal(await page.locator('#jarvixActivityToggle').count(),1);
    }

    await page.locator('.jarvix-activity-item').filter({hasText:'QA saved conversation'}).click();
    await page.waitForURL(/jarvix-chat\.html/);
    await page.waitForFunction(()=>document.getElementById('jMessages')?.textContent?.includes('QA saved message'));
    assert.ok((await page.locator('#jMessages').textContent()).includes('QA saved message'),'old chat restored');

    await page.goto(base+'/generate-studio.html?studio=video');
    await page.locator('#jarvixActivityPanel .jarvix-activity-new-link').click();
    await page.waitForURL(/jarvix-chat\.html/);
    await page.waitForFunction(()=>document.querySelector('#jMessages .j-empty'));
    assert.ok((await page.locator('#jMessages').textContent()).includes('What would you like to create?'),'new chat starts empty');
    assert.equal(new URL(page.url()).searchParams.has('new'),false,'new chat query cleared on load');

    await page.locator('#jarvixActivityToggle').click();
    assert.equal(await page.locator('#jarvixActivityPanel').isVisible(),false);
    await page.goto(base+'/generate-studio.html?studio=audio');
    await page.waitForSelector('#jarvixActivityToggle');
    assert.equal(await page.locator('#jarvixActivityPanel').isVisible(),false,'collapsed state persists');

    assert.deepEqual(paid,[],'NO paid generation/payment calls');

    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const mobilePage=await mobile.newPage();
    await mobilePage.goto(base+'/jarvix-chat.html');
    await mobilePage.waitForSelector('#jarvixActivityToggle');
    const position=await mobilePage.locator('#jarvixActivityToggle').boundingBox();
    assert.ok(position&&position.x>=0&&position.x+position.width<=390,'mobile toggle fits width');
    await mobilePage.locator('#jarvixActivityToggle').click();
    const drawer=await mobilePage.locator('#jarvixActivityPanel').boundingBox();
    assert.ok(drawer&&drawer.x>=0&&drawer.x+drawer.width<=390,'mobile drawer fits width');
    await mobile.close();
    await context.close();
  }finally{
    await browser?.close();
    server.kill('SIGTERM');
  }
});
