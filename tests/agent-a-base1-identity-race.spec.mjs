import {test,expect} from '@playwright/test';

// A-only account UI privacy acceptance: real Home DOM/JS with mocked, delayed
// responses. No real account, charge, provider, media upload or POST is made.
function gate(){let release;const promise=new Promise(resolve=>{release=resolve;});return{promise,release:()=>release()};}
async function mockHome(page){
 await page.addInitScript(()=>localStorage.setItem('vv_token','fixture-account-A'));
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{},googleClientId:'',billingConfigured:false,features:{inspiration:false,aiApps:false,productVideo:false,onboarding:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/inspiration**',r=>r.fulfill({json:{items:[],categories:[]}}));
 await page.route('**/api/studio/jobs**',r=>r.fulfill({json:{items:[]}}));
}
test('A9 late account-A identity must not overwrite account-B after same-tab switch',async({page})=>{
 await mockHome(page);
 let seen;const requestSeen=new Promise(resolve=>seen=resolve),hold=gate();
 await page.route('**/api/me',async r=>{seen();await hold.promise;await r.fulfill({json:{user:{name:'SECRET_ACCOUNT_A_NAME',isAdmin:true}}});});
 let postCount=0;page.on('request',r=>{if(r.method()==='POST')postCount++;});
 await page.goto('/deepsyq.html',{waitUntil:'commit'});
 await requestSeen;
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-B'));
 hold.release();
 await page.waitForLoadState('load');
 expect((await page.locator('#accountLabel').textContent())||'').not.toContain('SECRET_ACCOUNT_A_NAME');
 await expect(page.locator('#adminAiControl')).toHaveCount(0);
 await expect(page.locator('#logout')).toBeHidden();
 expect(postCount).toBe(0);
});
test('A9 late account-A wallet must not show its credits under account-B',async({page})=>{
 await mockHome(page);
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Account A',isAdmin:false}}}));
 await page.route('**/api/ai-billing/config',r=>r.fulfill({json:{enabled:true}}));
 await page.route('**/api/ai-wallet/config',r=>r.fulfill({json:{welcomeEnabled:false}}));
 let seen;const requestSeen=new Promise(resolve=>seen=resolve),hold=gate();
 await page.route('**/api/ai-wallet/balance',async r=>{seen();await hold.promise;await r.fulfill({json:{available:999999,reserved:35,debt:0}});});
 await page.goto('/deepsyq.html',{waitUntil:'commit'});await requestSeen;
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-B'));
 hold.release();
 await page.waitForLoadState('load');
 await expect(page.locator('#aiWalletLink')).toBeHidden();
 await expect(page.locator('#aiWalletAvailable')).not.toHaveText('999,999');
});
test('A9 already displayed identity and wallet are scrubbed before other account can click',async({page})=>{
 await mockHome(page);
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'SECRET_ACCOUNT_A_NAME',isAdmin:true}}}));
 await page.route('**/api/ai-billing/config',r=>r.fulfill({json:{enabled:true}}));
 await page.route('**/api/ai-wallet/config',r=>r.fulfill({json:{welcomeEnabled:false}}));
 await page.route('**/api/ai-wallet/balance',r=>r.fulfill({json:{available:999999,reserved:35,debt:0}}));
 await page.goto('/deepsyq.html');
 await expect(page.locator('#accountLabel')).toContainText('SECRET_ACCOUNT_A_NAME');
 await expect(page.locator('#adminAiControl')).toHaveCount(1);
 await expect(page.locator('#aiWalletLink')).toBeVisible();
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-B'));
 await page.keyboard.press('Tab');
 await expect(page.locator('#accountLabel')).not.toContainText('SECRET_ACCOUNT_A_NAME');
 await expect(page.locator('#adminAiControl')).toHaveCount(0);
 await expect(page.locator('#aiWalletLink')).toBeHidden();
 await expect(page.locator('#aiWalletAvailable')).not.toHaveText('999,999');
 await expect(page.locator('#logout')).toBeHidden();
});
