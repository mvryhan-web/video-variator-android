import {test,expect} from '@playwright/test';

test('BASE #35: AI Apps logout clears pending product prompts only, preserving unrelated drafts',async({page})=>{
 // Stay on AI Apps: Home can asynchronously invalidate this synthetic /api/me session.
 await page.goto('/ai-apps.html');
 await page.evaluate(()=>{
  localStorage.setItem('vv_token','test-local-session-only');
  sessionStorage.setItem('deepsyq_template_start',JSON.stringify({promptTemplate:'Private product name Luna',generationType:'image'}));
  sessionStorage.setItem('unrelated-user-preference','preserve');
 });
 // Reload AI Apps so its module initializes against the already-seeded token.
 await page.reload();
 const logout=page.locator('#appsLogout');
 await expect(logout).toBeVisible();
 await logout.click();
 await expect(page).toHaveURL(/\/deepsyq\.html$/);
 const state=await page.evaluate(()=>({
  token:localStorage.getItem('vv_token'),
  template:sessionStorage.getItem('deepsyq_template_start'),
  unrelated:sessionStorage.getItem('unrelated-user-preference')
 }));
 expect(state).toEqual({token:null,template:null,unrelated:'preserve'});
});

test('BASE #35: normal AI Apps browsing does not delete an active prepared template',async({page})=>{
 await page.goto('/deepsyq.html');
 await page.evaluate(()=>{
  sessionStorage.setItem('deepsyq_template_start','existing-prepared-template');
 });
 await page.goto('/ai-apps.html');
 await expect(page.locator('h1')).toHaveText('AI Apps');
 expect(await page.evaluate(()=>sessionStorage.getItem('deepsyq_template_start'))).toBe('existing-prepared-template');
});

test('BASE #35: logout still removes the account token when tab storage cleanup is denied',async({page})=>{
 await page.addInitScript(()=>{
  const previous=Storage.prototype.removeItem;
  Storage.prototype.removeItem=function(key){
   if(key==='deepsyq_template_start')throw new DOMException('Storage denied','SecurityError');
   return previous.call(this,key);
  };
 });
 // Avoid an unrelated Home /api/me reply removing the synthetic token before AI Apps loads.
 await page.goto('/ai-apps.html');
 await page.evaluate(()=>{
  localStorage.setItem('vv_token','test-local-session-only');
  sessionStorage.setItem('deepsyq_template_start','test-private-product');
 });
 await page.reload();
 await expect(page.locator('#appsLogout')).toBeVisible();
 await page.locator('#appsLogout').click();
 await expect(page).toHaveURL(/\/deepsyq\.html$/);
 expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBeNull();
 // Browser-denied session storage cannot be guaranteed wiped, but logout
 // must never remain authenticated because a cleanup operation throws.
});
