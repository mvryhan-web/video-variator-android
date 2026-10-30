import {test,expect} from '@playwright/test';

// Agent C BASE29: approved inner-page navigation. No live accounts or paid providers.
const ordered=['Home','Image','Video','Agent','Audio','Tools','AI Apps','Canvas',
 'Video Uniquifier','Assets','My Creations','History','Affiliate','Share','Inspiration','Pricing'];
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
  ['History','generate-studio.html?view=history'],['Pricing','pricing.html'],
  ['Inspiration','deepsyq.html#inspirationPreview']
 ]) await expect(nav.getByRole('link',{name:label,exact:true})).toHaveAttribute('href',href);
 await expect(nav.locator('[aria-label="Agent coming soon"]')).toHaveCount(1);
 await expect(nav.locator('[aria-label="Affiliate coming soon"]')).toHaveCount(1);
 await expect(nav.locator('[aria-label="Agent coming soon"] a,[aria-label="Affiliate coming soon"] a')).toHaveCount(0);
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

test('BASE29 canonical Pricing and History links navigate, with no generation request',async({page})=>{
 const paid=noPaidRequests(page);
 await page.goto('/ai-apps.html');
 await openMobileSidebar(page);
 await page.locator('#dsSiteSidebar').getByRole('link',{name:'Pricing',exact:true}).click();
 await expect(page).toHaveURL(/\/pricing\.html$/);
 await expect(page.locator('#pricingTitle')).toBeVisible();
 await page.goto('/ai-apps.html');
 await openMobileSidebar(page);
 await page.locator('#dsSiteSidebar').getByRole('link',{name:'History',exact:true}).click();
 await expect(page).toHaveURL(/\/generate-studio\.html\?view=history/);
 await expect(page.locator('#showHistory')).toHaveAttribute('aria-pressed','true');
 expect(paid).toEqual([]);
});
