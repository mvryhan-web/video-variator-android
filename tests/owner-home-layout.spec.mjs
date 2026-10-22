import {test,expect} from '@playwright/test';
// Google login is not exercised in this local UI suite (googleClientId is empty).
// Keep the external SDK from delaying load/pageshow and the privacy reset.
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{window.__ownerHomePageShown=false;window.addEventListener('pagehide',()=>{window.__ownerHomePageShown=false;});window.addEventListener('pageshow',()=>{window.__ownerHomePageShown=true;});});
 await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'application/javascript',body:''}));
});

import {readFile} from 'node:fs/promises';
const bundle=JSON.parse(await readFile(new URL('../app/src/main/assets/media/home/owner-20261018/manifest.json',import.meta.url)));
async function home(page){
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}},googleClientId:'',billingConfigured:false,features:{inspiration:true,aiApps:false,productVideo:false,onboarding:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/inspiration**',r=>r.fulfill({json:{items:new URL(r.request().url()).searchParams.get('target')==='agent'?[]:bundle.items.filter(x=>x.featured),categories:['Cinematic']}}));
 await page.goto('/deepsyq.html');
 await page.waitForFunction(()=>window.__ownerHomePageShown===true);
}
test('Owner neon layout: reference section order, real card images and mobile bounds',async({page},info)=>{
 const posts=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await home(page);
 await expect(page.locator('#homeHeroModel')).toHaveText('AI Canvas');
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
 await expect(page.locator('.inspiration-video-label')).toHaveCount(0);
 await expect.poll(()=>page.locator('#inspirationPreview').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 for(const width of [1448,390,320]){
  await page.setViewportSize({width,height:1086});
  await page.locator('#createWithDeepsyq').scrollIntoViewIfNeeded();
  await expect.poll(()=>page.locator('.home-feature-spotlight>img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
  // Check settled bounds and report exact overflowing cards if a layout regresses.
  await expect.poll(()=>page.evaluate(()=>{
   const ids=['homeHeroCarousel','homeQuickBar','createWithDeepsyq','inspirationPreview','canvasFeature'];
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
 await expect(page.locator('.home-feature-spotlight[href="ai-apps.html"]')).toBeVisible();
 await expect(page.locator('#homeQuickForm a[href="free-tools.html"]')).toBeVisible();
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
 await page.locator('#homeQuickForm .home-reference-link').click();
 await expect(page.locator('#quickCreateForm')).toBeInViewport();
});

test('Owner lock: server-side stale carousel captions cannot replace the six owner-approved headings',async({page})=>{
 const posts=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await home(page);
 await page.route('**/api/inspiration**',r=>r.fulfill({json:{items:bundle.items.filter(x=>x.featured).map(item=>({
  ...item,defaultSettings:{...item.defaultSettings,homeShowcase:{...item.defaultSettings.homeShowcase,title:'Sample video, created in Google Flow',label:'FEATURED VIDEO'}}
 }))}}));
 await page.reload();
 const names=['AI Canvas','Seedance 2.0','Seedance 2.5','Video Studio','AI Agent','Image Studio'];
 const labels=['CREATIVE WORKSPACE','EXPLORE VIDEO MODELS','EXPLORE VIDEO MODELS','CREATE WITH DEEPSYQ','CREATIVE CO-PILOT · COMING SOON','CREATE WITH DEEPSYQ'];
 for(let i=0;i<6;i++){
  await expect(page.locator('#homeHeroModel')).toHaveText(names[i]);
  await expect(page.locator('#homeHeroCreditLabel')).toHaveText(labels[i]);
  if(i<5)await page.locator('#homeHeroNext').click();
 }
 expect(posts).toEqual([]);
});

test('Owner neon layout: Home creation links open the existing destinations without extra model/settings controls or paid requests',async({page})=>{
 const posts=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 for(const [kind,studio] of [['image','image'],['video','video'],['music','audio']]){
  await home(page);
  await expect(page.locator('#homeModelPicker,#homeSettingsOpen,.home-compose-toolbar')).toHaveCount(0);
  await page.locator('[data-home-kind="'+kind+'"]').click();
  await expect(page).toHaveURL(new RegExp('generate-studio\\.html\\?studio='+studio+'&from=home'));
  await expect(page.locator('#prompt')).toBeVisible();
 }
 await home(page);
 await page.locator('#homeQuickPrompt').fill('A private idea kept across Back navigation');
 await page.locator('[data-home-kind="image"]').click();
 await expect(page.locator('#prompt')).toHaveValue('A private idea kept across Back navigation');
 await page.goBack();
 await page.waitForFunction(()=>window.__ownerHomePageShown===true);
 await page.locator('#homeQuickPrompt').fill('A second private video idea');
 await page.locator('[data-home-kind="video"]').click();
 await expect(page).toHaveURL(/studio=video&from=home/);
 await expect(page.locator('#prompt')).toHaveValue('A second private video idea');
 await home(page);
 await page.locator('[data-home-kind="agent"]').click();
 await expect(page).toHaveURL(/#agentFeature$/);
 await expect(page.locator('#agentFeature')).toBeInViewport();
 await page.locator('.home-compose-more').click();
 await expect(page).toHaveURL(/free-tools\.html$/);
 expect(posts).toEqual([]);
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
