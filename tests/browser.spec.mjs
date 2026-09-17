import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route(/accounts\.google\.com|appleid\.cdn-apple\.com|unpkg\.com/,route=>route.abort());
  await page.goto('/');
});

test('loads dashboard and credit-based pricing',async({page})=>{
  await expect(page).toHaveTitle(/Video Variator/);
  await expect(page.getByRole('heading',{name:'Dashboard'})).toBeVisible();
  await page.getByRole('button',{name:'Plans'}).click();
  await expect(page.getByText('750',{exact:true})).toBeVisible();
  await expect(page.getByText('2,250',{exact:true})).toBeVisible();
  await expect(page.getByText('15,000',{exact:true})).toBeVisible();
  await expect(page.getByText('1 second of processed output uses one credit.')).toBeVisible();
});

test('supports vertical and landscape output controls',async({page})=>{
  const format=page.locator('#aspectRatio');
  await expect(format).toBeVisible();
  await format.selectOption('16:9');
  await expect(format).toHaveValue('16:9');
  await format.selectOption('9:16');
  await expect(format).toHaveValue('9:16');
  await expect(page.locator('#quality')).toBeVisible();
});

test('analytics and profile views are reachable',async({page})=>{
  await page.getByRole('button',{name:'Analytics'}).click();
  await expect(page.getByRole('heading',{name:'Analytics'})).toBeVisible();
  await page.getByRole('button',{name:'Profile & Settings'}).click();
  await expect(page.getByRole('heading',{name:'Profile & Settings'})).toBeVisible();
  await expect(page.getByText('Privacy & security')).toBeVisible();
});

test('FAQ explains credits, cancellation and privacy',async({page})=>{
  await page.getByRole('button',{name:'FAQ'}).click();
  await expect(page.getByText('How do credits work?')).toBeVisible();
  await expect(page.getByText('Can I cancel my subscription easily?')).toBeVisible();
  await expect(page.getByText('How is my data protected?')).toBeVisible();
});
