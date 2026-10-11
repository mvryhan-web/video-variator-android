import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test.describe('Telegram Mini App mobile checkout and five free trials',()=>{
 test('works in a simulated Telegram mobile webview without leaving the app',async({page})=>{
  let used=0,reservations=0,invoices=0;
  const plans=[
   {id:'basic',name:'Basic',price:'$9 / month',credits:750,stars:450},
   {id:'pro',name:'Pro',price:'$24 / month',credits:2250,stars:1200},
   {id:'business',name:'Business',price:'$99 / month',credits:15000,stars:4950},
   {id:'lifetime',name:'Lifetime',price:'€2,999 one time',credits:null,stars:null}
  ];
  const state=()=>({limit:5,used,remaining:5-used,paid:null,busy:false,plans,firstName:'Tester'});
  await page.route('**/telegram-web-app.js?*',async route=>route.fulfill({
   contentType:'application/javascript',body:"window.Telegram={WebApp:{initData:'signed-telegram-test-fixture',ready(){},expand(){},openInvoice(url,fn){window.__invoiceOpened=url;window.__invoiceCallback=fn;}}};"
  }));
  await page.route('**/video-core.js',async route=>route.fulfill({
   contentType:'application/javascript',
   body:"window.VideoVariatorCore={configure(o){window.__coreHooks=o;},setFiles(list){window.__files=Array.from(list);return window.__files;},getFiles(){return window.__files||[];},durationOf:async()=>2.5,process:async()=>({results:[{name:'processed.mp4',blob:new Blob(['sample output'],{type:'video/mp4'})}],sourceCount:1}),cancel(){}};"
  }));
  await page.route('**/api/telegram-mini/**',async route=>{
   const u=new URL(route.request().url()),endpoint=u.pathname.split('/').pop();
   let data={};
   try{data=route.request().postDataJSON()||{};}catch{}
   let response=state(),status=200;
   if(endpoint==='reserve'){
    if(used>=5){status=402;response={error:'TRIAL_EXHAUSTED'};}
    else{used++;reservations++;response={...state(),job:'aaaaaaaa-bbbb-cccc-dddd-'+String(reservations).padStart(12,'0')};}
   }
   if(endpoint==='checkout'){
    invoices++;response=data.termsAccepted&&data.immediateAccess&&data.recurringAcknowledged?{url:'https://t.me/$test_invoice',plan:data.plan,stars:450}:{error:'TERMS_ACCEPTANCE_REQUIRED'};
    if(response.error)status=400;
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(response)});
  });
  await page.goto('/telegram-mini.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#counter')).toHaveText('5 / 5 free');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#plansSection')).toBeHidden();
  const file=readFileSync('/tmp/telegram-mini-smoke.mp4');
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
  await expect(page.getByRole('button',{name:'Buy for 450 ★'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Buy for 1200 ★'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Buy for 4950 ★'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Not sold via Stars'})).toBeDisabled();
  await page.getByRole('button',{name:'Buy for 450 ★'}).click();
  await expect(page.locator('#status')).toContainText('review and agree');
  expect(invoices).toBe(0);
  await page.locator('#termsAccepted').check();
  await page.locator('#immediateAccess').check();
  await page.locator('#recurringAcknowledged').check();
  await page.getByRole('button',{name:'Buy for 450 ★'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__invoiceOpened)).toBe('https://t.me/$test_invoice');
  expect(invoices).toBe(1);
  expect(reservations).toBe(5);
  expect(page.url()).toContain('/telegram-mini.html');
 });
});
