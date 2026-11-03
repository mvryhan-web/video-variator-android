import {test,expect} from '@playwright/test';

const fixture=(id,kind)=>({
 id,slug:id,title:id,kind,category:'Cinematic',actionTarget:'studio',
 previewUrl:kind==='video'?'/media/home/neon-20261018/canvas-card.mp4':'/media/home/neon-20261018/canvas.webp',
 previewPosterUrl:'/media/home/neon-20261018/canvas.webp',
 prompt:'Synthetic test prompt',aspectRatio:'16:9',requiredInputTypes:[],active:true
});
async function setup(page){
 await page.route('**/api/config',r=>r.fulfill({json:{billingConfigured:false,features:{inspiration:true,aiApps:true,onboarding:false},plans:{}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/inspiration**',r=>r.fulfill({json:{
  items:[fixture('motion-example','video'),fixture('still-example','image')],
  categories:['Cinematic'],ratios:['16:9'],pagination:{hasMore:false}
 }}));
 // Real browser event/DOM/IntersectionObserver path, no full MP4 fetch required.
 await page.addInitScript(()=>{
  window.__previewCalls=[];
  const nativePlay=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){
   if(this.matches('.home-spotlight-video, #inspirationPreviewGrid video')){
    window.__previewCalls.push({type:'play',cls:this.className,src:this.getAttribute('src')});
    return Promise.resolve();
   }
   return nativePlay.call(this);
  };
 });
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(2);
}

test('desktop spotlight and Inspiration videos play only while hovered; photos never play',async({page},testInfo)=>{
 test.skip(testInfo.project.name.startsWith('mobile'),'requires desktop hover pointer');
 await setup(page);
 const cards=page.locator('.home-feature-spotlight');
 for(let i=0;i<3;i++){
  const card=cards.nth(i),video=card.locator('video');
  await card.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await expect(video).not.toHaveAttribute('src',/\\.mp4/);
  await card.hover();
  await expect(video).toHaveAttribute('src',/\\.mp4/);
  await page.mouse.move(0,0);
  await expect(video).not.toHaveAttribute('src',/\\.mp4/);
 }
 const inspiration=page.locator('#inspirationPreviewGrid .inspiration-preview-card');
 const motion=inspiration.first().locator('video');
 await inspiration.first().evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await expect(motion).not.toHaveAttribute('src',/\\.mp4/);
 await inspiration.first().hover();
 await expect(motion).toHaveAttribute('src',/\\.mp4/);
 await page.mouse.move(0,0);
 await expect(motion).not.toHaveAttribute('src',/\\.mp4/);
 await expect(inspiration.nth(1).locator('img')).toHaveCount(1);
 await expect(inspiration.nth(1).locator('video')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__previewCalls.length)).toBeGreaterThan(0);
});

test('mobile spotlight and Inspiration videos load only while scrolled into view',async({page},testInfo)=>{
 test.skip(!testInfo.project.name.startsWith('mobile'),'requires real mobile emulation');
 await setup(page);
 const spotlight=page.locator('.home-feature-spotlight').first();
 const video=spotlight.locator('video');
 await page.evaluate(()=>window.scrollTo(0,0));
 await expect(video).not.toHaveAttribute('src',/\\.mp4/);
 await spotlight.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await expect(video).toHaveAttribute('src',/\\.mp4/);
 await page.evaluate(()=>window.scrollTo(0,0));
 await expect(video).not.toHaveAttribute('src',/\\.mp4/);
 const motion=page.locator('#inspirationPreviewGrid .inspiration-preview-card').first();
 await motion.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await expect(motion.locator('video')).toHaveAttribute('src',/\\.mp4/);
 await page.evaluate(()=>window.scrollTo(0,0));
 await expect(motion.locator('video')).not.toHaveAttribute('src',/\\.mp4/);
});
