import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('**/api/auth/email/status',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({supported:true,configured:true})}));
  await page.route(/accounts\.google\.com|appleid\.cdn-apple\.com|unpkg\.com/,route=>route.abort());
  await page.goto('/');
});

test('email authentication is available and Apple is removed',async({page})=>{
  await page.locator('#signInBtn').click();
  await expect(page.locator('#authModal')).toBeVisible();
  await expect(page.locator('#emailAuthForm')).toBeVisible();
  await expect(page.locator('#emailAuthEmail')).toBeVisible();
  await expect(page.locator('#emailAuthPassword')).toBeVisible();
  await expect(page.locator('#appleButton')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/create an account/i})).toBeVisible();
});

test('email registration mode exposes optional name field',async({page})=>{
  await page.locator('#signInBtn').click();
  await page.locator('#emailAuthToggle').click();
  await expect(page.locator('#emailNameLabel')).toBeVisible();
  await expect(page.locator('#emailAuthPassword')).toHaveAttribute('autocomplete','new-password');
});

test('email auth status reports capability and storage configuration',async({request})=>{
  const response=await request.get('/api/auth/email/status');
  expect(response.status()).toBe(200);
  const status=await response.json();
  expect(status.supported).toBe(true);
  expect(status.configured).toBe(false);
});
