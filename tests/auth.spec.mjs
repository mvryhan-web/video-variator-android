import {test,expect} from '@playwright/test';

test('configuration reports missing authentication prerequisites without secrets',async({request})=>{
  const response=await request.get('/api/config');
  expect(response.status()).toBe(200);
  const config=await response.json();
  expect(config.authentication).toEqual({googleConfigured:false,appleConfigured:false,databaseConfigured:false,sessionConfigured:true});
  expect(JSON.stringify(config)).not.toMatch(/test-only-secret|PRIVATE KEY|postgres:\/\//);
  expect(response.headers()['cache-control']).toContain('no-store');
  const health=await request.get('/api/health');
  expect((await health.json()).databaseConfigured).toBe(false);
});

test('unconfigured providers and invalid sessions fail closed',async({request})=>{
  for(const provider of ['google','apple']){
    const response=await request.post(`/api/auth/${provider}`,{data:{credential:'forged',idToken:'forged',user:{email:'admin@example.test'}}});
    expect(response.status()).toBe(503);
  }
  expect((await request.get('/api/me',{headers:{Authorization:'Bearer forged'}})).status()).toBe(401);
});

const user={id:'test-user',email:'test@example.test',name:'Test User',usage:{plan:'trial',limit:2,used:0,remaining:2,active:false,unit:'videos'}};
async function prepare(page){
  await page.route(/accounts\.google\.com|appleid\.cdn-apple\.com|unpkg\.com/,r=>r.abort());
  await page.addInitScript(()=>localStorage.setItem('vv_token','test-session'));
}

test('restores account and clears session on logout',async({page})=>{
  await prepare(page);
  await page.route('**/api/me',r=>r.fulfill({json:{user}}));
  await page.goto('/');
  await expect(page.locator('#signInBtn')).toHaveText('Sign out');
  await page.locator('#signInBtn').click();
  await expect(page.locator('#signInBtn')).toHaveText('Sign in');
  expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBeNull();
});

test('temporary server failure does not discard saved login',async({page})=>{
  await prepare(page);
  await page.route('**/api/me',r=>r.fulfill({status:503,json:{error:'TEMPORARILY_UNAVAILABLE'}}));
  const response=page.waitForResponse('**/api/me');
  await page.goto('/');await response;
  await expect(page.locator('#signInBtn')).toHaveText('Sign in');
  expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBe('test-session');
});

test('expired session is discarded',async({page})=>{
  await prepare(page);
  await page.route('**/api/me',r=>r.fulfill({status:401,json:{error:'INVALID_SESSION'}}));
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('vv_token'))).toBeNull();
});

test('sign-in dialog fits viewport and declares iOS standalone support',async({page})=>{
  await page.route(/accounts\.google\.com|appleid\.cdn-apple\.com|unpkg\.com/,r=>r.abort());
  await page.goto('/');
  await page.locator('#signInBtn').click();
  await expect(page.locator('.authCard')).toBeVisible();
  const fits=await page.locator('.authCard').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});
  expect(fits).toBe(true);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content','yes');
});
