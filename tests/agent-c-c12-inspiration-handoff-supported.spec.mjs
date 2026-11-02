import {test,expect} from '@playwright/test';

// C12: only synthetic rights-neutral Inspiration fixtures; zero provider calls,
// zero purchased credits/Stripe, no actual customer files or production.
const base={
 category:'Fiction',description:'Synthetic handoff fixture',aspectRatio:'16:9',
 previewUrl:'/does-not-exist-c12.webp',actionTarget:'studio',rightsBasis:'owned',
 rightsNote:'Synthetic test only',active:true,featured:true,defaultSettings:{ratio:'16:9'}
};
const catalog=[
 {...base,id:'video-input',slug:'video-input',title:'Needs source video',kind:'video',
  requiredInputTypes:['video'],prompt:'Remix the user uploaded source video'},
 {...base,id:'overlong',slug:'overlong',title:'Oversized prompt',kind:'video',
  requiredInputTypes:[],prompt:'A'.repeat(2001)},
 {...base,id:'product-name',slug:'product-name',title:'Needs product name field',kind:'video',
  requiredInputTypes:['product_name'],prompt:'A beautiful {{product_name}}'},
 {...base,id:'supported-image',slug:'supported-image',title:'Supported original picture',kind:'video',
  requiredInputTypes:['image'],prompt:'A fictional lakeside painting'},
 {...base,id:'supported-video',slug:'supported-video',title:'Supported original movie',kind:'video',
  requiredInputTypes:[],prompt:'A fictional floating island in twilight'}
];
async function setup(page){
 await page.route('**/api/inspiration**',route=>route.fulfill({json:{
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

test('C12 incompatible published Inspiration does not advertise false actionable Studio handoff',async({page})=>{
 test.setTimeout(120000);
 await setup(page);const posts=paidRequests(page);
 for(const width of [320,390,1448]){
  await page.setViewportSize({width,height:850});
  await page.goto('/deepsyq.html?c12Width='+width+'#inspirationPreview',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(5);
  for(const [title,reason] of [
   ['Needs source video','video input support not yet available'],
   ['Oversized prompt','exceeds the 2,000-character Studio limit'],
   ['Needs product name field','product name']
  ]){
   const card=page.getByRole('button',{name:'View '+title+' inspiration'});
   await card.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   await card.click();
   const detail=page.getByRole('dialog');
   await expect(detail,'fixture '+title+' at '+width).toContainText(reason);
   for(const action of ['Create yours','Use this prompt','Clone & Try']){
    await expect(detail.getByRole('button',{name:action})).toBeDisabled();
   }
   await page.keyboard.press('Escape');
  }
  const supported=page.getByRole('button',{name:'View Supported original picture inspiration'});
  await supported.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await supported.click();
  await expect(page.getByRole('dialog').getByRole('button',{name:'Create yours'})).toBeEnabled();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 }
 expect(posts).toEqual([]);
});

test('C12 supported Image and Video retain real Create yours / Clone handoff without consent or paid jobs',async({page})=>{
 test.setTimeout(120000);
 await setup(page);const posts=paidRequests(page);
 for(const [title,kind,action,prompt] of [
  ['Supported original picture','video','Create yours','A fictional lakeside painting'],
  ['Supported original movie','video','Clone and Try','A fictional floating island in twilight']
 ]){
  await page.goto('/deepsyq.html?c12Supported='+encodeURIComponent(title)+'#inspirationPreview',{waitUntil:'domcontentloaded'});
  const card=page.getByRole('button',{name:'View '+title+' inspiration'});
  await card.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await card.click();
  const detail=page.getByRole('dialog');
  const actionButton=detail.getByRole('button',{name:action==='Clone and Try'?'Clone & Try':action});
  await expect(actionButton).toBeEnabled();
  await actionButton.click();
  await expect(page).toHaveURL(new RegExp('generate-studio\\.html\\?studio='+kind+'&from=inspiration&action='));
  await expect(page.locator('#prompt')).toHaveValue(prompt);
  await expect(page.locator('#consent')).not.toBeChecked();
 }
 expect(posts).toEqual([]);
});
