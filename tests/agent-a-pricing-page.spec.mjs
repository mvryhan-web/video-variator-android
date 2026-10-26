import {test,expect} from '@playwright/test';
test('pricing page renders 5 plan cards, 5 credit packs, no duplicate middle strip in preview',async({page})=>{
 await page.goto('/pricing.html');
 await expect(page.locator('#pricingTitle')).toHaveText('Power Your Creativity');
 await expect(page.locator('#planCards .price-plan')).toHaveCount(5);
 await expect(page.locator('#creditCards .price-credit-card')).toHaveCount(5);
 await expect(page.locator('.price-plan-name')).toHaveText(['Trial','Basic','Pro','Business','Lifetime']);
 await expect(page.locator('#planCards .price-plan-price strong')).toHaveText(['$0.99','$9','$24','$99','€2,999']);
 await expect(page.locator('#creditCards .price-credit-number')).toHaveText(['✦ 1,000','✦ 10,000','✦ 100,000','✦ 1,000,000','✦ 10,000,000']);
 await expect(page.locator('.price-plan-action')).toHaveCount(5);
 await expect(page.locator('.price-credit-purchase')).toHaveCount(5);
 await expect(page.locator('.price-credit-purchase:enabled')).toHaveCount(5);
 await expect(page.locator('a.price-wallet-link')).toHaveAttribute('href','pricing.html#wallet');
 await expect(page.locator('#walletHistory')).toHaveCount(1);
 expect(await page.locator('.price-credits-area').evaluate(el=>el.getBoundingClientRect().top)).toBeGreaterThan(0);
 await page.locator('#creditsHeading').scrollIntoViewIfNeeded();
 await expect(page.locator('#creditsHeading')).toBeVisible();
});
test('ratio of card columns and sidebar responsive layout',async({page},testInfo)=>{
 await page.goto('/pricing.html');
 await expect(page.locator('#planCards .price-plan')).toHaveCount(5);
 const cols=await page.locator('#planCards').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
 if((page.viewportSize()?.width||1000)>1180)expect(cols).toBe(5);
 if((page.viewportSize()?.width||1000)<420)expect(cols).toBe(1);
 await expect(page.locator('#dsSiteSidebar')).toHaveCount(1);
 await expect(page.locator('.price-topbar .price-top-active')).toHaveAttribute('href','pricing.html');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
});
test('server verification fails closed, but enabled real pack sends original Stripe SKU and requestId',async({page})=>{
 await page.route('**/api/config',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({billingConfigured:false,plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}}})}));
 await page.route('**/api/ai-billing/config',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,mode:'test',packs:[{sku:'test_1k',credits:1000,amount:1000,currency:'usd'}]})}));
 await page.addInitScript(()=>localStorage.setItem('vv_token','test-session'));
 await page.route('**/api/ai-billing/checkout',async route=>{const payload=route.request().postDataJSON();await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'PAYMENTS_NOT_ACTIVATED'})});return payload;});
 await page.goto('/pricing.html');
 await expect(page.locator('.price-credit-purchase').first()).toBeEnabled();
 await expect(page.locator('.price-credit-purchase').nth(1)).toBeEnabled();
 const req=page.waitForRequest(r=>r.url().includes('/api/ai-billing/checkout')&&r.method()==='POST');
 await page.locator('.price-credit-purchase').first().click();
 const sent=(await req).postDataJSON();
 expect(sent.sku).toBe('test_1k');expect(sent.requestId).toMatch(/^[0-9a-f-]{36}$/);
 await expect(page.locator('#creditStatus')).toContainText('unavailable');
});

test('owner desktop Pricing expands between the left navigation and right viewport edge',async({page})=>{
 await page.setViewportSize({width:1645,height:1000});
 await page.goto('/pricing.html');
 await expect(page.locator('#planCards .price-plan')).toHaveCount(5);
 const measure=await page.evaluate(()=>{
  const sidebar=document.querySelector('#dsSiteSidebar').getBoundingClientRect();
  const main=document.querySelector('#pricingMain').getBoundingClientRect();
  const cards=document.querySelector('#planCards').getBoundingClientRect();
  return {sidebarRight:sidebar.right,mainLeft:main.left,mainRight:main.right,
    cardsWidth:cards.width,viewport:innerWidth,columns:getComputedStyle(document.querySelector('#planCards')).gridTemplateColumns.split(' ').length,
    overflow:document.documentElement.scrollWidth>innerWidth+1};
 });
 expect(measure.columns).toBe(5);
 expect(measure.mainLeft).toBeGreaterThanOrEqual(measure.sidebarRight-2);
 expect(measure.mainRight).toBeGreaterThanOrEqual(measure.viewport-2);
 expect(measure.cardsWidth).toBeGreaterThan(measure.viewport-measure.sidebarRight-100);
 expect(measure.overflow).toBe(false);
 for(const key of ['trial','basic','pro','business','lifetime']){
  const card=page.locator('.price-'+key);
  await expect(card.locator('.price-features li')).not.toHaveCount(0);
  await expect(card).toContainText(/Canvas/);
  await expect(card).toContainText(/Watermark/i);
 }
 await expect(page.locator('.price-trial')).toContainText('not yet active');
});

test('plan click opens original Google or email auth modal without checkout or navigation',async({page})=>{
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/api/auth/email/status',route=>route.fulfill({json:{configured:true}}));
 await page.route('**/api/config',route=>route.fulfill({json:{billingConfigured:false,googleClientId:'',
  plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}}}}));
 let checkoutPosts=0;
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/billing/checkout'))checkoutPosts++;});
 await page.goto('/pricing.html');
 await page.getByRole('button',{name:'Choose Basic'}).click();
 await expect(page.locator('#authModal')).toBeVisible();
 await expect(page.locator('#authTitle')).toHaveText('Sign in to your account');
 await expect(page.locator('#emailAuthForm')).toBeVisible();
 await expect(page.locator('#emailAuthEmail')).toBeVisible();
 await expect(page.locator('#googleButton')).toBeVisible();
 expect(checkoutPosts).toBe(0);
 await page.keyboard.press('Escape');
 await expect(page.locator('#authModal')).toBeHidden();
 await page.getByRole('button',{name:'Check Trial availability'}).click();
 await expect(page.locator('#authModal')).toBeVisible();
 expect(checkoutPosts).toBe(0);
 await expect(page).toHaveURL(/\/pricing\.html$/);
});

test('signed-in plan shows fail-closed no-billing status rather than launching Stripe',async({page})=>{
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
 await page.addInitScript(()=>localStorage.setItem('vv_token','fixture'));
 await page.route('**/api/config',route=>route.fulfill({json:{billingConfigured:false,googleClientId:'',
  plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}}}}));
 let posts=0;page.on('request',r=>{if(r.url().includes('/api/billing/checkout')&&r.method()==='POST')posts++;});
 await page.goto('/pricing.html');
 await page.getByRole('button',{name:'Choose Pro'}).click();
 await expect(page.locator('#pricingStatus')).toContainText('No payment was taken');
 expect(posts).toBe(0);
 await page.getByRole('button',{name:'Check Trial availability'}).click();
 await expect(page.locator('#pricingStatus')).toContainText('Trial is not available yet');
 expect(posts).toBe(0);
});

test('all five AI Credits cards reuse the exact existing Google/email login without a billing request',async({page})=>{
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/api/auth/email/status',route=>route.fulfill({json:{configured:true}}));
 await page.route('**/api/ai-billing/config',route=>route.fulfill({json:{enabled:false,mode:'test',livePaymentsEnabled:false,packs:[],rates:[]}}));
 let requests=0;
 page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/api/ai-billing/checkout'))requests++;});
 await page.goto('/pricing.html');
 await expect(page.locator('#creditCards .price-credit-purchase')).toHaveCount(5);
 await expect(page.locator('#creditCards .price-credit-purchase:enabled')).toHaveCount(5);
 for(let i=0;i<5;i++){
  await page.locator('#creditCards .price-credit-purchase').nth(i).click();
  await expect(page.locator('#authModal')).toBeVisible();
  await expect(page.locator('#authTitle')).toHaveText('Sign in to your account');
  await expect(page.locator('#googleButton')).toBeVisible();
  await expect(page.locator('#emailAuthForm')).toBeVisible();
  await expect(page.locator('#emailAuthEmail')).toBeVisible();
  await expect(page.locator('#emailAuthPassword')).toBeVisible();
  expect(requests).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#authModal')).toBeHidden();
 }
 expect(requests).toBe(0);
});

test('signed-in unavailable AI package is a safe, clickable no-charge status, not an invented offer',async({page})=>{
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
 await page.addInitScript(()=>localStorage.setItem('vv_token','test-only-token'));
 await page.route('**/api/ai-billing/config',route=>route.fulfill({json:{enabled:false,mode:'test',livePaymentsEnabled:false,packs:[]}}));
 let posts=0;page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/ai-billing/checkout'))posts++;});
 await page.goto('/pricing.html');
 for(let i=0;i<5;i++){
  await page.locator('#creditCards .price-credit-purchase').nth(i).click();
  await expect(page.locator('#creditStatus')).toContainText('No payment was taken.');
  await expect(page.locator('#authModal')).toBeHidden();
 }
 expect(posts).toBe(0);
});


test('Monthly and Yearly switch uses an honest display-only 20 percent annual quote',async({page})=>{
 await page.goto('/pricing.html');
 await expect(page.locator('#priceBillingMonthly')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#priceBillingYearly')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#priceBillingPromo')).toContainText('80% Credit Bonus');
 await expect(page.locator('#priceBillingPromo')).toContainText('credited amounts are unchanged');
 await expect(page.locator('#pricingStatus')).toBeEmpty();
 await expect(page.locator('#planCards .price-plan-price strong')).toHaveText(['$0.99','$9','$24','$99','€2,999']);
 await page.locator('#priceBillingYearly').click();
 await expect(page.locator('#priceBillingYearly')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#priceBillingPromo')).toContainText('Save 20%');
 await expect(page.locator('#planCards .price-plan-price strong')).toHaveText(['$0.99','$7.20','$19.20','$79.20','€2,999']);
 await expect(page.locator('#planCards .price-annual-note')).toHaveText([
  '$86.40 / year · estimate only; yearly checkout not available',
  '$230.40 / year · estimate only; yearly checkout not available',
  '$950.40 / year · estimate only; yearly checkout not available'
 ]);
 await expect(page.locator('#planCards .price-trial')).toContainText('not yet active');
 await page.locator('#priceBillingMonthly').click();
 await expect(page.locator('#planCards .price-plan-price strong')).toHaveText(['$0.99','$9','$24','$99','€2,999']);
 await expect(page.locator('#planCards .price-annual-note')).toHaveCount(0);
});

test('Yearly buttons never submit a monthly plan checkout for signed-in user',async({page})=>{
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
 await page.addInitScript(()=>localStorage.setItem('vv_token','yearly-demo-user'));
 await page.route('**/api/config',route=>route.fulfill({json:{billingConfigured:true,googleClientId:'',
  plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}}}}));
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/billing/checkout')posts++;});
 await page.goto('/pricing.html');
 await page.locator('#priceBillingYearly').click();
 for(const name of ['Basic','Pro','Business']){
  await page.getByRole('button',{name:'Choose '+name}).click();
  await expect(page.locator('#pricingStatus')).toContainText('annual checkout is not available');
  expect(posts).toBe(0);
 }
 await expect(page.locator('#authModal')).toBeHidden();
 await expect(page).toHaveURL(/\/pricing\.html$/);
});

test('Yearly quote still uses original Deepsyq auth for guest and does not charge',async({page})=>{
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/api/auth/email/status',route=>route.fulfill({json:{configured:true}}));
 await page.route('**/api/config',route=>route.fulfill({json:{billingConfigured:true,googleClientId:'',
  plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}}}}));
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/billing/checkout'))posts++;});
 await page.goto('/pricing.html');
 await page.locator('#priceBillingYearly').click();
 await page.getByRole('button',{name:'Choose Basic'}).click();
 await expect(page.locator('#authModal')).toBeVisible();
 await expect(page.locator('#emailAuthForm')).toBeVisible();
 expect(posts).toBe(0);
});

test('hero photograph gives all four frame labels full breathing room on desktop and mobile',async({page})=>{
 for(const viewport of [{width:1448,height:1086},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  await page.goto('/pricing.html');
  const geometry=await page.evaluate(()=>{
   const hero=document.querySelector('.price-hero');
   const image=document.querySelector('.price-hero-art');
   const title=document.querySelector('#pricingTitle').getBoundingClientRect();
   const heroRect=hero.getBoundingClientRect();
   const boxes=[...hero.querySelectorAll('.price-chips span')].map(el=>el.getBoundingClientRect());
   const artwork=getComputedStyle(image).backgroundImage;
   return {hero:{left:heroRect.left,right:heroRect.right,top:heroRect.top,bottom:heroRect.bottom,height:heroRect.height},
    titleBottom:title.bottom,
    boxes:boxes.map(x=>({left:x.left,right:x.right,top:x.top,bottom:x.bottom,width:x.width})),
    artworkLoaded:artwork.includes('fa2c9a57-3fe7-4a2c-8123-7da568cabe10.png'),
    overflow:document.documentElement.scrollWidth>window.innerWidth+1};
  });
  expect(geometry.hero.height).toBeGreaterThanOrEqual(viewport.width<700?379:364);
  expect(geometry.boxes).toHaveLength(4);
  expect(geometry.artworkLoaded).toBeTruthy();
  expect(geometry.overflow).toBeFalsy();
  for(const box of geometry.boxes){
   expect(box.width).toBeGreaterThan(35);
   expect(box.top).toBeGreaterThan(geometry.titleBottom+15);
   expect(box.top).toBeGreaterThan(geometry.hero.top+5);
   expect(box.bottom).toBeLessThanOrEqual(geometry.hero.bottom-8);
   expect(box.left).toBeGreaterThanOrEqual(geometry.hero.left+8);
   expect(box.right).toBeLessThanOrEqual(geometry.hero.right-8);
  }
 }
});

test('AI Credits artwork matches upper hero width and height, anchors below text without overlapping packs',async({page})=>{
 for(const viewport of [{width:1448,height:1086},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  await page.goto('/pricing.html');
  await expect(page.locator('#creditCards .price-credit-card')).toHaveCount(5);
  const layout=await page.evaluate(()=>{
   const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
   const art=getComputedStyle(document.querySelector('.price-credit-hero-art'));
   return {topHero:rect('.price-hero'),creditHero:rect('.price-credit-hero'),
    heading:rect('.price-credit-heading'),title:rect('#creditsHeading'),
    pack:rect('.price-credit-card'),image:art.backgroundImage,
    backgroundPosition:art.backgroundPosition,
    overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  expect(layout.creditHero.height).toBeGreaterThanOrEqual(viewport.width<700?379:364);
  expect(Math.abs(layout.creditHero.height-layout.topHero.height)).toBeLessThan(3);
  expect(Math.abs(layout.creditHero.width-layout.topHero.width)).toBeLessThan(7);
  expect(layout.image).toContain('e5506ef4-b0a2-412d-a8b7-6e3108f80761.png');
  expect(layout.backgroundPosition.split(',').at(-1)).toMatch(/top|0%/);
  expect(layout.title.bottom).toBeLessThan(layout.creditHero.bottom-45);
  expect(layout.heading.bottom).toBeLessThan(layout.creditHero.bottom-20);
  expect(layout.pack.top).toBeGreaterThanOrEqual(layout.creditHero.bottom-1);
  expect(layout.overflow).toBeFalsy();
 }
});

// Owner final visual acceptance: restore all big AI Credits visuals and remove only footnotes.
test('owner correction: keep credit headings and bonuses; remove only plan footer and USD-pack footnotes',async({page})=>{
 for(const viewport of [{width:1448,height:1086},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  await page.goto('/pricing.html');
  await expect(page.locator('#planCards .price-plan')).toHaveCount(5);
  await expect(page.locator('.price-plans-area > .price-disclosure')).toHaveCount(0);
  await expect(page.locator('#creditCards .price-credit-card')).toHaveCount(5);
  await expect(page.locator('#creditsHeading')).toHaveText(/AI Credits/);
  await expect(page.locator('.price-credit-hero .price-credit-heading p')).toHaveCount(2);
  await expect(page.locator('#creditCards .price-bonus-status')).toHaveCount(5);
  await expect(page.locator('#creditCards .price-bonus-title')).toHaveCount(5);
  await expect(page.locator('#creditCards .price-bonus-count')).toHaveText(['+ 200','+ 3,333','+ 20,000','+ 200,000','+ 2,000,000']);
  await expect(page.locator('#creditCards .price-bonus-desc')).toHaveCount(5);
  await expect(page.locator('#creditCards .price-credit-price')).toHaveText(['$10','$100','$1,000','$10,000','$100,000']);
  await expect(page.locator('#creditCards .price-credit-note')).toHaveCount(0);
  await expect(page.locator('#creditCards .price-credit-purchase:enabled')).toHaveCount(5);
  await expect(page.locator('.price-credits-area > .price-disclosure')).toHaveCount(1);
  await expect(page.locator('.price-wallet-link')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
 }
});

test('AI Credits keeps original full-height artwork with upper heavenly city framed instead of lower zoom',async({page})=>{
 await page.goto('/pricing.html');
 const art=await page.locator('.price-credit-hero-art').evaluate(el=>{
  const css=getComputedStyle(el);
  return {position:css.backgroundPosition,transform:css.transform,image:css.backgroundImage};
 });
 expect(art.image).toContain('e5506ef4-b0a2-412d-a8b7-6e3108f80761.png');
 expect(art.position.split(',').at(-1)).toMatch(/top|0%/);
 expect(art.transform).toBe('none');
});
