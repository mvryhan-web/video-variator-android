import {test,expect} from '@playwright/test';

// Detail-preview close must display only ×, without a circular background/ring,
// across mouse, focus, image, video, Canvas and Agent previews.
async function expectPlainClose(dialog){
 const close=dialog.getByRole('button',{name:'Close inspiration preview'});
 await expect(close).toHaveText('×');
 async function checkStyle(){
  const style=await close.evaluate(el=>{
   const s=getComputedStyle(el);
   return {radius:s.borderTopLeftRadius,border:s.borderTopWidth,background:s.backgroundColor,shadow:s.boxShadow,outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth};
  });
  expect(style.radius).toBe('0px');
  expect(style.border).toBe('0px');
  expect(style.background).toBe('rgba(0, 0, 0, 0)');
  expect(style.shadow).toBe('none');
  // Some engines retain a nominal outline-width even if the outline is disabled.
  // No outline is painted when the style is "none" or its width is zero.
  expect(style.outlineStyle==='none'||Number.parseFloat(style.outlineWidth)===0,JSON.stringify(style)).toBe(true);
 }
 await checkStyle();
 // Touch-only WebKit has no hover device; desktop browsers must still pass hover.
 if(await close.evaluate(()=>matchMedia('(hover: hover)').matches)){
  await close.hover();await checkStyle();
 }
 await close.focus();await checkStyle();
 return close;
}
const video={id:'owner-video',title:'Original cinematic video',kind:'video',category:'Cinematic',previewUrl:'/media/home/owner-20261018/v01.mp4',prompt:'Original owner video prompt',aspectRatio:'16:9',actionTarget:'studio',requiredInputTypes:[],defaultSettings:{ratio:'16:9'},defaultModel:null};
const image={id:'owner-image',title:'Golden perfume splash',kind:'image',category:'Product Ads',previewUrl:'/media/inspiration/openai-20261021/image-01-orbital-muse.webp',prompt:'Exact golden perfume prompt',previewDimensions:[819,1024],sourceAspectRatio:'4:5',displayModel:'OpenAI ChatGPT image_gen · exact model/version not exposed',advancedParameters:{min_ratio:null,max_ratio:null,cot_mode:null,use_pre_llm:null},aspectRatio:'1:1',actionTarget:'studio',requiredInputTypes:[],defaultSettings:{ratio:'1:1'},defaultModel:null};
test('Home Inspiration filters image and video cards in place; detail shows the exact prompt; old page redirects',async({page})=>{
 test.setTimeout(90000);
 const paid=[];page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio|billing|ai-wallet)/.test(r.url()))paid.push(r.url());});
 await page.route('**/api/config',route=>route.fulfill({json:{billingConfigured:false,googleClientId:'',features:{aiApps:true,inspiration:true,productVideo:false,onboarding:false},plans:{},auth:{}}}));
 await page.route('**/api/templates?**',route=>route.fulfill({json:{items:[]}}));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,ownerOnly:true,publicGenerationEnabled:false,models:[],catalog:[]}}));
 await page.route('**/api/auth/email/status',route=>route.fulfill({json:{configured:false}}));
 await page.route('**/api/inspiration**',route=>route.fulfill({json:{items:[video,image],categories:['Cinematic','Product Ads'],ratios:['16:9','1:1']}}));
 for(const width of [390,768,1448]){
  await page.setViewportSize({width,height:850});await page.goto('/deepsyq.html?galleryWidth='+width,{waitUntil:'domcontentloaded'});
  const section=page.locator('#inspirationPreview');await expect(section).toBeVisible({timeout:15000});
  const tabs=section.locator('[data-inspiration-kind]');await expect(tabs).toHaveText(['All','Video','Image']);
  // Owner removed the lead text; the tabs should align with the visible title.
  await expect(section.locator('.inspiration-preview-lead')).toHaveCount(0);
  const tabsLeft=await tabs.first().evaluate(el=>el.getBoundingClientRect().left);
  const titleLeft=await section.locator('#inspirationPreviewTitle').evaluate(el=>el.getBoundingClientRect().left);
  expect(Math.abs(tabsLeft-titleLeft),'tabs align with title at '+width).toBeLessThanOrEqual(2);
  await expect(section.locator('[data-inspiration-ratio]')).toHaveCount(0);
  await expect(section.getByText('16:9',{exact:true})).toHaveCount(0);
  await expect(section.getByText('9:16',{exact:true})).toHaveCount(0);
  await expect(section.locator('.inspiration-preview-card')).toHaveCount(2);
  const imageTab=section.getByRole('button',{name:'Image',exact:true});await imageTab.scrollIntoViewIfNeeded();await imageTab.click();
  await expect(section.locator('.inspiration-preview-card')).toHaveCount(1);
  const imageCard=section.getByRole('button',{name:'View Golden perfume splash inspiration',exact:true});
  await expect(imageCard.locator('img')).toHaveAttribute('src',image.previewUrl);
  await imageCard.click();
  const imageDialog=page.getByRole('dialog');await expect(imageDialog).toBeVisible();
  await expect(imageDialog.getByText(image.prompt,{exact:true})).toBeVisible();
  await expect(imageDialog.locator('img')).toHaveAttribute('alt',image.title);
  await expect(imageDialog.locator('.inspiration-detail-parameters')).toHaveCount(0);
  await expect(imageDialog.getByRole('heading',{name:'Parameters',exact:true})).toHaveCount(0);
  await expect(imageDialog.getByRole('button',{name:'Clone & try'})).toHaveText('✦ Clone & try');
  const imageClose=await expectPlainClose(imageDialog);
  await imageClose.click();await expect(imageDialog).toHaveCount(0);
  const videoTab=section.getByRole('button',{name:'Video',exact:true});await videoTab.scrollIntoViewIfNeeded();await videoTab.click();
  await expect(section.locator('.inspiration-preview-card')).toHaveCount(1);
  await section.getByRole('button',{name:'View Original cinematic video inspiration',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Original owner video prompt',{exact:true})).toBeVisible();
  await expect(dialog.locator('video')).toHaveAttribute('controls','');
  await expect(dialog.getByRole('button',{name:'Clone & Try'})).toBeEnabled();
  await expectPlainClose(dialog);
  await expect(page).toHaveURL(/deepsyq\.html(?:\?|$)/);
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  // Canvas and AI Agent examples reuse the same owner-approved dialog.
  if(width===390)for(const selector of ['#canvasFeature [data-creative-example]','#agentFeature [data-creative-example]']){
   const example=page.locator(selector).first();
   await expect(example).toBeVisible();
   await example.click();
   const preview=page.locator('dialog.inspiration-detail-dialog');
   await expect(preview).toBeVisible();
   const close=await expectPlainClose(preview);
   await close.click();
   await expect(preview).toHaveCount(0);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 }
 const legacy=await page.request.get('/inspiration.html?kind=video',{maxRedirects:0});expect(legacy.status()).toBe(302);expect(legacy.headers().location).toBe('/deepsyq.html#inspirationPreview');
 expect(paid).toEqual([]);
});
test('Home inspiration clone hands off prompt without generating',async({page})=>{
 await page.route('**/api/config',r=>r.fulfill({json:{features:{inspiration:true},plans:{}}}));
 await page.route('**/api/inspiration?**',r=>r.fulfill({json:{items:[video]}}));
 await page.goto('/deepsyq.html');
 await page.getByRole('button',{name:'View Original cinematic video inspiration'}).click();
 await page.route('**/generate-studio.html?**',r=>r.fulfill({contentType:'text/html',body:'<p>Studio handoff</p>'}));
 await page.getByRole('button',{name:'Clone & Try'}).click();
 await expect(page).toHaveURL(/generate-studio\.html\?studio=video/);
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('deepsyq_template_start')).promptTemplate)).toBe(video.prompt);
});
