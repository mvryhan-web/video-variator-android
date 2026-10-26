import {test,expect} from '@playwright/test';
test('Video Uniquifier owner cleanup removes only small decorative labels',async({page})=>{
 await page.goto('/index.html');
 await expect(page.locator('body.vu-reference')).toBeVisible();
 await expect(page.locator('#heroTitle')).toHaveText('Video Uniquifier');
 await expect(page.locator('.hero #heroTitle ~ p')).toHaveCount(0);
 await expect(page.locator('.workspace .sectionHead .workspaceEyebrow')).toHaveCount(0);
 await expect(page.locator('.vu-mode-card')).toHaveCount(3);
 await expect(page.locator('.vu-mode-copy small')).toHaveCount(0);
 await expect(page.locator('.vu-preview .vu-panel-head h3')).toHaveText('Example preview');
 await expect(page.locator('.vu-preview .vu-panel-head p')).toHaveCount(0);
 await expect(page.locator('.vu-upgrade .vu-upgrade-content small')).toHaveCount(0);
 await expect(page.locator('.vu-upgrade .vu-upgrade-art')).toHaveCount(0);
 await expect(page.locator('.vu-upgrade')).toContainText('Upgrade to');
 await expect(page.locator('.vu-upgrade')).toContainText('Upgrade Now');
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
test('upgrade card is still a functional link to real plan selection',async({page})=>{
 await page.goto('/index.html');
 if((page.viewportSize()?.width||1448)<900)await page.locator('.vu-nav-toggle').click();
 await expect(page.locator('.vu-upgrade')).toBeVisible();
 await page.locator('.vu-upgrade').click();
 await expect(page.locator('#plansView')).toBeVisible();
});
