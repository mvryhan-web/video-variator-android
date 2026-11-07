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
      console.log('MOBILE_HEADER_QA '+JSON.stringify({width,route,...geometry}));
      const centerX=b=>b.x+b.w/2,centerY=b=>b.y+b.h/2;
      for(const key of ['header','spacer','brand','word','login','menu','orb','controls','main'])
       assert.ok(geometry[key]&&geometry[key].w>0&&geometry[key].h>0,
        width+' '+route+' missing shared visible '+key+' '+JSON.stringify(geometry));
      assert.equal(geometry.header.h,132,width+' '+route+' exactly one compact 132px header');
      assert.equal(geometry.spacer.h,132,width+' '+route+' flow spacer matches header (no leftover 156px gap)');
      assert.ok(Math.abs(centerX(geometry.word)-width/2)<=1.5,
       width+' '+route+' actual Deepsyq WORD must be horizontally centered, not the icon+word pair');
      assert.ok(Math.abs(centerY(geometry.word)-centerY(geometry.login))<=2,
       width+' '+route+' title must share actual Login button midline '+JSON.stringify(geometry));
      assert.ok(Math.abs(centerY(geometry.menu)-centerY(geometry.login))<=2,
       width+' '+route+' menu and Login remain same top row');
      assert.ok(geometry.orb.y>=geometry.brand.y+geometry.brand.h-2,
       width+' '+route+' original orb must not cover Deepsyq word');
      assert.ok(geometry.orb.y+geometry.orb.h<=geometry.header.y+geometry.header.h+2,
       width+' '+route+' original orb must fit within compact header');
      assert.ok(geometry.controls.y+geometry.controls.h<=geometry.header.y+geometry.header.h+1,
       width+' '+route+' existing second-row controls must fit header');
      assert.ok(geometry.main.y>=geometry.header.y+geometry.header.h-1&&
       geometry.main.y<=geometry.header.y+geometry.header.h+28,
       width+' '+route+' actual content begins near the common header without a large top gap');
      assert.ok(geometry.word.x>geometry.menu.x+geometry.menu.w+2&&
       geometry.word.x+geometry.word.w<geometry.login.x-2,
       width+' '+route+' title must not overlap menu or Login');

     }finally{await page.close();}
    }
   }finally{await context.close();}
  }
 }finally{
  await browser?.close();server.kill('SIGTERM');
  if(server.exitCode===null&&server.signalCode===null)await once(server,'exit');
 }
});
