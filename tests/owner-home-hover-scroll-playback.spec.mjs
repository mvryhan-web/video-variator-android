import {test,expect} from '@playwright/test';

const fixture=(id,kind)=>({
 id,slug:id,title:id,kind,category:'Cinematic',actionTarget:'studio',
 previewUrl:kind==='video'?'/media/home/neon-20261018/canvas-card.mp4':'/media/home/neon-20261018/canvas.webp',
 previewPosterUrl:'/media/home/neon-20261018/canvas.webp',
 prompt:'Synthetic test prompt',aspectRatio:'16:9',requiredInputTypes:[],active:true
});
async function setup(page,{spy=true}={}){
 await page.route('**/api/config',r=>r.fulfill({json:{billingConfigured:false,features:{inspiration:true,aiApps:true,onboarding:false},plans:{}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/inspiration**',r=>r.fulfill({json:{
  items:[fixture('motion-example','video'),fixture('still-example','image')],
  categories:['Cinematic'],ratios:['16:9'],pagination:{hasMore:false}
 }}));
 // Real browser event/DOM/IntersectionObserver path, no full MP4 fetch required.
 if(spy)await page.addInitScript(()=>{
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
  await expect(video).not.toHaveAttribute('src',/\.mp4/);
  await card.hover();
  await expect(video).toHaveAttribute('src',/\.mp4/);
  await page.mouse.move(0,0);
  await expect(video).not.toHaveAttribute('src',/\.mp4/);
 }
 const inspiration=page.locator('#inspirationPreviewGrid .inspiration-preview-card');
 const motion=inspiration.first().locator('video');
 await inspiration.first().evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await expect(motion).not.toHaveAttribute('src',/\.mp4/);
 await inspiration.first().hover();
 await expect(motion).toHaveAttribute('src',/\.mp4/);
 await page.mouse.move(0,0);
 await expect(motion).not.toHaveAttribute('src',/\.mp4/);
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
 await expect(video).not.toHaveAttribute('src',/\.mp4/);
 await spotlight.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await expect(video).toHaveAttribute('src',/\.mp4/);
 await page.evaluate(()=>window.scrollTo(0,0));
 await expect(video).not.toHaveAttribute('src',/\.mp4/);
 const motion=page.locator('#inspirationPreviewGrid .inspiration-preview-card').first();
 await motion.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await expect(motion.locator('video')).toHaveAttribute('src',/\.mp4/);
 await page.evaluate(()=>window.scrollTo(0,0));
 await expect(motion.locator('video')).not.toHaveAttribute('src',/\.mp4/);
});

test('genuine owner MP4 advances while active and stops when the card leaves view',async({page},testInfo)=>{
 test.skip(!['chromium','mobile-webkit'].includes(testInfo.project.name),'real media checked in desktop Chromium and iOS WebKit');
 test.setTimeout(90000);
 await setup(page,{spy:false});
 const mobile=testInfo.project.name.startsWith('mobile');
 const card=page.locator('.home-feature-spotlight').first();
 const video=card.locator('video');
 await card.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 if(!mobile)await card.hover();
 await expect(video).toHaveAttribute('src',/\.mp4/);
 await expect.poll(()=>video.evaluate(v=>v.currentTime),{timeout:25000}).toBeGreaterThan(.15);
 if(mobile)await page.evaluate(()=>window.scrollTo(0,0));
 else await page.mouse.move(0,0);
 await expect(video).not.toHaveAttribute('src',/\.mp4/);
 // A newly selected Inspiration preview must play a real file too.
 const inspiration=page.locator('#inspirationPreviewGrid .inspiration-preview-card').first();
 await inspiration.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 if(!mobile)await inspiration.hover();
 const preview=inspiration.locator('video');
 await expect(preview).toHaveAttribute('src',/\.mp4/);
 await expect.poll(()=>preview.evaluate(v=>v.currentTime),{timeout:25000}).toBeGreaterThan(.15);
 await page.evaluate(()=>window.scrollTo(0,0));
 await expect(preview).not.toHaveAttribute('src',/\.mp4/);
});

test('mobile Need an idea? scrolls to the real Inspiration heading without opening starter ideas',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await setup(page);
 const summary=page.locator('.home-prompt-ideas > summary');
 const inspiration=page.locator('#inspirationPreview');
 await expect(summary).toBeVisible();
 await expect(inspiration).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,0));
 await summary.click();
 await expect(page.locator('.home-prompt-ideas')).not.toHaveAttribute('open');
 // Respect the fixed mobile header; the actual Inspiration heading must
 // be in the viewport rather than obscured behind the header.
 await expect.poll(()=>inspiration.evaluate(el=>{
  const top=el.getBoundingClientRect().top;
  const header=document.querySelector('header.ds-mobile-header');
  const visibleHeaderBottom=header?.getBoundingClientRect().bottom||0;
  return top>=visibleHeaderBottom-8&&top<window.innerHeight*0.75;
 }),{timeout:8000}).toBe(true);
 await expect(page.locator('#inspirationPreviewTitle')).toBeVisible();
});

test('desktop hides Need an idea? entirely; mobile retains Inspiration shortcut',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await setup(page);
 const details=page.locator('.home-prompt-ideas');
 const summary=details.locator('summary');
 await expect(details).toBeHidden();
 await expect(summary).toBeHidden();
 await page.setViewportSize({width:390,height:844});
 await expect(details).toBeVisible();
 await expect(summary).toBeVisible();
 await page.setViewportSize({width:1280,height:800});
 await expect(details).toBeHidden();
});
