import {test,expect} from '@playwright/test';

test('BASE #35: AI Apps logout clears pending product prompts only, preserving unrelated drafts',async({page})=>{
 await page.goto('/deepsyq.html');
 await page.evaluate(()=>{
  localStorage.setItem('vv_token','test-local-session-only');
  sessionStorage.setItem('deepsyq_template_start',JSON.stringify({promptTemplate:'Private product name Luna',generationType:'image'}));
  sessionStorage.setItem('unrelated-user-preference','preserve');
 });
 await page.goto('/ai-apps.html');
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
