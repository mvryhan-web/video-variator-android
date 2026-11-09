import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

// Read-only UI acceptance. Does not log in, save conversations, submit any
// messages or use an AI/provider endpoint. Synthetic items live only in DOM.
test('JARVIX Chat: no scrollbar when empty, scroll only messages when long', async () => {
  const port=32948,base='http://127.0.0.1:'+port;
  const server=spawn(process.execPath,['server/deepsyq-preview.js'],{
    cwd:process.cwd(),
    env:{...process.env,PORT:String(port),NODE_ENV:'test',AI_BILLING_MODE:'test',
      DATABASE_URL:'',JARVIX_QUOTA_DATABASE_URL:'',OPENAI_API_KEY:'',
      GEMINI_API_KEY:'',GROQ_API_KEY:'',STRIPE_SECRET_KEY:'',
      JARVIX_FREE_LLM_ENABLED:'false'},
    stdio:['ignore','pipe','pipe']
  });
  let browser;
  try {
    let online=false;
    for(let i=0;i<100;i++){
      try {if((await fetch(base+'/jarvix-chat.html')).ok){online=true;break;}}catch{}
      await new Promise(resolve=>setTimeout(resolve,130));
    }
    assert(online,'Local preview unavailable');
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    for(const device of [
      {name:'desktop',w:1366,h:900,mobile:false},
      {name:'mobile',w:390,h:844,mobile:true},
      {name:'small-mobile',w:320,h:568,mobile:true}
    ]){
      const ctx=await browser.newContext({viewport:{width:device.w,height:device.h},isMobile:device.mobile,hasTouch:device.mobile});
      await ctx.addInitScript(()=>{
        localStorage.setItem('deepsyq_home_language','ru');
        localStorage.setItem('deepsyq_lumina_terms_accepted','true');
      });
      const page=await ctx.newPage();const paid=[];
      page.on('request',req=>{
        if(req.method()==='POST' && /\/api\/(?:checkout|payments|stripe|studio\/jobs)/i.test(req.url()))paid.push(req.url());
      });
      try {
        await page.goto(base+'/jarvix-chat.html',{waitUntil:'domcontentloaded',timeout:30000});
        await page.locator('#jMessages').waitFor({state:'visible'});
        await page.locator('#jChatForm').waitFor({state:'visible'});
        await page.waitForTimeout(850); // includes late shared mobile header injection
        const initial=await page.evaluate(()=>{
          const main=document.querySelector('main.jarvix-chat');
          const messages=document.querySelector('#jMessages');
          const toolbar=document.querySelector('.j-chat-toolbar').getBoundingClientRect();
          const dock=document.querySelector('.j-chat-bottom').getBoundingClientRect();
          const area=messages.getBoundingClientRect();
          window.scrollTo(0,100);
          return {docY:window.scrollY,bodyOverflow:getComputedStyle(document.body).overflowY,
            scrollRange:messages.scrollHeight-messages.clientHeight,
            overflow:getComputedStyle(messages).overflowY,
            viewportHeight:innerHeight,mainBottom:main.getBoundingClientRect().bottom,
            toolbarTop:toolbar.top,toolbarBottom:toolbar.bottom,
            dockTop:dock.top,dockBottom:dock.bottom,areaTop:area.top,areaBottom:area.bottom,
            naturalMessages:messages.querySelectorAll('.j-message').length};
        });
        assert.equal(initial.docY,0,device.name+' outer page must not scroll');
        assert.equal(initial.bodyOverflow,'hidden',device.name+' document scrollbar must not appear');
        if(initial.naturalMessages===0){
          assert(initial.scrollRange<=2,device.name+' empty chat scrollbar must not appear '+JSON.stringify(initial));
        }
        assert(initial.dockBottom<=device.h+2 && initial.dockTop>initial.toolbarBottom,
          device.name+' original composer must remain visible '+JSON.stringify(initial));

        await page.evaluate(()=>{
          const area=document.querySelector('#jMessages');
          area.replaceChildren();
          for(let n=0;n<30;n++){
            const article=document.createElement('article');
            article.className='j-message '+(n%2?'assistant':'user');
            article.textContent='TEST SCROLL-ONLY MESSAGE '+n+' — '.repeat(12);
            area.append(article);
          }
        });
        const long=await page.evaluate(()=>{
          const area=document.querySelector('#jMessages');
          const before={toolbar:document.querySelector('.j-chat-toolbar').getBoundingClientRect().top,
            dock:document.querySelector('.j-chat-bottom').getBoundingClientRect().top};
          area.scrollTop=area.scrollHeight;
          const after={toolbar:document.querySelector('.j-chat-toolbar').getBoundingClientRect().top,
            dock:document.querySelector('.j-chat-bottom').getBoundingClientRect().top};
          window.scrollTo(0,250);
          return {scrollRange:area.scrollHeight-area.clientHeight,scrollTop:area.scrollTop,
            messageScrollStyle:getComputedStyle(area).overflowY,outerScrollY:window.scrollY,
            fixedToolbarDelta:after.toolbar-before.toolbar,fixedDockDelta:after.dock-before.dock,
            toolbarTop:after.toolbar,dockTop:after.dock};
        });
        assert(long.scrollRange>80,device.name+' long messages must overflow');
        assert(long.scrollTop>40,device.name+' message area must be independently scrollable');
        assert.equal(long.messageScrollStyle,'auto',device.name+' scrollbar should appear only as needed');
        assert.equal(long.outerScrollY,0,device.name+' page must not move');
        assert(Math.abs(long.fixedToolbarDelta)<1 && Math.abs(long.fixedDockDelta)<1,
          device.name+' title and composer must remain fixed '+JSON.stringify(long));
        assert.deepEqual(paid,[],device.name+' must not trigger paid APIs');
        console.log('JARVIX_ONLY_MESSAGES_SCROLL_PASS',JSON.stringify({device:device.name,empty:initial,long}));
      } finally { await ctx.close(); }
    }
  } finally {await browser?.close();server.kill('SIGTERM');}
});
