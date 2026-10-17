import {test,expect} from '@playwright/test';

test('BASE #20: prepared Etsy brief uses exact product photos without provider submissions',async({page})=>{
 let jobPosts=0;
 page.on('request',req=>{if(req.method()==='POST'&&/\/api\/studio\/jobs/.test(req.url()))jobPosts++;});
 await page.goto('/product-video.html');
 await expect(page.locator('#continue')).toBeVisible();
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 await page.locator('#photos').setInputFiles([{name:'actual-product.png',mimeType:'image/png',buffer:png}]);
 await page.locator('#productName').fill('Holiday sweater printed graphic');
 await page.locator('#ratio').selectOption('1:1');
 await page.locator('#style').selectOption('lifestyle');
 await page.locator('#duration').selectOption('about 8 seconds');
 const prompt=await page.locator('#promptPreview').inputValue();
 expect(prompt).toContain('EXACT product');
 expect(prompt).toContain('ONLY source of truth');
 expect(prompt).toContain('PRINT ON FABRIC');
 expect(prompt).toContain('OMIT any unseen back');
 expect(prompt).toContain('No stock substitute');
 expect(prompt).toContain('Frame: 1:1');
 expect(prompt).toContain('Duration preference: about 8 seconds');
 expect(prompt).toContain('Holiday sweater printed graphic');
 expect(prompt.length).toBeLessThanOrEqual(2000);
 await expect(page.locator('#photoPreview img')).toHaveCount(1);
 expect(jobPosts).toBe(0);
});

test('BASE #20: local prompt preview does not fake a generation when no reference exists',async({page})=>{
 await page.goto('/product-video.html');
 await page.locator('#continue').click();
 await expect(page.locator('#status')).toContainText('Add at least one product photo first');
 await expect(page).toHaveURL(/product-video\.html$/);
});
