import {test,expect} from '@playwright/test';

// A→B delegated BASE24 narrow History rendering guard in existing B PR174.
// Every response below is local Playwright mock data, never a real customer.
const item=(id,prompt)=>({id,kind:'video',status:'failed',model:'mock-video',
 provider:'Google',prompt,createdAt:'2026-10-20T09:00:00.000Z'});
async function base(page){
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,models:[],catalog:[]}}));
}
test('B8 older filter GET must not replace newer filter results',async({page})=>{
 await base(page);
 let resolveAll,notifyAll;
 const allStarted=new Promise(resolve=>notifyAll=resolve);
 const oldHeld=new Promise(resolve=>resolveAll=resolve);
 await page.route(url=>new URL(url).pathname==='/api/studio/jobs',async route=>{
  const filter=new URL(route.request().url()).searchParams.get('filter');
  if(filter==='all'){
   notifyAll();await oldHeld;
   await route.fulfill({json:{items:[item('old-A','OLD_PRIVATE_FILTER_PROMPT')]}});
  }else await route.fulfill({json:{items:[item('new-B','NEW_VIDEO_FILTER_PROMPT')]}});
 });
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#showHistory').click();
 await allStarted;
 await page.locator('[data-history-filter=video]').click();
 await expect(page.locator('.history-card')).toContainText('NEW_VIDEO_FILTER_PROMPT');
 resolveAll();
 await expect(page.locator('.history-card')).toHaveCount(1);
 await expect(page.locator('.history-card')).not.toContainText('OLD_PRIVATE_FILTER_PROMPT');
});
test('B8 account switch while old private History GET is pending must not render account A to account B',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','fake-account-A'));
 await base(page);
 let notify,release,requestCount=0;
 const seen=new Promise(resolve=>notify=resolve);
 const held=new Promise(resolve=>release=resolve);
 await page.route(url=>new URL(url).pathname==='/api/studio/jobs',async route=>{
  requestCount++;
  if(requestCount===1){
   notify();await held;
   return route.fulfill({json:{items:[item('account-A','PRIVATE_ACCOUNT_A_HISTORY')]}});
  }
  return route.fulfill({json:{items:[item('account-B','ONLY_ACCOUNT_B_HISTORY')]}});
 });
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#showHistory').click();await seen;
 await page.evaluate(()=>localStorage.setItem('vv_token','fake-account-B'));
 release();
 await expect(page.locator('.history-card')).toHaveCount(0);
 await page.locator('#showCreate').click();
 await page.locator('#showHistory').click();
 await expect(page.locator('.history-card')).toContainText('ONLY_ACCOUNT_B_HISTORY');
 await expect(page.locator('.history-card')).not.toContainText('PRIVATE_ACCOUNT_A_HISTORY');
 expect(requestCount).toBe(2);
});
