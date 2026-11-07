import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright';

test('Owner mobile header positioning across shared pages',async()=>{
 const port=32994,base='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,['server/deepsyq-preview.js'],{
  env:{...process.env,PORT:String(port),NODE_ENV:'test',
   OPENAI_API_KEY:'',GEMINI_API_KEY:'',DATABASE_URL:'',JARVIX_FREE_LLM_ENABLED:'false'},
  stdio:['ignore','pipe','pipe']});
 let output='';server.stdout.on('data',x=>output+=String(x));server.stderr.on('data',x=>output+=String(x));
 let browser;
 try{
  let ready=false;
  for(let i=0;i<140;i++){
   try{if((await fetch(base+'/deepsyq.html')).ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,120));
  }
  assert.ok(ready,'Preview failed '+output.slice(-700));
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [390,320]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
   await context.addInitScript(()=>localStorage.setItem('deepsyq_home_language','ru'));
   try{
    for(const route of ['deepsyq.html','ai-apps.html','pricing.html','canvas.html',
      'generate-studio.html?studio=image','generate-studio.html?studio=video',
      'generate-studio.html?studio=audio','jarvix-chat.html','free-tools.html',
      'my-creations.html','index.html']){
     const page=await context.newPage();
     try{
      await page.goto(base+'/'+route,{waitUntil:'domcontentloaded',timeout:18000});
      await page.waitForTimeout(220);
      const geometry=await page.evaluate(()=>{
       const box=selector=>{const e=document.querySelector(selector),r=e?.getBoundingClientRect();
        return r?{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}:null;};
       return{header:box('header.ds-mobile-header'),spacer:box('.ds-mobile-header-spacer'),
        brand:box('.ds-mobile-brand'),word:box('.ds-mobile-brand span'),login:box('#topLogin'),
        menu:box('.ds-mobile-menu'),orb:box('#topJarvisBtn'),controls:box('.ds-mobile-controls'),
        main:box('main'),body:document.body.className};
      });
      console.log('MOBILE_HEADER_GEOMETRY '+JSON.stringify({width,route,...geometry}));
     }finally{await page.close();}
    }
   }finally{await context.close();}
  }
 }finally{
  await browser?.close();server.kill('SIGTERM');
  if(server.exitCode===null&&server.signalCode===null)await once(server,'exit');
 }
});
