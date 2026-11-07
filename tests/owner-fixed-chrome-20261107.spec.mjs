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


test('stage03 existing mobile account button has one stable selector on every shared page',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
 for(const route of ['deepsyq.html','generate-studio.html?studio=image','pricing.html','my-creations.html','ai-apps.html']){
  await page.goto('/'+route,{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>document.body.dataset.mobileShell),{timeout:9000}).toBe('ready');
  const login=page.locator('#topLogin');
  await expect(login,route+' missing canonical account control').toHaveCount(1);
  await expect(login,route+' account control not visible').toBeVisible();
  expect(await login.evaluate(e=>e.tagName),route).toMatch(/^(A|BUTTON)$/);
  const bounds=await login.boundingBox();
  expect(bounds.x,route+' login off left').toBeGreaterThanOrEqual(0);
  expect(bounds.x+bounds.width,route+' login off right').toBeLessThanOrEqual(391);
 }
});

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


test('stage05 mobile drawer preserves canonical icons, ordering, routes and close behavior',async({page})=>{
 test.setTimeout(120000);
 await page.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
 let paid=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio\/jobs|payments|stripe)\b/.test(r.url()))paid++;});
 const expected=[
  ['generate-studio.html?studio=image','image'],
  ['generate-studio.html?studio=video','video'],
  ['generate-studio.html?studio=audio','audio'],
  ['ai-apps.html','apps'],['canvas.html','canvas'],
  ['free-tools.html','tools'],['index.html','legacy'],
  ['my-creations.html','history']
 ];
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});
  for(const route of ['deepsyq.html','ai-apps.html','pricing.html','generate-studio.html?studio=image']){
   await page.goto('/'+route,{waitUntil:'domcontentloaded'});
   await expect.poll(()=>page.evaluate(()=>document.body.dataset.mobileShell),{timeout:9000}).toBe('ready');
   const toggle=page.locator('.ds-mobile-menu');
   await expect(toggle).toBeVisible();
   await expect(toggle).toHaveAttribute('aria-expanded','false');
   await toggle.click();
   await expect(page.locator('body')).toHaveClass(/ds-mobile-drawer-open/);
   await expect(toggle).toHaveAttribute('aria-expanded','true');
   const drawer=page.locator(route==='deepsyq.html'?'#sidebar':'#dsSiteSidebar');
   await expect(drawer).toBeVisible();
   const entries=await drawer.locator('nav a[href]').evaluateAll(nodes=>nodes.flatMap(a=>{
    const svg=a.querySelector(':scope > [data-canonical-icon] svg');
    if(!svg)return [];
    return [{href:a.getAttribute('href'),icon:a.querySelector(':scope > [data-canonical-icon]')?.dataset.canonicalIcon}];
   }));
   const filtered=entries.filter(e=>expected.some(([href])=>href===e.href));
   expect(filtered,route+' mobile icon order').toEqual(expected.map(([href,icon])=>({href,icon})));
   await expect(drawer.getByRole('link',{name:'Assets',exact:true})).toHaveCount(0);
   const close=page.locator('.ds-mobile-dismiss');
   await expect(close).toBeVisible();
   await close.click({position:{x:Math.min(width-20,Math.ceil(width*.75)),y:330}});
   await expect(page.locator('body')).not.toHaveClass(/ds-mobile-drawer-open/);
   await expect(toggle).toHaveAttribute('aria-expanded','false');
  }
 }
 expect(paid).toBe(0);
});


test('stage06 composer uses stable icons and preserves existing image mode and actions',async({page})=>{
 test.setTimeout(120000);
 await page.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
 let paid=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio\/jobs|payments|stripe)\b/.test(r.url()))paid++;});
 for(const width of [390,1365]){
  await page.setViewportSize({width,height:900});
  for(const route of ['deepsyq.html','generate-studio.html?studio=image']){
   await page.goto('/'+route,{waitUntil:'domcontentloaded'});
   const rail=page.locator('.j-mode-rail').first();
   await expect(rail,route+' lower creation modes missing').toHaveCount(1);
   const controls=await rail.locator('a').evaluateAll(nodes=>nodes.map(a=>({
    label:a.textContent.trim(),href:a.getAttribute('href'),
    icon:a.querySelector('.j-rail-icon svg')?.outerHTML||''
   })));
   for(const [label,href] of [
    ['Image','generate-studio.html?studio=image'],
    ['Video','generate-studio.html?studio=video'],
    ['Audio','generate-studio.html?studio=audio'],
    ['Tools','free-tools.html'],
    ['Video Uniquifier','index.html']]){
    const matching=controls.filter(x=>x.label===label);
    expect(matching.length,route+' duplicate/missing '+label).toBe(1);
    expect(matching[0].href).toBe(href);
    expect(matching[0].icon,route+' font-dependent '+label).toContain('<svg');
   }
   expect(controls.filter(x=>x.label.includes('JARVIX')).length).toBe(1);
   if(route==='deepsyq.html'){
    await expect(page.locator('.j-attach-shortcut').first()).toHaveCount(1);
    await expect(page.locator('.j-settings-shortcut').first()).toHaveCount(1);
    const shortcut=page.locator('.j-image-shortcut');
    await expect(shortcut).toHaveCount(1);
    await shortcut.click();
    await expect(page.locator('#jPlusMenu [data-j-mode="image"]')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#jPlusMenu')).toBeHidden();
    await expect(page.locator('#jPlus')).toHaveText('I');
   }
  }
 }
 expect(paid).toBe(0);
});


test('stage07 approved JARVIX orb reused in header, nav and composer without duplicate controls',async({page})=>{
 test.setTimeout(120000);
 await page.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
 let paid=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio\/jobs|payments|stripe)\b/.test(r.url()))paid++;});
 for(const width of [390,1365]){
  await page.setViewportSize({width,height:900});
  for(const route of ['deepsyq.html','generate-studio.html?studio=image','my-creations.html']){
   await page.goto('/'+route,{waitUntil:'domcontentloaded'});
   const top=page.locator('#topJarvisBtn');
   await expect(top).toHaveCount(1);
   const photo=top.locator('.jarvis-mini-orb.jv-owner-photo-test');
   await expect(photo).toHaveCount(1);
   await expect(photo.locator('.jv-owner-upload-orb')).toHaveCount(5);
   await expect(top.locator('svg.ds-reference-orb')).toHaveCount(0);
   await expect(top.locator('.jarvis-ring:visible')).toHaveCount(0);
   await expect.poll(()=>photo.locator('.jv-owner-layer-base').evaluate(node=>node.complete&&node.naturalWidth===1254)).toBe(true);
   const rail=page.locator('.j-mode-rail');
   if(await rail.count()){
    const jarvix=rail.locator('a[href="jarvix-chat.html"]');
    await expect(jarvix).toHaveCount(1);
    await expect(jarvix.locator('.jv-owner-photo-test > .jv-owner-layer-base')).toHaveCount(1);
    await expect(jarvix).toContainText('JARVIX');
   }
   const nav=page.locator('.ds-site-jarvix-btn .jv-owner-photo-test > .jv-owner-layer-base, #sidebar .nav-entry .jv-owner-photo-test > .jv-owner-layer-base');
   if(await page.locator('.ds-site-jarvix-btn,#sidebar .nav-entry a[aria-label="JARVIX"]').count())await expect(nav.first()).toBeAttached();
   expect(await page.locator('#topJarvisBtn').count()).toBe(1);
  }
 }
 expect(paid).toBe(0);
});


test('owner original-photo cyan clockwise, pink counterclockwise, inner orbits upward, halo breathing and stable size',async({page})=>{
 test.setTimeout(90000);
 await page.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
 let paid=0;
 page.on('request',r=>{if(r.method()==='POST'&&['/api/studio/jobs','/api/payments','/api/stripe'].some(path=>r.url().includes(path)))paid++;});
 for(const width of [390,1365]){
  await page.setViewportSize({width,height:900});
  await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
  const orb=page.locator('#topJarvisBtn .jarvis-mini-orb.jv-owner-photo-test');
  await expect(orb).toHaveCount(1);
  const metrics=await orb.evaluate(el=>{
   const css=part=>getComputedStyle(el.querySelector('.jv-owner-layer-'+part));
   const shell=el.getBoundingClientRect(),button=el.closest('#topJarvisBtn').getBoundingClientRect();
   return {cyan:css('cyan').animationName,pink:css('pink').animationName,
    blue:css('inner').animationName,orange:css('orange').animationName,
    halo:css('base').animationName,haloDuration:css('base').animationDuration,
    baseFilter:css('base').filter,legacySvg:el.querySelectorAll('svg.ds-reference-orb').length,
    pseudoBefore:getComputedStyle(el,'::before').content,
    shell:{width:shell.width,height:shell.height},button:{width:button.width,height:button.height}};
  });
  expect(metrics.cyan).toContain('jv-photo-cyan-clockwise');
  expect(metrics.pink).toContain('jv-photo-pink-counterclockwise');
  expect(metrics.blue).toContain('jv-photo-blue-orbits-up');
  expect(metrics.orange).toContain('jv-photo-original-orange-flow');
  expect(metrics.halo).toContain('jv-photo-original-halo-breath');
  expect(metrics.haloDuration).toBe('5s');
  expect(metrics.baseFilter).toBe('none');
  expect(metrics.legacySvg).toBe(0);
  expect(metrics.pseudoBefore).toBe('none');
  const original=await orb.locator('.jv-owner-layer-cyan').evaluate(el=>getComputedStyle(el).transform);
  await page.waitForTimeout(650);
  const next=await orb.locator('.jv-owner-layer-cyan').evaluate(el=>getComputedStyle(el).transform);
  expect(next).not.toBe(original);
  const later=await orb.evaluate(el=>{const r=el.getBoundingClientRect(),b=el.closest('#topJarvisBtn').getBoundingClientRect();return {shell:{width:r.width,height:r.height},button:{width:b.width,height:b.height}};});
  expect(later.shell.width).toBeCloseTo(metrics.shell.width,1);
  expect(later.shell.height).toBeCloseTo(metrics.shell.height,1);
  expect(later.button.width).toBeCloseTo(metrics.button.width,1);
  expect(later.button.height).toBeCloseTo(metrics.button.height,1);
 }
 expect(paid).toBe(0);
});


test('owner-uploaded JARVIX sphere is the only orb art across TEST pages',async({page})=>{
 test.setTimeout(120000);
 await page.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
 let paid=0;
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))paid++;});
 for(const width of [390,1365]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/deepsyq.html','/generate-studio.html?studio=image','/jarvix-chat.html']){
   await page.goto(route,{waitUntil:'domcontentloaded'});
   const headerOrb=page.locator('#topJarvisBtn .jv-approved-orb').first();
   await expect(headerOrb).toHaveCount(1);
   const photo=headerOrb.locator('img.jv-owner-layer-base');
   await expect(photo).toHaveCount(1);
   await expect.poll(()=>photo.evaluate(img=>img.complete&&img.naturalWidth===1254&&img.naturalHeight===1254),{timeout:25000}).toBe(true);
   await expect.poll(()=>headerOrb.evaluate(el=>el.classList.contains('jv-owner-photo-test'))).toBe(true);
   await expect(headerOrb.locator('svg.ds-reference-orb')).toHaveCount(0);
   await expect(headerOrb.locator('img.jv-owner-upload-orb')).toHaveCount(5);
   const mask=await photo.evaluate(img=>getComputedStyle(img).maskImage);
   expect(mask).toContain('radial-gradient');
   const src=await photo.getAttribute('src');
   expect(src).toContain('/760ea0b9-ba7d-4982-97f2-9bb59a6b0979.png');
   await expect.poll(()=>page.evaluate(()=>[...document.querySelectorAll('.jarvis-mini-orb.jv-approved-orb')]
     .every(el=>el.querySelector('img.jv-owner-upload-orb')))).toBe(true);
  }
 }
 expect(paid).toBe(0);
});

test('owner JARVIX shows no rejected sphere at all when owner image fails',async({page})=>{
 test.setTimeout(60000);
 await page.route('**/760ea0b9-ba7d-4982-97f2-9bb59a6b0979.png',route=>route.abort('failed'));
 for(const width of [390,1365]){
  await page.setViewportSize({width,height:900});
  await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
  const orb=page.locator('#topJarvisBtn .jarvis-mini-orb.jv-approved-orb').first();
  await expect(orb).toHaveCount(1);
  await expect.poll(()=>orb.evaluate(el=>el.classList.contains('jv-owner-photo-unavailable'))).toBe(true);
  await expect(orb.locator('svg, .ds-reference-orb, .jarvis-core, .jarvis-ring, .jv-owner-upload-orb')).toHaveCount(0);
  const pseudo=await orb.evaluate(el=>getComputedStyle(el,'::before').content);
  expect(pseudo).toBe('none');
 }
});

test('owner image module contains no legacy SVG builder or fallback',async({page})=>{
 const response=await page.request.get('/jarvix-approved-orb.js');
 expect(response.ok()).toBe(true);
 const moduleSource=await response.text();
 expect(moduleSource).not.toContain('function createOrbSvg');
 expect(moduleSource).not.toContain('slot.append(createOrbSvg');
 expect(moduleSource).toContain("const parts=['base','inner','cyan','orange','pink']");
});

test('JARVIX removes any late-injected old orb nodes without touching owner image or controls',async({page})=>{
 test.setTimeout(60000);
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 const orb=page.locator('#topJarvisBtn .jarvis-mini-orb.jv-approved-orb').first();
 await expect.poll(()=>orb.evaluate(el=>el.classList.contains('jv-owner-photo-test'))).toBe(true);
 await page.evaluate(()=>{
  const slot=document.querySelector('#topJarvisBtn .jarvis-mini-orb');
  const oldSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  oldSvg.classList.add('ds-reference-orb');
  slot.append(oldSvg);
  for(const name of ['jarvis-core','jarvis-ring']){
   const el=document.createElement('span');el.className=name;slot.append(el);
  }
 });
 await expect(orb.locator('svg, .ds-reference-orb, .jarvis-core, .jarvis-ring')).toHaveCount(0);
 await expect(orb.locator('.jv-owner-upload-orb')).toHaveCount(5);
 await expect(page.locator('#topJarvisBtn')).toHaveCount(1);
});


test('owner JARVIX original sphere has no outer football-shaped pseudo overlay',async({page})=>{
 test.setTimeout(60000);
 const css=await page.request.get('/jarvix-action-design.css');
 expect(css.ok()).toBe(true);
 expect(await css.text()).not.toContain('body.j-action-workspace #topJarvisBtn::after{display:block');
 for(const width of [390,1365]){
  await page.setViewportSize({width,height:900});
  await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
  const orb=page.locator('#topJarvisBtn');
  await expect(orb).toHaveCount(1);
  await expect.poll(()=>orb.evaluate(el=>getComputedStyle(el,'::after').display)).toBe('none');
  await expect.poll(()=>orb.locator('.jv-owner-photo-test').count()).toBe(1);
  await expect(orb.locator('svg.ds-reference-orb, .jarvis-ring')).toHaveCount(0);
 }
});


test('Video Uniquifier runs only inside DEEPSYQ shell; old menus and sales bar stay suppressed',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:1365,height:900});
 await page.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
 let paid=0;
 page.on('request',r=>{if(r.method()==='POST'&&['/api/studio/jobs','/api/payments','/api/stripe'].some(p=>r.url().includes(p)))paid++;});
 await page.goto('/index.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('body.ds-embedded-uniquifier')).toHaveCount(1);
 await expect(page.locator('.ds-platform-header #topJarvisBtn')).toHaveCount(1);
 await expect(page.locator('#dsSiteSidebar nav a[href="index.html"]')).toHaveCount(1);
 await expect(page.locator('.ds-platform-header .ds-header-tools')).toContainText('Everyday Tools');
 await expect(page.locator('.ds-platform-header .ds-header-tour')).toHaveCount(1);
 await expect(page.locator('.ds-platform-header .ds-header-credit')).toHaveCount(1);
 await expect(page.locator('.ds-platform-header #topPricing')).toHaveAttribute('href','pricing.html');
 await expect(page.locator('.ds-platform-header #topLogin')).toHaveCount(1);
 await expect(page.locator('.ds-platform-header #homeLanguage')).toHaveCount(1);
 await expect(page.locator('.vu-appbar,.vu-side-nav,.vu-upgrade')).toHaveCount(0);
 await expect(page.locator('.shell>.sidebar')).toBeHidden();
 await expect(page.locator('.shell>.main>.topbar')).toBeHidden();
 // The owner's original VIDEO workspace visuals must remain, even though the
 // standalone video's marketing/navigation chrome is permanently retired.
 await expect(page.locator('#dashboardView>.hero')).toBeVisible();
 await expect(page.locator('#dashboardView .vu-hero-image')).toHaveCount(1);
 await expect(page.locator('#dashboardView .vu-hero-films')).toHaveCount(1);
 // Standalone VU stats are intentionally hidden by the approved VU reference.
 await expect(page.locator('#dashboardView>.statsGrid')).toBeHidden();
 await expect(page.locator('#dashboardView>.vu-how')).toBeVisible();
 await expect(page.locator('#dashboardView .vu-content-grid')).toBeVisible();
 await expect(page.locator('#dashboardView .vu-film img')).toHaveCount(3);
 await expect(page.locator('#dashboardView .vu-output')).toHaveCount(1);
 await expect(page.locator('#fileInput')).toHaveCount(1);
 await expect(page.locator('#variantCount')).toHaveCount(1);
 await expect(page.locator('#mode')).toHaveCount(1);
 await expect(page.locator('#aspectRatio')).toHaveCount(1);
 await expect(page.locator('#quality')).toHaveCount(1);
 await expect(page.locator('#startBtn')).toBeVisible();
 await expect(page.locator('#progressCard,#resultsCard,#historyView')).toHaveCount(3);
 const pin=await page.locator('.ds-platform-header').evaluate(el=>getComputedStyle(el).position);
 expect(pin).toBe('fixed');
 const orb=page.locator('#topJarvisBtn .jv-owner-photo-test');
 await expect(orb).toHaveCount(1);
 expect(paid).toBe(0);
});

test('Video Uniquifier mobile uses platform drawer; no second legacy sidebar or header',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/index.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.ds-platform-header #topJarvisBtn')).toHaveCount(1);
 await expect(page.locator('.ds-platform-header #topLogin')).toHaveCount(1);
 await expect(page.locator('.shell>.sidebar')).toBeHidden();
 await expect(page.locator('#dsSiteSidebar')).toHaveCount(1);
 await expect(page.locator('.vu-appbar,.vu-side-nav,.vu-upgrade')).toHaveCount(0);
 await expect(page.locator('#startBtn')).toBeVisible();
 const menu=page.locator('.ds-site-mobile-toggle');
 await expect(menu).toHaveCount(1);
 await menu.click();
 await expect(page.locator('body')).toHaveClass(/ds-site-nav-open/);
 await expect(page.locator('#dsSiteSidebar')).toBeVisible();
});


test('one approved header shell reuses JARVIX and platform actions on secondary routes',async({page})=>{
 test.setTimeout(150000);
 await page.setViewportSize({width:1365,height:900});
 let paid=0;page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio\/jobs|payments|stripe)\b/.test(r.url()))paid++;});
 for(const route of ['generate-studio.html?studio=image','generate-studio.html?studio=video','generate-studio.html?studio=audio','ai-apps.html','canvas.html','pricing.html','my-creations.html','free-tools.html']){
  await page.goto('/'+route,{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>document.body.dataset.dsUnifiedPlatform),{timeout:12000}).toBe('ready');
  await expect(page.locator('header.ds-unified-header')).toHaveCount(1);
  const header=page.locator('header.ds-unified-header');
  await expect(header.locator('#topJarvisBtn')).toHaveCount(1);
  await expect(header.locator('#topJarvisBtn .jv-owner-photo-test')).toHaveCount(1);
  await expect(header.locator('#dsTakeTour')).toHaveCount(1);
  await expect(header.locator('.ds-header-tools')).toHaveCount(1);
  await expect(header.locator('.ds-header-credit')).toHaveCount(1);
  await expect(header.locator('#topPricing')).toHaveAttribute('href','pricing.html');
  await expect(header.locator('#topLogin')).toHaveCount(1);
  await expect(header.locator('#dsUnifiedLanguage')).toHaveValue(/en|ru|fr|es/);
  await expect(page.locator('#dsSiteSidebar')).toHaveCount(1);
  await expect(page.locator('.vu-appbar,.vu-side-nav,.vu-upgrade')).toHaveCount(0);
  await expect(header).toBeVisible();
  expect(await header.evaluate(el=>getComputedStyle(el).position)).toBe('fixed');
 }
 expect(paid).toBe(0);
});
test('secondary-page desktop navigation toggles with a single persistent owner orb',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:1365,height:900});
 await page.goto('/free-tools.html',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>document.body.dataset.dsUnifiedPlatform),{timeout:12000}).toBe('ready');
 const orb=page.locator('header.ds-unified-header #topJarvisBtn');
 await page.evaluate(()=>{window.__ownerOrbInstance=document.querySelector('header.ds-unified-header #topJarvisBtn');});
 const menu=page.locator('.ds-site-mobile-toggle');
 await expect(menu).toBeVisible();
 await menu.click();
 await expect(page.locator('body')).toHaveClass(/ds-unified-nav-collapsed/);
 await expect(orb).toHaveCount(1);
 expect(await orb.evaluate(el=>el===window.__ownerOrbInstance)).toBe(true);
 await menu.click();
 await expect(page.locator('body')).not.toHaveClass(/ds-unified-nav-collapsed/);
});
test('mobile secondary header preserves existing mobile buttons without duplicating them',async({page})=>{
 test.setTimeout(80000);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/generate-studio.html?studio=image',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>document.body.dataset.mobileShell),{timeout:12000}).toBe('ready');
 await expect(page.locator('#topJarvisBtn')).toHaveCount(1);
 await expect(page.locator('#dsTakeTour')).toHaveCount(1);
 await expect(page.locator('.ds-header-tools')).toHaveCount(1);
 await expect(page.locator('#topLogin')).toHaveCount(1);
 await expect(page.locator('.ds-mobile-control-right #dsTakeTour')).toHaveCount(1);
 await expect(page.locator('.ds-mobile-control-left .ds-header-credit')).toHaveCount(1);
 await expect(page.locator('.ds-mobile-control-left .ds-header-tools')).toHaveCount(1);
 await expect(page.locator('.ds-mobile-control-right #topLogin')).toHaveCount(1);
});

test('Owner 07 Nov mobile/desktop header: Credit left of orb, Tour right, no header AI Apps or dash',async({page},info)=>{
 test.setTimeout(100000);
 const writes=[];
 page.on('request',req=>{if(req.method()==='POST'&&/\/api\/(studio\/jobs|stripe|payments)\b/.test(req.url()))writes.push(req.url());});
 await page.addInitScript(()=>{localStorage.setItem('deepsyq_home_language','ru');});
 for(const [width,route] of [[320,'deepsyq.html'],[390,'deepsyq.html'],[430,'deepsyq.html'],
  [390,'generate-studio.html?studio=image'],[390,'jarvix-chat.html'],
  [1365,'generate-studio.html?studio=image']]){
  await page.setViewportSize({width,height:844});
  await page.goto('/'+route,{waitUntil:'domcontentloaded',timeout:30000});
  await expect.poll(()=>page.evaluate(()=>document.body.dataset.mobileShell),{timeout:15000}).toBe('ready');
  const mobile=width<=760,credit=page.locator(mobile?'.ds-mobile-control-left .ds-header-credit':'.ds-unified-actions-right .ds-header-credit, .ds-desktop-actions .ds-header-credit').first();
  const tour=page.locator(mobile?'.ds-mobile-control-right #dsTakeTour':'.ds-unified-actions-left #dsTakeTour, .ds-desktop-actions #dsTakeTour').first();
  await expect(credit,route+' must show exactly one credit link on the left').toHaveCount(1);
  await expect(tour,route+' must show one original Tour button on the right').toHaveCount(1);
  await expect(credit).toBeVisible();
  await expect(tour).toBeVisible();
  await expect(credit).toHaveAttribute('href','pricing.html#credits');
  await expect(credit).toHaveText('AI Credit');
  await expect(tour).toHaveText('Экскурсия');
  await expect(page.locator('.ds-header-apps')).toHaveCount(0);
  const infoRects=await page.evaluate(isMobile=>{
   const rect=s=>{const el=document.querySelector(s),r=el?.getBoundingClientRect();return r?{l:r.left,r:r.right,t:r.top,b:r.bottom,c:(r.left+r.right)/2}:null;};
   const scope=isMobile?'.ds-mobile-controls':'.ds-unified-actions';
   return {viewport:innerWidth,orb:rect('#topJarvisBtn'),
    credit:rect(scope+' .ds-header-credit'),tour:rect(scope+' #dsTakeTour'),
    tools:rect(scope+' .ds-header-tools'),price:rect(scope+' #topPricing'),
    header:rect('header.ds-stable-header'),
    overflow:document.documentElement.scrollWidth>innerWidth+1};
  },mobile);
  expect(infoRects.orb,route+' missing JARVIX orb').toBeTruthy();
  // Mobile orb is centered in the viewport. Desktop has a preserved fixed
  // sidebar, so the approved orb is centered within its header workspace.
  const expectedOrbCenter=mobile?width/2:infoRects.header.c;
  expect(Math.abs(infoRects.orb.c-expectedOrbCenter),route+' orb changed its approved center').toBeLessThanOrEqual(10);
  if(mobile){
   expect(infoRects.credit.r,route+' Credit must be left of orb').toBeLessThan(infoRects.orb.l+5);
   expect(infoRects.tour.l,route+' Tour must be right of orb').toBeGreaterThan(infoRects.orb.r-5);
  } else {
   expect(infoRects.tour.r,route+' Tour must be left of orb').toBeLessThan(infoRects.orb.l+10);
   expect(infoRects.credit.l,route+' Credit must be right of orb').toBeGreaterThan(infoRects.orb.r-10);
  }
  expect(infoRects.credit.l,route+' Credit must fit viewport').toBeGreaterThanOrEqual(-1);
  expect(infoRects.tour.r,route+' Tour must fit viewport').toBeLessThanOrEqual(width+1);
  if(mobile){
   expect(infoRects.tools.r,route+' Tools and Credit must not overlap').toBeLessThanOrEqual(infoRects.credit.l+1);
   expect(infoRects.tour.r,route+' Tour and Pricing must not overlap').toBeLessThanOrEqual(infoRects.price.l+1);
  }
  expect(infoRects.overflow,route+' must not create horizontal scroll').toBe(false);
  await page.screenshot({path:info.outputPath('header-credit-tour-'+width+'-'+route.split('?')[0]+'.png'),fullPage:false,animations:'disabled'});
 }
 expect(writes).toEqual([]);
});

test('Canvas original outer frame is preserved on Home and Canvas with its gallery and controls',async({page})=>{
 test.setTimeout(90000);
 for(const route of ['/deepsyq.html','/canvas.html']){
  await page.goto(route,{waitUntil:'domcontentloaded'});
  const container=page.locator('#canvasFeature.landing-feature');
  await expect(container).toHaveCount(1);
  const css=await container.evaluate(el=>{
   const s=getComputedStyle(el);
   return {top:s.borderTopWidth,left:s.borderLeftWidth,bottom:s.borderBottomWidth,right:s.borderRightWidth,shadow:s.boxShadow};
  });
  // Revert the previous mistaken Canvas edit; the user requested VIDEO carousel only.
  expect(css.top).toBe('1px');
  expect(css.left).toBe('1px');
  expect(css.bottom).toBe('1px');
  expect(css.right).toBe('1px');
  expect(css.shadow).toBe('none');
  await expect(container.locator('#canvasExampleGrid .canvas-example')).toHaveCount(9);
  // Home intentionally shows just the compact 9-image gallery; its full
  // existing editor remains only on /canvas.html.
  if(route==='/canvas.html')await expect(container.locator('#quickCreateForm')).toHaveCount(1);
 }
});


test('only Home video carousel purple outlines disappear without changing carousel playback or Canvas',async({page})=>{
 test.setTimeout(90000);
 for(const width of [390,1365]){
  await page.setViewportSize({width,height:900});
  await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
  const carousel=page.locator('#homeHeroCarousel');
  await expect(carousel).toHaveCount(1);
  // The actual purple frame came from jarvix-action-design.css applying
  // .j-action-workspace .hero, NOT the nested cinematic element.
  await expect.poll(()=>page.evaluate(()=>Boolean(
   document.body.classList.contains('j-action-workspace') &&
   document.querySelector('link[href="jarvix-action-design.css"]')?.sheet
  )),{timeout:12000}).toBe(true);
  const outerWrapper=page.locator('body.home-neon.j-action-workspace #workspace > .hero');
  await expect(outerWrapper).toHaveCount(1);
  const frame=await outerWrapper.evaluate(el=>{
   const v=getComputedStyle(el);
   return {top:v.borderTopWidth,right:v.borderRightWidth,bottom:v.borderBottomWidth,left:v.borderLeftWidth,shadow:v.boxShadow};
  });
  expect(frame).toEqual({top:'0px',right:'0px',bottom:'0px',left:'0px',shadow:'none'});
  const outer=page.locator('#workspace > .hero > .hero-stage.hero-stage-cinematic');
  await expect(outer).toHaveCount(1);
  const outerStyle=await outer.evaluate(el=>{
   const s=getComputedStyle(el);
   return {top:s.borderTopWidth,right:s.borderRightWidth,bottom:s.borderBottomWidth,left:s.borderLeftWidth,outline:s.outlineStyle,shadow:s.boxShadow};
  });
  expect(outerStyle).toEqual({top:'0px',right:'0px',bottom:'0px',left:'0px',outline:'none',shadow:'none'});
  await expect(page.locator('.hero-stage-cinematic .hero-film-outline')).toBeHidden();
  await expect(page.locator('.hero-stage-cinematic .hero-neighbor')).toHaveCount(2);
  const borders=await page.locator('.hero-stage-cinematic .hero-neighbor').evaluateAll(items=>items.map(item=>{
    const css=getComputedStyle(item);
    return {border:css.borderTopWidth,shadow:css.boxShadow};
  }));
  for(const frame of borders){
    expect(frame.border).toBe('0px');
    expect(frame.shadow).toBe('none');
  }
  await expect(page.locator('#homeHeroPrevious,#homeHeroNext')).toHaveCount(2);
  await expect(page.locator('#inspirationHeroVideo')).toHaveCount(1);
  await expect(page.locator('#canvasFeature.landing-feature')).toHaveCount(1);
 }
});

test('owner latest header: mobile Russian Tour is one line and desktop web positions match phone',async({page},info)=>{
 test.setTimeout(150000);
 await page.addInitScript(()=>{localStorage.setItem('deepsyq_home_language','ru');localStorage.setItem('deepsyq_lumina_terms_accepted','true');});
 let paid=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio\/jobs|stripe|payments)\b/.test(r.url()))paid++;});
 const cases=[
  {width:320,route:'deepsyq.html'},
  {width:390,route:'deepsyq.html'},
  {width:390,route:'generate-studio.html?studio=image'},
  {width:390,route:'index.html'},
  {width:1365,route:'deepsyq.html'},
  {width:1365,route:'generate-studio.html?studio=image'},
  {width:1365,route:'index.html'}
 ];
 for(const {width,route} of cases){
  await page.setViewportSize({width,height:844});
  const response=await page.goto('/'+route,{waitUntil:'domcontentloaded'});
  expect(response.status(),route+' must load').toBe(200);
  await expect.poll(()=>page.evaluate(()=>document.body.dataset.mobileShell),{timeout:15000}).toBe('ready');
  const mobile=width<=760;
  const credit=page.locator(mobile?'.ds-mobile-control-left .ds-header-credit':
   '.ds-unified-actions-right .ds-header-credit, .ds-platform-header .ds-header-credit, .ds-desktop-actions .ds-header-credit').first();
  const tour=page.locator(mobile?'.ds-mobile-control-right #dsTakeTour':
   '.ds-unified-actions-left #dsTakeTour, .ds-platform-header #dsTakeTour, .ds-desktop-actions #dsTakeTour').first();
  await expect(credit,route+' Credit selector').toHaveCount(1);
  await expect(tour,route+' Tour selector').toHaveCount(1);
  await expect(credit,route+' Credit visible').toBeVisible();
  await expect(tour,route+' Tour visible').toBeVisible();
  await expect(credit).toHaveText('AI Credit');
  await expect(credit).toHaveAttribute('href','pricing.html#credits');
  await expect(tour).toHaveText('Экскурсия');
  const actual=await page.evaluate(({mobile,route})=>{
   const box=el=>{const r=el?.getBoundingClientRect();return r?{l:r.left,r:r.right,t:r.top,b:r.bottom,c:(r.left+r.right)/2}:null;};
   const header=document.querySelector(route==='index.html'&&innerWidth>760?'.ds-platform-header':'header.ds-stable-header');
   const orb=document.querySelector('#topJarvisBtn');
   const credit=document.querySelector(mobile?'.ds-mobile-control-left .ds-header-credit':
    '.ds-unified-actions-right .ds-header-credit, .ds-platform-header .ds-header-credit, .ds-desktop-actions .ds-header-credit');
   const tour=document.querySelector(mobile?'.ds-mobile-control-right #dsTakeTour':
    '.ds-unified-actions-left #dsTakeTour, .ds-platform-header #dsTakeTour, .ds-desktop-actions #dsTakeTour');
   const pricing=document.getElementById('topPricing');
   const brand=document.querySelector('.ds-mobile-brand');
   const r=document.createRange();r.selectNodeContents(tour);
   const fragments=[...r.getClientRects()].filter(x=>x.width>0);
   return {header:box(header),orb:box(orb),credit:box(credit),tour:box(tour),pricing:box(pricing),
    brand:box(brand),fragments:fragments.length,whiteSpace:getComputedStyle(tour).whiteSpace,
    overflow:document.documentElement.scrollWidth-innerWidth};
  },{mobile,route});
  if(mobile){
   expect(actual.credit.r,route+' Credit must be before sphere').toBeLessThan(actual.orb.l+5);
   expect(actual.tour.l,route+' Tour must be after sphere').toBeGreaterThan(actual.orb.r-5);
  } else {
   expect(actual.tour.r,route+' Tour must be before sphere').toBeLessThan(actual.orb.l+10);
   expect(actual.credit.l,route+' Credit must be after sphere').toBeGreaterThan(actual.orb.r-10);
  }
  expect(actual.whiteSpace,route+' Tour must not wrap').toBe('nowrap');
  expect(actual.fragments,route+' Tour must be one rendered line').toBe(1);
  expect(actual.overflow,route+' horizontal page overflow').toBeLessThanOrEqual(1);
  expect(Math.abs(actual.orb.c-actual.header.c),route+' orb must stay centered in its header').toBeLessThanOrEqual(5);
  if(mobile){
   expect(Math.abs(actual.brand.c-width/2),route+' brand must remain horizontally centered').toBeLessThanOrEqual(4);
   expect(actual.brand.t,route+' lowered brand').toBeGreaterThanOrEqual(15);
   expect(actual.tour.r,route+' right edge').toBeLessThanOrEqual(width+1);
   expect(actual.tour.r,route+' Tour/Pricing overlap').toBeLessThanOrEqual(actual.pricing.l+1);
  }
  await page.screenshot({path:info.outputPath('header-final-'+width+'-'+route.replace(/[^a-z]/gi,'-')+'.png'),fullPage:false,animations:'disabled'});
 }
 expect(paid).toBe(0);
});

test('Home only: remove marked neon side hairlines and show cinematic media without dark film tint',async({page})=>{
 test.setTimeout(90000);
 let paid=0;
 page.on('request',r=>{if(r.method()==='POST'&&['/api/studio/jobs','/api/payments','/api/stripe'].some(x=>r.url().includes(x)))paid++;});
 for(const width of [390,1365]){
  await page.setViewportSize({width,height:900});
  await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#homeHeroCarousel')).toHaveCount(1);
  await expect(page.locator('.hero-stage-cinematic .hero-neighbor')).toHaveCount(2);
  await expect(page.locator('#inspirationHeroVideo')).toHaveCount(1);
  await expect(page.locator('#homeHeroPrevious,#homeHeroNext')).toHaveCount(2);
  const styles=await page.evaluate(()=>{
   const s=(selector,pseudo)=>{const el=document.querySelector(selector);return el?getComputedStyle(el,pseudo):null;};
   const aside=s('body.home-neon #sidebar');
   const carousel=s('.hero-stage-cinematic .home-hero-carousel','::after');
   const film=s('.hero-stage-cinematic .inspiration-hero-feature video');
   const neighbor=s('.hero-stage-cinematic .hero-neighbor video');
   const neighborMask=s('.hero-stage-cinematic .hero-neighbor','::after');
   const pod=s('body.home-neon .ds-header-cockpit');
   return {
    asideBorder:aside?.borderRightColor,
    carouselMask:carousel?.backgroundImage,
    filmFilter:film?.filter,
    neighborOpacity:neighbor?.opacity,
    neighborMaskDisplay:neighborMask?.display,
    pod:pod?{left:pod.borderLeftColor,right:pod.borderRightColor,top:pod.borderTopColor,bottom:pod.borderBottomColor}:null
   };
  });
  expect(styles.asideBorder,'no left-side Home sidebar hairline').toBe('rgba(0, 0, 0, 0)');
  expect(styles.carouselMask,'no film-wide dark overlay').toBe('none');
  expect(styles.filmFilter,'main movie brightened without a tint').toBe('brightness(1.18) saturate(1.04)');
  expect(styles.neighborOpacity,'side movies retain source brightness').toBe('1');
  expect(styles.neighborMaskDisplay,'no dark tint above side movies').toBe('none');
  if(width>760){
   expect(styles.pod,'desktop owner cockpit remains').not.toBeNull();
   expect(styles.pod.left,'left side rail removed').toBe('rgba(0, 0, 0, 0)');
   expect(styles.pod.right,'right side rail removed').toBe('rgba(0, 0, 0, 0)');
   expect(styles.pod.top,'upper border preserved').not.toBe('rgba(0, 0, 0, 0)');
   expect(styles.pod.bottom,'lower border preserved').not.toBe('rgba(0, 0, 0, 0)');
  }
 }
 expect(paid).toBe(0);
});

test('Neon screenshot: fresh Home style removes actual rails, masks and credit gradient',async({page})=>{
 test.setTimeout(120000);
 let paid=0;
 page.on('request',r=>{
  if(r.method()==='POST'&&['/api/studio/jobs','/api/payments','/api/stripe'].some(p=>r.url().includes(p)))paid++;
 });
 for(const width of [390,1365]){
  await page.setViewportSize({width,height:900});
  const response=await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  await expect(page.locator('link[href^="deepsyq-home-neon-cinema-fix-20261107.css"]')).toHaveCount(1);
  await page.evaluate(()=>document.documentElement.setAttribute('data-site-theme','neon'));
  await expect(page.locator('#homeHeroCarousel')).toHaveCount(1);
  // Assert the playable-film state, not the empty placeholder that hides overlays by default.
  await page.evaluate(()=>document.querySelector('#homeHeroCarousel')?.classList.remove('is-empty'));
  await expect(page.locator('#homeHeroCarousel .hero-neighbor')).toHaveCount(2);
  await expect(page.locator('#homeHeroPrevious,#homeHeroNext')).toHaveCount(2);
  await expect(page.locator('#inspirationHeroVideo')).toHaveCount(1);
  if(width>760)await expect(page.locator('.ds-header-cockpit')).toHaveCount(1);
  const s=await page.evaluate(()=>{
   const css=(q,pseudo)=>{const el=document.querySelector(q);return el?getComputedStyle(el,pseudo):null;};
   const side=css('body.home-neon #sidebar');
   const extra=css('body.home-neon .ds-site-sidebar');
   const cockpit=css('body.home-neon .ds-header-cockpit');
   const mask=css('#homeHeroCarousel','::after');
   const sideMask=css('#homeHeroCarousel .hero-neighbor','::after');
   const credit=css('#homeHeroCarousel .hero-film-credit');
   const main=css('#inspirationHeroVideo');
   const neighbor=css('#homeHeroCarousel .hero-neighbor video');
   return {
    sideBorder:side?.borderRightColor,
    extraBorder:extra?.borderRightColor,
    pod:cockpit?{left:cockpit.borderLeftColor,right:cockpit.borderRightColor,top:cockpit.borderTopColor,bottom:cockpit.borderBottomColor}:null,
    mask:mask?{display:mask.display,content:mask.content}:null,
    sideMask:sideMask?{display:sideMask.display,content:sideMask.content}:null,
    creditBackground:credit?.backgroundImage,
    mainFilter:main?.filter,
    sideFilter:neighbor?.filter,
    sideOpacity:neighbor?.opacity
   };
  });
  const clearColor='rgba(0, 0, 0, 0)';
  expect(s.sideBorder,'Neon sidebar bright vertical line').toBe(clearColor);
  if(s.extraBorder)expect(s.extraBorder,'Neon site-shell right border').toBe(clearColor);
  if(width>760){
   expect(s.pod).not.toBeNull();
   expect(s.pod.left,'cockpit left neon end').toBe(clearColor);
   expect(s.pod.right,'cockpit right neon end').toBe(clearColor);
   expect(s.pod.top,'retain upper neon stroke').not.toBe(clearColor);
   expect(s.pod.bottom,'retain lower neon stroke').not.toBe(clearColor);
  }
  expect(s.mask?.display,'carousel dark film layer').toBe('none');
  expect(s.sideMask?.display,'preview dark film layer').toBe('none');
  expect(s.creditBackground,'bottom dark gradient must not remain').toBe('none');
  expect(s.mainFilter).toBe('brightness(1.18) saturate(1.04)');
  expect(s.sideFilter).toBe('brightness(1.18) saturate(1.04)');
  expect(s.sideOpacity).toBe('1');
 }
 expect(paid).toBe(0);
});

test('Home header and first film align at desktop edges with visible clearance',async({page})=>{
 test.setTimeout(100000);
 let paid=0;
 page.on('request',r=>{if(r.method()==='POST'&&['/api/studio/jobs','/api/stripe','/api/payments'].some(p=>r.url().includes(p)))paid++;});
 for(const width of [1024,1365]){
  await page.setViewportSize({width,height:900});
  const response=await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  await expect(page.locator('.ds-header-cockpit')).toHaveCount(1);
  await expect(page.locator('#workspace > .hero .hero-stage-cinematic')).toHaveCount(1);
  const shape=await page.evaluate(()=>{
   const header=document.querySelector('.content > header');
   const cockpit=document.querySelector('.ds-header-cockpit');
   const hero=document.querySelector('#workspace > .hero');
   const stage=hero?.querySelector('.hero-stage-cinematic');
   const recommended=hero?.querySelector('.home-hero-recommended');
   const main=document.getElementById('workspace');
   const bounds=el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};};
   return {header:bounds(header),cockpit:bounds(cockpit),hero:bounds(hero),stage:bounds(stage),badge:bounds(recommended),
    workspacePaddingLeft:getComputedStyle(main).paddingLeft,
    workspacePaddingRight:getComputedStyle(main).paddingRight,
    heroMarginTop:getComputedStyle(hero).marginTop,
    pageOverflow:document.documentElement.scrollWidth-innerWidth};
  });
  expect(shape.workspacePaddingLeft,'left gutter matches cockpit').toBe('20px');
  expect(shape.workspacePaddingRight,'right gutter matches cockpit').toBe('20px');
  expect(shape.heroMarginTop,'hero clearance').toBe('20px');
  expect(Math.abs(shape.stage.left-shape.cockpit.left),'left lines align').toBeLessThanOrEqual(2);
  expect(Math.abs(shape.stage.right-shape.cockpit.right),'right lines align').toBeLessThanOrEqual(2);
  expect(shape.hero.top-shape.header.bottom,'Home content below header').toBeGreaterThanOrEqual(28);
  expect(shape.badge.top-shape.header.bottom,'Recommended remains below the header glow').toBeGreaterThanOrEqual(25);
  expect(shape.pageOverflow,'no new horizontal overflow').toBeLessThanOrEqual(1);
 }
 // Desktop edges align to the cockpit; the fixed mobile header and its padding stay untouched.
 await page.setViewportSize({width:390,height:844});
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#homeHeroCarousel')).toHaveCount(1);
 const mobile=await page.evaluate(()=>({
  padding:getComputedStyle(document.getElementById('workspace')).paddingLeft,
  horizontalOverflow:document.documentElement.scrollWidth-innerWidth
 }));
 expect(mobile.padding).toBe('12px');
 expect(mobile.horizontalOverflow).toBeLessThanOrEqual(1);
 expect(paid).toBe(0);
});
