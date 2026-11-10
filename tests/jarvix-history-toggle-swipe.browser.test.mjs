import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright';

const port = 32749;
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['server/deepsyq-preview.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env, PORT:String(port), NODE_ENV:'test',
    OPENAI_API_KEY:'', GEMINI_API_KEY:'', GROQ_API_KEY:'',
    STRIPE_SECRET_KEY:'', DATABASE_URL:'', JARVIX_FREE_LLM_ENABLED:'false',
  },
  stdio:['ignore','pipe','pipe']
});
let logs = '';
server.stdout.on('data', d => {logs += d;});
server.stderr.on('data', d => {logs += d;});
let browser;
try {
  let ready = false;
  for(let i = 0; i < 100; i++){
    if(server.exitCode !== null)break;
    try { const r=await fetch(base+'/jarvix-chat.html'); if(r.ok){ready=true;break;} } catch {}
    await new Promise(r=>setTimeout(r,160));
  }
  assert.ok(ready,'Existing JARVIX preview server did not start '+logs.slice(-1000));
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const profile of [
    {name:'desktop',width:1280,height:860,mobile:false},
    {name:'mobile',width:390,height:844,mobile:true}
  ]) {
    await test('existing JARVIX history toggle and selected chat - '+profile.name, async()=>{
      const ctx=await browser.newContext({
        viewport:{width:profile.width,height:profile.height},
        isMobile:profile.mobile,hasTouch:profile.mobile
      });
      const page=await ctx.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      try {
        await page.goto(base+'/jarvix-chat.html',{waitUntil:'domcontentloaded'});
        await page.locator('#jChatTitleBtn').waitFor();
        // Seed the EXISTING owner-scoped browser database, not a new chat store.
        await page.evaluate(async()=>{
          const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('guest'));
          const owner=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
          await new Promise((resolve,reject)=>{
            const req=indexedDB.open('deepsyq-jarvix-conversations-v1',2);
            req.onupgradeneeded=()=>{
              const db=req.result;
              const store=db.objectStoreNames.contains('conversations')?req.transaction.objectStore('conversations'):db.createObjectStore('conversations',{keyPath:'id'});
              if(!store.indexNames.contains('owner'))store.createIndex('owner','owner');
            };
            req.onerror=()=>reject(req.error);
            req.onsuccess=()=>{
              const db=req.result,tx=db.transaction('conversations','readwrite');
              tx.objectStore('conversations').put({
                id:'drawer-history-seeded',sessionId:'drawer-session-1',
                owner,title:'Saved conversation for drawer',
                messages:[{id:'msg-1',role:'user',text:'An earlier message',createdAt:Date.now()}],
                createdAt:Date.now(),updatedAt:Date.now()
              });
              tx.oncomplete=()=>{db.close();resolve()};
              tx.onerror=()=>reject(tx.error);
            };
          });
        });
        await page.reload({waitUntil:'domcontentloaded'});
        // The JARVIX module awaits IndexedDB before wiring its existing title button.
        await page.waitForFunction(() => typeof document.querySelector('#jChatTitleBtn')?.onclick === 'function', {timeout:15000});
        const toggle=page.locator('#jDrawerHistoryToggle');
        const dropdown=page.locator('#jChatDropdown');
        const rows=page.locator('#jMenuHistoryList');
        await page.locator('#jChatTitleBtn').click();
        await dropdown.waitFor({state:'visible',timeout:10000});
        assert.equal(await dropdown.isVisible(),true,'original menu opens');
        assert.equal(await toggle.getAttribute('aria-expanded'),'false','starts collapsed');
        assert.equal(await rows.isVisible(),false,'history hidden until expanded');

        await toggle.click();
        assert.equal(await toggle.getAttribute('aria-expanded'),'true');
        await page.getByRole('button',{name:/Saved conversation for drawer/}).waitFor({state:'visible'});
        assert.equal(await rows.isVisible(),true);

        await toggle.click();
        assert.equal(await toggle.getAttribute('aria-expanded'),'false');
        assert.equal(await rows.isVisible(),false,'second click collapses');

        await page.locator('#jDrawerRecent').click();
        assert.equal(await rows.isVisible(),true,'recent chats shortcut expands the same list');
        const before=new URL(page.url()).pathname;
        await page.getByRole('button',{name:/Saved conversation for drawer/}).click();
        assert.equal(await dropdown.isVisible(),false,'selecting a chat closes menu');
        assert.equal(new URL(page.url()).pathname,before,'selection stays in same chat page');
        assert.match(await page.locator('#jMessages').innerText(),/An earlier message/);

        if(profile.mobile){
          await page.locator('#jChatTitleBtn').click();
          assert.equal(await dropdown.isVisible(),true);
          await page.evaluate(()=>{
            const panel=document.querySelector('#jChatDropdown .j-drawer-panel');
            const rect=panel.getBoundingClientRect(),x=rect.left+Math.min(155,rect.width-18),y=rect.top+Math.min(160,rect.height-30);
            const make=(xx,yy)=>new Touch({identifier:9,target:panel,clientX:xx,clientY:yy});
            panel.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[make(x,y)],changedTouches:[make(x,y)]}));
            panel.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[make(x-9,y+105)]}));
          });
          assert.equal(await dropdown.isVisible(),true,'vertical swipe must not close chat drawer');
          await page.evaluate(()=>{
            const panel=document.querySelector('#jChatDropdown .j-drawer-panel');
            const rect=panel.getBoundingClientRect(),x=rect.left+Math.min(155,rect.width-18),y=rect.top+Math.min(160,rect.height-30);
            const make=(xx,yy)=>new Touch({identifier:10,target:panel,clientX:xx,clientY:yy});
            panel.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[make(x,y)],changedTouches:[make(x,y)]}));
            panel.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[make(x-115,y+5)]}));
          });
          await dropdown.waitFor({state:'hidden',timeout:1600});
          assert.equal(await dropdown.isVisible(),false,'left swipe closes existing menu');
        }
        assert.equal(await page.locator('#jChatForm').count(),1,'only one existing composer');
        assert.equal(errors.length,0,'No unexpected browser errors: '+errors.join(' | '));
      } finally {await ctx.close()}
    });
  }
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
  if(server.exitCode===null&&server.signalCode===null)await once(server,'exit');
}
