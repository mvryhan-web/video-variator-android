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
test('A9 Home no longer fetches or renders private wallet after A→B; Pricing owns it',async({page})=>{
 await mockHome(page);
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'SECRET_ACCOUNT_A_NAME',isAdmin:false}}}));
 let walletCalls=0,posts=0;
 await page.route('**/api/ai-wallet/**',r=>{walletCalls++;return r.fulfill({json:{available:999999,reserved:35,debt:0,items:[]}});});
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.goto('/deepsyq.html');
 await expect(page.locator('#accountLabel')).toContainText('SECRET_ACCOUNT_A_NAME');
 await expect(page.locator('#aiWalletLink,#aiWalletAvailable,#aiWalletHeld')).toHaveCount(0);
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-B'));
 await page.keyboard.press('Tab');
 await expect(page.locator('#accountLabel')).not.toContainText('SECRET_ACCOUNT_A_NAME');
 await expect(page.locator('#aiWalletLink,#aiWalletAvailable,#aiWalletHeld')).toHaveCount(0);
 await expect(page.locator('#logout')).toBeHidden();
 expect(walletCalls).toBe(0);
 expect(posts).toBe(0);
});
test('A9 already displayed Home identity and Admin link are scrubbed before other account can click',async({page})=>{
 await mockHome(page);
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'SECRET_ACCOUNT_A_NAME',isAdmin:true}}}));
 await page.goto('/deepsyq.html');
 await expect(page.locator('#accountLabel')).toContainText('SECRET_ACCOUNT_A_NAME');
 await expect(page.locator('#adminAiControl')).toHaveCount(1);
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-B'));
 await page.keyboard.press('Tab');
 await expect(page.locator('#accountLabel')).not.toContainText('SECRET_ACCOUNT_A_NAME');
 await expect(page.locator('#adminAiControl')).toHaveCount(0);
 await expect(page.locator('#logout')).toBeHidden();
});
