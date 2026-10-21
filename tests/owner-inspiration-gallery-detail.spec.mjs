import {test,expect} from '@playwright/test';
const video={id:'owner-video',title:'Original cinematic video',kind:'video',category:'Cinematic',previewUrl:'/media/home/owner-20261018/v01.mp4',prompt:'Original owner video prompt',aspectRatio:'16:9',actionTarget:'studio',requiredInputTypes:[],defaultSettings:{ratio:'16:9'},defaultModel:null};
test('Home Inspiration filters in place, images empty, video opens right-prompt overlay; old page redirects',async({page})=>{
 const paid=[];page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio|billing|ai-wallet)/.test(r.url()))paid.push(r.url());});
 await page.route('**/api/config',route=>route.fulfill({json:{billingConfigured:false,googleClientId:'',features:{aiApps:true,inspiration:true,productVideo:false,onboarding:false},plans:{},auth:{}}}));
 await page.route('**/api/templates?**',route=>route.fulfill({json:{items:[]}}));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,ownerOnly:true,publicGenerationEnabled:false,models:[],catalog:[]}}));
 await page.route('**/api/auth/email/status',route=>route.fulfill({json:{configured:false}}));
 await page.route('**/api/inspiration**',route=>route.fulfill({json:{items:[video,{...video,id:'poster',kind:'image',previewUrl:'/poster.webp'}],categories:['Cinematic'],ratios:['16:9']}}));
 for(const width of [390,768,1448]){
  await page.setViewportSize({width,height:850});await page.goto('/deepsyq.html?galleryWidth='+width,{waitUntil:'domcontentloaded'});
  const section=page.locator('#inspirationPreview');await expect(section).toBeVisible({timeout:15000});
  const tabs=section.locator('[data-inspiration-kind]');await expect(tabs).toHaveText(['All','Video','Image']);
  await expect(section.locator('.inspiration-preview-card')).toHaveCount(1);
  const imageTab=section.getByRole('button',{name:'Image',exact:true});await imageTab.scrollIntoViewIfNeeded();await imageTab.click();
  await expect(section.locator('.inspiration-preview-card')).toHaveCount(0);
  await expect(section.getByText('No images yet.',{exact:true})).toBeVisible();
  await expect(section.getByRole('button',{name:'16:9',exact:true})).toBeVisible();
  await expect(section.getByRole('button',{name:'9:16',exact:true})).toBeVisible();
  const videoTab=section.getByRole('button',{name:'Video',exact:true});await videoTab.scrollIntoViewIfNeeded();await videoTab.click();
  await expect(section.locator('.inspiration-preview-card')).toHaveCount(1);
  await section.getByRole('button',{name:'View Original cinematic video inspiration',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Original owner video prompt',{exact:true})).toBeVisible();
  await expect(dialog.locator('video')).toHaveAttribute('controls','');
  await expect(dialog.getByRole('button',{name:'Clone & Try'})).toBeEnabled();
  await expect(page).toHaveURL(/deepsyq\.html$/);
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  const ratioTab=section.getByRole('button',{name:'9:16',exact:true});await ratioTab.scrollIntoViewIfNeeded();await ratioTab.click();
  await expect(section.locator('.inspiration-preview-card')).toHaveCount(0);
  await ratioTab.click();
  await expect(section.locator('.inspiration-preview-card')).toHaveCount(1);
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
