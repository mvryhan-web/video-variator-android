import {test,expect} from '@playwright/test';

// Real browser history, real Canvas/Studio/IndexedDB. Only disabled model metadata is mocked.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
const model={id:'gemini-3.1-flash-image',kind:'image',label:'Fixture Image',provider:'Google',
 adapter:true,enabled:false,references:2,ratios:['1:1','3:2'],quality:'1K',
 capabilities:{resolutions:['1K'],outputFormats:['auto'],ratios:['1:1','3:2']}};
async function prepare(page,width,prompt){
 await page.setViewportSize({width,height:850});
 await page.addInitScript(()=>{if(!localStorage.getItem('vv_token'))localStorage.setItem('vv_token','a35-account-A');});
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[model]}}));
 const paid=[];
 page.on('request',r=>{const path=new URL(r.url()).pathname;
  if(r.method()==='POST'&&/^\/api\/(?:studio\/jobs(?:\/|$)|generation\/|billing\/|stripe\/)/.test(path))paid.push(path);
 });
 await page.goto('/canvas.html');
 await page.locator('#quickCreatePrompt').fill(prompt);
 await page.locator('#quickCreateFiles').setInputFiles({name:'private-account-A.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(1);
 await page.locator('#quickCreateSubmit').click();
 await expect(page).toHaveURL(/\/generate-studio\.html\?studio=image&from=canvas$/);
 await expect(page.locator('#prompt')).toHaveValue(prompt);
 await expect(page.locator('#refPreview img')).toHaveCount(1);
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(await page.evaluate(()=>sessionStorage.getItem('deepsyq_studio_handoff_id'))).toBeNull();
 return paid;
}
for(const width of [320,390,768,1448]){
 test('A35 browser Back→B account→Forward never exposes A Canvas or references '+width,async({page})=>{
  const secret='PRIVATE A IMAGE HISTORY '+width;
  const paid=await prepare(page,width,secret);
  await page.goBack();
  await expect(page).toHaveURL(/\/canvas\.html$/);
  await expect(page.locator('#quickCreatePrompt')).toHaveValue(secret);
  await page.evaluate(()=>localStorage.setItem('vv_token','a35-account-B'));
  await page.goForward();
  await expect(page).toHaveURL(/\/generate-studio\.html\?studio=image&from=canvas$/);
  await expect(page.locator('#prompt')).not.toHaveValue(secret);
  await expect(page.locator('#refPreview img')).toHaveCount(0);
  await expect(page.locator('#consent')).not.toBeChecked();
  expect(await page.evaluate(()=>sessionStorage.getItem('deepsyq_studio_handoff_id'))).toBeNull();
  await page.goBack();
  await expect(page).toHaveURL(/\/canvas\.html$/);
  await expect(page.locator('#quickCreatePrompt')).toHaveValue('');
  await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#quickCreatePrompt')).toHaveValue('');
  expect(paid).toEqual([]);
 });
 test('A35 same-account browser Back→Forward→reload never replays consumed photos '+width,async({page})=>{
  const secret='PRIVATE A IMAGE DRAFT '+width;
  const paid=await prepare(page,width,secret);
  await page.goBack();
  await expect(page).toHaveURL(/\/canvas\.html$/);
  await expect(page.locator('#quickCreatePrompt')).toHaveValue(secret);
  await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(0);
  await page.goForward();
  await expect(page).toHaveURL(/\/generate-studio\.html\?studio=image&from=canvas$/);
  await expect(page.locator('#refPreview img')).toHaveCount(0);
  await expect(page.locator('#consent')).not.toBeChecked();
  expect(await page.evaluate(()=>sessionStorage.getItem('deepsyq_studio_handoff_id'))).toBeNull();
  await page.reload();
  await expect(page.locator('#refPreview img')).toHaveCount(0);
  await expect(page.locator('#consent')).not.toBeChecked();
  expect(paid).toEqual([]);
 });
}
