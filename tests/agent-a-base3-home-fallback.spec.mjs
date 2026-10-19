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
 await expect(page.locator('main > h1.sr-only')).toHaveText('Deepsyq AI creative platform');
 await expect(page.locator('.hero-stage h1')).toHaveCount(0);
 await expect(page.locator('#canvasFeature')).toBeVisible();
 await expect(page.locator('#homeQuickForm')).toBeVisible();
 const desktopRatio=await page.locator('.hero-stage').evaluate(el=>{const r=el.getBoundingClientRect();return r.width/r.height;});
 expect(desktopRatio).toBeGreaterThan(1.73);
 expect(desktopRatio).toBeLessThan(1.82);
 await page.screenshot({path:info.outputPath('home-no-approved-media-1448.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await expect(gallery).toBeVisible();
 await expect(page.locator('#homeHeroEmpty')).toBeVisible();
 await expect(page.locator('.hero-stage')).toBeVisible();
 await expect(page.locator('.hero-stage h1')).toHaveCount(0);
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

test('BASE 3: six featured carousel slots preserve thirteen original source scene identities',async({page})=>{
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
 await expect(page.locator('#homeHeroDots button')).toHaveCount(6);
 expect(exactVideoFeed).toBe(true);
 await expect(page.locator('#homeHeroDots img')).toHaveCount(6);
 await expect(page.locator('#homeHeroDots button').nth(5)).toHaveAttribute('aria-label',/Visualize White Tiger/);
 expect(scenes).toHaveLength(13); // Seven additional owner scene identities stay in the feed.
 await expect(page.locator('#homeHeroDots button').first()).toHaveAttribute('aria-current','true');
 await expect(page.locator('#homeHeroCounter')).toHaveText('Video 1 of 6');
 await page.locator('#homeHeroPrevious').click();
 await expect(page.locator('#homeHeroSlideTitle')).toHaveText('Visualize White Tiger');
 await expect(page.locator('#homeHeroCounter')).toHaveText('Video 6 of 6');
 await page.locator('#homeHeroNext').click();
 await expect(page.locator('#homeHeroSlideTitle')).toHaveText('Hero Girl');
 await expect(page.locator('#homeHeroCounter')).toHaveText('Video 1 of 6');
 await expect(page.locator('#homeHeroDots button').last()).toHaveAttribute('aria-label',/Visualize White Tiger/);
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

test('BASE 3: Canvas draft cannot be restored by a different account sharing this browser tab',async({page})=>{
 await mockSafeHome(page,[]);
 await page.addInitScript(()=>{
  if(!localStorage.getItem('vv_token'))localStorage.setItem('vv_token','fixture-account-A');
 });
 await page.route('**/api/me',route=>route.fulfill({json:{user:{id:'test-user',name:'Account A',isAdmin:false}}}));
 let paidPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/studio\/jobs/.test(r.url()))paidPosts++;});
 await page.goto('/deepsyq.html');
 const aPrompt='PRIVATE ACCOUNT A: winter fashion concept';
 const bPrompt='PRIVATE ACCOUNT B: independent product design';
 await page.locator('#quickCreatePrompt').fill(aPrompt);
 await expect.poll(()=>page.evaluate(()=>{
  const keys=Object.keys(sessionStorage).filter(k=>k.startsWith('deepsyq_quick_canvas_draft_v2_'));
  return keys.some(key=>JSON.parse(sessionStorage.getItem(key)||'null')?.prompt==='PRIVATE ACCOUNT A: winter fashion concept');
 })).toBe(true);
 await page.reload();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue(aPrompt);
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-B'));
 await page.reload();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('');
 await page.locator('#quickCreatePrompt').fill(bPrompt);
 await expect.poll(()=>page.evaluate(()=>Object.keys(sessionStorage)
  .filter(key=>key.startsWith('deepsyq_quick_canvas_draft_v2_'))
  .some(key=>JSON.parse(sessionStorage.getItem(key)||'null')?.prompt==='PRIVATE ACCOUNT B: independent product design'))).toBe(true);
 await page.reload();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue(bPrompt);
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-A'));
 await page.reload();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue(aPrompt);
 const keys=await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('deepsyq_quick_canvas_draft_v2_')));
 expect(keys.length).toBeGreaterThanOrEqual(2);
 expect(keys.some(key=>key.includes('fixture-account-A')||key.includes('fixture-account-B'))).toBe(false);
 expect(paidPosts).toBe(0);
});

test('BASE 3: cross-tab account switch clears unsent prompts and reference previews on Home',async({page})=>{
 await mockSafeHome(page,[]);
 await page.addInitScript(()=>localStorage.setItem('vv_token','fixture-account-A'));
 await page.route('**/api/me',route=>route.fulfill({json:{user:{id:'owner',name:'Account A',isAdmin:false}}}));
 await page.goto('/deepsyq.html');
 await page.locator('#quickCreatePrompt').fill('PRIVATE OLD CANVAS PROMPT');
 await page.locator('#homeQuickPrompt').fill('PRIVATE OLD HOME IDEA');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 await page.locator('#quickCreateFiles').setInputFiles({name:'private-reference.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(1);
 await page.evaluate(()=>{
  localStorage.setItem('vv_token','fixture-account-B');
  dispatchEvent(new StorageEvent('storage',{key:'vv_token',newValue:'fixture-account-B'}));
 });
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('');
 await expect(page.locator('#homeQuickPrompt')).toHaveValue('');
 await expect(page.locator('#quickCreateFiles')).toHaveValue('');
 await expect(page.locator('#quickCreatePreviews .quick-reference')).toHaveCount(0);
 await expect(page.locator('#quickCreateStatus')).toContainText('Account changed');
});

test('BASE 3: offline platform config never hides the permanent original Hero gallery',async({page})=>{
 await mockSafeHome(page,[]);
 await page.route('**/api/config',route=>route.fulfill({status:503,json:{error:'CONFIG_UNAVAILABLE'}}));
 let paidPosts=0;
 page.on('request',request=>{if(request.method()==='POST'&&/\/api\/studio\/jobs/.test(request.url()))paidPosts++;});
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#homeHeroCarousel')).toBeVisible();
 await expect(page.locator('#homeHeroCarousel')).toHaveClass(/is-empty/);
 await expect(page.locator('#homeHeroEmpty')).toBeVisible();
 await expect(page.locator('#homeHeroStatus')).toContainText('No approved playable featured video');
 await expect(page.locator('main > h1.sr-only')).toHaveText('Deepsyq AI creative platform');
 await expect(page.locator('.hero-stage h1')).toHaveCount(0);
 await expect(page.locator('#homeQuickForm')).toBeVisible();
 await expect(page.locator('#paymentStatus')).toContainText('Plans could not load');
 expect(paidPosts).toBe(0);
});

test('BASE 3: narrow 320px Home Hero has no intrinsic-width overflow without clipping the approved gallery',async({page},info)=>{
 await mockSafeHome(page,[]);
 let paidJobs=0;
 page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/api/studio/jobs'))paidJobs++;});
 await page.setViewportSize({width:320,height:740});
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#homeHeroCarousel')).toBeVisible();
 await expect(page.locator('main > h1.sr-only')).toHaveText('Deepsyq AI creative platform');
 await expect(page.locator('.hero-stage h1')).toHaveCount(0);
 for(const width of [320,340,355,390]){
  await page.setViewportSize({width,height:740});
  const layout=await page.evaluate(()=>{
   const hero=document.querySelector('.hero-stage').getBoundingClientRect();
   const copy=document.querySelector('.hero-stage-copy').getBoundingClientRect();
   const stage=document.querySelector('.hero').getBoundingClientRect();
   return {viewport:innerWidth,page:document.documentElement.scrollWidth,
    stageLeft:hero.left,stageRight:hero.right,stageWidth:hero.width,stageHeight:hero.height,
    copyLeft:copy.left,copyRight:copy.right,heroRight:stage.right};
  });
  // The owner artwork remains visibly full-width INSIDE the 18px main padding.
  expect(layout.stageLeft).toBeGreaterThanOrEqual(17);
  expect(layout.stageRight).toBeLessThanOrEqual(width-17);
  expect(layout.copyLeft).toBeGreaterThanOrEqual(layout.stageLeft-1);
  expect(layout.copyRight).toBeLessThanOrEqual(layout.stageRight+1);
  expect(layout.page).toBeLessThanOrEqual(width);
  expect(layout.stageHeight).toBeGreaterThanOrEqual(399);
  if(width===390){
   expect(layout.stageWidth/layout.stageHeight).toBeGreaterThan(0.77);
   expect(layout.stageWidth/layout.stageHeight).toBeLessThan(0.83);
  }
  if(width===320||width===390)await page.screenshot({path:info.outputPath('owner-hero-fit-'+width+'.png'),fullPage:false});
 }
 expect(paidJobs).toBe(0);
});


test('BASE 3: approved Studio hero appears before the slow Inspiration mosaic responds',async({page})=>{
 await page.addInitScript(()=>{
  HTMLMediaElement.prototype.load=function(){};
  HTMLMediaElement.prototype.pause=function(){};
  HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
 });
 await mockSafeHome(page,[]);
 let releaseMosaic;
 const mosaicHeld=new Promise(resolve=>releaseMosaic=resolve);
 let heroRequested=false,mosaicRequested=false,paidPosts=0;
 page.on('request',r=>{
  if(r.method()==='POST'&&['/api/studio/jobs','/api/billing/checkout','/api/ai-wallet/purchase'].includes(new URL(r.url()).pathname))paidPosts++;
 });
 await page.route('**/api/inspiration**',async route=>{
  const q=new URL(route.request().url()).searchParams;
  if(q.get('kind')==='video'&&q.get('limit')==='13'){
   heroRequested=true;
   if(q.get('target')!=='studio')return route.fulfill({status:400,json:{error:'STUDIO_TARGET_REQUIRED'}});
   return route.fulfill({json:{items:[{
    id:'studio-approved-hero',kind:'video',actionTarget:'studio',
    title:'Approved moving hero for test transport only',category:'Cinematic',
    aspectRatio:'16:9',previewUrl:'/placeholder-transport-hero.mp4'
   }],categories:[],ratios:[]}});
  }
  if(q.get('limit')==='12'){
   mosaicRequested=true;
   await mosaicHeld;
   return route.fulfill({json:{items:[],categories:[],ratios:[]}});
  }
  return route.fulfill({json:{items:[],categories:[],ratios:[]}});
 });
 try{
  await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#homeHeroSlideTitle')).toHaveText('Approved moving hero for test transport only');
  await expect(page.locator('#homeHeroCarousel')).not.toHaveClass(/is-empty/);
  expect(heroRequested).toBe(true);
  expect(mosaicRequested).toBe(true);
  await expect(page.locator('#canvasFeature')).toBeVisible();
  expect(paidPosts).toBe(0);
 }finally{releaseMosaic();}
});


test('BASE 3: owner violet-pink Home and Canvas CTAs stay consistent on desktop and phone',async({page})=>{
 await mockSafeHome(page,[]);
 let jobs=0;
 page.on('request',request=>{
  if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))jobs++;
 });
 await page.setViewportSize({width:1448,height:900});
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 for(const width of [1448,390]){
  await page.setViewportSize({width,height:900});
  const css=await page.evaluate(()=>{
   const hero=getComputedStyle(document.querySelector('.hero-stage-copy .primary'));
   const canvas=getComputedStyle(document.querySelector('#quickCreateSubmit'));
   return {heroBackground:hero.backgroundImage,heroColor:hero.color,
    canvasBackground:canvas.backgroundImage,canvasColor:canvas.color};
  });
  for(const image of [css.heroBackground,css.canvasBackground]){
   expect(image).toContain('linear-gradient');
   expect(image).not.toContain('rgb(210, 247, 174)'); // obsolete mint CTA
  }
  expect(css.heroColor).toBe('rgb(16, 11, 35)'); // approved dark-ink on neon CTA
  expect(css.canvasColor).toBe('rgb(255, 255, 255)');
  await expect(page.locator('.hero-stage h1')).toHaveCount(0);
  await expect(page.locator('#homeHeroCarousel')).toBeVisible();
 }
 expect(jobs).toBe(0);
});
