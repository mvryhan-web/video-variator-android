import {test,expect} from '@playwright/test';
for(const width of [320,390,768,1440]){
 test('legacy Pricing deep links resolve to the single approved page at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/ai-pricing.html#toolPlans');
  await expect(page).toHaveURL(/\/pricing\.html#plans$/);
  await expect(page.locator('#pricingTitle')).toHaveText('Power Your Creativity');
  await expect(page.locator('#planCards .price-plan')).toHaveCount(5);
  await page.goto('/ai-pricing.html#aiCreditSection');
  await expect(page).toHaveURL(/\/pricing\.html#credits$/);
  await expect(page.locator('#creditCards .price-credit-card')).toHaveCount(5);
  await page.goto('/ai-pricing.html#walletSection');
  await expect(page).toHaveURL(/\/pricing\.html#wallet$/);
  await expect(page.locator('#walletHeading')).toHaveText('Your AI credits');
  await expect(page.locator('#walletSection')).toBeHidden();
  await expect(page.locator('#walletSignIn')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}
