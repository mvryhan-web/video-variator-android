import {test,expect} from '@playwright/test';

async function openView(page,name){
  await page.locator(`.navBtn[data-view="${name}"]`).evaluate(el=>el.click());
  await expect(page.locator(`#${name}View`)).toHaveClass(/active/);
}

test.beforeEach(async({page})=>{
  await page.route(/accounts\.google\.com|appleid\.cdn-apple\.com|unpkg\.com/,route=>route.abort());
  await page.goto('/');
});

test('loads dashboard with zero of two free trial videos',async({page})=>{
  await expect(page).toHaveTitle(/Video Variator/);
  await expect(page.getByRole('heading',{name:'Dashboard'})).toBeVisible();
  await expect(page.locator('#creditText')).toHaveText('0 / 2');
  await expect(page.getByText('Уникализирай своё старое видео')).toBeVisible();
});

test('trial uses Gentle and 720p and has no folder picker',async({page})=>{
  await expect(page.locator('#folderBtn')).toHaveCount(0);
  await expect(page.locator('#mode')).toHaveValue('gentle');
  await expect(page.locator('#quality')).toHaveValue('720');
  await expect(page.locator('#quality')).toBeDisabled();
  await expect(page.locator('#mode option[value="balanced"]')).toHaveAttribute('disabled','');
  await expect(page.locator('#mode option[value="dynamic"]')).toHaveAttribute('disabled','');
});

test('pricing displays credits plan access and quality',async({page})=>{
  await openView(page,'plans');
  await expect(page.getByText('750',{exact:true})).toBeVisible();
  await expect(page.getByText('2,250',{exact:true})).toBeVisible();
  await expect(page.getByText('15,000',{exact:true})).toBeVisible();
  await expect(page.getByText('Gentle mode · 720p · 9:16 / 16:9')).toBeVisible();
  await expect(page.getByText('Gentle + Balance · 1080p · 9:16 / 16:9')).toBeVisible();
  await expect(page.getByText('All modes · 4K · 9:16 / 16:9')).toBeVisible();
});

test('supports vertical and landscape output controls',async({page})=>{
  const format=page.locator('#aspectRatio');
  await expect(format).toBeVisible();
  await format.selectOption('16:9');
  await expect(format).toHaveValue('16:9');
  await format.selectOption('9:16');
  await expect(format).toHaveValue('9:16');
});

test('analytics profile error handling and FAQ are reachable',async({page})=>{
  await openView(page,'analytics');
  await expect(page.locator('#analyticsView').getByRole('heading',{name:'Analytics'})).toBeVisible();
  await openView(page,'profile');
  await expect(page.locator('#profileView').getByRole('heading',{name:'Profile & Settings'})).toBeVisible();
  await expect(page.getByText('Privacy & security')).toBeVisible();
  await expect(page.getByRole('button',{name:'Cancel subscription'})).toBeVisible();
  await openView(page,'faq');
  await expect(page.getByText('How do credits work?')).toBeVisible();
  await expect(page.getByText('What processing modes are included?')).toBeVisible();
  await expect(page.getByText('How is my data protected?')).toBeVisible();
});
