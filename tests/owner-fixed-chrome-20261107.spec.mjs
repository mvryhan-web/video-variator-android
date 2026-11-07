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


test('stage04 sidebar icons remain identical and never revert to font glyphs across pages and widths',async({page})=>{
 test.setTimeout(110000);
 await page.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
 let paid=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio\/jobs|payments|stripe)\b/.test(r.url()))paid++;});
 const expected=new Map([
  ['deepsyq.html','home'],
  ['generate-studio.html?studio=image','image'],
  ['generate-studio.html?studio=video','video'],
  ['generate-studio.html?studio=audio','audio'],
  ['ai-apps.html','apps'],['canvas.html','canvas'],
  ['free-tools.html','tools'],['index.html','legacy'],
  ['my-creations.html','history'],['pricing.html','pricing']
 ]);
 const signatures=[];
 for(const width of [1365,390]){
  await page.setViewportSize({width,height:844});
  for(const route of ['deepsyq.html','ai-apps.html','canvas.html','my-creations.html','generate-studio.html?studio=image','pricing.html']){
   await page.goto('/'+route,{waitUntil:'domcontentloaded'});
   await expect.poll(()=>page.evaluate(()=>document.body.dataset.mobileShell),{timeout:9000}).toBe('ready');
   const nav=page.locator(route==='deepsyq.html'?'#sidebar nav':'#dsSiteSidebar nav');
   await expect(nav).toHaveCount(1);
   const state=await nav.evaluate(el=>Array.from(el.querySelectorAll('a[href]')).flatMap(a=>{
    const key=a.querySelector(':scope > [data-canonical-icon]');
    return key?[{href:a.getAttribute('href'),key:key.dataset.canonicalIcon,
      svg:key.querySelector('svg')?.outerHTML||'',text:a.textContent?.trim()}]:[];
   }));
   for(const [href,key] of expected){
    const matching=state.filter(x=>x.href===href);
    expect(matching.length,route+' missing or duplicated '+href).toBe(1);
    expect(matching[0].key,route+' changed icon '+href).toBe(key);
    expect(matching[0].svg,route+' icon is not SVG '+href).toContain('<svg');
   }
   expect(await nav.locator('a').filter({hasText:/^Assets$/i}).count()).toBe(0);
   const fingerprint=state.filter(x=>expected.has(x.href))
     .map(x=>[x.href,x.key,x.svg.replace(/ data-[^=]+="[^"]+"/g,'')]);
   if(signatures.length)expect(fingerprint).toEqual(signatures[0]);
   else signatures.push(fingerprint);
  }
 }
 expect(paid).toBe(0);
});
