import {test,expect} from '@playwright/test';

// Agent C BASE29: approved inner-page navigation. No live accounts or paid providers.
const ordered=['Home','Image','Video','JARVIX','Audio','Tools','AI Apps','Canvas',
 'Video Uniquifier','Assets','My Creations','Share','Inspiration','Pricing'];
async function openMobileSidebar(page){
 const toggle=page.locator('.ds-site-mobile-toggle');
 if(await toggle.isVisible())await toggle.click();
}
function noPaidRequests(page){
 const sent=[];
 page.on('request',request=>{
  const path=new URL(request.url()).pathname;
  if(request.method()==='POST'&&/\/api\/(?:studio\/jobs|ai-billing|billing|payments|stripe|speech|ai-provider)/.test(path))
   sent.push(path);
 });
 return sent;
}

test('BASE29 sidebar order, existing routes, and honest non-links for unavailable features',async({page})=>{
 const paid=noPaidRequests(page);
 await page.goto('/ai-apps.html');
 const nav=page.locator('#dsSiteSidebar nav');
 await expect(nav).toBeVisible();
 const labels=await nav.locator(':scope > a,:scope > span.ds-site-pending,:scope > button.ds-site-share')
  .evaluateAll(nodes=>nodes.map(node=>{
   const copy=node.cloneNode(true);
   copy.querySelectorAll('.ds-icon,small').forEach(icon=>icon.remove());
   return copy.textContent.trim();
  }));
 expect(labels).toEqual(ordered);
 for(const [label,href] of [
  ['Home','deepsyq.html'],['Tools','free-tools.html'],['AI Apps','ai-apps.html'],
  ['Canvas','canvas.html'],['Video Uniquifier','index.html'],
  ['Assets','generate-studio.html?view=history'],
  ['My Creations','my-creations.html'],
  ['Pricing','pricing.html'],
  ['Inspiration','deepsyq.html#inspirationPreview']
 ]) await expect(nav.getByRole('link',{name:label,exact:true})).toHaveAttribute('href',href);
 await expect(nav.getByRole('link',{name:'JARVIX AI'})).toHaveCount(1);
 await expect(nav).not.toContainText('Affiliate');
 await expect(nav.locator('[aria-label="Agent coming soon"]')).toHaveCount(0);
 await expect(nav.getByRole('link',{name:/Favorites|Challenges/i})).toHaveCount(0);
 await expect(nav.getByRole('button',{name:'Share Deepsyq'})).toBeVisible();
 expect(paid).toEqual([]);
});

test('BASE29 working Share uses the existing Home URL, never a private account URL',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'share',{configurable:true,value:async info=>{window.__shareCaptured=info;}});
 });
 await page.goto('/free-tools.html');
 await openMobileSidebar(page);
 await page.locator('#dsSiteSidebar').getByRole('button',{name:'Share Deepsyq'}).click();
 const captured=await page.evaluate(()=>window.__shareCaptured);
 expect(captured).toEqual({title:'Deepsyq',url:'http://127.0.0.1:3000/deepsyq.html'});
});

test('BASE29 mobile and keyboard navigation remain accessible at 320/390/768/1448',async({page})=>{
 const paid=noPaidRequests(page);
 for(const width of [320,390,768,1448]){
  await page.setViewportSize({width,height:844});
  await page.goto('/ai-apps.html');
  const nav=page.locator('#dsSiteSidebar');
  if(width<=900){
   const toggle=page.locator('.ds-site-mobile-toggle');
   await expect(toggle).toBeVisible();
   await toggle.focus();await page.keyboard.press('Enter');
   await expect(toggle).toHaveAttribute('aria-expanded','true');
   await expect(nav.getByRole('link',{name:'Pricing',exact:true})).toBeVisible();
   await page.keyboard.press('Escape');
   await expect(toggle).toHaveAttribute('aria-expanded','false');
  }else await expect(nav.getByRole('button',{name:'Share Deepsyq'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 }
 expect(paid).toEqual([]);
});

test('BASE29 protected Home still holds Inspiration All/Video/Image, no fake AI Apps or favorites',async({page})=>{
 const paid=noPaidRequests(page);
 await page.goto('/deepsyq.html');
 const kinds=await page.locator('#inspirationPreview [data-inspiration-kind]')
  .evaluateAll(xs=>xs.map(x=>x.dataset.inspirationKind));
 expect(kinds).toEqual(['all','video','image']);
 await expect(page.locator('#sidebar')).not.toContainText('Favorites');
 await expect(page.locator('#sidebar')).not.toContainText('Challenges');
 await page.goto('/ai-apps.html');
 const types=await page.locator('#type option').evaluateAll(xs=>xs.map(x=>x.value));
 expect(types).toEqual(['','image','video','audio']);
 expect(paid).toEqual([]);
});

test('BASE29 canonical Pricing and single Library My Creations link navigate with no generation request',async({page})=>{
 const paid=noPaidRequests(page);
 await page.goto('/ai-apps.html');
 await openMobileSidebar(page);
 await page.locator('#dsSiteSidebar').getByRole('link',{name:'Pricing',exact:true}).click();
 await expect(page).toHaveURL(/\/pricing\.html$/);
 await expect(page.locator('#pricingTitle')).toBeVisible();
 await page.goto('/ai-apps.html');
 await openMobileSidebar(page);
 const nav=page.locator('#dsSiteSidebar');
 await expect(nav.getByRole('link',{name:'My Creations',exact:true})).toHaveCount(1);
 await expect(nav.getByRole('link',{name:'History',exact:true})).toHaveCount(0);
 await nav.getByRole('link',{name:'My Creations',exact:true}).click();
 await expect(page).toHaveURL(/\/my-creations\.html$/);
 await expect(page.locator('#wsTitle')).toHaveText('My Creations');
 expect(paid).toEqual([]);
});

test('BASE29 inner-page mobile drawer retains keyboard focus, blocks hidden links, and recovers on close and resize',async({page})=>{
 const paid=noPaidRequests(page);
 await page.setViewportSize({width:390,height:812});
 await page.goto('/ai-apps.html');
 const toggle=page.locator('.ds-site-mobile-toggle');
 const menu=page.locator('#dsSiteSidebar');
 await expect(menu).toHaveJSProperty('inert',true);
 // The closed sidebar must not be reachable from the keyboard.
 await toggle.focus();await page.keyboard.press('Tab');
 await expect(menu).not.toContainText('Favorites');
 expect(await menu.evaluate(el=>el.contains(document.activeElement))).toBe(false);
 const initialOverflow=await page.evaluate(()=>document.body.style.overflow);
 await toggle.click();
 await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect(menu).toHaveAttribute('aria-modal','true');
 await expect(menu).toHaveJSProperty('inert',false);
 await expect(menu.locator('.ds-site-brand')).toBeFocused();
 expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
 // Shift+Tab on the first link and Tab on the last link must wrap inside the drawer.
 await page.keyboard.press('Shift+Tab');
 await expect(menu.locator('.ds-site-footer a').last()).toBeFocused();
 await page.keyboard.press('Tab');
 await expect(menu.locator('.ds-site-brand')).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await expect(toggle).toBeFocused();
 await expect(menu).toHaveJSProperty('inert',true);
 expect(await page.evaluate(()=>document.body.style.overflow)).toBe(initialOverflow);
 await toggle.click();
 await expect(menu.locator('.ds-site-brand')).toBeFocused();
 await page.locator('.ds-site-scrim').click({position:{x:385,y:300}});
 await expect(toggle).toBeFocused();
 await expect(menu).toHaveJSProperty('inert',true);
 await toggle.click();
 await page.setViewportSize({width:1024,height:812});
 await expect(toggle).toBeHidden();
 await expect(menu).toHaveJSProperty('inert',false);
 await expect(menu).not.toHaveAttribute('aria-modal','true');
 expect(await page.evaluate(()=>document.body.style.overflow)).toBe(initialOverflow);
 await expect(menu.getByRole('link',{name:'Pricing',exact:true})).toBeVisible();
 expect(paid).toEqual([]);
});
