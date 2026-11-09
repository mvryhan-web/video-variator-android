// Owner request: JARVIX Chat has exactly one history UI, but Studios retain existing activity.
// Read-only local-preview tests: desktop and mobile. No generations, billing or network credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

test('JARVIX Chat no duplicate recent drawer; original history and Studios preserved', async () => {
  const port=32958,base='http://127.0.0.1:'+port;
  const server=spawn(process.execPath,['server/deepsyq-preview.js'],{
    cwd:process.cwd(), env:{...process.env,PORT:String(port),NODE_ENV:'test',
      DATABASE_URL:'',JARVIX_QUOTA_DATABASE_URL:'',OPENAI_API_KEY:'',
      GEMINI_API_KEY:'',GROQ_API_KEY:'',STRIPE_SECRET_KEY:'',
      AI_BILLING_MODE:'test',JARVIX_FREE_LLM_ENABLED:'false'},stdio:['ignore','pipe','pipe']
  });
  let browser;
  try {
    let ready=false;
    for(let i=0;i<120;i++){
      try{if((await fetch(base+'/jarvix-chat.html')).ok){ready=true;break;}}catch{}
      await new Promise(resolve=>setTimeout(resolve,120));
    }
    assert.ok(ready,'Local preview is unavailable');
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    for(const layout of [{name:'desktop',width:1365,height:900,mobile:false},
                         {name:'mobile',width:390,height:844,mobile:true}]){
      const ctx=await browser.newContext({viewport:{width:layout.width,height:layout.height},
        isMobile:layout.mobile,hasTouch:layout.mobile});
      await ctx.addInitScript(()=>{
        localStorage.setItem('deepsyq_home_language','ru');
        localStorage.setItem('deepsyq_lumina_terms_accepted','true');
      });
      const page=await ctx.newPage(),paid=[];
      page.on('request',r=>{
        if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|stripe|payments|checkout)/i.test(r.url()))paid.push(r.url());
      });
      try {
        await page.goto(base+'/jarvix-chat.html',{waitUntil:'domcontentloaded'});
        await page.locator('#jChatTitleBtn').waitFor();
        await page.waitForTimeout(550);
        assert.equal(await page.locator('#jarvixActivityPanel').count(),0,
          layout.name+': duplicate recent drawer should not be mounted');
        assert.equal(await page.locator('#jarvixActivityToggle').count(),0,
          layout.name+': duplicate recent toggle should not be mounted');
        assert.equal(await page.locator('#jChatForm').count(),1,
          layout.name+': original composer stays mounted only once');
        assert.equal(await page.locator('#jPlus').count(),1,
          layout.name+': original plus button is not duplicated');
        await page.locator('#jChatTitleBtn').click();
        await page.locator('#jChatDropdown:not([hidden])').waitFor();
        assert.equal(await page.locator('#jMenuHistoryList').count(),1);
        assert.equal(await page.locator('#jMenuNewChat').count(),1);
        assert.equal(await page.locator('#jDropdownBackdrop').evaluate(e=>getComputedStyle(e).display),'none');
        await page.locator('#jChatTitleBtn').click();
        assert.equal(await page.locator('#jChatDropdown').isVisible(),false);
        assert.equal((await page.locator('#jActiveModeLabel').textContent()).trim(),'Чат');

        // Old drawer stays on the separate Studio page: scope does NOT impact Studios.
        await page.goto(base+'/generate-studio.html?studio=image',{waitUntil:'domcontentloaded'});
        await page.locator('#jarvixActivityToggle').waitFor({timeout:16000});
        assert.equal(await page.locator('#jarvixActivityPanel').count(),1,
          layout.name+': preserve existing Studio recent-history component');
        assert.deepEqual(paid,[],'No paid generation or checkout requests');
        console.log('SINGLE_JARVIX_HISTORY_PASS',layout.name);
      } finally {await ctx.close();}
    }
  } finally {
    await browser?.close();
    server.kill('SIGTERM');
  }
});
