import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright';
const port=33712,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server/deepsyq-preview.js'],{
 cwd:process.cwd(),env:{...process.env,PORT:String(port),NODE_ENV:'test',
  DATABASE_URL:'',JARVIX_QUOTA_DATABASE_URL:'',OPENAI_API_KEY:'',GEMINI_API_KEY:'',
  GROQ_API_KEY:'',JARVIX_FREE_LLM_ENABLED:'false'},
 stdio:['ignore','pipe','pipe']
});
let logs='';server.stdout.on('data',x=>logs+=String(x));server.stderr.on('data',x=>logs+=String(x));
let browser;
try{
 let ready=false;
 for(let i=0;i<125;i++){try{const r=await fetch(base+'/jarvix-chat.html');if(r.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));}
 assert(ready,'Local preview server did not start: '+logs.slice(-1400));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const layout of [{name:'desktop',width:1365,height:900,mobile:false},{name:'mobile',width:390,height:844,mobile:true}]){
  await test('single JARVIX conversation '+layout.name+' Image/Video/Audio',async()=>{
   const context=await browser.newContext({viewport:{width:layout.width,height:layout.height},
    isMobile:layout.mobile,hasTouch:layout.mobile,deviceScaleFactor:1});
   await context.addInitScript(()=>{localStorage.setItem('deepsyq_lumina_terms_accepted','true');});
   const page=await context.newPage(),paid=[];
   page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|payments|stripe)/.test(r.url()))paid.push(r.url());});
   try{
    await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded',timeout:30000});
    for(const mode of ['image','video','audio']){
     const a=page.locator('#sidebar a[href="jarvix-chat.html?mode='+mode+'"]');
     assert.equal(await a.count(),1,'Home sidebar '+mode);
    }
    assert.equal(await page.locator('#homeQuickForm').count(),0,'old Home quick form removed');
    await page.locator('#homeQuickBar #jChatForm').waitFor({state:'visible',timeout:18000});
    assert.equal(await page.locator('#homeQuickBar .j-mode-rail a[href="index.html"]').count(),0,'no lower Video Uniquifier');
    await page.locator('#homeQuickPrompt').fill('Создай видео про лес утром');
    await page.locator('#homeQuickSubmit').click();
    await page.waitForURL(url=>url.pathname.endsWith('/jarvix-chat.html')&&url.searchParams.get('mode')==='video',{timeout:22000});
    await page.locator('#jWorkspacePane:not([hidden])').waitFor({timeout:22000});
    assert.match(await page.locator('#jWorkspaceFrame').getAttribute('src'),/studio=video&jarvix_embedded=1/);
    const homeConversation=await page.evaluate(()=>sessionStorage.getItem('jarvix_active_conversation'));
    assert(homeConversation,'Home uses the single persisted JARVIX session');
    await page.goto(base+'/jarvix-chat.html?mode=image',{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('#jChatForm').waitFor({state:'attached',timeout:22000}); // Native creation mode hides the chat composer visually, but keeps the one conversation.
    await page.locator('#jWorkspacePane:not([hidden])').waitFor({timeout:22000});
    assert.match(await page.locator('.j-chat-toolbar h1').innerText(),/JARVIX Image/);
    assert.match(await page.locator('#jWorkspaceFrame').getAttribute('src'),/generate-studio\.html\?studio=image&jarvix_embedded=1/);
    await page.frameLocator('#jWorkspaceFrame').locator('#creator').waitFor({timeout:26000});
    const id=await page.evaluate(()=>sessionStorage.getItem('jarvix_active_conversation'));
    assert(id,'existing JARVIX conversation ID must be present');
    const before=await page.locator('#jMessages').innerHTML();
    for(const mode of ['video','audio','image']){
     await page.evaluate(mode=>document.querySelector('#dsSiteSidebar a[href="jarvix-chat.html?mode='+mode+'"]')?.click(),mode);
     await page.waitForFunction(mode=>document.querySelector('#jWorkspaceFrame')?.getAttribute('src')?.includes('studio='+mode+'&jarvix_embedded=1'),mode,{timeout:12000});
     assert.equal(new URL(page.url()).pathname,'/jarvix-chat.html','same canonical pathname');
     assert.equal(new URL(page.url()).searchParams.get('mode'),mode,'mode query reflects current tool');
     assert.equal(await page.evaluate(()=>sessionStorage.getItem('jarvix_active_conversation')),id,'NO new conversation on mode toggle');
     assert.equal(await page.locator('#jMessages').innerHTML(),before,'transcript preserved');
     await page.frameLocator('#jWorkspaceFrame').locator('#creator').waitFor({timeout:25000});
     const native=page.frameLocator('#jWorkspaceFrame');
     const kind=mode==='audio'?'music':mode;
     await native.locator('.studio-nav [data-kind="'+kind+'"][aria-pressed="true"]').waitFor({state:'attached',timeout:22000});
     assert.equal(await native.locator('#modelButton').count(),1,'original model picker');
     assert.equal(await native.locator('#generate').count(),1,'original submit and credits flow');
    }
    await page.evaluate(()=>document.querySelector('#dsSiteSidebar a[href="jarvix-chat.html"]')?.click());
    await page.locator('#jWorkspacePane').waitFor({state:'hidden',timeout:10000});
    assert.equal(new URL(page.url()).pathname,'/jarvix-chat.html');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('jarvix_active_conversation')),homeConversation);
    assert.equal(new URL(page.url()).searchParams.has('mode'),false);
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('jarvix_active_conversation')),id);
    assert.equal(await page.locator('#jMessages').innerHTML(),before);
    assert.equal(await page.locator('.j-mode-rail a[href="index.html"]').count(),0);
    assert.equal(paid.length,0,'mode navigation never requests paid generation');
    console.log('UNIFIED_JARVIX_PASS',JSON.stringify({layout:layout.name,idPreserved:true,
      modes:['image','video','audio'],url:'/jarvix-chat.html',paidRequests:0}));
   }finally{await context.close();}
  });
 }
}finally{await browser?.close();server.kill('SIGTERM');await once(server,'exit').catch(()=>{});}
