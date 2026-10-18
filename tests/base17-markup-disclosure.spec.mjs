import {test,expect} from '@playwright/test';

test('BASE #17: owner markup settings are explicitly reference-only, never an accidental customer price change',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','owner-markup-disclosure-fixture'));
 const model={id:'owner-model',label:'Owner sample image',provider:'Google',kind:'image',
  enabled:true,control:{enabledOverride:null,priority:100,markupBps:12000,internalCostMicros:32000,maintenance:false}};
 let patchCount=0,lastPatch=null,paidRequests=0;
 await page.route('**/api/me',r=>r.fulfill({json:{user:{id:'owner',isAdmin:true}}}));
 await page.route('**/api/studio/admin/**',r=>r.fulfill({status:503,json:{error:'OWNER_TEST_UNAVAILABLE'}}));
 await page.route('**/api/studio/admin/models',r=>r.fulfill({json:{items:[model]}}));
 await page.route('**/api/studio/admin/models/*',r=>{
  if(r.request().method()!=='PATCH')return r.fulfill({status:405,json:{error:'UNEXPECTED_METHOD'}});
  patchCount++;
  lastPatch=r.request().postDataJSON();
  model.control.markupBps=lastPatch.markupBps;
  model.control.internalCostMicros=lastPatch.internalCostMicros;
  return r.fulfill({json:{modelId:model.id,control:model.control}});
 });
 page.on('request',r=>{if(r.method()==='POST'&&(/\/api\/studio\/(?:jobs|estimate)|\/api\/ai-billing\/checkout|\/api\/webhooks\/stripe/.test(r.url())))paidRequests++;});
 await page.setViewportSize({width:390,height:844});
 await page.goto('/deepsyq-admin.html');
 const card=page.locator('#models article');
 await expect(card).toHaveCount(1);
 await expect(card).toContainText('Markup and internal cost are reference settings only');
 await expect(card).toContainText('They do not change customer AI-credit prices');
 const input=card.locator('label').filter({hasText:'Markup (bps)'}).locator('input');
 await expect(input).toHaveValue('12000');
 await input.fill('14000');
 await card.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>patchCount).toBe(1);
 expect(lastPatch.markupBps).toBe(14000);
 await expect(page.locator('#models article')).toContainText('They do not change customer AI-credit prices');
 await expect(page.locator('#models article label').filter({hasText:'Markup (bps)'}).locator('input')).toHaveValue('14000');
 expect(paidRequests).toBe(0);
});
