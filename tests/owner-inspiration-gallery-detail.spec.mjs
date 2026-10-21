import {test,expect} from '@playwright/test';

const content=[
 {id:'image-1',title:'Unpublished test portrait',kind:'image',category:'Editorial',
  previewUrl:'/safe/portrait.webp',prompt:'A test portrait prompt',aspectRatio:'9:16',
  actionTarget:'studio',requiredInputTypes:[],defaultSettings:{}},
 {id:'video-1',title:'Original cinematic video',kind:'video',category:'Cinematic',
  previewUrl:'/safe/scene.mp4',previewPosterUrl:'/safe/scene.webp',
  prompt:'An original video of a flying object in a forest, warm backlight',
  aspectRatio:'16:9',actionTarget:'studio',requiredInputTypes:[],
  defaultSettings:{ratio:'16:9',duration:'8s'}}
];
test('Home Inspiration: inline All Video Image, right prompt, empty Images, ratio, no spend',async({page})=>{
 const paid=[];
 page.on('request',req=>{
  if(req.method()==='POST'&&['/api/studio','/api/billing','/api/payments','/api/ai-wallet'].some(p=>new URL(req.url()).pathname.startsWith(p)))
   paid.push(req.url());
 });
 await page.route('**/api/config',route=>route.fulfill({json:{features:{inspiration:true},plans:{}}}));
 await page.route('**/api/inspiration?**',route=>route.fulfill({json:{
  items:content,categories:['Cinematic','Editorial'],ratios:['16:9','9:16'],
  pagination:{limit:12,offset:0,nextOffset:null,hasMore:false}
 }}));
 for(const width of [390,768,1448]){
  await page.setViewportSize({width,height:820});
  await page.goto('/deepsyq.html#inspirationPreview');
  const section=page.locator('#inspirationPreview');
  await expect(section).toBeVisible({timeout:15000});
  await expect(section.locator('[data-inspiration-kind]')).toHaveText(['All','Video','Image']);
  const cards=section.locator('.inspiration-preview-card:visible');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toHaveAttribute('data-kind','video');
  await section.locator('[data-inspiration-kind="image"]').click();
  await expect(cards).toHaveCount(0);
  await expect(page.locator('#homeInspirationEmpty')).toContainText('Images');
  await section.locator('[data-inspiration-kind="video"]').click();
  await expect(cards).toHaveCount(1);
  await section.locator('[data-inspiration-ratio="9:16"]').click();
  await expect(cards).toHaveCount(0);
  await section.locator('[data-inspiration-ratio="16:9"]').click();
  await expect(cards).toHaveCount(1);
  await cards.first().click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('video')).toHaveAttribute('src','/safe/scene.mp4');
  await expect(dialog.locator('video')).toHaveAttribute('controls','');
  await expect(dialog.getByText('An original video of a flying object in a forest, warm backlight')).toBeVisible();
  await expect(dialog.getByText('16:9')).toBeVisible();
  await expect(dialog.getByRole('button',{name:/Clone & Try/})).toBeVisible();
  await dialog.getByRole('button',{name:'Close inspiration preview'}).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth),
    'no horizontal overflow at '+width).toBeLessThanOrEqual(width+1);
 }
 await page.goto('/inspiration.html');
 await expect(page).toHaveURL(/deepsyq[.]html#inspirationPreview$/);
 expect(paid).toEqual([]);
});
