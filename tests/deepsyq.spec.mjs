import {test,expect} from '@playwright/test';
const plans={basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}};
async function fixtures(page){
 await page.route('**/api/config',r=>r.fulfill({json:{plans,googleClientId:'',billingConfigured:true}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{ownerOnly:true,enabled:false,models:[],catalog:[]}}));
 await page.route('**/api/auth/email/status',r=>r.fulfill({json:{configured:true}}));
}
test('dashboard keeps tools secondary, honest availability and supported navigation',async({page},info)=>{
 await fixtures(page);await page.goto('/deepsyq.html');
 await expect(page.getByRole('heading',{name:/What will you/})).toBeVisible();
 await expect(page.locator('#studioStatus')).toContainText('owner preview');
 await expect(page.locator('.plan')).toHaveCount(3);
 await expect(page.locator('.trial-offer button')).toBeDisabled();
 await expect(page.locator('.lifetime')).toContainText('does not provide unlimited');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:info.outputPath('deepsyq.png'),fullPage:true});
 await page.locator('.studio-card.image').click();await expect(page).toHaveURL(/studio=image/);
 await expect(page.locator('#taskTitle')).toContainText('image');
 await page.locator('.topbar .back').click();await expect(page).toHaveURL(/deepsyq.html/);
});
test('existing email component logs in and logout clears session and latest result',async({page})=>{
 await fixtures(page);let payload;
 await page.route('**/api/auth/email/login',async r=>{payload=r.request().postDataJSON();await r.fulfill({json:{token:'test-session'}});});
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Test creator'}}}));
 await page.goto('/deepsyq.html');
 if(await page.locator('#menu').isVisible())await page.locator('#menu').click();
 await page.locator('#accountButton').click();
 await page.locator('#emailAuthEmail').fill('creator@example.test');await page.locator('#emailAuthPassword').fill('fixture-only-password');await page.locator('#emailAuthSubmit').click();
 await expect(page.locator('#accountButton')).toHaveText('Account settings');
 expect(payload.email).toBe('creator@example.test');
 expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBe('test-session');
 if(await page.locator('#menu').isVisible())await page.locator('#menu').click();
 await page.locator('#logout').click();await expect(page.locator('#logout')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBeNull();
});
test('checkout uses original plan endpoint and explains unavailable payments',async({page})=>{
 await fixtures(page);await page.addInitScript(()=>localStorage.setItem('vv_token','fixture'));
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Creator'}}}));let plan;
 await page.route('**/api/billing/checkout',async r=>{plan=r.request().postDataJSON().plan;await r.fulfill({status:503,json:{error:'BILLING_NOT_CONFIGURED'}});});
 await page.goto('/deepsyq.html');await page.getByRole('button',{name:'Choose Basic',exact:true}).click();
 await expect(page.locator('#paymentStatus')).toContainText('No payment was taken');expect(plan).toBe('basic');
});
test('comparison is crawlable and does not pretend AI chat exists',async({page})=>{
 await page.goto('/deepsyq-vs-deepseek.html');await expect(page).toHaveTitle(/Deepsyq vs DeepSeek/);
 await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('body')).toContainText('not currently offer a general-purpose AI chat');
 await expect(page.locator('body')).toContainText('not affiliated');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('legacy video history and profile deep links open actual views',async({page})=>{
 await fixtures(page);await page.goto('/index.html#history');await expect(page.locator('#historyView')).toHaveClass(/active/);
 await page.goto('/index.html#profile');await expect(page.locator('#profileView')).toHaveClass(/active/);
});

test('owner sees AI control entry and admin page exposes only safe model controls',async({page})=>{
 await fixtures(page);await page.addInitScript(()=>localStorage.setItem('vv_token','owner-fixture'));
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Owner',isAdmin:true}}}));
 await page.route('**/api/studio/admin/models',r=>r.fulfill({json:{items:[{id:'byteplus-seedance-2',label:'Seedance 2.0',provider:'BytePlus',kind:'video',enabled:true,control:{enabledOverride:null,priority:100,markupBps:null,internalCostMicros:null,maintenance:false}}]}}));
 await page.route('**/api/studio/admin/metrics',r=>r.fulfill({json:{items:[{provider:'BytePlus',model:'byteplus-seedance-2',kind:'video',jobs:2,succeeded:1,failed:1,processing:0,averageSeconds:12.5,actualCost:0.5,creditsCharged:80}]}}));
 await page.route('**/api/studio/admin/billing-review',r=>r.fulfill({json:{items:[{jobId:'job-review-1',userId:'user-1',credits:17,kind:'video',provider:'BytePlus',model:'byteplus-seedance-2',status:'failed',error:'GENERATION_FAILED_NO_AUTOMATIC_RETRY',createdAt:'2026-10-15T08:00:00Z'}]}}));
 await page.route('**/api/studio/admin/route-preview',r=>r.fulfill({json:{primary:'byteplus-seedance-2',candidates:[{id:'byteplus-seedance-2',provider:'BytePlus',priority:10,quality:'720p',duration:'5 seconds'}]}}));
 await page.goto('/deepsyq.html');if(await page.locator('#menu').isVisible())await page.locator('#menu').click();await expect(page.locator('#adminAiControl')).toBeVisible();await page.locator('#adminAiControl').click();
 await expect(page).toHaveURL(/deepsyq-admin.html/);await expect(page.getByText('Seedance 2.0')).toBeVisible();await expect(page.locator('table')).toContainText('BytePlus');await expect(page.locator('#billingReview')).toContainText('17 credits');
 await page.locator('#routeKind').selectOption('video');await page.locator('#routeRatio').selectOption('16:9');await page.locator('#routePreview').click();await expect(page.locator('#routeResult')).toContainText('byteplus-seedance-2');await expect(page.locator('#routeStatus')).toContainText('No provider call was made');
 await expect(page.locator('body')).not.toContainText('API key');await expect(page.locator('body')).not.toContainText('secret');
});
