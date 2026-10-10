import {test,expect} from '@playwright/test';

test('Avatar keeps creator styling and fits quality, files and voice choices into compact rows',async({page})=>{
 await page.goto('/avatar-studio.html');
 await expect(page.locator('html')).toHaveClass(/creator-pages/);
 await expect(page.locator('.cp-hero .cp-lead')).toBeVisible();
 await expect(page.locator('.avatar-workflow-step')).toHaveCount(3);
 await expect(page.locator('.cp-quality')).toHaveCount(0); // no duplicate oversized quality cards
 const qualities=page.locator('.avatar-quality-option');
 await expect(qualities).toHaveCount(3);
 await expect(page.locator('.voice-source-choice .voice-source-card')).toHaveCount(3);
 const aligned=async(selector)=>{
  const tops=await page.locator(selector).evaluateAll(els=>els.map(el=>el.getBoundingClientRect().top));
  expect(Math.max(...tops)-Math.min(...tops)).toBeLessThan(4);
 };
 await aligned('.avatar-quality-option');
 await aligned('.compact-upload-grid>label');
 await aligned('.voice-source-choice .voice-source-card');
 await qualities.nth(2).click();await expect(page.locator('#avatarOutputQuality')).toHaveValue('2160');
 await expect(qualities.nth(2)).toHaveAttribute('aria-pressed','true');
 await page.reload();
 await expect(page.locator('#avatarOutputQuality')).toHaveValue('2160');
 await expect(page.locator('.avatar-quality-option').nth(2)).toHaveAttribute('aria-pressed','true');
 const mouth=page.locator('details.motion-settings');
 await expect(mouth).not.toHaveAttribute('open','');
 await mouth.locator('summary').click();await expect(mouth).toHaveAttribute('open','');
 await expect(page.locator('#mouthWidth')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('secondary pages retain controls and readable light-theme layout',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('vu_theme','light'));
 await page.goto('/index.html#history');await expect(page.locator('html')).toHaveClass(/creator-pages/);
 await expect(page.locator('#historyView')).toHaveClass(/active/);
 await page.locator('#historyEmpty .cp-action').click();await expect(page.locator('#dashboardView')).toHaveClass(/active/);
 for(const view of ['history','analytics','profile','faq']){
  await page.goto('/index.html#'+view);await expect(page.locator('#'+view+'View')).toHaveClass(/active/);
  await expect(page.locator('#'+view+'View .cp-lead')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.getByText('How do credits work?',{exact:true}).click();await expect(page.locator('details[open]')).toContainText('30 credits');
 await page.screenshot({path:info.outputPath('creator-faq-light.png'),fullPage:true});
 await page.goto('/free-tools.html');await expect(page.locator('html')).toHaveClass(/creator-pages/);
 await page.locator('[data-hub-tool="photo"]').evaluate(e=>e.click());await expect(page.locator('#operation')).toHaveValue('photo');
 await page.screenshot({path:info.outputPath('creator-tools-light.png'),fullPage:true});
});

test('Russian page copy explains avatar support and keeps links functional',async({browser})=>{
 const context=await browser.newContext({locale:'ru-RU'});const page=await context.newPage();
 try{
  await page.goto('http://127.0.0.1:3000/avatar-studio.html');await expect(page.locator('html')).toHaveClass(/creator-pages/);
  await expect(page.locator('.cp-hero')).toContainText('В Telegram и браузере');
  await expect(page.locator('.avatar-workflow')).toContainText('Голос + текст');
  await expect(page.locator('#avatarGenerate')).toBeDisabled();
  await expect(page.locator('.avatar-quality-option')).toHaveCount(3);
  await page.locator('header .tool-back').click();
  await expect(page.locator('#dashboardView')).toHaveClass(/active/);
 }finally{await context.close();}
});
