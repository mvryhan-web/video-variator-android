import {test,expect} from '@playwright/test';

test('BASE #27 Tools has a real link to the existing Video Uniquifier without replacing its modes',async({page})=>{
 let paidPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&(/\/api\/studio\/jobs|\/api\/ai-billing|\/api\/stripe/.test(r.url())))paidPosts++;});
 await page.goto('/free-tools.html');
 const link=page.locator('[data-legacy-tool=video-uniquifier]');
 await expect(link).toHaveCount(1);
 await expect(link).toBeVisible();
 await expect(link).toHaveAttribute('href','index.html');
 await expect(link).toContainText('Video Uniquifier');
 await expect(page.locator('[data-hub-tool]')).toHaveCount(8);
 await link.click();
 await expect(page).toHaveURL(/\/index\.html$/);
 await expect(page).toHaveTitle(/Video Uniquifier/);
 await expect(page.locator('#fileInput')).toHaveAttribute('accept','video/*');
 await expect(page.locator('#mode option')).toHaveCount(3);
 const modes=await page.locator('#mode option').evaluateAll(els=>els.map(e=>e.value));
 expect(modes).toEqual(['gentle','balanced','dynamic']);
 expect(paidPosts).toBe(0);
 await page.goBack();
 await expect(page.locator('[data-legacy-tool=video-uniquifier]')).toBeVisible();
});

test('BASE #27 Video Uniquifier entry stays visible and reachable on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/free-tools.html');
 const link=page.locator('[data-legacy-tool=video-uniquifier]');
 await expect(link).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await link.click();
 await expect(page).toHaveURL(/\/index\.html$/);
 await expect(page.locator('#mode')).toBeAttached();
});

test('BASE #27 Tools label is localized without altering legacy editor',async({browser})=>{
 const context=await browser.newContext({locale:'ru-RU'});
 try{
  const page=await context.newPage();
  await page.goto('/free-tools.html');
  const link=page.locator('[data-legacy-tool=video-uniquifier]');
  await expect(link).toContainText('Уникализация видео');
  await link.click();
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator('#mode option')).toHaveCount(3);
 }finally{await context.close();}
});
