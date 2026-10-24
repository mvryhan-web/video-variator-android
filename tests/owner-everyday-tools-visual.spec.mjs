import {test,expect} from '@playwright/test';

test('owner Everyday Tools landing: exactly nine live destinations, sidebar and approved art',async({page})=>{
 const paid=[];page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio|billing|generate|ai-wallet)/.test(r.url()))paid.push(r.url());});
 const r=await page.goto('/free-tools.html');expect(r.status()).toBe(200);
 await expect(page.locator('#etShowcase')).toBeVisible();
 await expect(page.locator('#etGallery .et-card')).toHaveCount(9);
 await expect(page.locator('#etShowcase .et-hero h1')).toHaveText('Everyday Tools');
 await expect(page.locator('.ds-site-caption').filter({hasText:'Everyday Tools'})).toHaveCount(1);
 await expect(page.locator('#etGallery .et-card').first()).toContainText('Compress Photos');
 // Reference layout: 19 standard cards, one separate wide Background Remover, two wide speech tiles.
 await expect(page.locator('#mobileUtilityGrid a.et-photo-card')).toHaveCount(19);
 await expect(page.locator('.utility-tools-preview a.et-owner-bg-banner')).toHaveCount(1);
 await expect(page.locator('.utility-tools-preview .et-owner-voices a.et-owner-voice-card')).toHaveCount(2);
 await expect(page.locator('#etShowcase .et-uniquifier')).toHaveAttribute('href','index.html');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 expect(paid).toEqual([]);
});
test('owner Everyday Tools filter and native file workflow preserve working processors',async({page})=>{
 await page.goto('/free-tools.html');
 await page.locator('.et-search').fill('collage');
 await expect(page.locator('#etGallery .et-card:visible')).toHaveCount(1);
 await page.locator('.et-search').fill('');
 await page.locator('.et-picker').selectOption('audio');
 await expect(page.locator('#etGallery .et-card:visible')).toHaveCount(1);
 await page.locator('.et-picker').selectOption('all');
 await page.locator('#etGallery .et-card').first().click();
 await expect(page).toHaveURL(/free-tools\.html\?tool=photo$/);
 await expect(page.locator('#files')).toBeVisible();
 await expect(page.locator('#etShowcase')).toBeHidden();
 await page.locator('#hubBack').click();
 await expect(page.locator('#etShowcase')).toBeVisible();
 await expect(page.locator('#etGallery .et-card')).toHaveCount(9);
});
test('owner Everyday Tools routes all target existing unmodified tools',async({page})=>{
 await page.goto('/free-tools.html');
 const urls=await page.locator('#etGallery .et-card').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
 expect(urls).toEqual(['?tool=photo','?tool=video','?tool=audio','mobile-utility.html?tool=scan-pdf','photo-collage.html','simple-background-remover.html','?tool=prompter','smart-reminders.html','avatar-studio.html']);
 await page.locator('#etGallery .et-card').nth(3).click();
 await expect(page).toHaveURL(/mobile-utility\.html\?tool=scan-pdf$/);
});
