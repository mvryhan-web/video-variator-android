import {test,expect} from '@playwright/test';
test('BASE #28 Teleprompter scrolls owner text locally and supports pause/reset on phones',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++});
 await page.goto('/free-tools.html');
 await expect(page.locator('[data-utility=teleprompter]')).toBeVisible();
 await page.locator('[data-utility=teleprompter]').click();
 await expect(page).toHaveURL(/\/teleprompter\.html$/);
 await page.locator('#teleScript').fill(('My original product video speech.\n').repeat(80));
 await expect(page.locator('#telePreview')).toContainText('My original product video speech.');
 await page.locator('#teleSize').evaluate(el=>{el.value='48';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(page.locator('#telePreview')).toHaveCSS('font-size','48px');
 await page.locator('#teleSpeed').evaluate(el=>{el.value='120';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#telePlay').click();
 await expect(page.locator('#telePlay')).toContainText(/Pause|Пауза|Pause/);
 await expect.poll(()=>page.locator('#teleViewport').evaluate(e=>e.scrollTop),{timeout:4000}).toBeGreaterThan(5);
 await page.locator('#telePlay').click();
 await expect(page.locator('#telePlay')).toContainText(/Start|Начать|Démarrer|Почати/);
 await page.locator('#teleReset').click();
 expect(await page.locator('#teleViewport').evaluate(e=>e.scrollTop)).toBe(0);
 expect(posts).toBe(0);
});
test('Teleprompter keeps text escaped and does not run markup',async({page})=>{
 await page.goto('/teleprompter.html');
 await page.locator('#teleScript').fill('<img src=x onerror=alert(1)>');
 await expect(page.locator('#telePreview')).toContainText('<img src=x');
 await expect(page.locator('#telePreview img')).toHaveCount(0);
});
