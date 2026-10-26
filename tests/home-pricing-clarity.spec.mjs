import {test,expect} from '@playwright/test';
async function mockPublicCatalog(page){
 await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}},googleClientId:'',billingConfigured:false,features:{inspiration:false,aiApps:false}}}));
 await page.route('**/api/ai-billing/config',r=>r.fulfill({json:{enabled:false,subscriptionCredits:{pro:500},packs:[]}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:true,models:[{id:'model-preview',label:'Nano Banana 2',kind:'image',enabled:true}]}}));
 await page.route('**/api/inspiration**',r=>r.fulfill({json:{items:[],categories:[]}}));
}
test('Home keeps creation sections but Pricing and Credits now live on standalone page',async({page},info)=>{
 await page.setViewportSize({width:1440,height:1000});await mockPublicCatalog(page);await page.goto('/deepsyq.html');
 await expect(page.locator('#canvasFeatureTitle')).toHaveText('Canvas');
 await expect(page.locator('#agentFeatureTitle')).toHaveText('AI Agent');
 await expect(page.locator('#appsFeatureTitle')).toHaveText('AI Apps');
 await expect(page.locator('#homeHeroCarousel')).toBeVisible();
 await expect(page.locator('#pricing')).toBeHidden();
 await expect(page.locator('#aiWalletLink')).toBeHidden();
 await expect(page.locator('header .top-link',{hasText:'Credits'})).toHaveCount(0);
 const pricing=page.locator('header .top-link',{hasText:'Pricing'});
 await expect(pricing).toHaveAttribute('href','pricing.html');
 await pricing.click();
 await expect(page).toHaveURL(/\/pricing\.html$/);
 await expect(page.locator('#pricingTitle')).toHaveText('Power Your Creativity');
 await expect(page.locator('#planCards .price-plan')).toHaveCount(5);
 await expect(page.locator('#creditCards .price-credit-card')).toHaveCount(5);
 await expect(page.locator('#planCards')).toContainText('750 tool credits / month');
 await expect(page.locator('#planCards')).toContainText('2,250 tool credits / month');
 await expect(page.locator('#planCards')).toContainText('15,000 tool credits / month');
 await expect(page.locator('#planCards .price-trial')).toContainText('not yet active');
 await expect(page.locator('#planCards .price-plan-action:enabled')).toHaveCount(5); // Configured plans can open auth safely; no checkout without user sign-in.
 await page.screenshot({path:info.outputPath('new-pricing-desktop.png'),fullPage:true});
});
test('Standalone Pricing scrolls naturally on phone, has correct columns, and keeps Home intact',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await mockPublicCatalog(page);await page.goto('/deepsyq.html');
 await expect(page.locator('#pricing')).toBeHidden();
 await page.goto('/pricing.html');
 await expect(page.locator('#planCards .price-plan')).toHaveCount(5);
 await expect(page.locator('#creditCards .price-credit-card')).toHaveCount(5);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await expect.poll(()=>page.locator('#planCards').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
 await expect(page.locator('#creditsHeading')).toHaveText('✦ AI Credits');
 await page.locator('#creditsHeading').scrollIntoViewIfNeeded();
 await expect(page.locator('#creditCards .price-credit-number').first()).toBeVisible();
 await expect(page.locator('#creditCards .price-credit-note')).toHaveCount(0);
 await expect(page.locator('#creditCards .price-bonus-count')).toHaveCount(5);
 await expect(page.locator('.price-credit-purchase:enabled')).toHaveCount(5); // Login or safe no-payment availability action.
 await page.screenshot({path:info.outputPath('new-pricing-mobile.png'),fullPage:true});
});
