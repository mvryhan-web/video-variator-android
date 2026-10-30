import {test,expect} from '@playwright/test';

// A33: native HTML form/file event paths previously bypassed the Canvas account guard.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
async function ownerA(page,width){
 await page.setViewportSize({width,height:850});
 await page.addInitScript(()=>localStorage.setItem('vv_token','a33-session-A'));
 await page.goto('/canvas.html');
 const prompt=page.locator('#quickCreatePrompt');
 await expect(prompt).toBeVisible();
 await prompt.fill('PRIVATE A33 session A idea and image');
 await page.locator('#quickCreateFiles').setInputFiles({name:'a33-owner-A.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(1);
 return prompt;
}
function paidRequests(page){
 const paid=[];
 page.on('request',r=>{
  if(r.method()==='POST'&&/^\/api\/(?:studio|generation|ai-billing|billing|stripe)/.test(new URL(r.url()).pathname))paid.push(r.url());
 });
 return paid;
}
for(const width of [320,390,768,1448]){
 test('A33 native requestSubmit after silent A to B account rotation '+width,async({page})=>{
  const paid=paidRequests(page);
  const prompt=await ownerA(page,width);
  await page.evaluate(()=>{
   localStorage.setItem('vv_token','a33-session-B');
   document.querySelector('#quickCreateForm').requestSubmit();
  });
  await expect(page).toHaveURL(/\/canvas\.html$/);
  await expect(prompt).toHaveValue('');
  await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(0);
  await expect(page.locator('#quickCreateStatus')).toContainText('Account changed');
  expect(await page.evaluate(()=>sessionStorage.getItem('deepsyq_studio_handoff_id'))).toBeNull();
  expect(paid).toEqual([]);
 });
 test('A33 file input change without pointer event after account rotation '+width,async({page})=>{
  const paid=paidRequests(page);
  const prompt=await ownerA(page,width);
  await page.evaluate(()=>localStorage.setItem('vv_token','a33-session-B'));
  await page.locator('#quickCreateFiles').setInputFiles({name:'a33-account-B.png',mimeType:'image/png',buffer:png});
  await expect(prompt).toHaveValue('');
  await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(0);
  await expect(page.locator('#quickCreateStatus')).toContainText('Account changed');
  expect(await page.evaluate(()=>sessionStorage.getItem('deepsyq_studio_handoff_id'))).toBeNull();
  expect(paid).toEqual([]);
 });
}
