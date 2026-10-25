import {test,expect} from '@playwright/test';

const model={
 id:'original-extremely-long-model-name-token-'.repeat(4),
 label:'Owned Original Creative Model Name Without Spaces'.replaceAll(' ',''),
 provider:'configured-provider',
 kind:'image',
 enabled:false,
 control:{enabledOverride:null,priority:100,markupBps:null,internalCostMicros:null,maintenance:false}
};
test('BASE #38 owner Admin is usable at 320/390px without page overflow or enabling paid models',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','synthetic-owner-dashboard-session'));
 await page.route('**/api/studio/admin/**',route=>route.fulfill({status:503,json:{error:'OWNER_TEST_UNAVAILABLE'}}));
 await page.route('**/api/studio/admin/models',route=>route.fulfill({json:{items:[model]}}));
 await page.route('**/api/me',route=>route.fulfill({json:{user:{id:'synthetic-test',isAdmin:true}}}));
 let writes=0;
 page.on('request',r=>{if(['POST','PATCH','DELETE'].includes(r.method()))writes++;});
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:850});
  await page.goto('/deepsyq-admin.html');
  await expect(page.locator('#models article')).toHaveCount(1);
  const result=await page.locator('#models article').evaluate(card=>{
   const rect=card.getBoundingClientRect();
   const title=card.querySelector('.card-head strong').getBoundingClientRect();
   const state=card.querySelector('.state').getBoundingClientRect();
   return {card:{left:rect.left,right:rect.right},titleRight:title.right,stateRight:state.right};
  });
  expect(result.titleRight).toBeLessThanOrEqual(result.card.right+1);
  expect(result.stateRight).toBeLessThanOrEqual(result.card.right+1);
  const overflow=await page.evaluate(()=>{
    const viewport=innerWidth;
    const offenders=[...document.querySelectorAll('body *')].filter(el=>!el.closest('.table-wrap,.ds-section-nav')&&!el.ownerSVGElement).map(el=>{
      const r=el.getBoundingClientRect();
      return {element:el.tagName.toLowerCase()+(el.id?'#'+el.id:el.className&&typeof el.className==='string'?'.'+el.className.split(' ').slice(0,2).join('.'):''),
        right:Math.round(r.right),left:Math.round(r.left),width:Math.round(r.width)};
    }).filter(item=>item.right>viewport+1||item.left< -1).slice(0,25);
    const scrollers=[document.documentElement,document.body,...document.querySelectorAll('body *')].filter(el=>!el.closest?.('.table-wrap')&&el.scrollWidth>el.clientWidth+1).map(el=>({element:el.tagName.toLowerCase()+(el.id?'#'+el.id:el.className&&typeof el.className==='string'?'.'+el.className.split(' ').slice(0,2).join('.'):''),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overflowX:getComputedStyle(el).overflowX})).slice(0,18);
    return {width:viewport,document:document.documentElement.scrollWidth,offenders,scrollers};
  });
  expect(overflow,'Overflow diagnostics for admin '+width+'px: '+JSON.stringify(overflow)).toMatchObject({width,document:width,offenders:[]});
  // The approved section strip intentionally scrolls. Verify its viewport and
  // every destination rather than treating clipped offscreen links as page overflow.
  const sectionNav=page.locator('.ds-section-nav');
  const navBox=await sectionNav.boundingBox();
  expect(navBox.x).toBeGreaterThanOrEqual(0);
  expect(navBox.x+navBox.width).toBeLessThanOrEqual(width+1);
  for(const link of await sectionNav.locator('a').all()){
   await link.scrollIntoViewIfNeeded();
   const box=await link.boundingBox();
   expect(box.x).toBeGreaterThanOrEqual(navBox.x-1);
   expect(box.x+box.width).toBeLessThanOrEqual(navBox.x+navBox.width+1);
   const href=await link.getAttribute('href');
   expect(await page.locator(href).count()).toBe(1);
  }
  const controlOverflow=await page.locator('.controls label,.template-form label.check').evaluateAll(labels=>
   labels.filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>({text:el.textContent,scroll:el.scrollWidth,width:el.clientWidth})));
  expect(controlOverflow).toEqual([]);
  const availability=page.locator('#models .controls select');
  await availability.selectOption('off');await expect(availability).toHaveValue('off');
  await availability.selectOption('inherit');await expect(availability).toHaveValue('inherit');
  await expect(page.locator('#models article button',{hasText:'Save'})).toBeVisible();
  await expect(page.locator('#templateCreate')).toBeVisible();
  await expect(page.locator('#creditAdjustForm')).toBeVisible();
  await page.screenshot({path:info.outputPath('owner-admin-'+width+'.png'),fullPage:true});
 }
 expect(writes).toBe(0);
});
test('BASE #38 missing owner session does not make unauthorized owner API requests',async({page})=>{
 let adminRequests=0;
 page.on('request',r=>{if(r.url().includes('/api/studio/admin/'))adminRequests++;});
 await page.goto('/deepsyq-admin.html');
 await expect(page.locator('#modelStatus')).toContainText('Sign in with the owner account first');
 expect(adminRequests).toBe(0);
});
