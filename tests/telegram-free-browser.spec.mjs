import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

test.describe('Free Telegram Mini App with five previews and no purchases',()=>{
 test('works in a simulated Telegram mobile webview without leaving the app',async({page},info)=>{
  let used=0,reservations=0;
  const state=()=>({limit:5,used,remaining:5-used,busy:false});
  await page.route(/telegram-web-app\.js/,async route=>route.fulfill({
   contentType:'application/javascript',body:"window.Telegram={WebApp:{initData:'signed-telegram-test-fixture',ready(){},expand(){},}};"
  }));
  await page.route('**/video-core.js',async route=>route.fulfill({
   contentType:'application/javascript',
   body:"window.VideoVariatorCore={configure(o){window.__coreHooks=o;},setFiles(list){window.__files=Array.from(list);return window.__files;},getFiles(){return window.__files||[];},durationOf:async()=>2.5,process:async()=>({results:[{name:'processed.mp4',blob:new Blob(['sample output'],{type:'video/mp4'})}],sourceCount:1}),cancel(){}};"
  }));
  await page.route('**/api/telegram-preview/**',async route=>{
   const u=new URL(route.request().url()),endpoint=u.pathname.split('/').pop();
   let data={};
   try{data=route.request().postDataJSON()||{};}catch{}
   let response=state(),status=200;
   if(endpoint==='reserve'){
    if(used>=5){status=402;response={error:'FREE_TRIAL_COMPLETE'};}
    else{used++;reservations++;response={...state(),job:'aaaaaaaa-bbbb-cccc-dddd-'+String(reservations).padStart(12,'0')};}
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(response)});
  });
  await page.goto('/telegram-free-mini.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#counter')).toHaveText('5 / 5 free');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#plansSection')).toBeHidden();
  const path=info.outputPath('short.mp4');
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=160x120:rate=15','-t','1','-threads','1','-c:v','libx264','-pix_fmt','yuv420p','-an',path]);
  const file=readFileSync(path);
  await page.locator('#video').setInputFiles({name:'preview.mp4',mimeType:'video/mp4',buffer:file});
  await expect(page.locator('#start')).toBeEnabled({timeout:15000});
  await page.locator('[data-mode="balanced"]').click();
  await expect(page.locator('[data-mode="balanced"]')).toHaveClass(/selected/);
  for(let n=1;n<=5;n++){
   await page.locator('#start').click();
   await expect(page.locator('#result')).toBeVisible();
   await expect(page.locator('#counter')).toContainText(String(5-n)+' / 5 free');
  }
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#plansSection')).toBeVisible();
  await expect(page.locator('#plansSection')).toContainText('Five free previews completed');
  await expect(page.getByText('Buy for')).toHaveCount(0);
  await expect(page.locator('[id*=checkout]')).toHaveCount(0);
  expect(reservations).toBe(5);
  expect(page.url()).toContain('/telegram-free-mini.html');
 });
});

