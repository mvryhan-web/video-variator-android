import {test,expect} from '@playwright/test';
const json=value=>({contentType:'application/json',body:JSON.stringify(value)});
test.beforeEach(async({page})=>{
 await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'application/javascript',body:''}));
});
test('old Pricing and old AI Credits links preserve tracking and go to one canonical path',async({page})=>{
 await page.goto('/ai-pricing.html?utm_source=old-link#aiCreditSection');
 await expect(page).toHaveURL(/\/pricing\.html\?utm_source=old-link#credits$/);
 await expect(page.locator('#creditCards .price-credit-card')).toHaveCount(5);
 await page.goto('/ai-pricing.html#walletSection');
 await expect(page).toHaveURL(/\/pricing\.html#wallet$/);
 await expect(page.locator('#walletSignIn')).toBeVisible();
 await expect(page.locator('#walletSection')).toBeHidden();
 await page.locator('#walletSignIn').click();
 await expect(page.locator('#authModal')).toBeVisible();
});
test('authenticated private ledger is shown only for current user and scrubbed at logout',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','A'));
 await page.route('**/api/ai-wallet/config',r=>r.fulfill(json({welcomeEnabled:false,welcomeCredits:0})));
 await page.route('**/api/ai-wallet/balance',r=>r.fulfill(json({available:r.request().headers().authorization==='Bearer A'?111:222,reserved:10,debt:0})));
 await page.route('**/api/ai-wallet/history',r=>r.fulfill(json({items:[{kind:'purchase',available_delta:111,created_at:'2026-10-20T12:00:00Z'}]})));
 await page.goto('/pricing.html#wallet');
 await expect(page.locator('#walletSummary')).toContainText('111');
 await expect(page.locator('#walletHistory')).toContainText('Purchased credits');
 await page.evaluate(()=>localStorage.setItem('vv_token','B'));
 await expect(page.locator('#walletSummary')).toContainText('222');
 await expect(page.locator('#walletSummary')).not.toContainText('111');
 await page.evaluate(()=>{localStorage.removeItem('vv_token');window.dispatchEvent(new StorageEvent('storage',{key:'vv_token'}));});
 await expect(page.locator('#walletSection')).toBeHidden();
 await expect(page.locator('#walletSummary')).toBeEmpty();
 await expect(page.locator('#walletHistory')).toBeEmpty();
 await expect(page.locator('#walletSignIn')).toBeVisible();
});
test('monthly/yearly plan controls stay original and no fake annual payment',async({page})=>{
 let posts=0;
 await page.route('**/api/config',r=>r.fulfill(json({plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}},billingConfigured:true})));
 await page.route('**/api/billing/checkout',r=>{posts++;return r.fulfill({status:503,...json({error:'PAYMENTS_NOT_ACTIVATED'})});});
 await page.goto('/pricing.html');
 await expect(page.locator('#planCards .price-plan')).toHaveCount(5);
 await page.locator('#priceBillingYearly').click();
 await page.locator('.price-basic .price-plan-action').click();
 await expect(page.locator('#authModal')).toBeVisible();
 expect(posts).toBe(0);
});
