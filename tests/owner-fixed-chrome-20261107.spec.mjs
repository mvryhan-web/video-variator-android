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
   await expect(top.locator('.jarvis-mini-orb.jv-approved-orb > svg.ds-reference-orb')).toHaveCount(1);
   await expect(top.locator('svg.ds-reference-orb')).toHaveAttribute('viewBox','0 0 160 160');
   await expect(top.locator('.jarvis-ring:visible')).toHaveCount(0);
   const artwork=await page.locator('.jarvis-mini-orb.jv-approved-orb > svg.ds-reference-orb').evaluateAll(nodes=>nodes.map(x=>x.querySelector('radialGradient')?.id));
   expect(artwork.every(Boolean)).toBe(true);
   expect(new Set(artwork).size).toBe(artwork.length);
   const rail=page.locator('.j-mode-rail');
   if(await rail.count()){
    const jarvix=rail.locator('a[href="jarvix-chat.html"]');
    await expect(jarvix).toHaveCount(1);
    await expect(jarvix.locator('.jv-approved-orb > svg.ds-reference-orb')).toHaveCount(1);
    await expect(jarvix).toContainText('JARVIX');
   }
   const nav=page.locator('.ds-site-jarvix-btn .jv-approved-orb > svg.ds-reference-orb, #sidebar .nav-entry .jv-approved-orb > svg.ds-reference-orb');
   if(await page.locator('.ds-site-jarvix-btn,#sidebar .nav-entry a[aria-label="JARVIX"]').count())await expect(nav.first()).toBeAttached();
   expect(await page.locator('#topJarvisBtn').count()).toBe(1);
  }
 }
 expect(paid).toBe(0);
});


test('stage08 JARVIX orbit directions, halo duration and stable shell size',async({page})=>{
 test.setTimeout(90000);
 await page.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
 let paid=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio\/jobs|payments|stripe)\b/.test(r.url()))paid++;});
 for(const width of [390,1365]){
  await page.setViewportSize({width,height:900});
  await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
  const svg=page.locator('#topJarvisBtn .jv-approved-orb svg.ds-reference-orb');
  await expect(svg).toHaveCount(1);
  const result=await svg.evaluate(node=>{
   const css=selector=>getComputedStyle(node.querySelector(selector));
   const halo=getComputedStyle(node.parentElement,'::before');
   const shell=node.getBoundingClientRect(),host=node.closest('#topJarvisBtn').getBoundingClientRect();
   return {cyan:css('.ds-orbit-spin').animationName,
    pink:css('.ds-orbit-reverse').animationName,
    blueBack:css('.jv-blue-behind').animationName,
    blueFront:css('.jv-blue-front').animationName,
    goldIn:css('.jv-warm-in').animationName,
    goldOut:css('.jv-warm-out').animationName,
    halo:halo.animationName,haloDuration:halo.animationDuration,
    shell:{width:shell.width,height:shell.height},host:{width:host.width,height:host.height}};
  });
  expect(result.cyan).toContain('jv-ring-clockwise');
  expect(result.pink).toContain('jv-ring-counterclockwise');
  expect(result.blueBack).toContain('jv-blue-up');
  expect(result.blueFront).toContain('jv-blue-up');
  expect(result.goldIn).toContain('jv-warm-leak-in');
  expect(result.goldOut).toContain('jv-warm-leak-out');
  expect(result.halo).toContain('jv-halo-breath');
  expect(result.haloDuration).toBe('5s');
  await page.waitForTimeout(300);
  const later=await svg.evaluate(node=>{
   const shell=node.getBoundingClientRect(),host=node.closest('#topJarvisBtn').getBoundingClientRect();
   return {shell:{width:shell.width,height:shell.height},host:{width:host.width,height:host.height}};
  });
  expect(later.shell.width).toBeCloseTo(result.shell.width,1);
  expect(later.shell.height).toBeCloseTo(result.shell.height,1);
  expect(later.host.width).toBeCloseTo(result.host.width,1);
  expect(later.host.height).toBeCloseTo(result.host.height,1);
 }
 expect(paid).toBe(0);
});


test('GO stage09 orb reacts to measured speech, listening and silence without resizing shell',async({page})=>{
 test.setTimeout(90000);
 await page.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
 let paid=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\\/api\\/(studio\\/jobs|payments|stripe)\\b/.test(r.url()))paid++;});
 for(const width of [390,1365]){
  await page.setViewportSize({width,height:900});
  await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
  const orb=page.locator('#topJarvisBtn .jv-approved-orb').first();
  await expect(orb.locator('.jv-voice-side-glints')).toHaveCount(1);
  const original=await orb.evaluate(el=>el.getBoundingClientRect().toJSON());
  await page.evaluate(()=>document.getElementById('topJarvisBtn').classList.add('is-listening'));
  await expect.poll(()=>orb.evaluate(el=>el.dataset.jvMode)).toBe('listening');
  await page.evaluate(()=>{
   const btn=document.getElementById('topJarvisBtn');
   btn.classList.remove('is-listening');btn.classList.add('is-speaking');
   window.dispatchEvent(new CustomEvent('jarvix:voice-level',{detail:{level:.65}}));
  });
  await expect.poll(()=>orb.evaluate(el=>el.dataset.jvMode)).toBe('speaking');
  await expect.poll(()=>orb.evaluate(el=>el.style.getPropertyValue('--jv-voice-level'))).toBe('0.65');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('jarvix:voice-level',{detail:{level:0}})));
  await expect.poll(()=>orb.evaluate(el=>el.style.getPropertyValue('--jv-voice-level'))).toBe('0');
  await page.evaluate(()=>document.getElementById('topJarvisBtn').classList.remove('is-speaking'));
  await expect.poll(()=>orb.evaluate(el=>el.dataset.jvMode)).toBe('idle');
  const later=await orb.evaluate(el=>el.getBoundingClientRect().toJSON());
  expect(later.width).toBeCloseTo(original.width,1);
  expect(later.height).toBeCloseTo(original.height,1);
  const ring=await orb.locator('.ds-orbit-spin').evaluate(el=>getComputedStyle(el).animationName);
  expect(ring).toContain('jv-ring-clockwise');
 }
 expect(paid).toBe(0);
});
