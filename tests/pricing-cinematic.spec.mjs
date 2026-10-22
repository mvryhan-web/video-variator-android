import {test,expect} from '@playwright/test';
for(const width of [320,390,768,1440]){
 test('Pricing visual and safe navigation at '+width+'px',async({page},info)=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/ai-pricing.html');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Make room foryour next idea.');
  const art=page.locator('.pricing-visual img');
  await expect(art).toBeVisible();
  await expect.poll(()=>art.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const hero=page.locator('.pricing-intro');
  expect(await hero.evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Inter');
  await expect(page.locator('#trialOffer button')).toBeDisabled();
  await page.getByRole('link',{name:'Explore plans',exact:false}).click();
  await expect(page).toHaveURL(/#toolPlans$/);
  await page.getByRole('link',{name:'Explore AI credits',exact:true}).click();
  await expect(page).toHaveURL(/#aiCreditSection$/);
  await page.goto('/ai-pricing.html');
  await page.screenshot({path:info.outputPath('pricing-'+width+'.png'),fullPage:true});
 });
}
