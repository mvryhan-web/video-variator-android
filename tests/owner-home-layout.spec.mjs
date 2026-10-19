import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const bundle=JSON.parse(await readFile(new URL('../app/src/main/assets/media/home/owner-20261018/manifest.json',import.meta.url)));
async function home(page){
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}},googleClientId:'',billingConfigured:false,features:{inspiration:true,aiApps:false,productVideo:false,onboarding:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/inspiration**',r=>r.fulfill({json:{items:new URL(r.request().url()).searchParams.get('target')==='agent'?[]:bundle.items.filter(x=>x.featured),categories:['Cinematic']}}));
 await page.goto('/deepsyq.html');
}
test('Owner neon layout: reference section order, real card images and mobile bounds',async({page},info)=>{
 const posts=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await home(page);
 await expect(page.locator('#homeHeroModel')).toHaveText('Sample video, created in Google Flow');
 await expect(page.locator('.home-launch-grid')).toHaveCount(0);
 await expect(page.locator('#homeQuickForm [data-home-kind]')).toHaveCount(4);
 await expect(page.locator('#homeCreativeTools')).toHaveCount(1);
 await expect(page.locator('#homeCreativeTools .home-create-card')).toHaveCount(6);
 await expect(page.locator('#createWithDeepsyq .home-create-card')).toHaveCount(0);
 await expect(page.locator('#createWithDeepsyq .home-feature-spotlight')).toHaveCount(3);
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
  await page.locator('#homeCreativeTools').scrollIntoViewIfNeeded();
  await expect.poll(()=>page.locator('.home-create-card img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
  // Check settled bounds and report exact overflowing cards if a layout regresses.
  await expect.poll(()=>page.evaluate(()=>{
   const ids=['homeHeroCarousel','homeQuickBar','homeCreativeTools','createWithDeepsyq','inspirationPreview','canvasFeature'];
   const tops=ids.map(id=>document.getElementById(id).getBoundingClientRect().top);
   const offenders=[...document.querySelectorAll('.home-compose-modes,.home-create-grid,.home-create-card,.home-feature-triptych,.home-feature-spotlight,#homeQuickBar')].flatMap(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1?[]:[{class:el.className,left:r.left,right:r.right,viewport:innerWidth}];});
   return {ordered:tops.every((v,i)=>i===0||v>tops[i-1]),offenders};
  })).toEqual({ordered:true,offenders:[]});
  await page.screenshot({path:info.outputPath('neon-home-'+width+'.png'),fullPage:false});
 }
 expect(posts).toEqual([]);
});
test('Owner neon layout: feature shortcuts keep routes and show truthful Flow source credit',async({page})=>{
 await home(page);
 await expect(page.locator('#homeCreativeTools a[href="ai-apps.html"]')).toBeVisible();
 await expect(page.locator('#homeQuickForm a[href="free-tools.html"]')).toBeVisible();
 await expect(page.locator('.home-create-card.tile-agent')).toHaveAttribute('href','#agentFeature');
 await expect(page.locator('.home-create-card.tile-agent')).toContainText('Coming soon');
 await expect(page.locator('#inspirationHeroFeature')).toHaveAttribute('href','#quickCreateForm');
 await page.locator('#homeHeroNext').click();
 await expect(page.locator('#inspirationHeroFeature')).toHaveAttribute('href','generate-studio.html?studio=video');
 await expect(page.locator('#homeHeroModel')).toHaveText('Sample video, created in Google Flow');
 await expect(page.locator('#homeHeroModel')).toHaveAttribute('title',/created in Google Flow/);
 await expect(page.locator('#homeHeroCreditLabel')).toHaveText('FEATURED VIDEO');
 await page.locator('#homeHeroNext').click();
 await expect(page.locator('#homeHeroModel')).toHaveText('Sample video, created in Google Flow');
 await page.locator('.home-create-card.tile-canvas').click();
 await expect(page.locator('#quickCreateForm')).toBeInViewport();
});

test('Home creator picker: studio model/settings windows are centered, model-aware and no-spend',async({page})=>{
 await home(page);let paidPosts=0;
 await page.route('**/api/studio/config',route=>route.fulfill({json:{ownerOnly:true,enabled:false,models:[{id:'fixture-video',kind:'video',enabled:true}],catalog:[{id:'fixture-video',label:'Fixture video model',provider:'Fixture',kind:'video',enabled:true,ratios:['16:9','9:16'],resolutions:['720p'],durations:[4,8],references:0,capabilities:{ratios:['16:9','9:16'],resolutions:['720p'],durations:[4,8]}}]}}));
 page.on('request',request=>{if(request.method()==='POST'&&/\/api\/studio\/(jobs|estimate)/.test(new URL(request.url()).pathname))paidPosts++;});
 await expect(page.locator('#homeQuickForm [data-home-kind]')).toHaveCount(4);
 await expect(page.locator('[data-home-kind="image"]')).toBeVisible();
 await expect(page.locator('[data-home-kind="video"]')).toBeVisible();
 await expect(page.locator('[data-home-kind="music"]')).toContainText('Audio');
 await page.locator('[data-home-kind="video"]').click();
 await expect(page.locator('[data-home-kind="video"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#homeModelPicker')).toHaveAttribute('data-home-model-kind','video');
 await page.locator('#homeModelPicker').click();
 await expect(page.locator('#modelFlyout')).toBeVisible();
 await expect(page.locator('#modelFlyoutTitle')).toHaveText('Video models');
 const modelCenter=await page.locator('#modelFlyout').evaluate(el=>{const r=el.getBoundingClientRect();return {x:Math.abs(r.left+r.width/2-innerWidth/2),y:Math.abs(r.top+r.height/2-innerHeight/2),inside:r.left>=0&&r.right<=innerWidth};});
 expect(modelCenter.x).toBeLessThan(3);expect(modelCenter.y).toBeLessThan(3);expect(modelCenter.inside).toBe(true);
 await page.locator('#modelFlyoutClose').click();
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:844});
  await expect(page.locator('#homeModelPicker')).toBeVisible();
  await expect(page.locator('#homeSettingsOpen')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('#homeSettingsOpen').click();
 await expect(page.locator('#homeSettingsDialog')).toBeVisible();
 const settingsCenter=await page.locator('#homeSettingsDialog').evaluate(el=>{const r=el.getBoundingClientRect();return {x:Math.abs(r.left+r.width/2-innerWidth/2),y:Math.abs(r.top+r.height/2-innerHeight/2),inside:r.left>=0&&r.right<=innerWidth};});
 expect(settingsCenter.x).toBeLessThan(3);expect(settingsCenter.y).toBeLessThan(3);expect(settingsCenter.inside).toBe(true);
 const supportedRatios=await page.locator('#homePreferredRatio option').evaluateAll(options=>options.map(option=>option.value));
 expect(supportedRatios).toContain('16:9');expect(supportedRatios).toContain('9:16');
 await page.locator('#homePreferredRatio').selectOption('9:16');
 await page.locator('#homeSettingsApply').click();
 await expect(page.locator('#homeSettingsDialog')).toBeHidden();
 await page.locator('#homeQuickPrompt').fill('A quiet cinematic landscape');
 await page.locator('#homeQuickSubmit').click();
 await expect(page).toHaveURL(/generate-studio\.html\?studio=video&from=home/);
 await expect(page.locator('#ratio')).toHaveValue('9:16');
 expect(paidPosts).toBe(0);
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

// TEST ONLY: bounded WebKit EOF clock reproduction; real films have separate native acceptance.
for(const clock of [{name:'rounded demuxer EOF',time:7.958333333,paused:false,advances:true},{name:'unplayed final frame',time:7.939,paused:false,advances:false},{name:'paused at EOF',time:7.958333333,paused:true,advances:false}]){
 test(`Owner neon layout: EOF recovery handles ${clock.name} without skipping content`,async({page})=>{
  await page.addInitScript(()=>{
   window.__clockTime=7.9;window.__clockPaused=false;
   Object.defineProperty(HTMLMediaElement.prototype,'duration',{get(){return 7.959;}});
   Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{get(){return window.__clockTime;},set(){}});
   Object.defineProperty(HTMLMediaElement.prototype,'readyState',{get(){return 4;}});
   Object.defineProperty(HTMLMediaElement.prototype,'paused',{get(){return window.__clockPaused;}});
   Object.defineProperty(HTMLMediaElement.prototype,'ended',{get(){return false;}});
   HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
   HTMLMediaElement.prototype.pause=function(){};
  });
  await home(page);
  const video=page.locator('#inspirationHeroVideo');await expect(video).toHaveAttribute('src',bundle.items[0].previewUrl);
  await expect(video).toBeInViewport();
  await video.evaluate((v,clock)=>{window.__clockTime=clock.time;window.__clockPaused=clock.paused;v.dispatchEvent(new Event('timeupdate'));},clock);
  if(clock.advances)await expect(video).toHaveAttribute('src',bundle.items[1].previewUrl);
  else{await page.waitForTimeout(150);await expect(video).toHaveAttribute('src',bundle.items[0].previewUrl);}
 });
}
