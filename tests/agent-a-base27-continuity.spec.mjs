import {test,expect} from '@playwright/test';

// BASE #27 A31. Unlike base-legacy-tools-entry, checks actual visible controls
// in all native browsers at four widths; never simulates paid generation.
for(const width of [320,390,768,1448]){
 test('A31 BASE27 usable legacy video controls via Tools at '+width+'px',async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width,height:850});
  const billed=[];
  page.on('request',req=>{
   const path=new URL(req.url()).pathname;
   if(req.method()==='POST'&&/^\/api\/(?:studio\/jobs|ai-billing|billing\/checkout|stripe|generation)/.test(path))
    billed.push(path);
  });
  await page.goto('/free-tools.html');
  const entry=page.locator('.et-showcase .et-uniquifier');
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAttribute('href','index.html');
  await entry.click();
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator('body.vu-reference')).toBeVisible();
  await expect(page.locator('#heroTitle')).toHaveText('Video Uniquifier');
  const modes=page.locator('.vu-mode-card');
  await expect(modes).toHaveCount(3);
  expect(await modes.evaluateAll(els=>els.map(e=>e.dataset.mode)))
   .toEqual(['gentle','balanced','dynamic']);
  for(const value of ['gentle','balanced','dynamic']){
   const button=page.locator('.vu-mode-card[data-mode="'+value+'"]');
   await expect(button).toBeVisible();
   // Plan-disabled choices are visible but must not be force-clicked.
   if(await button.isEnabled()){
    await button.click();
    await expect(page.locator('#mode')).toHaveValue(value);
    await expect(button).toHaveAttribute('aria-pressed','true');
   }
  }
  const vertical=page.locator('.vu-format-button[data-ratio="9:16"]');
  const horizontal=page.locator('.vu-format-button[data-ratio="16:9"]');
  await expect(vertical).toBeVisible();
  await expect(horizontal).toBeVisible();
  await horizontal.click();
  await expect(page.locator('#aspectRatio')).toHaveValue('16:9');
  await expect(horizontal).toHaveAttribute('aria-pressed','true');
  await vertical.click();
  await expect(page.locator('#aspectRatio')).toHaveValue('9:16');
  await expect(vertical).toHaveAttribute('aria-pressed','true');
  const qualityButtons=page.locator('.vu-quality-button');
  await expect(qualityButtons).toHaveCount(3);
  expect(await qualityButtons.evaluateAll(els=>els.map(e=>e.dataset.quality)))
   .toEqual(['720','1080','2160']);
  for(const value of ['720','1080','2160']){
   const button=page.locator('.vu-quality-button[data-quality="'+value+'"]');
   await expect(button).toBeVisible();
   if(await button.isEnabled()){
    await button.click();
    await expect(page.locator('#quality')).toHaveValue(value);
    await expect(button).toHaveAttribute('aria-pressed','true');
   }
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/free-tools\.html$/);
  await expect(page.locator('.et-showcase .et-uniquifier')).toBeVisible();
  expect(billed).toEqual([]);
 });
}
