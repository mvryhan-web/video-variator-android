import {test,expect} from '@playwright/test';

// Agent A BASE #3. Real browser inspection of the approved permanent Home
// gallery region. No copyrighted stills, fabricated MP4s or paid generation.
async function mockSafeHome(page,items=[]){
 await page.route('**/api/config',route=>route.fulfill({json:{
  plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},
         business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}},
  googleClientId:'',billingConfigured:false,
  features:{aiApps:false,inspiration:true,productVideo:false,onboarding:false}
 }}));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{ownerOnly:true,enabled:false,models:[],catalog:[]}}));
 await page.route('**/api/auth/email/status',route=>route.fulfill({json:{configured:false}}));
 await page.route('**/api/inspiration**',route=>route.fulfill({json:{items,categories:[],ratios:[],pagination:{hasMore:false}}}));
}

test('BASE 3: empty rights-cleared video feed keeps visible honest 16:9 gallery on desktop and mobile',async({page},info)=>{
 await mockSafeHome(page,[]);
 const paidPosts=[];
 page.on('request',request=>{if(request.method()==='POST'&&/\/api\/(studio|billing|ai-wallet)/.test(request.url()))paidPosts.push(request.url());});
 await page.setViewportSize({width:1448,height:900});
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 const gallery=page.locator('#homeHeroCarousel');
 await expect(gallery).toBeVisible();
 await expect(gallery).toHaveClass(/is-empty/);
 await expect(page.locator('#homeHeroEmpty')).toBeVisible();
 await expect(page.locator('#homeHeroEmpty')).toContainText('static preview, not a playable video');
 await expect(page.locator('#inspirationHeroFeature')).toBeHidden();
 await expect(page.locator('#homeHeroPlay')).toBeHidden();
 await expect(page.locator('#homeHeroSound')).toBeHidden();
 await expect(page.locator('#homeHeroNext')).toBeHidden();
 await expect(page.locator('#homeHeroPrevious')).toBeHidden();
 await expect(page.locator('#homeHeroDots button')).toHaveCount(0);
 await expect(page.locator('#homeHeroSlideLink')).toBeHidden();
 await expect(page.locator('#inspirationHeroVideo')).not.toHaveAttribute('src',/.+/);
 await expect(page.locator('.hero-stage h1')).toContainText('beyond limits');
 await expect(page.locator('#canvasFeature')).toBeVisible();
 await expect(page.locator('#homeQuickForm')).toBeVisible();
 const desktopRatio=await page.locator('.hero-stage').evaluate(el=>{const r=el.getBoundingClientRect();return r.width/r.height;});
 expect(desktopRatio).toBeGreaterThan(1.73);
 expect(desktopRatio).toBeLessThan(1.82);
 await page.screenshot({path:info.outputPath('home-no-approved-media-1448.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await expect(gallery).toBeVisible();
 await expect(page.locator('#homeHeroEmpty')).toBeVisible();
 await expect(page.locator('.hero-stage h1')).toBeVisible();
 await expect(page.locator('#canvasFeature')).toBeVisible();
 // Measure this A-owned hero only; C separately owns mobile drawer/top-nav acceptance.
 const fits=await gallery.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('.hero-stage').getBoundingClientRect();return a.left>=-1&&a.right<=innerWidth+1&&b.left>=-1&&b.right<=innerWidth+1;});
 expect(fits).toBeTruthy();
 await page.screenshot({path:info.outputPath('home-no-approved-media-390.png'),fullPage:true});
 expect(paidPosts).toEqual([]);
});

test('BASE 3: all unavailable clips leave static gallery, not broken Play or a false video link',async({page})=>{
 await page.addInitScript(()=>{
  HTMLMediaElement.prototype.load=function(){};
  HTMLMediaElement.prototype.pause=function(){};
  HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
 });
 const shared={kind:'video',actionTarget:'studio',category:'Cinematic',aspectRatio:'16:9',active:true,featured:true};
 await mockSafeHome(page,[
  {...shared,id:'unavailable-a',title:'Original scene A',previewUrl:'/unavailable-a.mp4'},
  {...shared,id:'unavailable-b',title:'Original scene B',previewUrl:'/unavailable-b.mp4'}
 ]);
 await page.goto('/deepsyq.html');
 await expect(page.locator('#inspirationHeroVideo')).toHaveAttribute('src','/unavailable-a.mp4');
 await page.locator('#inspirationHeroVideo').evaluate(el=>el.dispatchEvent(new Event('error')));
 await expect(page.locator('#inspirationHeroVideo')).toHaveAttribute('src','/unavailable-b.mp4');
 await page.locator('#inspirationHeroVideo').evaluate(el=>el.dispatchEvent(new Event('error')));
 await expect(page.locator('#homeHeroCarousel')).toBeVisible();
 await expect(page.locator('#homeHeroCarousel')).toHaveClass(/is-empty/);
 await expect(page.locator('#homeHeroPlay')).toBeHidden();
 await expect(page.locator('#homeHeroSound')).toBeHidden();
 await expect(page.locator('#homeHeroPrevious')).toBeHidden();
 await expect(page.locator('#homeHeroSlideLink')).toBeHidden();
 await expect(page.locator('#inspirationHeroVideo')).not.toHaveAttribute('src',/.+/);
 await expect(page.locator('#homeHeroEmpty')).toContainText('not a playable video');
 await expect(page.locator('#canvasFeature #quickCreateForm')).toBeVisible();
});

test('BASE 3: mocked navigation preserves real authorized slide metadata and wrapping only',async({page})=>{
 // Media methods are mocked intentionally: this asserts slide selection, NOT
 // a verified original playable video asset or real paid provider result.
 await page.addInitScript(()=>{
  HTMLMediaElement.prototype.load=function(){};
  HTMLMediaElement.prototype.pause=function(){};
  HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
 });
 const common={kind:'video',actionTarget:'studio',category:'Cinematic',aspectRatio:'16:9',active:true,featured:true};
 await mockSafeHome(page,[
  {...common,id:'a',title:'Original approved A',previewUrl:'/approved-a.mp4'},
  {...common,id:'b',title:'Original approved B',previewUrl:'/approved-b.mp4'}
 ]);
 await page.goto('/deepsyq.html');
 await expect(page.locator('#homeHeroCarousel')).toBeVisible();
 await expect(page.locator('#homeHeroCarousel')).not.toHaveClass(/is-empty/);
 await expect(page.locator('#homeHeroEmpty')).toBeHidden();
 await expect(page.locator('#homeHeroDots button')).toHaveCount(2);
 await expect(page.locator('#homeHeroPlay')).toBeVisible();
 await expect(page.locator('#inspirationHeroVideo')).toHaveJSProperty('muted',true);
 await page.locator('#homeHeroPrevious').click();
 await expect(page.locator('#homeHeroCounter')).toHaveText('Video 2 of 2');
 await page.locator('#homeHeroNext').click();
 await expect(page.locator('#homeHeroCounter')).toHaveText('Video 1 of 2');
 await expect(page.locator('#homeHeroSlideLink')).toHaveAttribute('href',/kind=video/);
});

test('BASE 3: one authorized video disables arrows and avoids dead carousel controls',async({page})=>{
 // Transport-only stub; does not claim actual playable source bytes.
 await page.addInitScript(()=>{
  HTMLMediaElement.prototype.load=function(){};
  HTMLMediaElement.prototype.pause=function(){};
  HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
 });
 await mockSafeHome(page,[{id:'single',kind:'video',title:'Only approved video',
  category:'Cinematic',aspectRatio:'16:9',actionTarget:'studio',active:true,featured:true,
  previewUrl:'/single-owner-video.mp4'}]);
 await page.goto('/deepsyq.html');
 await expect(page.locator('#homeHeroCarousel')).toBeVisible();
 await expect(page.locator('#homeHeroCounter')).toHaveText('Video 1 of 1');
 await expect(page.locator('#homeHeroPrevious')).toBeDisabled();
 await expect(page.locator('#homeHeroNext')).toBeDisabled();
 await expect(page.locator('#homeHeroDots button')).toHaveCount(1);
 await expect(page.locator('#homeHeroDots button')).toBeEnabled();
});

test('BASE 3: one failed source cannot leave useless arrows active on the sole surviving slide',async({page})=>{
 await page.addInitScript(()=>{
  HTMLMediaElement.prototype.load=function(){};
  HTMLMediaElement.prototype.pause=function(){};
  HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
 });
 const common={kind:'video',actionTarget:'studio',category:'Cinematic',
  aspectRatio:'16:9',active:true,featured:true};
 await mockSafeHome(page,[
  {...common,id:'a',title:'Broken approved clip',previewUrl:'/clip-a.mp4'},
  {...common,id:'b',title:'Remaining approved clip',previewUrl:'/clip-b.mp4'}
 ]);
 await page.goto('/deepsyq.html');
 await expect(page.locator('#homeHeroNext')).toBeEnabled();
 await page.locator('#inspirationHeroVideo').evaluate(el=>el.dispatchEvent(new Event('error')));
 await expect(page.locator('#inspirationHeroVideo')).toHaveAttribute('src','/clip-b.mp4');
 await expect(page.locator('#homeHeroCounter')).toHaveText('Video 2 of 2');
 await expect(page.locator('#homeHeroNext')).toBeDisabled();
 await expect(page.locator('#homeHeroPrevious')).toBeDisabled();
 await expect(page.locator('#homeHeroDots button').first()).toBeDisabled();
 await expect(page.locator('#homeHeroDots button').last()).toBeEnabled();
 await expect(page.locator('#homeHeroCarousel')).not.toHaveClass(/is-empty/);
});

test('BASE 3: all 13 original scene identities can navigate with only real API poster metadata',async({page})=>{
 // Test fixture has synthetic paths and mocked media methods, not actual
 // licensed playable V01–V13 movies or recreated owner imagery.
 await page.addInitScript(()=>{
  HTMLMediaElement.prototype.load=function(){};
  HTMLMediaElement.prototype.pause=function(){};
  HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
 });
 // Names correspond one-for-one to docs/DEEPSYQ_HOME_13_VIDEO_MASTER_SHOTLIST.md.
// Synthetic transport paths here are fixtures, not publishable imagery.
 const names=['Hero Girl','Dream Red Dress','Explore Castle','Portraits Beauty',
  'Discover Snow Mountains','Visualize White Tiger','Create Astronaut',
  'Transform Blossom House','Neon Car','Glamour Jewelry',
  'Waterfront House Dusk','Blue Fantasy','Red Silhouette'];
 const common={kind:'video',actionTarget:'studio',category:'Cinematic',aspectRatio:'16:9',active:true,featured:true};
 const scenes=names.map((title,i)=>({...common,id:'owner-identity-'+(i+1),title,
  previewUrl:'/approved-identity-'+(i+1)+'.mp4',previewPosterUrl:'/approved-poster-'+(i+1)+'.png'}));
 let exactVideoFeed=false;
 await mockSafeHome(page,[]);
 await page.route('**/api/inspiration**',route=>{
  const query=new URL(route.request().url()).searchParams;
  if(query.get('kind')==='video'&&query.get('limit')==='13'){
   exactVideoFeed=true;
   return route.fulfill({json:{items:scenes,categories:['Cinematic'],ratios:['16:9'],pagination:{hasMore:false}}});
  }
  return route.fulfill({json:{items:scenes.slice(0,2),categories:['Cinematic'],ratios:['16:9'],pagination:{hasMore:false}}});
 });
 await page.goto('/deepsyq.html');
 await expect(page.locator('#homeHeroDots button')).toHaveCount(13);
 expect(exactVideoFeed).toBe(true);
 await expect(page.locator('#homeHeroDots img')).toHaveCount(13);
 await expect(page.locator('#homeHeroDots button').nth(7)).toHaveAttribute('aria-label',/Transform Blossom House/);
 await expect(page.locator('#homeHeroDots button').nth(10)).toHaveAttribute('aria-label',/Waterfront House Dusk/);
 await expect(page.locator('#homeHeroDots button').first()).toHaveAttribute('aria-current','true');
 await expect(page.locator('#homeHeroCounter')).toHaveText('Video 1 of 13');
 await page.locator('#homeHeroPrevious').click();
 await expect(page.locator('#homeHeroSlideTitle')).toHaveText('Red Silhouette');
 await expect(page.locator('#homeHeroCounter')).toHaveText('Video 13 of 13');
 await page.locator('#homeHeroNext').click();
 await expect(page.locator('#homeHeroSlideTitle')).toHaveText('Hero Girl');
 await expect(page.locator('#homeHeroCounter')).toHaveText('Video 1 of 13');
 await expect(page.locator('#homeHeroDots button').last()).toHaveAttribute('aria-label',/Red Silhouette/);
 await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(2);
});

test('BASE 3: independent rights-cleared Hero survives failed preview and optional Agent feed',async({page})=>{
 await mockSafeHome(page,[]);
 // These are synthetic API contract entries, NOT delivered owner MP4s.
 await page.addInitScript(()=>{
  HTMLMediaElement.prototype.load=function(){};
  HTMLMediaElement.prototype.pause=function(){};
  HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
 });
 const item={id:'fixture-video',kind:'video',title:'Owner-authorized scene fixture',
  actionTarget:'studio',aspectRatio:'16:9',category:'Cinematic',active:true,featured:true,
  previewUrl:'/fixture-not-published.mp4',previewPosterUrl:'/fixture-not-published.png'};
 let receivedOwnerQuery=false;
 await page.route('**/api/inspiration**',route=>{
  const request=new URL(route.request().url());
  if(request.searchParams.get('kind')==='video'&&request.searchParams.get('limit')==='13'){
   receivedOwnerQuery=true;
   return route.fulfill({json:{items:[item],categories:[],ratios:[]}});
  }
  return route.fulfill({status:503,json:{error:'INSPIRATION_UNAVAILABLE'}});
 });
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>receivedOwnerQuery).toBe(true);
 await expect(page.locator('#homeHeroDots button')).toHaveCount(1);
 await expect(page.locator('#homeHeroSlideTitle')).toHaveText('Owner-authorized scene fixture');
 await expect(page.locator('#inspirationPreview')).toBeHidden();
 await expect(page.locator('#agentExamples')).toBeHidden();
});
