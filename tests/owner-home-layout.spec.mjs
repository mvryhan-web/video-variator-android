import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const bundle=JSON.parse(await readFile(new URL('../app/src/main/assets/media/home/owner-20261018/manifest.json',import.meta.url)));
async function home(page){
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}},googleClientId:'',billingConfigured:false,features:{inspiration:true,aiApps:false,onboarding:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/inspiration**',r=>r.fulfill({json:{items:new URL(r.request().url()).searchParams.get('target')==='agent'?[]:bundle.items.filter(x=>x.featured),categories:['Cinematic']}}));
 await page.goto('/deepsyq.html');
}
test('Owner neon layout: reference section order, real card images and mobile bounds',async({page},info)=>{
 const posts=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await home(page);
 await expect(page.locator('#homeHeroModel')).toHaveText('AI Canvas');
 await expect(page.locator('.home-launch-grid > *')).toHaveCount(7);
 await expect(page.locator('.home-create-card')).toHaveCount(6);
 await expect(page.getByRole('search').getByRole('searchbox',{name:'Search creative tools'})).toBeVisible();
 await expect(page.locator('.home-global-search')).toHaveAttribute('action','ai-apps.html');
 await expect(page.locator('.home-feature-spotlight')).toHaveCount(3);
 await expect(page.locator('.home-hero-recommended')).toContainText('Recommended');
 await expect(page.locator('.home-create-copy strong')).toHaveText(['Image','Video','Audio','AI Agent','AI Apps','Canvas']);
 await expect.poll(()=>page.locator('.inspiration-video-label').first().evaluate(el=>getComputedStyle(el).fontSize)).toBe('0px');
 await expect.poll(()=>page.locator('#inspirationPreview').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 for(const width of [1448,390,320]){
  await page.setViewportSize({width,height:1086});
  await page.locator('#createWithDeepsyq').scrollIntoViewIfNeeded();
  await expect.poll(()=>page.locator('.home-create-card img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
  // Check settled bounds and report exact overflowing cards if a layout regresses.
  await expect.poll(()=>page.evaluate(()=>{
   const ids=['homeHeroCarousel','homeQuickBar','createWithDeepsyq','inspirationPreview','canvasFeature'];
   const tops=ids.map(id=>document.getElementById(id).getBoundingClientRect().top);
   const offenders=[...document.querySelectorAll('.home-launch-grid,.home-create-grid,.home-create-card,.home-feature-triptych,.home-feature-spotlight,#homeQuickBar')].flatMap(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1?[]:[{class:el.className,left:r.left,right:r.right,viewport:innerWidth}];});
   return {ordered:tops.every((v,i)=>i===0||v>tops[i-1]),offenders};
  })).toEqual({ordered:true,offenders:[]});
  await page.screenshot({path:info.outputPath('neon-home-'+width+'.png'),fullPage:false});
 }
 expect(posts).toEqual([]);
});
test('Owner neon layout: feature shortcuts use existing destinations and showcase is not source credit',async({page})=>{
 await home(page);
 await expect(page.locator('.home-launch-grid a[href="ai-apps.html"]')).toBeVisible();
 await expect(page.locator('.home-launch-grid a[href="free-tools.html"]')).toBeVisible();
 await expect(page.locator('.home-create-card.tile-agent')).toHaveAttribute('href','#agentFeature');
 await expect(page.locator('.home-create-card.tile-agent')).toContainText('Coming soon');
 await expect(page.locator('#inspirationHeroFeature')).toHaveAttribute('href','#quickCreateForm');
 await page.locator('#homeHeroNext').click();
 await expect(page.locator('#inspirationHeroFeature')).toHaveAttribute('href','generate-studio.html?studio=video');
 await expect(page.locator('#homeHeroModel')).toHaveText('Seedance 2.0');
 await expect(page.locator('#homeHeroModel')).toHaveAttribute('title',/created in Google Flow/);
 await expect(page.locator('#homeHeroCreditLabel')).toHaveText('EXPLORE VIDEO MODELS');
 await page.locator('#homeHeroNext').click();
 await expect(page.locator('#homeHeroModel')).toHaveText('Seedance 2.5');
 await page.locator('.home-create-card.tile-canvas').click();
 await expect(page.locator('#quickCreateForm')).toBeInViewport();
});

// TEST ONLY: reproduce the native ready-but-stalled clock. Genuine film playback
// is independently checked without mocks in owner-home-media.spec.mjs.
test('Owner neon layout: a stuck startup clock retries the same film and respects user pause',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{
  Object.defineProperty(HTMLMediaElement.prototype,'readyState',{get(){return 4;}});
  Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{get(){return .003;},set(){}});
  HTMLMediaElement.prototype.load=function(){};
  HTMLMediaElement.prototype.play=function(){if(this.id==='inspirationHeroVideo')window.__mainPlays=(window.__mainPlays||0)+1;return Promise.resolve();};
  HTMLMediaElement.prototype.pause=function(){};
 });
 await home(page);
 await expect(page.locator('#inspirationHeroVideo')).toHaveAttribute('src',bundle.items[0].previewUrl);
 const initial=await page.evaluate(()=>window.__mainPlays||0);
 await expect.poll(()=>page.evaluate(()=>window.__mainPlays),{timeout:5000}).toBeGreaterThan(initial);
 await expect(page.locator('#inspirationHeroVideo')).toHaveAttribute('src',bundle.items[0].previewUrl);
 await page.locator('#homeHeroCarousel').press('Space');
 await expect(page.locator('#homeHeroPlay')).toHaveText('Play video');
 const stopped=await page.evaluate(()=>window.__mainPlays);
 await page.waitForTimeout(2200); // deliberate: prove a queued 1800ms retry stays cancelled
 expect(await page.evaluate(()=>window.__mainPlays)).toBe(stopped);
});

// Owner-cancelled standalone BASE #20 must never be served or promoted by visual preview.
test('retired Product Video URLs return 404 and do not appear in navigation',async({page,request})=>{
 await home(page);
 await expect(page.locator('a[href*="product-video"]')).toHaveCount(0);
 for(const path of ['/product-video','/product-video.html']){
  const response=await request.get(path);
  expect(response.status(),path).toBe(404);
 }
});
