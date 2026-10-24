import {test,expect} from '@playwright/test';

test('BASE #28: each free utility is shown once, including real Photo Compression entry',async({page})=>{
 let paidRequests=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|billing|ai-wallet)/.test(r.url()))paidRequests++;});
 await page.goto('/free-tools.html');
 const tiles=page.locator('#mobileUtilityGrid a[data-utility]');
 await expect(tiles).toHaveCount(19); // 17 catalog entries incl. Video Compression + Teleprompter and Collage
 const destinations=await tiles.evaluateAll(items=>items.map(item=>item.getAttribute('href')));
 expect(new Set(destinations).size).toBe(destinations.length);
 const videoCompress=page.locator('#mobileUtilityGrid a[data-utility="video-compress"]');
 await expect(videoCompress).toHaveCount(1);
 await expect(videoCompress).toHaveAttribute('href','mobile-utility.html?tool=video-compress');
 const compress=page.locator('#mobileUtilityGrid a[data-utility="photo-compress"]');
 await expect(compress).toHaveCount(1);
 await expect(compress).toHaveAttribute('href','mobile-utility.html?tool=photo-compress');
 await expect(compress).toContainText('Compress');
 await compress.click();
 await expect(page).toHaveURL(/mobile-utility\.html\?tool=photo-compress$/);
 await expect(page.locator('#compressQuality')).toBeVisible();
 expect(paidRequests).toBe(0);
});
