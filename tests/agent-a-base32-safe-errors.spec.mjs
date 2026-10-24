import {test,expect} from '@playwright/test';

// No external paid provider, keys or real wallet are involved.
const config={enabled:true,models:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1'],references:0,enabled:true}],
 catalog:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1'],references:0,enabled:true,adapter:true,provider:'Google'}]};
async function startImage(page){
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#prompt').fill('Test original illustration');
 await page.locator('#consent').check();
 await page.locator('#generate').click();
}

test('BASE 32: unmapped server failure never exposes upstream tokens, SQL or HTTP details',async({page})=>{
 await page.route('**/api/studio/config',r=>r.fulfill({json:config}));
 const raw='upstream api_key=sk-secret-abc456 SQL SELECT * FROM users HTTP 429';
 let posts=0;
 await page.route('**/api/studio/jobs',r=>{posts++;return r.fulfill({status:502,json:{error:raw}});});
 await startImage(page);
 await expect(page.locator('#status')).toContainText('Unable to complete this request.');
 await expect(page.locator('#status')).not.toContainText('sk-secret-abc456');
 await expect(page.locator('#status')).not.toContainText('SQL SELECT');
 await expect(page.locator('#status')).not.toContainText('HTTP 429');
 expect(posts).toBe(1);
});

test('BASE 32: known normalized provider code retains the existing readable message',async({page})=>{
 await page.route('**/api/studio/config',r=>r.fulfill({json:config}));
 await page.route('**/api/studio/jobs',r=>r.fulfill({status:503,json:{error:'AI_PROVIDER_BUSY'}}));
 await startImage(page);
 await expect(page.locator('#status')).toContainText('AI provider is busy right now');
 await expect(page.locator('#status')).not.toContainText('AI_PROVIDER_BUSY');
});

test('BASE 32: prototype-key-like error string cannot bypass the safe fallback',async({page})=>{
 await page.route('**/api/studio/config',r=>r.fulfill({json:config}));
 await page.route('**/api/studio/jobs',r=>r.fulfill({status:500,json:{error:'__proto__'}}));
 await startImage(page);
 await expect(page.locator('#status')).toContainText('Unable to complete this request.');
 await expect(page.locator('#status')).not.toContainText('[object Object]');
});
