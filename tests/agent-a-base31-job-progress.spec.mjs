import {test,expect} from '@playwright/test';

test('BASE 31: accepted Studio job shows server reserve and lifecycle; no extra paid submission',async({page})=>{
 const cfg={enabled:true,models:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1'],references:0,enabled:true}],
  catalog:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1'],references:0,enabled:true,adapter:true,provider:'Google'}]};
 await page.route('**/api/studio/config',r=>r.fulfill({json:cfg}));
 let jobsSubmitted=0,stage='processing';
 await page.route('**/api/studio/jobs',r=>{
  if(r.request().method()==='POST'){jobsSubmitted++;return r.fulfill({status:202,json:{id:'accepted-fixture',status:'processing',creditsReserved:17}});}
  return r.continue();
 });
 await page.route('**/api/studio/jobs/accepted-fixture',r=>r.fulfill({json:{
  id:'accepted-fixture',kind:'image',status:stage,mime:'image/png',creditsReserved:17,
  creditsCharged:stage==='ready'?17:0,retryAfterSeconds:1
 }}));
 await page.route('**/api/studio/jobs/accepted-fixture/media',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')}));
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#prompt').fill('Illustrate a product for the customer');
 await page.locator('#consent').check();
 await page.locator('#generate').click();
 await expect(page.locator('#jobProgress')).toBeVisible();
 await expect(page.locator('#jobProgress')).toHaveAttribute('data-status','processing');
 await expect(page.locator('#jobProgressCredits')).toContainText('17 AI credits reserved');
 await expect(page.locator('#jobProgressCredits')).not.toContainText('charged');
 await expect(page.locator('#jobProgressHint')).toContainText('History');
 expect(jobsSubmitted).toBe(1);
 // This must coexist with A24's independent History request-epoch fix:
 // toggling the view should hide status visually without rewriting setHistory.
 await page.locator('#showHistory').click();
 await expect(page.locator('#jobProgress')).toBeHidden();
 await page.locator('#showCreate').click();
 await expect(page.locator('#jobProgress')).toBeVisible();
 stage='ready';
 await expect(page.locator('#jobProgress')).toHaveAttribute('data-status','ready',{timeout:20000});
 await expect(page.locator('#jobProgressCredits')).toContainText('17 AI credits charged');
 await expect(page.locator('#media img')).toBeVisible();
 expect(jobsSubmitted).toBe(1);
});

test('BASE 31: denied or uncertain submission never invents a charged amount',async({page})=>{
 const cfg={enabled:true,models:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1'],references:0,enabled:true}],
  catalog:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1'],references:0,enabled:true,adapter:true,provider:'Google'}]};
 await page.route('**/api/studio/config',r=>r.fulfill({json:cfg}));
 await page.route('**/api/studio/jobs',r=>r.fulfill({status:503,json:{error:'AI_PROVIDER_UNAVAILABLE'}}));
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#prompt').fill('Product still');
 await page.locator('#consent').check();
 await page.locator('#generate').click();
 await expect(page.locator('#jobProgress')).toHaveAttribute('data-status','unconfirmed');
 await expect(page.locator('#jobProgressCredits')).toBeEmpty();
 await expect(page.locator('#jobProgressHint')).toContainText('Check History');
});
