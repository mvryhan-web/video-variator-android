import {test,expect} from '@playwright/test';

// C12: only synthetic rights-neutral Inspiration fixtures; zero provider calls,
// zero purchased credits/Stripe, no actual customer files or production.
const base={
 category:'Fiction',description:'Synthetic handoff fixture',aspectRatio:'16:9',
 previewUrl:'/does-not-exist-c12.webp',actionTarget:'studio',rightsBasis:'owned',
 rightsNote:'Synthetic test only',defaultSettings:{ratio:'16:9'}
};
const catalog=[
 {...base,id:'video-input',slug:'video-input',title:'Needs source video',kind:'video',
  requiredInputTypes:['video'],prompt:'Remix the user uploaded source video'},
 {...base,id:'overlong',slug:'overlong',title:'Oversized prompt',kind:'image',
  requiredInputTypes:[],prompt:'A'.repeat(2001)},
 {...base,id:'product-name',slug:'product-name',title:'Needs product name field',kind:'image',
  requiredInputTypes:['product_name'],prompt:'A beautiful {{product_name}}'},
 {...base,id:'supported-image',slug:'supported-image',title:'Supported original picture',kind:'image',
  requiredInputTypes:['image'],prompt:'A fictional lakeside painting'},
 {...base,id:'supported-video',slug:'supported-video',title:'Supported original movie',kind:'video',
  requiredInputTypes:[],prompt:'A fictional floating island in twilight'}
];
async function setup(page){
 await page.route('**/api/inspiration?**',route=>route.fulfill({json:{
  items:catalog,categories:['Fiction'],ratios:['16:9'],
  pagination:{limit:24,offset:0,nextOffset:null,hasMore:false}
 }}));
 await page.route('**/api/config',route=>route.fulfill({json:{
  billingConfigured:false,features:{aiApps:true,inspiration:true,productVideo:false}
 }}));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{
  enabled:false,publicGenerationEnabled:false,ownerOnly:true,models:[],catalog:[]
 }}));
 await page.route('**/api/auth/email/status',route=>route.fulfill({json:{configured:false}}));
}
function paidRequests(page){
 const requests=[];
 page.on('request',r=>{
  if(r.method()==='POST'&&/\/api\/(studio\/jobs|billing|ai-billing|payments|wallet|ai-wallet|speech\/generate)/.test(new URL(r.url()).pathname))
   requests.push(r.url());
 });
 return requests;
}

test('C12 Home Inspiration does not advertise unsupported video handoff',async({page})=>{
 await setup(page);const posts=paidRequests(page);
 for(const width of [320,390,1448]){
  await page.setViewportSize({width,height:850});
  await page.goto('/deepsyq.html#inspirationPreview');
  const section=page.locator('#inspirationPreview');
  await expect(section).toBeVisible({timeout:15000});
  const cards=section.locator('.inspiration-preview-card:visible');
  await expect(cards).toHaveCount(2);
  // Image records, including unsupported image prompts, are not published in the empty Image tab.
  await section.locator('[data-inspiration-kind="image"]').click();
  await expect(cards).toHaveCount(0);
  await section.locator('[data-inspiration-kind="video"]').click();
  const video=cards.filter({hasText:'Needs source video'});
  await video.click();
  const detail=page.getByRole('dialog');
  await expect(detail).toContainText('video input support not yet available');
  for(const action of ['Use this prompt','Clone & Try'])
   await expect(detail.getByRole('button',{name:action})).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(detail).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 }
 expect(posts).toEqual([]);
});

test('C12 supported Home video retains its Studio Clone handoff without paid jobs',async({page})=>{
 await setup(page);const posts=paidRequests(page);
 await page.goto('/deepsyq.html#inspirationPreview');
 const video=page.locator('#inspirationPreviewGrid .inspiration-preview-card').filter({hasText:'Supported original movie'});
 await expect(video).toBeVisible({timeout:15000});
 await video.click();
 const detail=page.getByRole('dialog');
 await expect(detail.getByRole('button',{name:'Clone & Try'})).toBeEnabled();
 await detail.getByRole('button',{name:'Clone & Try'}).click();
 await expect(page).toHaveURL(/studio=video&from=inspiration&action=clone/);
 await expect(page.locator('#prompt')).toHaveValue('A fictional floating island in twilight');
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(posts).toEqual([]);
});
