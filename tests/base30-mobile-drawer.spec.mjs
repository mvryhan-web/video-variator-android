import {test,expect} from '@playwright/test';

async function prepare(page){
 await page.route('**/api/config',route=>route.fulfill({json:{
  plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}},
  googleClientId:'',billingConfigured:false,features:{aiApps:false,inspiration:false,productVideo:false,onboarding:false}
 }}));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/auth/email/status',route=>route.fulfill({json:{configured:false}}));
}

test('BASE #30: real mobile opener, scrollable owned drawer, Escape, outside tap and focus recovery at 320/390px',async({page},info)=>{
 test.skip(!info.project.name.startsWith('mobile-'),'mobile viewport only');
 await prepare(page);
 let paidCalls=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|billing\/checkout|ai-wallet)/.test(r.url()))paidCalls++;});
 for(const width of [320,390]){
  await page.setViewportSize({width,height:780});
  await page.goto('/deepsyq.html');
  const menu=page.locator('#menu'),sidebar=page.locator('#sidebar');
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded','false');
  await expect(sidebar).toHaveJSProperty('inert',true);
  await menu.click();
  await expect(page.locator('body')).toHaveClass(/menu-open/);
  await expect(menu).toHaveAttribute('aria-expanded','true');
  await expect(sidebar.locator('#sidebarToggle')).toHaveAttribute('aria-expanded','true');
  await expect(sidebar).toHaveJSProperty('inert',false);
  // Wait for the actual 150ms mobile drawer transition, never assume the
  // layout has finished immediately after aria-expanded changes.
  await expect.poll(()=>sidebar.evaluate(el=>el.getBoundingClientRect().left)).toBeGreaterThanOrEqual(-1);
  const rect=await sidebar.evaluate(el=>{
   const r=el.getBoundingClientRect();return {left:r.left,right:r.right,viewport:innerWidth,
    scrollable:el.scrollHeight>el.clientHeight,overflow:getComputedStyle(el).overflowY};
  });
  expect(rect.left).toBeGreaterThanOrEqual(-1);
  expect(rect.right).toBeLessThanOrEqual(rect.viewport+1);
  expect(rect.overflow).toBe('auto');
  // A sticky header or language picker must not intercept the real drawer
  // close button; previous mobile Chromium/WebKit CI failed on this.
  const drawerClose=sidebar.locator('#sidebarToggle');
  const hitTarget=await drawerClose.evaluate(button=>{
   const r=button.getBoundingClientRect();
   const center=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
   return center===button||button.contains(center);
  });
  expect(hitTarget,'The open drawer close button must receive pointer input').toBe(true);
  await drawerClose.click();
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  await expect(menu).toBeFocused();
  await expect(sidebar).toHaveJSProperty('inert',true);
  await menu.click();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded','false');
  await expect(menu).toBeFocused();
  await menu.click();
  // Tap an uncovered point to the right of the 240px mobile drawer.
  await page.mouse.click(width-12,140);
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  await expect(sidebar).toHaveJSProperty('inert',true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 expect(paidCalls).toBe(0);
});

test('BASE #30: mobile account and owner navigation are reachable through visible drawer',async({page},info)=>{
 test.skip(!info.project.name.startsWith('mobile-'),'mobile viewport only');
 await prepare(page);
 await page.goto('/deepsyq.html');
 await page.locator('#menu').click();
 await page.locator('#accountButton').click();
 await expect(page.locator('#authModal')).toBeVisible();
 await expect(page.locator('body')).not.toHaveClass(/menu-open/);
 await expect(page.locator('#menu')).toHaveAttribute('aria-expanded','false');
 await page.locator('#authModal .modalClose').click();
 await expect(page.locator('#menu')).toBeFocused();
 await page.route('**/api/me',route=>route.fulfill({json:{user:{id:'owner-fixture',name:'Owner',isAdmin:true}}}));
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-only-token'));
 await page.reload();
 await page.locator('#menu').click();
 await expect(page.locator('#adminAiControl')).toBeVisible();
 await page.locator('#adminAiControl').click();
 await expect(page).toHaveURL(/deepsyq-admin\.html/);
});

test('BASE #30: header Log in opens existing auth even while mobile sidebar is inert',async({page},info)=>{
 test.skip(!info.project.name.startsWith('mobile-'),'mobile viewport only');
 await prepare(page);
 await page.goto('/deepsyq.html');
 await expect(page.locator('#sidebar')).toHaveJSProperty('inert',true);
 await page.locator('#topLogin').click();
 await expect(page.locator('#authModal')).toBeVisible();
 await expect(page.locator('#authModal')).toContainText('Sign in to your account');
 await expect(page.locator('body')).not.toHaveClass(/menu-open/);
 await page.locator('#authModal .modalClose').click();
 await expect(page.locator('#authModal')).toBeHidden();
});

test('BASE #30: mobile share is reachable after scrolling the actual drawer',async({page},info)=>{
 test.skip(!info.project.name.startsWith('mobile-'),'mobile viewport only');
 await prepare(page);
 // Browser-native share sheets are not automation targets. Exercise the real
 // fallback copy-link UI instead, without contacting any social service.
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});
 });
 await page.goto('/deepsyq.html');
 await page.locator('#menu').click();
 await expect(page.locator('.sidebar-social [data-social=x]')).toBeVisible();
 await page.locator('#navShare').click();
 await expect(page.locator('#navShareStatus')).not.toBeEmpty();
 await expect(page.locator('#menu')).toHaveAttribute('aria-expanded','true');
});

test('BASE #30: desktop retains original rail collapse and stays keyboard accessible',async({page},info)=>{
 test.skip(info.project.name.startsWith('mobile-'),'desktop only');
 await prepare(page);
 await page.goto('/deepsyq.html');
 const rail=page.locator('#sidebar');
 await expect(rail).toHaveJSProperty('inert',false);
 await rail.locator('#sidebarToggle').click();
 await expect(page.locator('body')).toHaveClass(/sidebar-collapsed/);
 await expect(rail).toHaveJSProperty('inert',false);
 await page.locator('#menu').click();
 await expect(page.locator('body')).not.toHaveClass(/sidebar-collapsed/);
 await expect(rail.locator('a[aria-label="Video Uniquifier"]')).toBeVisible();
});
