import {test,expect} from '@playwright/test';

const A='c20-fixture-account-A',B='c20-fixture-account-B';
const transparentPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
async function setup(page) {
 await page.addInitScript(token=>{
  localStorage.setItem('vv_token',token);
  window.__c20OCR=[];
  // No CDN/provider/network/real camera; the actual installed photo module receives a deferred local worker.
  window.Tesseract={createWorker:async()=>({
   recognize(file){return new Promise(resolve=>window.__c20OCR.push({resolve,name:file.name}));},
   async terminate(){}
  })};
 },A);
 await page.route('**/api/reminders**',route=>route.fulfill({json:{items:[]}}));
 await page.goto('/smart-reminders.html',{waitUntil:'domcontentloaded'});
 await page.locator('#photoExtra').evaluate(el=>el.open=true);
}
async function choose(page,name='account-A-private.png'){
 await page.locator('#reminderPhotoFile').setInputFiles({name,mimeType:'image/png',buffer:transparentPng});
 await expect(page.locator('#photoPreview')).toBeVisible();
}
async function changeAccount(page,token) {
 await page.evaluate(token=>{localStorage.setItem('vv_token',token);window.dispatchEvent(new Event('focus'));},token);
}
test('C20 a chosen private photo is cleared when a different account resumes the Tools tab',async({page})=>{
 await setup(page);
 await choose(page);
 await changeAccount(page,B);
 await expect(page.locator('#photoPreview')).toBeHidden();
 expect(await page.locator('#reminderPhotoFile').evaluate(el=>el.files.length)).toBe(0);
 await expect(page.locator('#photoRecognizedLine')).toBeHidden();
});
test('C20 old OCR recognition cannot restore A text or dates into B; B may still scan own picture',async({page})=>{
 const paid=[];
 page.on('request',request=>{if(request.method()==='POST')paid.push(request.url());});
 await setup(page);
 await choose(page);
 await page.locator('#reminderScanPhoto').click();
 await expect.poll(()=>page.evaluate(()=>window.__c20OCR.length)).toBe(1);
 await changeAccount(page,B);
 await page.evaluate(()=>window.__c20OCR.shift().resolve({data:{text:'ACCOUNT_A_PRIVATE_FLIGHT ticket 12/12/2026 16:45'}}));
 await expect(page.locator('#reminderScanPhoto')).toBeEnabled();
 await expect(page.locator('#photoRecognizedLine')).toBeHidden();
 await expect(page.locator('#photoRecognized')).not.toHaveValue(/ACCOUNT_A_PRIVATE/);
 expect(await page.locator('#photoCandidates').textContent()).not.toContain('ACCOUNT_A_PRIVATE');
 await choose(page,'account-B-private.png');
 await page.locator('#reminderScanPhoto').click();
 await expect.poll(()=>page.evaluate(()=>window.__c20OCR.length)).toBe(1);
 await page.evaluate(()=>window.__c20OCR.shift().resolve({data:{text:'ACCOUNT_B_NEW_OWN_TICKET 25/12/2026 12:00'}}));
 await expect(page.locator('#photoRecognized')).toContainText('ACCOUNT_B_NEW_OWN_TICKET');
 expect(paid).toEqual([]);
});
