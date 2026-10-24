import {test,expect} from '@playwright/test';

test('Retired Product Video paths return 404, not SPA Home or a generated form',async({page})=>{
 for(const path of ['/product-video.html','/product-video']){
  const response=await page.request.get(path);
  expect(response.status(),path).toBe(404);
 }
});

test('Home and secondary navigation do not expose retired Product Video',async({page})=>{
 await page.goto('/deepsyq.html');
 await expect(page.locator('#homeHeroCarousel')).toHaveCount(1);
 await expect(page.locator('a[href*="product-video"],[data-feature="productVideo"],[data-home-idea="product"]')).toHaveCount(0);
 await page.goto('/generate-studio.html?studio=video');
 await expect(page.locator('#dsSiteSidebar')).toHaveCount(1);
 await expect(page.locator('a[href*="product-video"]')).toHaveCount(0);
 await expect(page.locator('#prompt')).toBeVisible();
 await expect(page.locator('#generate')).toHaveCount(1);
});

test('AI Apps offers only current navigation when no templates exist',async({page})=>{
 await page.route('**/api/templates',route=>route.fulfill({json:{items:[]}}));
 await page.goto('/ai-apps.html');
 await expect(page.locator('.app-card')).toHaveCount(0);
 await expect(page.locator('a[href*="product-video"]')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Open Image Studio'})).toBeVisible();
});

test('Legacy Product Video type from API cannot become an active AI Apps card',async({page})=>{
 await page.route('**/api/templates',route=>route.fulfill({json:{items:[
  {id:'retired',title:'Discontinued workflow',generationType:'product_video',promptTemplate:'Retired'},
  {id:'ok',title:'Normal Video',generationType:'video',promptTemplate:'An original short film'}
 ]}}));
 await page.goto('/ai-apps.html');
 await expect(page.locator('.app-card')).toHaveCount(1);
 await expect(page.locator('.app-card')).toContainText('Normal Video');
 await expect(page.locator('#apps')).not.toContainText('Discontinued workflow');
});
