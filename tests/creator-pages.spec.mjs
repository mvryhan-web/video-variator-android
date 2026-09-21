import {test,expect} from '@playwright/test';

test('tool pages share creator design and link to the actual plans view',async({page})=>{
 for(const path of ['/free-tools.html','/avatar-studio.html']){
  await page.goto(path);await expect(page.locator('html')).toHaveClass(/creator-pages/);
  await expect(page.locator('.cp-hero .cp-lead')).toBeVisible();
  await expect(page.locator('.cp-cta')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.cp-cta a').click();
  await expect(page.locator('#plansView')).toHaveClass(/active/);
  await expect(page.locator('.planBtn[data-plan="lifetime"]')).toHaveText('Get Lifetime');
  await expect(page.locator('.priceCard').first().locator('.price b')).toHaveText('$9');
 }
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
 await page.locator('[data-tool="photo"]').evaluate(e=>e.click());await expect(page.locator('#operation')).toHaveValue('photo');
 await page.screenshot({path:info.outputPath('creator-tools-light.png'),fullPage:true});
});

test('Russian page copy explains avatar support and keeps links functional',async({browser})=>{
 const context=await browser.newContext({locale:'ru-RU'});const page=await context.newPage();
 try{
  await page.goto('http://127.0.0.1:3000/avatar-studio.html');await expect(page.locator('html')).toHaveClass(/creator-pages/);
  await expect(page.locator('.cp-hero')).toContainText('В веб-версии выберите «Мой голос»');
  await expect(page.locator('#avatarGenerate')).toBeDisabled();
  await page.locator('.cp-cta a').click();await expect(page.locator('#plansView')).toHaveClass(/active/);
  await expect(page.locator('.planBtn[data-plan="pro"]')).toHaveText('Выбрать Pro');
 }finally{await context.close();}
});
