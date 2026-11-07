import {test,expect} from '@playwright/test';
test('Video Uniquifier processing remains available without its old commercial chrome',async({page})=>{
 await page.goto('/index.html');
 await expect(page.locator('body.vu-reference')).toBeVisible();
 await expect(page.locator('#heroTitle')).toHaveText('Video Uniquifier');
 await expect(page.locator('.hero #heroTitle ~ p')).toHaveCount(0);
 await expect(page.locator('.workspace .sectionHead .workspaceEyebrow')).toHaveCount(0);
 await expect(page.locator('.vu-mode-card')).toHaveCount(3);
 await expect(page.locator('.vu-mode-copy small')).toHaveCount(0);
 // The new owner rule explicitly decommissions old Video Uniquifier marketing navigation.
 await expect(page.locator('.vu-appbar,.vu-side-nav,.vu-upgrade')).toHaveCount(0);
 await expect(page.locator('.ds-platform-header')).toBeVisible();
 await expect(page.locator('#dsSiteSidebar')).toHaveCount(1);
 await expect(page.locator('#fileInput,#variantCount,#mode,#aspectRatio,#quality')).toHaveCount(5);
 await expect(page.locator('#startBtn')).toHaveCount(1);
});
test('portrait/landscape glyphs respond to actual format changes',async({page})=>{
 await page.goto('/index.html');
 const portrait=page.locator('.vu-format-button[data-ratio="9:16"]');
 const landscape=page.locator('.vu-format-button[data-ratio="16:9"]');
 await expect(portrait.locator('.vu-ratio-portrait')).toBeVisible();
 await expect(landscape.locator('.vu-ratio-landscape')).toBeVisible();
 await expect(portrait).toHaveAttribute('aria-pressed','true');
 await landscape.click();
 await expect(page.locator('#aspectRatio')).toHaveValue('16:9');
 await expect(landscape).toHaveAttribute('aria-pressed','true');
 await portrait.click();
 await expect(page.locator('#aspectRatio')).toHaveValue('9:16');
 await expect(portrait).toHaveAttribute('aria-pressed','true');
});
test('DEEPSYQ Pricing opens from one platform header instead of old VU Upgrade card',async({page})=>{
 const checkoutPosts=[];
 page.on('request',request=>{
  const path=new URL(request.url()).pathname;
  if(request.method()==='POST'&&path.includes('checkout')&&(path.startsWith('/api/ai-billing/')||path.startsWith('/api/billing/')))checkoutPosts.push(request.url());
 });
 await page.goto('/index.html');
 await expect(page.locator('.vu-upgrade,.vu-appbar')).toHaveCount(0);
 const pricing=page.locator('.ds-platform-header #topPricing');
 await expect(pricing).toBeVisible();
 await pricing.click();
 await page.waitForURL(url=>new URL(url).pathname==='/pricing.html');
 await expect(page.locator('#pricingTitle')).toHaveText('Power Your Creativity');
 await expect(page.locator('#planCards')).toContainText('Basic');
 await expect(page.locator('#creditCards .price-credit-card')).toHaveCount(5);
 expect(checkoutPosts).toEqual([]);
});
