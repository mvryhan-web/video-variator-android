import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('Telegram Mini App genuinely transcodes a short MP4 on mobile Chromium',async({page},info)=>{
 test.skip(info.project.name!=='mobile-chromium');
 test.setTimeout(180000);
 const uploads=[];
 page.on('request',req=>{
  if(req.method()==='POST'&&/video\/|application\/octet-stream/i.test(req.headers()['content-type']||''))uploads.push(req.url());
 });
 await page.route(/telegram-web-app\.js/,route=>route.fulfill({
  contentType:'application/javascript',
  body:"window.Telegram={WebApp:{initData:'test-init-data',ready(){},expand(){}}};"
 }));
 let remaining=5;
 await page.route('**/api/telegram-mini/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let response={remaining,limit:5,used:5-remaining,paid:null,plans:[]};
  if(path.endsWith('/reserve')){remaining--;response={...response,remaining,job:'aaaa1111-2222-3333-4444-555555555555'};}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
 });
 const failures=[];page.on('pageerror',e=>failures.push(String(e)));
 await page.goto('/telegram-mini.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#counter')).toHaveText('5 / 5 free');
 await page.locator('#video').setInputFiles({
  name:'short.mp4',mimeType:'video/mp4',buffer:readFileSync('/tmp/telegram-mini-smoke.mp4')
 });
 await expect(page.locator('#start')).toBeEnabled({timeout:15000});
 await page.locator('#start').click();
 await expect(page.locator('#result')).toBeVisible({timeout:155000});
 await expect(page.locator('#counter')).toHaveText('4 / 5 free');
 const output=await page.evaluate(async()=>{
  const url=document.querySelector('#output').src;
  const bytes=await(await fetch(url)).arrayBuffer();
  return{length:bytes.byteLength,mp4Tag:new TextDecoder().decode(bytes.slice(4,8))};
 });
 expect(output.length).toBeGreaterThan(3000);
 expect(output.mp4Tag).toBe('ftyp');
 expect(uploads).toEqual([]);
 expect(failures).toEqual([]);
});
