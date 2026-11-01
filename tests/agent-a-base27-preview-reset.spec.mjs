import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// A37 BASE27: genuine local media preview + a workspace reset that never
// deletes owned history. No provider, Stripe, or remote processing mock.
for(const width of [320,390,768,1448]){
 test('A37 selected local source is playable; reset preserves stored MP4 at '+width+'px',async({page},info)=>{
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  await page.setViewportSize({width,height:850});
  const path=info.outputPath('a37-native-source.mp4');
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi',
   '-i','testsrc2=size=96x64:rate=12:duration=0.6','-an',
   '-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',path]);
  const bytes=readFileSync(path);
  const paid=[];
  page.on('request',request=>{
   const pathname=new URL(request.url()).pathname;
   if(request.method()==='POST'&&/^\/api\/(?:studio\/jobs|ai-billing|billing\/checkout|stripe|generation)/.test(pathname))
    paid.push(pathname);
  });
  await page.goto('/free-tools.html');
  await page.locator('.et-showcase .et-uniquifier').click();
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator('body.vu-reference')).toBeVisible();
  await expect(page.locator('.vu-preview .vu-panel-head h3')).toHaveText('Example preview');

  const original={id:'a37-existing-video',name:'precious-original.mp4',createdAt:'2026-10-31T12:00:00Z',saved:true,mediaCacheKey:'a37:existing'};
  await expect.poll(()=>page.evaluate(()=>!!window.VUPersistentMedia?.put)).toBe(true);
  await page.evaluate(async entry=>{
   localStorage.setItem('vv_history',JSON.stringify([entry]));
   await window.VUPersistentMedia.put(entry.mediaCacheKey,new Blob([new Uint8Array([1,2,3,4,5])],{type:'video/mp4'}));
  },original);
  await page.reload();
  await expect(page.locator('body.vu-reference')).toBeVisible();

  const uploader=page.locator('#fileInput');
  await uploader.setInputFiles({name:'my-first-video.mp4',mimeType:'video/mp4',buffer:bytes});
  const video=page.locator('.vu-preview-scene .vu-source-video');
  await expect(video).toBeVisible();
  await expect(page.locator('.vu-preview .vu-panel-head h3')).toHaveText('Your video preview');
  await expect(page.locator('.vu-preview-file')).toHaveText('my-first-video.mp4');
  await expect.poll(()=>video.evaluate(element=>element.videoWidth)).toBeGreaterThan(0);
  const oldURL=await video.getAttribute('src');
  expect(oldURL).toMatch(/^blob:/);
  await expect(page.locator('.vu-preview-scene')).toHaveClass(/vu-has-input/);

  await uploader.setInputFiles([
   {name:'second-video.mp4',mimeType:'video/mp4',buffer:bytes},
   {name:'third-video.mp4',mimeType:'video/mp4',buffer:bytes}
  ]);
  await expect(page.locator('.vu-preview-file')).toHaveText('second-video.mp4 · first of 2 videos');
  await expect.poll(()=>video.evaluate(element=>element.videoWidth)).toBeGreaterThan(0);
  expect(await video.getAttribute('src')).not.toBe(oldURL);
  expect(await page.evaluate(async url=>{
   try{return (await fetch(url)).ok;}catch(_){return false;}
  },oldURL)).toBe(false);

  await page.locator('.vu-queue-clear').click();
  await expect(page.locator('.vu-preview .vu-panel-head h3')).toHaveText('Example preview');
  await expect(video).toBeHidden();
  await expect(page.locator('.vu-preview-scene')).not.toHaveClass(/vu-has-input/);
  await expect(page.locator('#startBtn')).toBeDisabled();
  expect(await uploader.evaluate(input=>input.files.length)).toBe(0);
  expect(await page.evaluate(()=>window.VideoVariatorCore.getFiles().length)).toBe(0);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vv_history')))).toEqual([original]);
  expect(await page.evaluate(async key=>{
   const blob=await window.VUPersistentMedia.get(key);
   return blob?[...new Uint8Array(await blob.arrayBuffer())]:null;
  },original.mediaCacheKey)).toEqual([1,2,3,4,5]);
  expect(paid).toEqual([]);
 });
}
