import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

test('JARVIX Chat: full-height non-dimming history, Chat mode and existing Studio settings', async () => {
  const port = 32967, base = 'http://127.0.0.1:' + port;
  const proc = spawn(process.execPath, ['server/deepsyq-preview.js'], {
    cwd: process.cwd(),
    env: {...process.env, PORT:String(port), NODE_ENV:'test', DATABASE_URL:'',
      JARVIX_QUOTA_DATABASE_URL:'', OPENAI_API_KEY:'', GEMINI_API_KEY:'',
      GROQ_API_KEY:'', STRIPE_SECRET_KEY:'', AI_BILLING_MODE:'test',
      JARVIX_FREE_LLM_ENABLED:'false'},
    stdio:['ignore','pipe','pipe']
  });
  let stdout = '', browser;
  proc.stdout.on('data', b => stdout += String(b));
  proc.stderr.on('data', b => stdout += String(b));
  try {
    let ready = false;
    for (let i=0; i<100; i++) {
      try { if ((await fetch(base + '/jarvix-chat.html')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    assert.ok(ready, 'Local preview failed: ' + stdout.slice(-800));
    browser = await chromium.launch({headless:true,args:['--no-sandbox']});
    await mkdir('artifacts/jarvix-chat-sidebar', {recursive:true});
    for (const setup of [
      {name:'desktop',viewport:{width:1365,height:900},isMobile:false},
      {name:'mobile',viewport:{width:390,height:844},isMobile:true}
    ]) {
      const ctx = await browser.newContext({viewport:setup.viewport,isMobile:setup.isMobile,hasTouch:setup.isMobile});
      await ctx.addInitScript(() => {
        localStorage.setItem('deepsyq_home_language','ru');
        localStorage.setItem('deepsyq_lumina_terms_accepted','true');
      });
      const page = await ctx.newPage();
      const paid = [];
      page.on('request',r => {
        if (r.method()==='POST' && /\/api\/(?:studio\/jobs|payments|checkout|stripe)/i.test(r.url())) paid.push(r.url());
      });
      try {
        await page.goto(base + '/jarvix-chat.html',{waitUntil:'domcontentloaded',timeout:30000});
        await page.locator('#jChatTitleBtn').waitFor();
        await page.waitForFunction(() => document.getElementById('jActiveModeLabel')?.textContent?.trim() === 'Чат',{timeout:12000});
        assert.equal((await page.locator('#jActiveModeLabel').textContent()).trim(),'Чат');
        await page.locator('#jChatTitleBtn').click();
        await page.locator('#jChatDropdown:not([hidden])').waitFor();
        const panel = await page.evaluate(() => {
          const p=document.querySelector('.jarvix-chat #jChatDropdown .j-dropdown-panel');
          const title=document.querySelector('#jChatTitleBtn').getBoundingClientRect();
          const r=p.getBoundingClientRect();
          const bg=document.querySelector('#jDropdownBackdrop');
          return {
            x:r.left,y:r.top,right:r.right,bottom:r.bottom,height:r.height,
            viewportW:innerWidth,viewportH:innerHeight,
            backdrop:getComputedStyle(bg).display,chatFilter:getComputedStyle(document.querySelector('#jMessages')).filter,
            titleBottom:title.bottom
          };
        });
        assert.equal(panel.backdrop,'none','chat may never be dimmed');
        assert.equal(panel.chatFilter,'none','chat text stays sharp');
        assert.ok(panel.y >= panel.titleBottom-2,'history starts below JARVIX title '+JSON.stringify(panel));
        assert.ok(panel.bottom >= panel.viewportH-28,'history extends to bottom '+JSON.stringify(panel));
        assert.ok(panel.x >= 0 && panel.right <= panel.viewportW+1,'history panel fits '+JSON.stringify(panel));
        assert.ok(panel.height > setup.viewport.height*0.58,'full-height history (not 250px popup)');
        await page.screenshot({path:'artifacts/jarvix-chat-sidebar/'+setup.name+'-history.png',fullPage:false});
        await page.locator('#jChatTitleBtn').click();
        assert.equal(await page.locator('#jChatDropdown').isVisible(),false);

        const settings = page.locator('#jChatForm .j-settings-shortcut');
        await settings.waitFor({state:'visible',timeout:15000});
        await settings.click();
        await page.waitForFunction(()=>{
          const host=document.getElementById('homeStudioSettingsHost');
          return !!host && getComputedStyle(host).visibility==='visible' && getComputedStyle(host).display!=='none' &&
            host.getBoundingClientRect().width>200;
        },{timeout:20000});
        await page.frameLocator('#homeStudioSettingsFrame').locator('#studioSettingsHub[open]').waitFor({timeout:15000});
        for(const id of ['studioTypePicker','modelButton','settingsButton'])
          assert.equal(await page.frameLocator('#homeStudioSettingsFrame').locator('#studioSettingsHub #'+id).count(),1,
            'existing settings '+id+' should open in JARVIX only');
        assert.equal(await settings.getAttribute('aria-expanded'),'true');
        await page.screenshot({path:'artifacts/jarvix-chat-sidebar/'+setup.name+'-settings.png',fullPage:false});
        assert.deepEqual(paid,[],'read-only settings may not charge credits');
        console.log('JARVIX_CHAT_SCOPED_PASS',JSON.stringify({layout:setup.name,panel}));
      } finally { await ctx.close(); }
    }
  } finally {
    await browser?.close();
    proc.kill('SIGTERM');
  }
});
