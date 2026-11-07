import {test,expect} from '@playwright/test';

test('owner Everyday Tools landing: exactly nine live destinations, sidebar and approved art',async({page})=>{
 const paid=[];page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio|billing|generate|ai-wallet)/.test(r.url()))paid.push(r.url());});
 const r=await page.goto('/free-tools.html');expect(r.status()).toBe(200);
 await expect(page.locator('#etShowcase')).toBeVisible();
 await expect(page.locator('#etGallery .et-card')).toHaveCount(9);
 await expect(page.locator('#etShowcase .et-hero')).toHaveCount(0);
 await expect(page.locator('.ds-site-caption').filter({hasText:'Everyday Tools'})).toHaveCount(1);
 await expect(page.locator('#etGallery .et-card').first()).toContainText('Compress Photos');
 // Reference layout: 19 standard cards, one separate wide Background Remover, two wide speech tiles.
 await expect(page.locator('#mobileUtilityGrid a.et-photo-card')).toHaveCount(19);
 await expect(page.locator('.utility-tools-preview a.et-owner-bg-banner')).toHaveCount(1);
 await expect(page.locator('.utility-tools-preview .et-owner-voices a.et-owner-voice-card')).toHaveCount(2);
 await expect(page.locator('#etShowcase .et-uniquifier')).toHaveAttribute('href','index.html');
 const overflow=await page.evaluate(()=>({
  scrollWidth:document.documentElement.scrollWidth,
  innerWidth,
  elements:[...document.body.querySelectorAll('*')].map(el=>{
   const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
   return {tag:el.tagName,id:el.id,classes:String(el.className||'').slice(0,100),left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width),position:style.position,overflowX:style.overflowX};
  }).filter(el=>el.width>0&&el.right>innerWidth+1).sort((a,b)=>b.right-a.right).slice(0,12)
 }));
 expect(overflow.scrollWidth-overflow.innerWidth,JSON.stringify(overflow.elements)).toBeLessThanOrEqual(1);
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


test('Owner: inspect every Everyday Tools destination, remove only crossed-out Example Inspiration card',async({page})=>{
 test.setTimeout(120000);
 const paid=[];
 page.on('request',request=>{
  if(request.method()==='POST'&&/\/api\/(?:studio|billing|generate|ai-wallet|wallet)/.test(request.url()))
   paid.push(request.url());
 });
 await page.goto('/free-tools.html',{waitUntil:'domcontentloaded'});
 const hubUrls=await page.locator('#etGallery a.et-card').evaluateAll(nodes=>nodes.map(x=>x.getAttribute('href')));
 const utilityUrls=await page.locator('#mobileUtilityGrid a[data-utility]').evaluateAll(nodes=>nodes.map(x=>x.getAttribute('href')));
 expect(hubUrls.length).toBe(9);
 expect(utilityUrls.length).toBe(19); // 17 true local processors + teleprompter + collage
 const routes=[...new Set([...hubUrls,...utilityUrls,'mobile-utility.html?tool=scan-pdf','photo-collage.html'])];
 expect(routes.length).toBeGreaterThanOrEqual(20);
 for(const route of routes){
  const res=await page.goto(new URL(route,'http://localhost/free-tools.html').pathname+new URL(route,'http://localhost/free-tools.html').search,{waitUntil:'domcontentloaded'});
  expect(res.status(),'Everyday Tools '+route+' loads').toBe(200);
  await expect(page.locator('.ds-tool-inspiration')).toHaveCount(0);
  const toolWorkspaceCopy=await page.locator('.utility-workspace,.collage-workspace').allTextContents();
  for(const copy of toolWorkspaceCopy){
   expect(copy).not.toContain('Example inspiration');
   expect(copy).not.toContain('Choose your own photos to create a downloadable result.');
  }
  await expect(page.locator('.utility-workspace img[src*="01-crystal-orchard"],.collage-workspace img[src*="01-crystal-orchard"]')).toHaveCount(0);
  if(route.includes('mobile-utility.html')){
   await expect(page.locator('#utilityFiles')).toHaveCount(1);
   await expect(page.locator('#utilityRun')).toHaveCount(1);
   await expect(page.locator('#utilityCancel')).toHaveCount(1);
  }
  if(route.includes('photo-collage.html')){
   await expect(page.locator('#collageFiles')).toBeVisible();
   await expect(page.locator('#collageCreate')).toBeVisible();
   const columns=await page.locator('.collage-workspace').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
   expect(columns.split(' ').length,'No empty former example column').toBe(1);
  }
 }
 expect(paid).toEqual([]);
});
