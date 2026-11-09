import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=32867,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server/deepsyq-preview.js'],{
 cwd:process.cwd(),
 env:{...process.env,PORT:String(port),NODE_ENV:'test',AI_BILLING_MODE:'test',
  OPENAI_API_KEY:'',GEMINI_API_KEY:'',GROQ_API_KEY:'',DATABASE_URL:'',
  JARVIX_QUOTA_DATABASE_URL:'',JARVIX_FREE_LLM_ENABLED:'false'},
 stdio:['ignore','pipe','pipe']
});
let logs='';server.stdout.on('data',x=>logs+=String(x));server.stderr.on('data',x=>logs+=String(x));
let browser;
try{
 let ready=false;
 for(let i=0;i<100;i++){if(server.exitCode!==null)break;
  try{const r=await fetch(base+'/deepsyq.html');if(r.ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,150));
 }
 assert(ready,'Preview did not start: '+logs.slice(-1000));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 await mkdir('artifacts/one-jarvix-chat',{recursive:true});
 for(const layout of [{name:'desktop',width:1365,height:900,mobile:false},{name:'mobile',width:390,height:844,mobile:true}]){
  await test(layout.name+' has ONE JARVIX conversation with three connected Studio tools',async()=>{
   const context=await browser.newContext({viewport:{width:layout.width,height:layout.height},isMobile:layout.mobile,hasTouch:layout.mobile});
   await context.addInitScript(()=>{localStorage.setItem('deepsyq_lumina_terms_accepted','true');});
   const page=await context.newPage(),paid=[],errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|stripe|payments|studio\/estimate)\b/.test(r.url()))paid.push(r.url());});
   try{
    await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded',timeout:30000});
    const targets={image:'jarvix-chat.html?mode=image',video:'jarvix-chat.html?mode=video',audio:'jarvix-chat.html?mode=audio'};
    for(const [kind,href] of Object.entries(targets))
     assert.equal(await page.locator('#sidebar .nav-entry a[href="'+href+'"]').count(),1,'Home '+kind+' must go to canonical JARVIX');
    assert.equal(await page.locator('#sidebar .nav-entry a[aria-label="JARVIX"][href="jarvix-chat.html"]').count(),1);
    await page.goto(base+'/jarvix-chat.html?mode=image',{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('body[data-jarvix-mode="image"]').waitFor({timeout:25000});
    await page.locator('#jWorkspaceFrame[src*="studio=image"]').waitFor({timeout:25000});
    await page.frameLocator('#jWorkspaceFrame').locator('#creator').waitFor({state:'attached',timeout:35000});
    assert.match(await page.locator('.j-chat-toolbar h1').innerText(),/JARVIX Image/);
    await page.evaluate(()=>{window.__oneJarvixPageMarker=Symbol('same-page');});
    const before=await page.evaluate(()=>sessionStorage.getItem('jarvix_active_conversation'));
    assert(before,'JARVIX must have an active conversation');
    const aside=page.locator('#dsSiteSidebar');
    await aside.waitFor({state:'attached',timeout:15000});
    for(const kind of ['video','audio','image']){
     // A sidebar selection changes mode in-place, without a second chat page or history.
     await page.evaluate(mode=>{
       const a=document.querySelector('#dsSiteSidebar a[href="jarvix-chat.html?mode='+mode+'"]');
       if(!a)throw Error('Missing sidebar '+mode);
       a.click();
     },kind);
     await page.locator('body[data-jarvix-mode="'+kind+'"]').waitFor({timeout:10000});
     assert.equal(new URL(page.url()).pathname,'/jarvix-chat.html','one canonical chat URL');
     assert.equal(new URL(page.url()).searchParams.get('mode'),kind);
     assert.match(await page.locator('#jWorkspaceFrame').getAttribute('src'),new RegExp('studio='+kind));
     assert.match(await page.locator('.j-chat-toolbar h1').innerText(),new RegExp('JARVIX '+kind[0].toUpperCase()+kind.slice(1)));
     assert.equal(await page.evaluate(()=>sessionStorage.getItem('jarvix_active_conversation')),before,'same conversation');
     assert.equal(await page.evaluate(()=>typeof window.__oneJarvixPageMarker),'symbol','page never reloaded');
     assert.equal(await page.locator('#jHistory').count(),1,'one history controller');
    }
    await page.locator('#jWorkspaceClose').click({timeout:12000});
    await page.locator('#jWorkspacePane').waitFor({state:'hidden',timeout:8000});
    assert.equal(new URL(page.url()).pathname,'/jarvix-chat.html');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('jarvix_active_conversation')),before);
    assert.match(await page.locator('.j-chat-toolbar h1').innerText(),/JARVIX Chat/);
    assert.equal(await page.locator('#jWorkspaceFrame').getAttribute('src'),'about:blank');
    assert.equal(await page.locator('#jChatForm').count(),1);
    assert.equal(paid.length,0,'mode selection must not charge or create jobs');
    await page.screenshot({path:'artifacts/one-jarvix-chat/'+layout.name+'-one-chat.png',fullPage:false});
    assert.equal(errors.filter(x=>/SyntaxError|ReferenceError|TypeError/.test(x)).length,0,'unexpected script errors '+errors.join(' | '));
   }finally{await context.close();}
  });
 }
}finally{await browser?.close();server.kill('SIGTERM');}
