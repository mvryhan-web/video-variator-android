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


test('BASE #29 Canvas link opens actual Home draft, not mistaken Image Studio',async({page})=>{
 let paidWrites=0;
 page.on('request',request=>{
  if(request.method()==='POST'&&/\/api\/(?:studio\/jobs|speech|billing|payments)/.test(new URL(request.url()).pathname))paidWrites++;
 });
 await page.goto('/ai-apps.html');
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 const canvas=nav.getByRole('link',{name:'Canvas',exact:true});
 await expect(canvas).toHaveAttribute('href','canvas.html');
 await canvas.click();
 await expect(page).toHaveURL(/\/canvas\.html$/);
 await expect(page.locator('#quickCreateForm')).toBeAttached();
 await expect(page.locator('#quickCreatePrompt')).toBeAttached();
 expect(paidWrites).toBe(0);
});

test('BASE #29 AI Agents link leads to honest coming-soon section, never fake paid generation',async({page})=>{
 let paidWrites=0;
 page.on('request',request=>{
  if(request.method()==='POST'&&/\/api\/(?:studio\/jobs|speech|billing|payments)/.test(new URL(request.url()).pathname))paidWrites++;
 });
 await page.goto('/ai-apps.html');
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 const agents=nav.getByRole('link',{name:'AI Agents — coming soon'});
 await expect(agents).toHaveAttribute('href','deepsyq.html#agentFeature');
 await agents.click();
 await expect(page).toHaveURL(/\/deepsyq\.html#agentFeature$/);
 const panel=page.locator('#agentFeature');
 await expect(panel).toContainText(/COMING SOON|In development/i);
 await expect(panel).toContainText(/Agent execution is (?:still under development|in development)/);
 expect(paidWrites).toBe(0);
});

test('BASE #29 all seven main destinations remain discoverable at narrow mobile widths',async({page})=>{
 for(const width of [320,390]){
  await page.setViewportSize({width,height:812});
  await page.goto('/ai-apps.html');
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  for(const name of ['Home','Canvas','AI Apps','Inspiration','Tools','Pricing']){
   await expect(nav.getByRole('link',{name,exact:true})).toHaveCount(1);
  }
  await expect(nav.getByRole('link',{name:'AI Agents — coming soon'})).toHaveCount(1);
  await expect(nav.getByRole('link',{name:'My Creations',exact:true})).toHaveCount(1);
  await expect(nav.getByRole('link',{name:'History',exact:true})).toHaveCount(1);
  await expect(nav.getByRole('link',{name:'Billing in existing Profile and Settings'})).toHaveCount(1);
  await expect(nav.getByRole('link',{name:'Account Settings in existing Profile'})).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});


test('BASE #29 My Creations opens existing Home Recent creations, not a fake library',async({page})=>{
 let paidWrites=0;
 page.on('request',r=>{
  if(r.method()==='POST'&&['/api/studio/jobs','/api/speech','/api/billing','/api/payments'].some(s=>new URL(r.url()).pathname.startsWith(s)))paidWrites++;
 });
 await page.goto('/ai-apps.html');
 const link=page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'My Creations',exact:true});
 await expect(link).toHaveAttribute('href','generate-studio.html?view=history');
 await link.click();
 await expect(page).toHaveURL(/\/generate-studio\.html\?view=history$/);
 await expect(page.locator('#showHistory')).toHaveAttribute('aria-pressed','true');
 expect(paidWrites).toBe(0);
});

test('BASE #29 History opens existing Studio history with real filter controls',async({page})=>{
 let paidWrites=0;
 page.on('request',r=>{
  if(r.method()==='POST'&&['/api/studio/jobs','/api/speech','/api/billing','/api/payments'].some(s=>new URL(r.url()).pathname.startsWith(s)))paidWrites++;
 });
 await page.goto('/ai-apps.html');
 const link=page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'History',exact:true});
 await expect(link).toHaveAttribute('href','generate-studio.html?view=history');
 await link.click();
 await expect(page).toHaveURL(/\/generate-studio\.html\?/);
 await expect.poll(()=>page.evaluate(()=>new URL(location.href).searchParams.get('view'))).toBe('history');
 await expect(page.locator('#showHistory')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#historyFilters')).toBeVisible();
 expect(paidWrites).toBe(0);
});
