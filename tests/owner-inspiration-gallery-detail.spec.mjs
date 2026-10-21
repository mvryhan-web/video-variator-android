import {test,expect} from '@playwright/test';

const cards=[
 {id:'owner-image-1',slug:'portrait',title:'Original editorial portrait',kind:'image',
  description:'Owner licensed original photo',category:'Editorial',previewUrl:'/safe/portrait.webp',
  prompt:'An original portrait, soft cinematic light, teal background',aspectRatio:'2:3',
  actionTarget:'studio',requiredInputTypes:[],defaultSettings:{ratio:'2:3'},defaultModel:null},
 {id:'owner-video-1',slug:'scene',title:'Original cinematic video',kind:'video',
  description:'Owner licensed original MP4',category:'Cinematic',previewUrl:'/safe/scene.mp4',
  previewPosterUrl:'/safe/scene.webp',
  prompt:'An original video of a flying object in a forest, warm backlight',aspectRatio:'16:9',
  actionTarget:'studio',requiredInputTypes:[],defaultSettings:{ratio:'16:9',duration:'8s'},defaultModel:null}
];
function fakeAPI(page){
 return page.route('**/api/inspiration?**',route=>{
  const search=new URL(route.request().url()).searchParams;
  const kind=search.get('kind')||'all';
  route.fulfill({json:{items:cards.filter(x=>kind==='all'||x.kind===kind),
   categories:['Editorial','Cinematic'],ratios:['2:3','16:9'],
   pagination:{limit:24,offset:0,nextOffset:null,hasMore:false}}});
 });
}
test('Inspiration owner screenshot workflow: compact gallery, image detail with prompt, video detail with controls, filters and no spend',async({page})=>{
 const paid=[];
 page.on('request',req=>{
  if(req.method()==='POST'&&/\/api\/(?:studio|billing|payments|ai-wallet)/.test(new URL(req.url()).pathname))
   paid.push(req.url());
 });
 await fakeAPI(page);
 for(const width of [390,768,1448]){
  await page.setViewportSize({width,height:820});
  await page.goto('/inspiration.html');
  await expect(page.locator('#gallery .card')).toHaveCount(2);
  await expect(page.locator('.gallery .inspiration-tile-open')).toHaveCount(2);
  const portrait=page.getByRole('button',{name:'View Original editorial portrait inspiration'});
  await expect(portrait).toBeVisible();
  await portrait.click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('An original portrait, soft cinematic light, teal background')).toBeVisible();
  await expect(dialog.locator('.inspiration-detail-image-area img')).toHaveAttribute('src','/safe/portrait.webp');
  await expect(dialog.getByRole('button',{name:'Clone & Try'})).toBeEnabled();
  await expect(dialog.getByText('2:3')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button',{name:'View Original cinematic video inspiration'}).click();
  const video=page.getByRole('dialog').locator('video');
  await expect(video).toHaveAttribute('src','/safe/scene.mp4');
  await expect(video).toHaveAttribute('controls','');
  await expect(page.getByRole('dialog').getByText('An original video of a flying object in a forest, warm backlight')).toBeVisible();
  await page.getByRole('button',{name:'Close inspiration preview'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth),'no horizontal overflow at '+width).toBeLessThanOrEqual(width+1);
  await page.getByRole('button',{name:'Images',exact:true}).click();
  await expect(page.locator('#gallery .card')).toHaveCount(1);
  await page.getByRole('button',{name:'Videos',exact:true}).click();
  await expect(page.locator('#gallery .card')).toHaveCount(1);
 }
 expect(paid).toEqual([]);
});
