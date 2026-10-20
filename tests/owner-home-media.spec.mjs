import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const bundle=JSON.parse(await readFile(new URL('../app/src/main/assets/media/home/owner-20261018/manifest.json',import.meta.url)));
const clips=bundle.items.filter(x=>x.featured);

test('owner-supplied MP4: real muted autoplay, six complete films wrap, arrows, mobile layout',async({page},info)=>{
 test.setTimeout(120000);
 const diagnoseFailure=async()=>{
  const state=await page.locator('#inspirationHeroVideo').evaluate(v=>({src:v.getAttribute('src'),time:v.currentTime,duration:v.duration,paused:v.paused,ended:v.ended,ready:v.readyState,hidden:document.hidden,events:v.__mediaEvents,neighbors:[...document.querySelectorAll('.hero-neighbor video')].map(n=>({src:n.getAttribute('src'),time:n.currentTime,paused:n.paused,ready:n.readyState})),label:document.getElementById('homeHeroPlay').getAttribute('aria-label')})).catch(()=>null);
  console.log('PASSIVE_PLAYBACK_STATE '+JSON.stringify(state));
 };
 try{
 const mutations=[],mediaErrors=[];
 page.on('request',r=>{if(r.method()!=='GET'&&new URL(r.url()).pathname.startsWith('/api/'))mutations.push(r.url());});
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}},googleClientId:'',billingConfigured:false,features:{inspiration:true,aiApps:false,productVideo:false,onboarding:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/inspiration**',r=>{
  const u=new URL(r.request().url());
  // TEST ONLY: this stands in for the existing admin-published feed. It does
  // not attest rights or activate the supplied inactive records in any DB.
  const items=u.searchParams.get('target')==='agent'?[]:clips;
  return r.fulfill({json:{items,categories:['Cinematic'],ratios:['16:9'],pagination:{hasMore:false}}});
 });
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 const video=page.locator('#inspirationHeroVideo');
 await expect(page.locator('#homeHeroDots,#homeHeroSound,.hero-stage-copy,.home-hero-footer')).toHaveCount(0);
 await expect(page.locator('#homeHeroModel')).toHaveText('AI Canvas');
 await expect(page.locator('#homeHeroPreviousVideo')).toHaveAttribute('src',clips[5].previewUrl);
 await expect(page.locator('#homeHeroNextVideo')).toHaveAttribute('src',clips[1].previewUrl);
 const center=await page.locator('#inspirationHeroFeature').evaluate(v=>{const r=v.getBoundingClientRect();return {ratio:r.width/r.height,width:r.width,stage:v.closest('.hero-stage').getBoundingClientRect().width};});
 expect(center.ratio).toBeCloseTo(16/9,1);expect(center.width).toBeLessThan(center.stage*.9);
 await expect(page.locator('#homeHeroPlay')).not.toBeInViewport();
 await expect(video).toHaveAttribute('src',clips[0].previewUrl);
 await expect(video).toHaveJSProperty('muted',true);
 await expect(video).toHaveJSProperty('playsInline',true);
 if(info.project.name.startsWith('mobile'))await expect.poll(()=>page.locator('.hero-neighbor video').evaluateAll(videos=>videos.every(v=>v.paused))).toBe(true);
 // Never patch play/load, use fake media, or dispatch a synthetic ended event.
 await expect.poll(()=>video.evaluate(v=>v.currentTime),{timeout:20000}).toBeGreaterThan(0.2);
 await video.evaluate((v,actualEnds)=>{
  v.__actualEnds=actualEnds;
  v.__testEnded=0;v.__testErrors=[];v.__mediaEvents=[];v.__completedFilms={};
  for(const type of ['play','playing','pause','ended','waiting','stalled','suspend','error','loadeddata','timeupdate'])v.addEventListener(type,()=>{
   if((type==='timeupdate'||type==='ended')&&Number.isFinite(v.duration)&&v.currentTime>=v.__actualEnds[v.getAttribute('src')]-0.000001)v.__completedFilms[v.getAttribute('src')]=v.currentTime;
   v.__mediaEvents.push({type,src:v.getAttribute('src'),time:v.currentTime,duration:v.duration,paused:v.paused,ended:v.ended,ready:v.readyState,hidden:document.hidden});
   if(v.__mediaEvents.length>60)v.__mediaEvents.shift();
  });
  v.addEventListener('ended',()=>v.__testEnded++);v.addEventListener('error',()=>v.__testErrors.push(v.error?.code));
 },Object.fromEntries(clips.map(clip=>[clip.previewUrl,clip.durationSeconds])));
 for(let n=0;n<6;n++){
  await expect(video).toHaveAttribute('src',clips[n].previewUrl);
  await expect(page.locator('#homeHeroModel')).toHaveText(clips[n].defaultSettings.homeShowcase.title);
  await expect(page.locator('#homeHeroModel')).toHaveAttribute('title',/not source attribution/);
  await expect.poll(()=>video.evaluate(v=>v.readyState),{timeout:20000}).toBeGreaterThanOrEqual(2);
  await expect.poll(()=>video.evaluate(v=>v.currentTime),{timeout:20000}).toBeGreaterThan(0.1);
  const size=await video.evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration}));
  expect(size.width).toBe(1920);expect(size.height).toBe(1080);expect(size.duration).toBeGreaterThan(7.9);
  // Let every entire real film finish, including the last frame. Verify
  // actual media time at the ffprobe-verified stream EOF, not the browser
  // duration that WebKit can round upward by <1 millisecond.
  try{await expect(video).toHaveAttribute('src',clips[(n+1)%6].previewUrl,{timeout:20000});}
  catch(error){
   const state=await video.evaluate(v=>({src:v.getAttribute('src'),time:v.currentTime,duration:v.duration,paused:v.paused,ended:v.ended,ready:v.readyState,hidden:document.hidden,events:v.__mediaEvents,playLabel:document.getElementById('homeHeroPlay').getAttribute('aria-label')}));
   await test.info().attach('playback-state.json',{body:JSON.stringify(state,null,2),contentType:'application/json'});
   throw new Error(error.message+'\nPLAYBACK_STATE '+JSON.stringify(state));
  }
  expect(await video.evaluate((v,src)=>v.__completedFilms[src],clips[n].previewUrl)).toBeGreaterThanOrEqual(clips[n].durationSeconds-0.000001);
 }
 expect(Object.keys(await video.evaluate(v=>v.__completedFilms))).toHaveLength(6);
 mediaErrors.push(...await video.evaluate(v=>v.__testErrors));expect(mediaErrors).toEqual([]);
 await page.getByRole('button',{name:'Previous video',exact:true}).click();
 await expect(video).toHaveAttribute('src',clips[5].previewUrl);
 await page.getByRole('button',{name:'Next video',exact:true}).click();
 await expect(video).toHaveAttribute('src',clips[0].previewUrl);
 const hero=await page.locator('#homeHeroCarousel').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth};});
 expect(hero.left).toBeGreaterThanOrEqual(-1);expect(hero.right).toBeLessThanOrEqual(hero.width+1);
 expect(clips.some(x=>x.previewUrl.includes('red-gown'))).toBe(false);
 expect(mutations).toEqual([]);
 // Screenshot only AFTER playback assertions: full-page WebKit capture can
 // take longer than one eight-second film and change viewport visibility.
 await page.screenshot({path:info.outputPath('owner-carousel-after-real-cycle.png'),fullPage:false});
 }catch(error){await diagnoseFailure();throw error;}
});
