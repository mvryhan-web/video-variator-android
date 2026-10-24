import {test,expect} from '@playwright/test';

// Owner-approved interior-only styling. Deliberately only local/no-paid browser
// reads, no generator POST, provider, real Stripe, migration or production.
const primary=[
 '/generate-studio.html?studio=image',
 '/generate-studio.html?studio=video',
 '/generate-studio.html?studio=audio',
 '/generate-studio.html?view=history',
 '/ai-apps.html',
 '/inspiration.html',
 '/audio-studio.html',
 '/free-tools.html',
 '/ai-pricing.html'
];
const legal=['/contact.html','/cookie.html','/terms.html','/refund.html'];
const allSecondary=[
 ...primary,...legal,
 '/ai-privacy.html','/avatar-studio.html','/deepsyq-vs-deepseek.html',
 '/mobile-utility.html','/photo-collage.html','/simple-background-remover.html',
 '/smart-reminders.html','/teleprompter.html',
 '/deepsyq-admin.html','/product-watcher-admin.html',
 '/telegram-free-mini.html','/index.html'
];

test.beforeEach(async({page})=>{
 await page.route('**/api/**',async route=>{
   if(!['GET','HEAD','OPTIONS'].includes(route.request().method())){
     return route.fulfill({status:503,contentType:'application/json',
       body:JSON.stringify({error:'Owner visual QA: all backend writes blocked'})});
   }
   return route.continue();
 });
});

test('approved Home remains excluded from every new interior visual rule',async({page})=>{
 await page.goto('/deepsyq.html');
 await expect(page.locator('body')).toHaveClass(/home-neon/);
 const tokens=await page.locator('body').evaluate(node=>{
  const css=getComputedStyle(node);
  return {bg:css.getPropertyValue('--ds-bg').trim(),
    inner:node.matches('body:not(.home-neon)')};
 });
 expect(tokens.inner).toBe(false);
 expect(tokens.bg).not.toBe('#030b1c');
 await expect(page.locator('#homeHeroCarousel')).toHaveCount(1);
 await expect(page.locator('#homeQuickForm')).toHaveCount(1);
});

test('all 22 existing secondary HTML routes load a shared visual theme',async({page})=>{
 // These 25 URL cases represent the 22 distinct secondary HTML files:
 // Studio modes and History intentionally share generate-studio.html.
 for(const route of allSecondary){
   const res=await page.request.get(route);
   expect(res.status(),route).toBe(200);
   const html=await res.text();
   expect(html,route).toContain(route.includes('generate-studio.html')?'studio-classic-theme.css':'deepsyq-global-theme.css');
 }
});

test('Image Video Audio Studio and History use restored October 20 neon surfaces',async({page})=>{
 for(const mode of ['image','video','audio']){
   await page.goto('/generate-studio.html?studio='+mode);
   await expect(page.locator('.composer')).toBeVisible();
   const c=await page.locator('.composer').evaluate(node=>{
     const s=getComputedStyle(node);
     return {border:s.borderTopColor,bg:s.backgroundImage,body:document.body.className};
   });
   expect(c.border).toBe('rgb(113, 99, 220)');
   expect(c.bg).toContain('linear-gradient');
   expect(c.body).not.toContain('home-neon');
 }
 await page.goto('/generate-studio.html?view=history');
 const active=page.locator('.history-filters button[aria-pressed="true"]').first();
 if(await active.count()){
   const bg=await active.evaluate(node=>getComputedStyle(node).backgroundImage);
   expect(bg).toContain('linear-gradient');
 }
});

test('interior destinations preserve functional fields and distinct enabled/disabled controls',async({page})=>{
 await page.goto('/ai-apps.html');
 await expect(page.locator('#search')).toBeVisible();
 await expect(page.locator('#type')).toBeVisible();
 await page.goto('/inspiration.html');
 await expect(page).toHaveURL(/deepsyq\.html#inspirationPreview$/);
 await expect(page.locator('#inspirationPreviewGrid')).toHaveCount(1);
 await expect(page.locator('.inspiration-home-tabs [data-inspiration-kind]')).toHaveCount(3);
 await page.goto('/audio-studio.html');
 await expect(page.locator('#trimGenerate')).toBeDisabled();
 await expect(page.locator('#trimFile')).toHaveCount(1);
 await page.goto('/free-tools.html');
 await expect(page.locator('#run')).toHaveCount(1);
});

test('legal pages use the same navy theme and safe read-only sidebar',async({page})=>{
 for(const url of legal){
  await page.goto(url);
  await expect(page.locator('#dsSiteSidebar')).toHaveCount(1);
  const color=await page.locator('body').evaluate(node=>
    getComputedStyle(node).getPropertyValue('--ds-bg').trim());
  expect(color,url).toBe('#030b1c');
 }
});

test('responsive secondary neon pages keep the navigation toggle accessible',async({page})=>{
 for(const width of [320,375,390,768,1448]){
  await page.setViewportSize({width,height:850});
  await page.goto('/generate-studio.html?studio=image');
  const drawer=page.locator('.ds-site-mobile-toggle');
  if(width<=900){
    await expect(drawer).toBeVisible();
    await drawer.click();
    await expect(drawer).toHaveAttribute('aria-expanded','true');
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveAttribute('aria-expanded','false');
  } else {
    await expect(drawer).toBeHidden();
  }
 }
});
