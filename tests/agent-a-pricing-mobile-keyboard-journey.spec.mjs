import {test,expect} from '@playwright/test';

// A30: keyboard-only, real Home/Pricing/History navigation across four widths.
// Synthetic offline public API only; no token, paid provider or checkout.
// Existing A28/A29 account/Back/Forward tests remain completely unchanged.
const json=data=>({contentType:'application/json',body:JSON.stringify(data)});

async function isolated(page){
 const posts=[],media=[];
 page.on('request',req=>{
  const u=new URL(req.url());
  if(req.method()==='POST'&&u.pathname.startsWith('/api/'))posts.push(u.pathname);
  if(/(?:\/api\/studio\/jobs\/[^/]+\/media|a30-private-account)/.test(u.pathname))media.push(u.pathname);
 });
 await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(req.method()!=='GET')return route.fulfill({status:405,...json({error:'A30_NO_WRITES'})});
  if(path==='/api/config')return route.fulfill(json({
   plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},
    lifetime:{price:2999,currency:'eur'}},googleClientId:'',billingConfigured:false,
   features:{inspiration:false,aiApps:false,productVideo:false,onboarding:false}
  }));
  if(path==='/api/ai-billing/config')return route.fulfill(json({enabled:false,packs:[]}));
  if(path==='/api/ai-wallet/config')return route.fulfill(json({welcomeEnabled:false,welcomeCredits:0}));
  if(path==='/api/studio/config')return route.fulfill(json({enabled:false,ownerOnly:true,models:[],catalog:[]}));
  if(path==='/api/auth/email/status')return route.fulfill(json({configured:false}));
  if(path.startsWith('/api/inspiration'))return route.fulfill(json({items:[],categories:[]}));
  if(path.startsWith('/api/studio/jobs'))return route.fulfill(json({items:[]}));
  return route.fulfill({status:503,...json({error:'A30_OFFLINE_NO_PAID_API'})});
 });
 return {posts,media};
}

// Only user-like keyboard presses can move focus; never call .focus(),
// dispatch fake key events, or .click() to bypass a hidden/inert control.
async function tabTo(page,selector,max=100){
 const target=page.locator(selector);
 await expect(target).toHaveCount(1);
 await expect(target).toBeVisible();
 for(let i=0;i<max;i++){
  if(await target.evaluate(e=>document.activeElement===e))break;
  await page.keyboard.press('Tab');
 }
 await expect(target).toBeFocused();
 const state=await target.evaluate(e=>({
  name:e.getAttribute('aria-label')||e.textContent?.trim()||'',
  visible:e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden',
  disabled:e.hasAttribute('disabled')||e.closest('[inert]')!==null
 }));
 expect(state.name.trim()).not.toBe('');
 expect(state.visible).toBe(true);
 expect(state.disabled).toBe(false);
}

for(const width of [320,390,768,1448]){
 test('A30 actual keyboard Home to Pricing/Wallet then mobile or desktop History at '+width+'px',async({page})=>{
  test.setTimeout(120000);
  const state=await isolated(page);
  await page.setViewportSize({width,height:850});
  await page.goto('/deepsyq.html');
  await tabTo(page,'#topPricing');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/pricing\.html(?:[?#]|$)/);
  await expect(page.locator('#pricingTitle')).toHaveText('Power Your Creativity');
  await expect(page.locator('#walletSection')).toBeHidden();
  await tabTo(page,'a.price-wallet-link');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator('a.price-wallet-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/pricing\.html#wallet$/);
  await tabTo(page,'#walletSignIn',8);
  await page.keyboard.press('Enter');
  await expect(page.locator('#authModal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#authModal')).toBeHidden();
  await expect(page.locator('#walletSection')).toBeHidden();
  await expect(page.locator('#walletSummary')).toBeEmpty();
  await expect(page.locator('#walletHistory')).toBeEmpty();

  // A new navigation, not the Back/Forward or cross-tab privacy tested in A28/A29.
  await page.goto('/deepsyq.html');
  if(width<=760){
   await expect(page.locator('#sidebar')).toHaveJSProperty('inert',true);
   await tabTo(page,'#menu');
   await page.keyboard.press('Enter');
   await expect(page.locator('#menu')).toHaveAttribute('aria-expanded','true');
   await expect(page.locator('#sidebar')).toHaveJSProperty('inert',false);
  }
  await tabTo(page,'#sidebar a[aria-label="History"]');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/generate-studio\.html\?view=history(?:&.*)?$/);
  await expect(page.locator('#showHistory')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#historyFilters')).toBeVisible();
  expect(state.posts,'keyboard navigation must never POST to billing/provider').toEqual([]);
  expect(state.media,'keyboard navigation must not download private job media').toEqual([]);
 });
}
