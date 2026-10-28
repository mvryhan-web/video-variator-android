import {test,expect} from '@playwright/test';

// Real local express routes in Chromium/WebKit, zero external paid services.
// The old Pricing redirect remains navigable but never an indexed destination.
const host='https://video-variator-android.onrender.com';
test('canonical Pricing, legacy redirects, robots privacy and noindex AI Apps at mobile and desktop widths',async({page})=>{
 test.setTimeout(120000);
 const forbidden=[];
 page.on('request',req=>{
  const pathname=new URL(req.url()).pathname;
  if(req.method()==='POST'&&/^\/api\/(?:studio\/jobs|billing|ai-billing|ai-wallet|payments|ai-provider)(?:\/|$)/.test(pathname))
   forbidden.push(req.url());
 });
 for(const width of [320,1448]){
  await page.setViewportSize({width,height:820});
  await page.goto('/pricing.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',host+'/pricing.html');
  await expect(page.locator('title')).toHaveText('Pricing | Deepsyq');
  await page.goto('/ai-pricing.html?utm_source=seo-test#aiCreditSection',{waitUntil:'domcontentloaded'});
  await expect(page).toHaveURL(/\/pricing\.html\?utm_source=seo-test#credits$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',host+'/pricing.html');
  await page.goto('/ai-apps.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,follow');
  const old=await page.request.get('/product-video.html');
  expect(old.status()).toBe(404);
 }
 const sitemap=await page.request.get('/sitemap.xml');
 expect(sitemap.status()).toBe(200);
 const xml=await sitemap.text();
 expect(xml).toContain(host+'/pricing.html');
 expect(xml).not.toContain('/ai-pricing.html');
 expect(xml).not.toContain('/ai-apps.html');
 const robots=await page.request.get('/robots.txt');
 expect(robots.status()).toBe(200);
 const rules=await robots.text();
 expect(rules).toContain('Disallow: /api/');
 expect(rules).toContain('Disallow: /deepsyq-admin.html');
 expect(forbidden).toEqual([]);
});
