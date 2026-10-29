import {test,expect} from '@playwright/test';
// Offline mock API only; no provider calls or financial changes.
const time='2026-10-15T12:00:00Z';
test('BASE32 History shows confirmed charge versus held credits, including unknown Audio',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','offline-fixture'));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,models:[],catalog:[]}}));
 const items=[
 {id:'img',kind:'image',status:'ready',model:'image-fixture',prompt:'Example image',creditsCharged:9,creditsReserved:9,createdAt:time},
 {id:'vid',kind:'video',status:'processing',model:'video-fixture',prompt:'Example video',creditsCharged:0,creditsReserved:7,createdAt:time},
 {id:'audio',kind:'music',status:'unknown',model:'audio-fixture',prompt:'Example audio',creditsCharged:0,creditsReserved:4,createdAt:time}];
 await page.route('**/api/studio/jobs?filter=all',route=>route.fulfill({json:{items}}));
 let posts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))posts++;});
 await page.goto('/generate-studio.html?studio=image');await page.locator('#showHistory').click();
 await expect(page.locator('.history-card')).toHaveCount(3);
 await expect(page.locator('.history-card').nth(0)).toContainText('9 AI credits charged (confirmed)');
 await expect(page.locator('.history-card').nth(1)).toContainText('7 AI credits held (not a confirmed charge)');
 await expect(page.locator('.history-card').nth(2)).toContainText('4 AI credits held (not a confirmed charge)');
 await expect(page.locator('.history-card').nth(2).locator('.history-status')).toHaveText('Status uncertain');
 expect(posts).toBe(0);
});
test('BASE32 revoked consent keeps existing Video and explains credit hold in English/Russian',async({browser})=>{
 for(const [locale,expected] of [['en-US','Sharing with the AI provider is disabled'],['ru-RU','Передача данных AI-провайдеру отключена']]){
  const context=await browser.newContext({locale});const page=await context.newPage();
  await page.addInitScript(()=>localStorage.setItem('vv_token','offline-fixture'));
  await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,models:[],catalog:[]}}));
  await page.route('**/api/studio/jobs?filter=all',route=>route.fulfill({json:{items:[{id:'held-video',kind:'video',status:'processing',model:'video-fixture',prompt:'Example video',creditsReserved:7,creditsCharged:0,createdAt:time}]}}));
  let checks=0,posts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))posts++;});
  await page.route('**/api/studio/jobs/held-video',route=>{checks++;return route.fulfill({json:{id:'held-video',kind:'video',status:'unknown',error:'PROVIDER_CONSENT_REQUIRED',creditsReserved:7,creditsCharged:0,retryAfterSeconds:0}});});
  await page.goto('/generate-studio.html?studio=video');await page.locator('#showHistory').click();
  await page.locator('.history-card').getByRole('button',{name:locale==='ru-RU'?'Проверить статус':'Check status'}).click();
  await expect(page.locator('#status')).toContainText(expected);
  await expect(page.locator('#status')).not.toContainText('PROVIDER_CONSENT_REQUIRED');
  expect(checks).toBe(1);expect(posts).toBe(0);
  await context.close();
 }
});
