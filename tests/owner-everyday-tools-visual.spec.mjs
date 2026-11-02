import {test,expect} from '@playwright/test';

test('owner Everyday Tools landing: exactly nine live destinations, sidebar and approved art',async({page})=>{
 const paid=[];page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio|billing|generate|ai-wallet)/.test(r.url()))paid.push(r.url());});
 const r=await page.goto('/free-tools.html');expect(r.status()).toBe(200);
 await expect(page.locator('#etShowcase')).toBeVisible();
 await expect(page.locator('#etGallery .et-card')).toHaveCount(9);
 await expect(page.locator('#etShowcase .et-hero h1')).toHaveText('Everyday Tools');
 await expect(page.locator('.ds-site-caption').filter({hasText:'Everyday Tools'})).toHaveCount(1);
 await expect(page.locator('#etGallery .et-card').first()).toContainText('Compress Photos');
 // Reference layout: 19 standard cards, one separate wide Background Remover, two wide speech tiles.
 await expect(page.locator('#mobileUtilityGrid a.et-photo-card')).toHaveCount(19);
 await expect(page.locator('.utility-tools-preview a.et-owner-bg-banner')).toHaveCount(1);
 await expect(page.locator('.utility-tools-preview .et-owner-voices a.et-owner-voice-card')).toHaveCount(2);
 await expect(page.locator('#etShowcase .et-uniquifier')).toHaveAttribute('href','index.html');
 const overflow=await page.evaluate(()=>{
  const extra=document.documentElement.scrollWidth-innerWidth;
  const offenders=[...document.querySelectorAll('body *')].filter(e=>{
   const b=e.getBoundingClientRect(),s=getComputedStyle(e);
   return e instanceof HTMLElement&&b.width>0&&b.right>innerWidth+2&&s.position!=='fixed'&&s.display!=='none';
  }).slice(0,24).map(e=>({tag:e.tagName,id:e.id,cls:typeof e.className==='string'?e.className.slice(0,80):'',right:Math.round(e.getBoundingClientRect().right),left:Math.round(e.getBoundingClientRect().left),width:Math.round(e.getBoundingClientRect().width),overflow:getComputedStyle(e).overflow}));
  return {extra,offenders};
 });
 if(overflow.extra>1)console.log('EVERYDAY_TOOLS_MOBILE_OVERFLOW',JSON.stringify(overflow));
 expect(overflow.extra).toBeLessThanOrEqual(1);
 expect(paid).toEqual([]);
});
test('owner Everyday Tools filter and native file workflow preserve working processors',async({page})=>{
 await page.goto('/free-tools.html');
 await page.locator('.et-search').fill('collage');
 await expect(page.locator('#etGallery .et-card:visible')).toHaveCount(1);
 await page.locator('.et-search').fill('');
 await page.locator('.et-picker').selectOption('audio');
 await expect(page.locator('#etGallery .et-card:visible')).toHaveCount(1);
 await page.locator('.et-picker').selectOption('all');
 await page.locator('#etGallery .et-card').first().click();
 await expect(page).toHaveURL(/free-tools\.html\?tool=photo$/);
 await expect(page.locator('#files')).toBeVisible();
 await expect(page.locator('#etShowcase')).toBeHidden();
 await page.locator('#hubBack').click();
 await expect(page.locator('#etShowcase')).toBeVisible();
 await expect(page.locator('#etGallery .et-card')).toHaveCount(9);
});
test('owner Everyday Tools routes all target existing unmodified tools',async({page})=>{
 await page.goto('/free-tools.html');
 const urls=await page.locator('#etGallery .et-card').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
 expect(urls).toEqual(['?tool=photo','?tool=video','?tool=audio','mobile-utility.html?tool=scan-pdf','photo-collage.html','simple-background-remover.html','?tool=prompter','smart-reminders.html','avatar-studio.html']);
 await page.locator('#etGallery .et-card').nth(3).click();
 await expect(page).toHaveURL(/mobile-utility\.html\?tool=scan-pdf$/);
});

test('owner banner lock: original media decodes, displays without stretching, with only approved copy',async({page})=>{
 await page.setViewportSize({width:1448,height:1086});
 const response=await page.goto('/free-tools.html');expect(response.status()).toBe(200);
 const hero=page.locator('#etShowcase .et-hero');
 await expect(hero.locator('h1')).toHaveText('Everyday Tools');
 await expect(hero.locator('.et-hero-lead')).toHaveText('Less routine. More creating.');
 await expect(hero.locator('.et-hero-copy p')).toHaveCount(0);
 const img=hero.locator('.et-hero-art image');
 await expect(img).toHaveAttribute('width','1448');
 await expect(img).toHaveAttribute('height','1086');
 const media=await img.evaluate(async node=>{
  const url=node.href.baseVal;
  const raster=new Image();raster.src=url;await raster.decode();
  const box=node.ownerSVGElement.getBoundingClientRect();
  return {src:new URL(url).pathname,width:raster.naturalWidth,height:raster.naturalHeight,displayWidth:box.width,opacity:getComputedStyle(node.ownerSVGElement).opacity};
 });
 expect(media.src).toContain('/media/approved-design-20261023/09_Everyday_Tools.png');
 expect(media.width).toBe(1448);expect(media.height).toBe(1086);
 expect(media.displayWidth).toBeGreaterThan(400);
 expect(media.displayWidth).toBeLessThanOrEqual(704); // Never upscale past the native 703px crop.
 expect(media.opacity).toBe('1');
 await page.setViewportSize({width:390,height:844});
 await expect(hero).toBeVisible();
 await expect(hero.locator('.et-hero-art')).toHaveCSS('opacity','1');
 const overflow=await page.evaluate(()=>{
  const extra=document.documentElement.scrollWidth-innerWidth;
  const offenders=[...document.querySelectorAll('body *')].filter(e=>{
   const b=e.getBoundingClientRect(),s=getComputedStyle(e);
   return e instanceof HTMLElement&&b.width>0&&b.right>innerWidth+2&&s.position!=='fixed'&&s.display!=='none';
  }).slice(0,24).map(e=>({tag:e.tagName,id:e.id,cls:typeof e.className==='string'?e.className.slice(0,80):'',right:Math.round(e.getBoundingClientRect().right),left:Math.round(e.getBoundingClientRect().left),width:Math.round(e.getBoundingClientRect().width),overflow:getComputedStyle(e).overflow}));
  return {extra,offenders};
 });
 if(overflow.extra>1)console.log('EVERYDAY_TOOLS_MOBILE_OVERFLOW',JSON.stringify(overflow));
 expect(overflow.extra).toBeLessThanOrEqual(1);
});
