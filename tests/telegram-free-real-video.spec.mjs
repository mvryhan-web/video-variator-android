import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

test('Telegram Mini App genuinely transcodes a short MP4 on mobile Chromium',async({page},info)=>{
 test.skip(info.project.name!=='mobile-chromium');
 test.setTimeout(180000);
 const fixture=info.outputPath('short.mp4');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=160x120:rate=15','-t','1','-threads','1','-c:v','libx264','-pix_fmt','yuv420p','-an',fixture]);
 const uploads=[];
 page.on('request',req=>{
  if(req.method()==='POST'&&/video\/|application\/octet-stream/i.test(req.headers()['content-type']||''))uploads.push(req.url());
 });
 await page.route(/telegram-web-app\.js/,route=>route.fulfill({
  contentType:'application/javascript',
  body:"window.Telegram={WebApp:{initData:'test-init-data',ready(){},expand(){}}};"
 }));
 let remaining=5;
 await page.route('**/api/telegram-preview/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let response={remaining,limit:5,used:5-remaining};
  if(path.endsWith('/reserve')){remaining--;response={...response,remaining,job:'aaaa1111-2222-3333-4444-555555555555'};}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
 });
 const failures=[];page.on('pageerror',e=>failures.push(String(e)));
 await page.goto('/telegram-free-mini.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#counter')).toHaveText('5 / 5 free');
 await page.locator('#video').setInputFiles({
  name:'short.mp4',mimeType:'video/mp4',buffer:readFileSync(fixture)
 });
 await expect(page.locator('#start')).toBeEnabled({timeout:15000});
 await page.locator('#start').click();
 await expect(page.locator('#result')).toBeVisible({timeout:155000});
 await expect(page.locator('#counter')).toHaveText('4 / 5 free');
 const downloadPromise=page.waitForEvent('download',{timeout:15000});
 await page.evaluate(()=>{
  const a=document.createElement('a');
  a.href=document.querySelector('#output').src;
  a.download='processed.mp4';
  document.body.append(a);a.click();a.remove();
 });
 const downloaded=await downloadPromise;
 const downloadedBytes=readFileSync(await downloaded.path());
 expect(downloaded.suggestedFilename()).toBe('processed.mp4');
 expect(downloadedBytes.byteLength).toBeGreaterThan(3000);
 expect(downloadedBytes.toString('ascii',4,8)).toBe('ftyp');
 expect(uploads).toEqual([]);
 expect(failures).toEqual([]);
});

