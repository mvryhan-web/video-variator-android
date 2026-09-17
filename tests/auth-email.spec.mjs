import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route(/accounts\.google\.com|appleid\.cdn-apple\.com|unpkg\.com/,route=>route.abort());
  await page.goto('/');
});

test('email authentication is available and Apple is hidden',async({page})=>{
  await page.locator('#signInBtn').click();
  await expect(page.locator('#authModal')).toBeVisible();
  await expect(page.locator('#emailAuthForm')).toBeVisible();
  await expect(page.locator('#emailAuthEmail')).toBeVisible();
  await expect(page.locator('#emailAuthPassword')).toBeVisible();
  await expect(page.locator('#appleButton')).toBeHidden();
  await expect(page.getByRole('button',{name:/create an account/i})).toBeVisible();
});

test('email registration mode exposes optional name field',async({page})=>{
  await page.locator('#signInBtn').click();
  await page.locator('#emailAuthToggle').click();
  await expect(page.locator('#emailNameLabel')).toBeVisible();
  await expect(page.locator('#emailAuthPassword')).toHaveAttribute('autocomplete','new-password');
});

test('public config advertises built-in email auth',async({request})=>{
  const response=await request.get('/api/config');
  expect(response.status()).toBe(200);
  const config=await response.json();
  expect(config.emailAuth).toBe(true);
});
