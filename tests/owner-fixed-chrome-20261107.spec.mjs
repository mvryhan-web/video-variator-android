import {test,expect} from '@playwright/test';

// Scope: positioning only. It must not modify or replace the owner's buttons,
// icon markup, pricing/user balance, Jarvix actions or user-generated work.
const pages=[
 'deepsyq.html',
 'generate-studio.html?studio=image',
 'generate-studio.html?studio=video',
 'generate-studio.html?studio=audio',
 'ai-apps.html','canvas.html','pricing.html','my-creations.html','free-tools.html'
];
for(const [label,width,height] of [['desktop',1365,900],['mobile',390,844]]){
 test('owner pinned chrome persists on main routes — '+label,async({page})=>{
  test.setTimeout(150000);
  await page.setViewportSize({width,height});
  await page.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
  let paid=0;
  page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio\/jobs|payments|stripe)\b/.test(r.url()))paid++;});
  for(const path of pages){
   await page.goto('/'+path,{waitUntil:'domcontentloaded'});
   await expect.poll(()=>page.evaluate(()=>document.body.dataset.mobileShell),{timeout:10000}).toBe('ready');
   const header=page.locator('header.ds-stable-header').first();
   const sidebar=page.locator('#sidebar.ds-stable-sidebar,#dsSiteSidebar.ds-stable-sidebar').first();
   await expect(header,path+' missing shared pinned header').toHaveCount(1);
   await expect(sidebar,path+' missing fixed sidebar').toHaveCount(1);
   await expect(header).toBeVisible();

   await page.evaluate(()=>{
    if(!document.getElementById('pinTestSpacer')){
     const spacer=document.createElement('div');spacer.id='pinTestSpacer';
     spacer.style.cssText='height:1500px;pointer-events:none;visibility:hidden';
     document.body.append(spacer);
    }
    window.scrollTo(0,650);
   });
   await page.waitForTimeout(90);
   const metrics=await header.evaluate(el=>{
    const r=el.getBoundingClientRect(),sidebar=document.querySelector('#sidebar.ds-stable-sidebar,#dsSiteSidebar.ds-stable-sidebar');
    const s=sidebar?.getBoundingClientRect();
    return {position:getComputedStyle(el).position,top:r.top,bottom:r.bottom,width:r.width,sidebarPosition:sidebar&&getComputedStyle(sidebar).position,sidebarTop:s?.top,scrollY:window.scrollY};
   });
   // Some routes scroll inside their own container rather than window (notably
   // Pricing / Library in mobile WebKit). A genuinely viewport-fixed header is
   // required independent of the scroll container, so assert its geometry.
   expect(metrics.position,'header must stay viewport-fixed on '+path).toBe('fixed');
   expect(Math.abs(metrics.top),'header scrolled out of view on '+path).toBeLessThanOrEqual(3);
   expect(metrics.bottom,'header too small/hidden on '+path).toBeGreaterThan(30);
   expect(metrics.sidebarPosition,'sidebar not fixed on '+path).toBe('fixed');
   expect(Math.abs(metrics.sidebarTop),'sidebar moved on '+path).toBeLessThanOrEqual(3);
   await page.evaluate(()=>window.scrollTo(0,0));
  }
  expect(paid).toBe(0);
 });
}


test('mobile header reference: orb centered, brand centered, login above action row, no clipping',async({page})=>{
 test.setTimeout(90000);
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});
  for(const route of ['deepsyq.html','generate-studio.html?studio=image','pricing.html']){
   await page.goto('/'+route,{waitUntil:'domcontentloaded'});
   await expect.poll(()=>page.evaluate(()=>document.body.dataset.mobileShell),{timeout:9000}).toBe('ready');
   const result=await page.evaluate(()=>{
    const rect=selector=>{const x=document.querySelector(selector)?.getBoundingClientRect();return x?{left:x.left,right:x.right,top:x.top,bottom:x.bottom,width:x.width,height:x.height,center:(x.left+x.right)/2}:null;};
    return {width:innerWidth,logo:rect('.ds-mobile-brand'),orb:rect('#topJarvisBtn'),login:rect('#topLogin'),header:rect('header.ds-mobile-header'),controls:rect('.ds-mobile-controls'),overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   expect(result.logo,route+' logo missing').toBeTruthy();
   expect(result.orb,route+' orb missing').toBeTruthy();
   expect(Math.abs(result.logo.center-width/2),route+' brand off center').toBeLessThanOrEqual(3);
   expect(Math.abs(result.orb.center-width/2),route+' JARVIX off center').toBeLessThanOrEqual(3);
   expect(result.login.top,route+' login moved into lower row').toBeLessThan(56);
   expect(result.login.right,route+' login overflows right edge').toBeLessThanOrEqual(width+1);
   expect(result.header.top,route+' header not fixed at top').toBeGreaterThanOrEqual(-2);
   expect(result.header.bottom,route+' header clipped').toBeGreaterThan(105);
   expect(result.overflow,route+' document horizontal overflow').toBe(false);
  }
 }
});
