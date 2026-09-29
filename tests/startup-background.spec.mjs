import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

test('slow presentation scripts never expose the old tool layout',async({page})=>{
 for(const path of ['/index.html','/avatar-studio.html','/free-tools.html']){
  let release;const gate=new Promise(r=>release=r);
  await page.route('**/creator-pages.js',async route=>{await gate;await route.continue();});
  await page.goto(path,{waitUntil:'commit'});
  await expect(page.locator('html')).toHaveClass(/vu-starting/);
  await expect(page.locator(path==='/index.html'?'.shell':'main')).toHaveCSS('visibility','hidden');
  release();
  await expect(page.locator('html')).toHaveClass(/creator-pages/);
  await expect(page.locator('html')).not.toHaveClass(/vu-starting/);
  await expect(page.locator(path==='/index.html'?'.shell':'main')).toBeVisible();
  await page.unroute('**/creator-pages.js');
 }
});

test('running jobs protect document navigation and release native service on finish',async({page})=>{
 await page.addInitScript(()=>{window.nativeCalls=[];window.AndroidBridge={beginProcessing(){nativeCalls.push('begin');return true;},endProcessing(){nativeCalls.push('end');}};});
 await page.goto('/');
 await page.evaluate(()=>{window.session=VUProcessingSession.begin();});
 await page.locator('#freeToolsLink').evaluate(e=>e.click());
 expect(new URL(page.url()).pathname).toBe('/');
 expect(await page.evaluate(()=>VUProcessingSession.active)).toBe(true);
 await expect(page.locator('#backgroundProcessingHint')).toContainText('minimized');
 await page.evaluate(()=>VUProcessingSession.end(window.session));
 expect(await page.evaluate(()=>nativeCalls)).toEqual(['begin','end']);
 await page.locator('#freeToolsLink').evaluate(e=>e.click());
 await expect(page).toHaveURL(/free-tools/);
});

test('five real variations reuse one source and retain completed results after reload',async({page},info)=>{
 test.skip(info.project.name!=='chromium');test.setTimeout(600000);
 const source=info.outputPath('source.mp4');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x568:rate=30','-f','lavfi','-i','sine=frequency=440','-t','13','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-y',source]);
 await page.goto('/');
 // Capture actual FS writes, not a fake encoding result.
 await page.evaluate(()=>{
  const Real=FFmpegWASM.FFmpeg;window.sourceWrites=0;
  FFmpegWASM.FFmpeg=class extends Real{constructor(){super();const write=this.writeFile.bind(this);this.writeFile=(name,...args)=>{if(name.startsWith('source_'))sourceWrites++;return write(name,...args);};}};
 });
 await page.locator('#fileInput').setInputFiles(source);
 await page.locator('#variantCount').selectOption('5');
 await page.locator('#quality').selectOption({label:'720p'});
 const started=Date.now();await page.locator('#startBtn').click();
 await expect(page.locator('#resultsCard')).toBeVisible({timeout:570000});
 console.log('BATCH_BENCHMARK '+JSON.stringify({seconds:(Date.now()-started)/1000,sourceSeconds:13,outputs:5,resolution:'720p',sourceWrites:await page.evaluate(()=>sourceWrites)}));
 expect(await page.evaluate(()=>sourceWrites)).toBe(1);
 const rows=await page.evaluate(()=>JSON.parse(localStorage.getItem('vv_history')));
 expect(rows).toHaveLength(5);expect(rows.every(x=>x.mediaCacheKey)).toBe(true);
 const results=await page.evaluate(async()=>{const h=JSON.parse(localStorage.getItem('vv_history'));return Promise.all(h.map(async r=>{const b=await VUPersistentMedia.get(r.mediaCacheKey);const v=document.createElement('video');v.src=URL.createObjectURL(b);await new Promise((ok,no)=>{v.onloadedmetadata=ok;v.onerror=no;});return{duration:v.duration,width:v.videoWidth,height:v.videoHeight};}));});
 for(const r of results){expect(r.duration).toBeGreaterThan(12);expect(r.width).toBe(720);expect(r.height).toBe(1280);}
 await page.reload();
 await page.locator('[data-view="history"]').evaluate(e=>e.click());
 await expect(page.locator('#historyList .historyItem')).toHaveCount(5);
 await expect(page.locator('#historyList button').filter({hasText:'Download'})).toHaveCount(5);
});
