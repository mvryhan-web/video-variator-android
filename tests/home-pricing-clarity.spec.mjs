import {test,expect} from '@playwright/test';

async function openHome(page){
 await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}},googleClientId:'',billingConfigured:false,features:{inspiration:false,aiApps:false}}}));
 await page.route('**/api/ai-billing/config',r=>r.fulfill({json:{enabled:false,subscriptionCredits:{pro:500},packs:[]}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:true,models:[{id:'model-preview',label:'Nano Banana 2',kind:'image',enabled:true}]}}));
 await page.route('**/api/inspiration**',r=>r.fulfill({json:{items:[],categories:[]}}));
 await page.goto('/deepsyq.html');
}

test('Home plan comparison shows real allowances, model separation and working existing purchase actions',async({page},info)=>{
 await page.setViewportSize({width:1440,height:1000});
 await openHome(page);
 await expect(page.getByRole('heading',{name:'A plan that fits your workflow'})).toBeVisible();
 await expect(page.locator('#plans .plan')).toHaveCount(3);
 await expect(page.locator('#plans')).toContainText('750 credits');
 await expect(page.locator('#plans')).toContainText('2,250 credits');
 await expect(page.locator('#plans')).toContainText('15,000 credits');
 await expect(page.locator('#plans')).toContainText('500 AI-generation credits per paid subscription invoice');
 await expect(page.locator('#homeModelCatalog')).toContainText('Nano Banana 2 · IMAGE');
 await expect(page.locator('#homeAiCredits')).toContainText('AI credits');
 await expect(page.locator('.home-plan-switch a')).toHaveCount(3);
 await expect(page.locator('.home-plan-switch a[href="#homeAiCredits"]')).toBeVisible();
 await expect(page.locator('#homeMonthlyPlans .trial-plan')).toContainText('Checkout is not enabled');
 await expect(page.getByRole('button',{name:'Choose Basic',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Choose Basic',exact:true}).click();
 await expect(page.locator('#authModal')).toBeVisible();
 await expect(page.locator('#homeHeroCarousel')).toBeVisible();
 await page.screenshot({path:info.outputPath('home-pricing-desktop.png'),fullPage:true});
});

test('Home plan comparison adapts to phone width with an accessible swipe rail and no page overflow',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});
 await openHome(page);
 await expect(page.locator('#plans .plan')).toHaveCount(3);
 await page.locator('#pricing').scrollIntoViewIfNeeded();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await expect.poll(()=>page.locator('#plans .plan').evaluateAll(cards=>cards.every(card=>card.getBoundingClientRect().width>250))).toBe(true);
 await expect.poll(()=>page.locator('#homeMonthlyPlans').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
 await page.locator('#homeMonthlyPlans').evaluate(el=>el.scrollTo({left:el.scrollWidth,behavior:'instant'}));
 await expect.poll(()=>page.locator('#plans .plan').last().evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1)).toBe(true);
 await page.screenshot({path:info.outputPath('home-pricing-mobile.png'),fullPage:true});
});
