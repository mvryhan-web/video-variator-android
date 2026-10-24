import {test,expect} from '@playwright/test';

// Reuse merged Agent A privacy acceptance; all account APIs are fixtures.
async function mockSafeHome(page,items=[]){
 await page.route('**/api/config',route=>route.fulfill({json:{
  plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},
         business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}},
  googleClientId:'',billingConfigured:false,
  features:{aiApps:false,inspiration:true,productVideo:false,onboarding:false}
 }}));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{ownerOnly:true,enabled:false,models:[],catalog:[]}}));
 await page.route('**/api/auth/email/status',route=>route.fulfill({json:{configured:false}}));
 await page.route('**/api/inspiration**',route=>route.fulfill({json:{items,categories:[],ratios:[],pagination:{hasMore:false}}}));
}

test('BASE 3: Canvas draft cannot be restored by a different account sharing this browser tab',async({page})=>{
 await mockSafeHome(page,[]);
 await page.addInitScript(()=>{
  if(!localStorage.getItem('vv_token'))localStorage.setItem('vv_token','fixture-account-A');
 });
 await page.route('**/api/me',route=>route.fulfill({json:{user:{id:'test-user',name:'Account A',isAdmin:false}}}));
 let paidPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/studio\/jobs/.test(r.url()))paidPosts++;});
 await page.goto('/deepsyq.html');
 const aPrompt='PRIVATE ACCOUNT A: winter fashion concept';
 const bPrompt='PRIVATE ACCOUNT B: independent product design';
 await page.locator('#quickCreatePrompt').fill(aPrompt);
 await expect.poll(()=>page.evaluate(()=>{
  const keys=Object.keys(sessionStorage).filter(k=>k.startsWith('deepsyq_quick_canvas_draft_v2_'));
  return keys.some(key=>JSON.parse(sessionStorage.getItem(key)||'null')?.prompt==='PRIVATE ACCOUNT A: winter fashion concept');
 })).toBe(true);
 await page.reload();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue(aPrompt);
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-B'));
 // Same-tab token changes do not fire native storage; the first keyboard
 // interaction must not expose A's still-open private form to account B.
 await page.locator('#quickCreatePrompt').press('Tab');
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('');
 await page.reload();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('');
 // Emulate Firefox history/form restoration *after* the JS startup. The
 // pageshow handler must discard A's stale value before restoring only B.
 await page.evaluate(oldPrompt=>{
  document.getElementById('quickCreatePrompt').value=oldPrompt;
  window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
 },aPrompt);
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('');
 await page.locator('#quickCreatePrompt').fill(bPrompt);
 await expect.poll(()=>page.evaluate(()=>Object.keys(sessionStorage)
  .filter(key=>key.startsWith('deepsyq_quick_canvas_draft_v2_'))
  .some(key=>JSON.parse(sessionStorage.getItem(key)||'null')?.prompt==='PRIVATE ACCOUNT B: independent product design'))).toBe(true);
 await page.reload();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue(bPrompt);
 // A's restored DOM must never win over this account's hashed B draft.
 await page.evaluate(oldPrompt=>{
  document.getElementById('quickCreatePrompt').value=oldPrompt;
  window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
 },aPrompt);
 await expect(page.locator('#quickCreatePrompt')).toHaveValue(bPrompt);
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-A'));
 await page.reload();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue(aPrompt);
 const keys=await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('deepsyq_quick_canvas_draft_v2_')));
 expect(keys.length).toBeGreaterThanOrEqual(2);
 expect(keys.some(key=>key.includes('fixture-account-A')||key.includes('fixture-account-B'))).toBe(false);
 expect(paidPosts).toBe(0);
});

test('BASE 3: cross-tab account switch clears unsent prompts and reference previews on Home',async({page})=>{
 await mockSafeHome(page,[]);
 await page.addInitScript(()=>localStorage.setItem('vv_token','fixture-account-A'));
 await page.route('**/api/me',route=>route.fulfill({json:{user:{id:'owner',name:'Account A',isAdmin:false}}}));
 await page.goto('/deepsyq.html');
 await page.locator('#quickCreatePrompt').fill('PRIVATE OLD CANVAS PROMPT');
 await page.locator('#homeQuickPrompt').fill('PRIVATE OLD HOME IDEA');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 await page.locator('#quickCreateFiles').setInputFiles({name:'private-reference.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(1);
 await page.evaluate(()=>{
  localStorage.setItem('vv_token','fixture-account-B');
  dispatchEvent(new StorageEvent('storage',{key:'vv_token',newValue:'fixture-account-B'}));
 });
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('');
 await expect(page.locator('#homeQuickPrompt')).toHaveValue('');
 await expect(page.locator('#quickCreateFiles')).toHaveValue('');
 await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(0);
 await expect(page.locator('#quickCreateStatus')).toContainText('Account changed');
});

test("BASE 3: logout and browser Back never show another account's Canvas draft",async({page})=>{
 await mockSafeHome(page,[]);
 await page.route('**/api/me',route=>route.fulfill({json:{user:{id:'owner-a',name:'Creator A',isAdmin:false}}}));
 let paidJobs=0;
 page.on('request',request=>{
  if(request.method()==='POST'&&/\/api\/studio\/jobs/.test(request.url()))paidJobs++;
 });
 await page.goto('/deepsyq.html');
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-owner-A'));
 await page.reload();
 await expect(page.locator('#logout')).toBeVisible();
 const secret='PRIVATE A Canvas draft must not appear for logged-out visitors';
 await page.locator('#quickCreatePrompt').fill(secret);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 await page.locator('#quickCreateFiles').setInputFiles({name:'private-owner-A.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(1);
 await expect.poll(()=>page.evaluate(text=>Object.keys(sessionStorage)
  .filter(key=>key.startsWith('deepsyq_quick_canvas_draft_v2_'))
  .some(key=>JSON.parse(sessionStorage.getItem(key)||'null')?.prompt===text),secret)).toBe(true);
 // Exercise the actual Home Logout control, not a simulated storage event.
 // On phones, the sidebar is inert until the visible menu button opens it.
 if(await page.evaluate(()=>matchMedia('(max-width:760px)').matches))
  await page.locator('#menu').click();
 await page.locator('#logout').click();
 await expect(page.locator('#logout')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBeNull();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('');
 await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(0);
 await page.goto('/ai-apps.html');
 await page.goBack();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('');
 // A different signed-in identity must not see A's saved text either.
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-owner-B'));
 await page.reload();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('');
 // A can still recover their OWN account-scoped draft after signing back in.
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-owner-A'));
 await page.reload();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue(secret);
 expect(paidJobs).toBe(0);
});

