import {test,expect} from '@playwright/test';
const json=data=>({contentType:'application/json',body:JSON.stringify(data)});
async function setup(page){
 await page.addInitScript(()=>localStorage.setItem('vv_token','A'));
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/config')return route.fulfill(json({plans:{}}));
  if(path==='/api/ai-billing/config')return route.fulfill(json({enabled:false,packs:[]}));
  if(path==='/api/ai-wallet/config')return route.fulfill(json({welcomeEnabled:false,welcomeCredits:0}));
  if(path==='/api/ai-wallet/balance')return route.fulfill(json({available:route.request().headers().authorization==='Bearer A'?111:222,reserved:0,debt:0}));
  if(path==='/api/ai-wallet/history')return route.fulfill(json({items:[]}));
  return route.fulfill({status:503,...json({error:'TEST_ONLY'})});
 });
}
test('rendered wallet changes owner after same-tab token rotation',async({page})=>{
 await setup(page);await page.goto('/ai-pricing.html');
 await expect(page.locator('#walletSummary')).toContainText('111');
 await expect(page.locator('#welcomeCredits')).toBeHidden();
 await page.evaluate(()=>localStorage.setItem('vv_token','B'));
 await expect(page.locator('#walletSummary')).toContainText('222');
 await expect(page.locator('#walletSummary')).not.toContainText('111');
});
test('logout erases previously visible balance and activity',async({page})=>{
 await setup(page);await page.goto('/ai-pricing.html');await expect(page.locator('#walletSummary')).toContainText('111');
 await page.evaluate(()=>{localStorage.removeItem('vv_token');window.dispatchEvent(new StorageEvent('storage',{key:'vv_token'}));});
 await expect(page.locator('#walletSection')).toBeHidden();await expect(page.locator('#walletSummary')).toBeEmpty();await expect(page.locator('#walletHistory')).toBeEmpty();
});
test('delayed response cannot repaint an old account',async({page})=>{
 await setup(page);let release;const held=new Promise(r=>release=r);let seen;const requested=new Promise(r=>seen=r);
 await page.route('**/api/ai-wallet/balance',async route=>{if(route.request().headers().authorization==='Bearer A'){seen();await held;await route.fulfill(json({available:111,reserved:0,debt:0})).catch(()=>{});}else await route.fulfill(json({available:222,reserved:0,debt:0}));});
 await page.goto('/ai-pricing.html',{waitUntil:'commit'});await requested;await page.evaluate(()=>localStorage.setItem('vv_token','B'));release();
 await expect(page.locator('#walletSummary')).toContainText('222');await expect(page.locator('#walletSummary')).not.toContainText('111');
});
test('pagehide clears private DOM and persisted pageshow restores current owner',async({page})=>{
 await setup(page);await page.goto('/ai-pricing.html');await expect(page.locator('#walletSummary')).toContainText('111');
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
 await expect(page.locator('#walletSummary')).toBeEmpty();
 await page.evaluate(()=>{localStorage.setItem('vv_token','B');window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await expect(page.locator('#walletSummary')).toContainText('222');
});
