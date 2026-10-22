import {test,expect} from '@playwright/test';
for(const width of [320,390,768,1440]){
 test('Pricing visual and safe navigation at '+width+'px',async({page},info)=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/ai-pricing.html');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Choose your creative plan.');
  await expect(page.getByRole('navigation',{name:'Pricing sections'})).toBeVisible();
  await expect(page.locator('#toolPlans')).toBeVisible();
  await expect(page.locator('#toolPlans .price-card')).toHaveCount(4);
  if(width===1440)await expect.poll(()=>page.locator('#lifetimePlan').evaluate(el=>getComputedStyle(el).gridColumn)).toBe('auto');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const hero=page.locator('.pricing-intro');
  expect(await hero.evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Inter');
  await expect(page.locator('#trialOffer button')).toBeDisabled();
  await page.getByRole('link',{name:'Lifetime',exact:true}).click();
  await expect(page).toHaveURL(/#lifetimePlan$/);
  await page.getByRole('link',{name:'AI credits',exact:true}).click();
  await expect(page).toHaveURL(/#aiCreditSection$/);
  await page.goto('/ai-pricing.html');
  await page.screenshot({path:info.outputPath('pricing-'+width+'.png'),fullPage:true});
 });
}
