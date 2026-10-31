import {test, expect} from '@playwright/test';

// A28: actual browser back/forward navigation using the real Home + Pricing JS.
// All identities, wallet values and history are mocked. This is NOT a two-JWT
// server authorization test, a genuine purchase, or proof BFCache was activated.
const A='a28-synthetic-account-A', B='a28-synthetic-account-B';
const A_NAME='A28_USER_A_SECRET', B_NAME='A28_USER_B';
const A_BALANCE='120,111', B_BALANCE='240,222';
const A_ACTIVITY='91,011', B_ACTIVITY='92,022';
const pathOf=page=>new URL(page.url()).pathname;
const json=data=>({contentType:'application/json',body:JSON.stringify(data)});

async function installSafeFixtures(page) {
 const forbiddenPosts=[],walletRequests=[],privateMediaRequests=[],jobRequests=[];
 page.on('request',req=>{
  const url=new URL(req.url()),path=url.pathname;
  if(req.method()==='POST' && path.startsWith('/api/'))forbiddenPosts.push(path);
  if(path.startsWith('/api/ai-wallet/'))walletRequests.push({path,auth:req.headers().authorization||''});
  if(path.startsWith('/api/studio/jobs'))jobRequests.push(path);
  if(/a28-account-a-private-(?:image|prompt)/.test(req.url()))privateMediaRequests.push(req.url());
 });
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(req.method()!=='GET')return route.fulfill({status:405,...json({error:'A28_NO_POST_ALLOWED'})});
  const bearer=req.headers().authorization||'';
  const account=bearer==='Bearer '+A?'A':bearer==='Bearer '+B?'B':null;
  if(path==='/api/config')return route.fulfill(json({
   plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}},
   googleClientId:'',billingConfigured:false,
   features:{inspiration:false,aiApps:false,productVideo:false,onboarding:false}
  }));
  if(path==='/api/ai-billing/config')return route.fulfill(json({enabled:false,packs:[],checkoutMode:'disabled'}));
  if(path==='/api/ai-wallet/config')return route.fulfill(json({welcomeEnabled:false,welcomeCredits:0}));
  if(path==='/api/studio/config')return route.fulfill(json({enabled:false,ownerOnly:true,models:[],catalog:[]}));
  if(path.startsWith('/api/inspiration'))return route.fulfill(json({items:[],categories:[]}));
  if(path==='/api/me'){
   if(!account)return route.fulfill({status:401,...json({error:'AUTH_REQUIRED'})});
   return route.fulfill(json({user:{name:account==='A'?A_NAME:B_NAME,isAdmin:false}}));
  }
  if(path==='/api/ai-wallet/balance'||path==='/api/ai-wallet/history'){
   if(!account)return route.fulfill({status:401,...json({error:'AUTH_REQUIRED'})});
   if(path.endsWith('/balance'))return route.fulfill(json({available:account==='A'?120111:240222,reserved:0,debt:0}));
   return route.fulfill(json({items:[{
    kind:'purchase',available_delta:account==='A'?91011:92022,reserved_delta:0,debt_delta:0,
    created_at:'2026-10-28T09:00:00Z'
   }]}));
  }
  if(path.startsWith('/api/studio/jobs'))return route.fulfill(json({items:[{
   id:'a28-account-a-private-image',prompt:'a28-account-a-private-prompt',status:'ready',kind:'image',
   thumbnailUrl:'/a28-account-a-private-image.png'
  }]}));
  return route.fulfill({status:503,...json({error:'A28_OFFLINE_FIXTURE'})});
 });
 // Track *actual* browser pageshow and whether the browser reported BFCache.
 // Never synthesize pagehide/pageshow or assert BFCache=true when not observed.
 await page.addInitScript(()=>{
  window.__a28Pageshow=[];
  window.addEventListener('pageshow',event=>{
   window.__a28Pageshow.push({persisted:event.persisted});
  });
 });
 return {forbiddenPosts,walletRequests,privateMediaRequests,jobRequests};
}
async function startAsA(page){
 await page.goto('/deepsyq.html');
 await page.evaluate(value=>localStorage.setItem('vv_token',value),A);
 await page.reload();
 await expect(page.locator('#accountLabel')).toContainText(A_NAME);
}
async function assertAAbsent(page){
 await expect(page.locator('body')).not.toContainText(A_NAME);
 await expect(page.locator('body')).not.toContainText(A_ACTIVITY);
 await expect(page.locator('body')).not.toContainText(A_BALANCE);
 await expect(page.locator('body')).not.toContainText('a28-account-a-private-prompt');
 await expect(page.locator('img[src*="a28-account-a-private-image"]')).toHaveCount(0);
}
async function assertBWallet(page){
 await expect(page).toHaveURL(/\/pricing\.html(?:[?#]|$)/);
 await expect(page.locator('#walletSection')).toBeVisible();
 await expect(page.locator('#walletSummary')).toContainText(B_BALANCE);
 await expect(page.locator('#walletHistory')).toContainText(B_ACTIVITY);
 await assertAAbsent(page);
}
async function assertSignedOutWallet(page){
 await expect(page.locator('#walletSection')).toBeHidden();
 await expect(page.locator('#walletEntry')).toBeVisible();
 await expect(page.locator('#walletSummary')).toBeEmpty();
 await expect(page.locator('#walletHistory')).toBeEmpty();
 await expect(page.locator('#welcomeCredits')).toBeHidden();
 await assertAAbsent(page);
}

test('A28 physical Home → Pricing → Contact → Back/Forward never restores account A wallet under B',async({page},info)=>{
 const state=await installSafeFixtures(page);
 await startAsA(page);
 expect(state.walletRequests).toHaveLength(0); // Home must not fetch private Wallet.
 await page.locator('#topPricing').click();
 await expect(page).toHaveURL(/\/pricing\.html(?:[?#]|$)/);
 await expect(page.locator('#walletSummary')).toContainText(A_BALANCE);
 await expect(page.locator('#walletHistory')).toContainText(A_ACTIVITY);
 await page.locator('footer a[href="contact.html"]').click();
 await expect(page).toHaveURL(/\/contact\.html(?:[?#]|$)/);
 await page.evaluate(value=>localStorage.setItem('vv_token',value),B);
 await page.goBack(); // Actual browser Back: Contact -> previously visited Pricing.
 await assertBWallet(page);
 const shows=await page.evaluate(()=>window.__a28Pageshow||[]);
 const bfcache=shows.some(item=>item.persisted===true);
 info.annotations.push({type:'browser-BFCache-observed',description:String(bfcache)});
 console.log('A28_BFCACHE_PERSISTED '+info.project.name+' '+bfcache);
 await page.goBack(); // Pricing -> the original Home.
 await expect(page).toHaveURL(/\/deepsyq\.html(?:[?#]|$)/);
 await assertAAbsent(page);
 await page.goForward(); // Home -> Pricing, for the second time under B.
 await assertBWallet(page);
 await page.goForward(); // Pricing -> Contact; no POST should occur.
 expect(pathOf(page)).toBe('/contact.html');
 expect(state.forbiddenPosts).toEqual([]);
 expect(state.privateMediaRequests).toEqual([]);
 expect(state.jobRequests).toEqual([]);
 expect(state.walletRequests.every(item=>item.auth==='Bearer '+A||item.auth==='Bearer '+B)).toBe(true);
});

test('A28 real Home Logout clears Pricing wallet across Back/Forward and hard refresh',async({page})=>{
 const state=await installSafeFixtures(page);
 await startAsA(page);
 await page.locator('#topPricing').click();
 await expect(page.locator('#walletSummary')).toContainText(A_BALANCE);
 await page.goBack(); // Pricing -> Home, without simulated lifecycle events.
 await expect(page).toHaveURL(/\/deepsyq\.html(?:[?#]|$)/);
 if((page.viewportSize()?.width||1024)<=760)await page.locator('#menu').click();
 await expect(page.locator('#logout')).toBeVisible();
 await page.locator('#logout').click(); // Actual Home UI logout + reload.
 await expect(page).toHaveURL(/\/deepsyq\.html(?:[?#]|$)/);
 expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBeNull();
 await page.locator('#topPricing').click();
 await assertSignedOutWallet(page);
 await page.goBack();
 await page.goForward();
 await assertSignedOutWallet(page);
 await page.reload();
 await assertSignedOutWallet(page);
 expect(state.forbiddenPosts).toEqual([]);
 expect(state.privateMediaRequests).toEqual([]);
 expect(state.jobRequests).toEqual([]);
});

test('A29 native second-tab storage switches live Pricing A→B and logout removes all wallet data',async({page,context})=>{
 const state=await installSafeFixtures(page);
 await startAsA(page);
 await page.locator('#topPricing').click();
 await expect(page.locator('#walletSummary')).toContainText(A_BALANCE);
 await expect(page.locator('#walletHistory')).toContainText(A_ACTIVITY);
 // Attach an observer BEFORE the external tab changes the token.
 // We never dispatch synthetic StorageEvent or page lifecycle events.
 await page.evaluate(()=>{
  window.__a29NativeStorage=[];
  window.addEventListener('storage',event=>{
   if(event.key==='vv_token')window.__a29NativeStorage.push(event.newValue);
  });
 });
 const secondTab=await context.newPage();
 try{
  await secondTab.goto('/contact.html');
  expect(await secondTab.evaluate(()=>localStorage.getItem('vv_token'))).toBe(A);
  // Real browser cross-document localStorage mutation; Pricing receives native storage.
  await secondTab.evaluate(value=>localStorage.setItem('vv_token',value),B);
  await expect.poll(()=>page.evaluate(()=>window.__a29NativeStorage)).toEqual([B]);
  await page.bringToFront();
  await assertBWallet(page);
  await assertAAbsent(page);
  // A sign-out from the other tab must scrub visible B wallet and A leftovers.
  await secondTab.bringToFront();
  await secondTab.evaluate(()=>localStorage.removeItem('vv_token'));
  await expect.poll(()=>page.evaluate(()=>window.__a29NativeStorage)).toEqual([B,null]);
  await page.bringToFront();
  await assertSignedOutWallet(page);
  await page.goBack(); // Actual Pricing -> Home history (not a simulated event).
  await expect.poll(()=>pathOf(page)).toBe('/deepsyq.html');
  await assertAAbsent(page);
  await page.goForward();
  await assertSignedOutWallet(page);
  expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBeNull();
  expect(state.forbiddenPosts).toEqual([]);
  expect(state.privateMediaRequests).toEqual([]);
  expect(state.jobRequests).toEqual([]);
  expect(state.walletRequests.every(item=>
   item.auth==='Bearer '+A||item.auth==='Bearer '+B
  )).toBe(true);
 }finally{
  await secondTab.close();
 }
});
