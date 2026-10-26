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


test('Home header removes unsupported Help and Credits; keeps functional Pricing and Promo entry',async({page})=>{
 await mockPublicCatalog(page);
 await page.goto('/deepsyq.html');
 await expect(page.locator('header .top-help')).toHaveCount(0);
 await expect(page.locator('header #aiWalletLink')).toHaveCount(0);
 await expect(page.locator('header #topPromo')).toBeVisible();
 await expect(page.locator('header #topInvite')).toBeVisible();
 await expect(page.locator('header #topPricing')).toHaveAttribute('href','pricing.html');
 await page.locator('#topPromo').click();
 await expect(page.locator('#promoDialog')).toBeVisible();
 await expect(page.locator('#promoDialog')).toContainText('secure Stripe checkout');
 await expect(page.locator('#promoGoPricing')).toHaveAttribute('href','pricing.html#plans');
 await page.locator('#promoGoPricing').click();
 await expect(page).toHaveURL(/\/pricing\.html#plans$/);
});

test('English language selector genuinely switches and persists translated Home controls in French, Russian and English',async({page})=>{
 await mockPublicCatalog(page);
 await page.goto('/deepsyq.html');
 await page.locator('#homeLanguage').selectOption('fr');
 await expect(page.locator('html')).toHaveAttribute('lang','fr');
 await expect(page.locator('#topInvite')).toHaveText('Inviter un ami');
 await expect(page.locator('#topPricing')).toHaveText('Tarifs');
 await expect(page.locator('#topPromo')).toContainText('Code promo');
 await expect(page.locator('#toolsTitle')).toHaveText('Outils du quotidien');
 await expect(page.locator('#homeQuickPrompt')).toHaveAttribute('placeholder','Décrivez ce que vous voulez créer…');
 await page.reload();
 await expect(page.locator('#homeLanguage')).toHaveValue('fr');
 await expect(page.locator('#topInvite')).toHaveText('Inviter un ami');
 await page.locator('#homeLanguage').selectOption('ru');
 await expect(page.locator('html')).toHaveAttribute('lang','ru');
 await expect(page.locator('#topPricing')).toHaveText('Тарифы');
 await expect(page.locator('#homeQuickPrompt')).toHaveAttribute('placeholder','Опишите, что хотите создать…');
 await page.locator('#homeLanguage').selectOption('en');
 await expect(page.locator('html')).toHaveAttribute('lang','en-US');
 await expect(page.locator('#topInvite')).toHaveText('Invite Friend');
 await expect(page.locator('#topPricing')).toHaveText('Pricing');
 await expect(page.locator('#topPromo')).toContainText('Promo Code');
});

test('Invite Friend always reveals the actual link and the copy action gives visible feedback, including on phones',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copiedInvite=value;}}});
 });
 await mockPublicCatalog(page);
 await page.goto('/deepsyq.html');
 await expect(page.locator('#topInvite')).toBeVisible();
 await expect(page.locator('#topPricing')).toBeVisible();
 await page.locator('#topInvite').click();
 await expect(page.locator('#inviteDialog')).toBeVisible();
 const invite=page.locator('#inviteLink');
 await expect(invite).toHaveValue(/\/deepsyq\.html$/);
 await page.locator('#inviteCopy').click();
 await expect(page.locator('#inviteStatus')).toContainText('Link copied');
 expect(await page.evaluate(()=>window.__copiedInvite)).toMatch(/\/deepsyq\.html$/);
 await page.locator('#inviteClose').click();
 await expect(page.locator('#inviteDialog')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
});

test('Stripe promotion entry is server-owned and never stacks with an existing first-subscription coupon',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../server/server.js',import.meta.url),'utf8');
 expect(source).toMatch(/discounts:coupon\?\[\{coupon\}\]:undefined,allow_promotion_codes:coupon\?undefined:true/);
 expect(source).toMatch(/STRIPE_FIRST_SUBSCRIPTION_COUPON_ID/);
 expect(source).not.toMatch(/app\.post\('\/api\/promo\/redeem'/);
});

test('A PR414: real desktop and phone Home to Pricing and five signed-out plan entries never charge',async({page})=>{
 await mockPublicCatalog(page);
 const paid=[];
 page.on('request',request=>{
  if(request.method()==='POST'&&/\/api\/(?:ai-billing|billing)\/checkout/.test(new URL(request.url()).pathname))paid.push(request.url());
 });
 for(const width of [1448,390]){
  await page.setViewportSize({width,height:width===390?844:1086});
  await page.goto('/deepsyq.html');
  const pricing=page.locator('#topPricing');
  if(await pricing.isVisible())await pricing.click();
  else{
   await page.locator('#menu').click();
   await expect(page.locator('body')).toHaveClass(/menu-open/);
   await page.locator('#sidebar a[href="pricing.html"]').click();
  }
  await expect(page).toHaveURL(/\/pricing\.html$/);
  await expect(page.locator('#planCards .price-plan')).toHaveCount(5);
  await expect(page.locator('#creditCards .price-credit-card')).toHaveCount(5);
  for(const button of await page.locator('#planCards .price-plan-action').all()){
   await expect(button).toBeEnabled();
   await button.click();
   await expect(page.locator('#authModal')).toBeVisible();
   await page.keyboard.press('Escape');
   await expect(page.locator('#authModal')).toBeHidden();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 expect(paid).toEqual([]);
});
