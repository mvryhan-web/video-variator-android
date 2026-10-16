import {test,expect} from '@playwright/test';

test('BASE #29 AI Apps Billing and Settings open the existing account screen instead of fake pages',async({page})=>{
 let writes=0;
 page.on('request',r=>{if(['POST','PATCH','DELETE'].includes(r.method())&&r.url().includes('/api/'))writes++;});
 await page.goto('/ai-apps.html');
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 const billing=nav.getByRole('link',{name:/Billing in existing/});
 const settings=nav.getByRole('link',{name:/Account Settings in existing/});
 await expect(billing).toHaveAttribute('href','index.html#profile');
 await expect(settings).toHaveAttribute('href','index.html#profile');
 await expect(nav.locator('#appsLogout')).toBeHidden();
 await billing.click();
 await expect(page).toHaveURL(/\/index\.html#profile$/);
 await expect(page.locator('#profileView')).toBeVisible();
 await expect(page.locator('#manageBillingBtn')).toBeAttached();
 expect(writes).toBe(0);
});

test('BASE #29 authenticated Logout clears existing token and returns Home without any generation',async({page})=>{
 await page.goto('/ai-apps.html');
 await page.evaluate(()=>localStorage.setItem('vv_token','synthetic-account-navigation-test'));
 let posted=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\//.test(r.url()))posted++;});
 await page.reload();
 const logout=page.getByRole('button',{name:'Log out'});
 await expect(logout).toBeVisible();
 await logout.click();
 await expect(page).toHaveURL(/\/deepsyq\.html$/);
 expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBeNull();
 expect(posted).toBe(0);
});

test('BASE #29 account navigation remains reachable on 320px and 390px phones',async({page})=>{
 for(const width of [320,390]){
  await page.setViewportSize({width,height:812});
  await page.goto('/ai-apps.html');
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  const settings=nav.getByRole('link',{name:/Account Settings in existing/});
  await settings.scrollIntoViewIfNeeded();
  await expect(settings).toBeVisible();
  expect(await settings.evaluate(e=>e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
