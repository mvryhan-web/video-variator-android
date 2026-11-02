import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const manifest=JSON.parse(await readFile(new URL('../app/src/main/assets/approved-design-manifest.json',import.meta.url),'utf8'));
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vu_theme','dark'));
 await page.route('**/api/**',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.fulfill({status:503,json:{error:'NO_SPEND_ACCEPTANCE'}}));
});
test('All 31 original concepts have available images and working screen links',async({page,request})=>{
 await page.goto('/design-gallery.html');await expect(page.locator('article')).toHaveCount(31);
 for(const item of manifest){expect((await request.get('/'+item.image)).status()).toBe(200);expect((await request.get('/'+item.url)).status()).toBe(200);}
 await page.locator('article').nth(29).getByText('Open screen').click();await expect(page.locator('h1')).toHaveText('Owner Admin');
});
test('Studio dialogs, history and prompt survive presentation changes',async({page})=>{
 await page.goto('/generate-studio.html?studio=image');
 await expect(page.locator('.ds-studio-examples')).toHaveCount(0);
 await expect(page.locator('#taskTitle')).toBeVisible();
 await expect(page.locator('#creator')).toBeVisible();
 await page.locator('#modelButton').click();await expect(page.locator('#modelDialog')).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('#settingsButton').click();await expect(page.locator('#settingsDialog')).toBeVisible();await page.locator('[data-close="settingsDialog"]').last().click();
 await page.locator('#prompt').fill('A violet glass garden at sunrise');await page.locator('#consent').check();await expect(page.locator('#generate')).toBeDisabled();
 await page.locator('#showHistory').click();await expect(page.locator('.ds-studio-examples')).toBeHidden();
 await page.locator('#showCreate').click();await expect(page.locator('#prompt')).toHaveValue('A violet glass garden at sunrise');
});
test('App search filters existing templates',async({page})=>{
 await page.goto('/ai-apps.html');await expect(page.locator('#apps .app-card').first()).toBeVisible();
 await page.locator('#search').fill('zzzz-no-template');await expect(page.locator('#apps .app-card')).toHaveCount(0);
 await page.locator('#search').fill('');await expect(page.locator('#apps .app-card').first()).toBeVisible();
});
test('Protected Home has no new presentation script',async({page})=>{
 await page.goto('/deepsyq.html');await expect(page.locator('body')).toHaveClass(/home-neon/);
 await expect(page.locator('#homeHeroCarousel')).toHaveCount(1);await expect(page.locator('script[src="approved-page-design.js"]')).toHaveCount(0);
});
