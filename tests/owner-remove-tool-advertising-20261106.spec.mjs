import {test,expect} from '@playwright/test';

// Owner 2026-11-06: read-only UX audit, across the same Chromium/WebKit
// desktop and mobile projects. Do not fake user processing or submit purchases.
test('crossed-out Video Uniquifier, Everyday Tools and AI Apps blocks are gone',async({page})=>{
 await page.goto('/index.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.vu-content-grid')).toHaveCount(1);
 await expect(page.locator('.vu-preview')).toHaveCount(0);
 await expect(page.locator('.vu-output')).toHaveCount(1);

 await page.goto('/free-tools.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#etShowcase')).toBeVisible();
 await expect(page.locator('#etGallery .et-card')).toHaveCount(9);
 await expect(page.locator('.et-hero,.free-tools-hero,#toolAccessBanner')).toHaveCount(0);

 for(const mode of ['photo','video','audio','clips','motion','prompter']){
  await page.goto('/free-tools.html?tool='+mode,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#hubTitle')).toBeVisible();
  await expect(page.locator('#etShowcase')).toBeHidden();
  await expect(page.locator('#toolAccessBanner,.free-tools-hero,.et-hero')).toHaveCount(0);
 }
 await page.goto('/audio-studio.html?tool=stt',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#toolAccessBanner')).toHaveCount(0);
 await expect(page.locator('#transcribeFile')).toBeVisible();

 for(const url of ['/mobile-utility.html?tool=scan-pdf','/smart-reminders.html','/photo-collage.html']){
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#toolAccessBanner,.et-hero')).toHaveCount(0);
 }
 await page.goto('/ai-apps.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#apps')).toBeVisible();
 await expect(page.locator('.filters,#search,#type,#category,#clearFilters')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth))
  .toBeLessThanOrEqual(1);
});
