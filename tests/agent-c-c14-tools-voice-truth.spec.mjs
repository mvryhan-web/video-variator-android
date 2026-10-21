import {test,expect} from '@playwright/test';

// Agent C C14: synthetic/offline truth and navigation acceptance. No real AI,
// Stripe, user data, account purchase or provider call.
const expected={
 'en-US':'Cloud voice · paid access required',
 'ru-RU':'Облачный голос · нужен оплаченный доступ',
 'fr-FR':'Voix cloud · accès payant requis',
 'uk-UA':'Хмарний голос · потрібен оплачений доступ'
};
const widths=[320,375,390,768,1448];
async function mocks(page){
 await page.route('**/api/speech/config',route=>route.fulfill({json:{enabled:false}}));
 await page.route('**/api/config',route=>route.fulfill({json:{
  billingConfigured:false,features:{inspiration:true,aiApps:true,productVideo:false},
  googleClientId:''
 }}));
 await page.route('**/api/templates',route=>route.fulfill({json:{items:[
  {id:'c14-img',title:'Fictional Image',generationType:'image',promptTemplate:'A fictional garden'},
  {id:'c14-vid',title:'Fictional Video',generationType:'video',promptTemplate:'Fictional flying whale'},
  {id:'c14-aud',title:'Fictional Audio',generationType:'audio',promptTemplate:'Fictional melody'},
  {id:'c14-old',title:'Cancelled Product Video',generationType:'product_video',promptTemplate:'Retired'},
  {id:'c14-agent',title:'Unavailable Agent',generationType:'agent',requiredInputTypes:['external_agent'],promptTemplate:'Pending agent'}
 ]}}));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{
  enabled:false,ownerOnly:true,publicGenerationEnabled:false,models:[],catalog:[]
 }}));
}
function protect(page){
 const calls=[];
 page.on('request',req=>{
  const path=new URL(req.url()).pathname;
  if(req.method()==='POST'&&/\/api\/(?:studio\/jobs|studio\/generate|payments|billing|ai-billing|ai-wallet|stripe|speech\/generate|ai-provider)/.test(path))
   calls.push(req.method()+' '+path);
 });
 return calls;
}
async function fit(page,width,section){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth),
  section+' horizontal overflow at '+width).toBeLessThanOrEqual(width+1);
}
test('C14 all supported locales accurately mark cloud TTS paid access and preserve local STT',async({browser})=>{
 for(const [locale,copy] of Object.entries(expected)){
  const context=await browser.newContext({locale,viewport:{width:390,height:844}});
  try{
   const page=await context.newPage(),calls=protect(page);
   await mocks(page);
   await page.goto('/free-tools.html');
   const tts=page.locator('[data-hub-tool="tts"]');
   await expect(tts.locator('small')).toHaveText(copy);
   await expect(tts).toHaveAttribute('href','audio-studio.html?tool=tts');
   await expect(page.locator('[data-hub-tool="stt"]')).toHaveAttribute('href','audio-studio.html?tool=stt');
   await fit(page,390,locale+' Tools');
   await tts.click();
   await expect(page).toHaveURL(/\/audio-studio\.html\?tool=tts$/);
   await expect(page.locator('#speechText')).toBeVisible();
   await expect(page.locator('#speechGenerate')).toBeDisabled();
   await expect(page.locator('#transcribeFile')).toBeHidden();
   await expect(page.locator('main.tools header a[data-s="back"]')).toHaveAttribute('href','free-tools.html');
   await page.locator('main.tools header a[data-s="back"]').click();
   await expect(page).toHaveURL(/\/free-tools\.html$/);
   await page.locator('[data-hub-tool="stt"]').click();
   await expect(page).toHaveURL(/\/audio-studio\.html\?tool=stt$/);
   await expect(page.locator('#transcribeFile')).toBeVisible();
   await expect(page.locator('#speechText')).toBeHidden();
   expect(calls,locale+' unexpected paid request').toEqual([]);
  }finally{await context.close();}
 }
});

test('C14 five widths: Tools real modes/Back/legacy, exactly three AI Apps kinds, Agent pending, retired Product Video 404',async({page})=>{
 await mocks(page);const calls=protect(page);
 for(const path of ['/product-video','/product-video.html'])
  expect((await page.request.get(path)).status(),path).toBe(404);
 for(const width of widths){
  await page.setViewportSize({width,height:844});
  await page.goto('/free-tools.html');
  await expect(page.locator('[data-hub-tool]')).toHaveCount(8);
  await expect(page.locator('[data-legacy-tool="video-uniquifier"]')).toHaveAttribute('href','index.html');
  await fit(page,width,'Tools');
  await page.locator('[data-hub-tool="photo"]').click();
  await expect(page).toHaveURL(/\/free-tools\.html\?tool=photo$/);
  await expect(page.locator('#hubBack')).toBeVisible();
  await page.locator('#hubBack').click();
  await expect(page).toHaveURL(/\/free-tools\.html$/);
  await page.locator('[data-legacy-tool="video-uniquifier"]').click();
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator('#mode option')).toHaveCount(3);
  await page.goto('/ai-apps.html');
  const types=await page.locator('#type option').evaluateAll(os=>os.map(o=>o.value));
  expect(types).toEqual(['','image','video','audio']);
  await expect(page.locator('.app-card').filter({hasText:'Cancelled Product Video'})).toHaveCount(0);
  await expect(page.locator('.app-card').filter({hasText:'Unavailable Agent'})
    .getByRole('button',{name:'Workflow pending'})).toBeDisabled();
  await expect(page.locator('#dsSiteSidebar [aria-label="Agent coming soon"]')).toHaveCount(1);
  await fit(page,width,'AI Apps');
  if(width<=900){
   const toggle=page.locator('.ds-site-mobile-toggle');
   await toggle.click();
   await expect(toggle).toHaveAttribute('aria-expanded','true');
   await page.keyboard.press('Escape');
   await expect(toggle).toHaveAttribute('aria-expanded','false');
  }
  await page.goto('/inspiration.html');
  await expect(page.getByRole('heading',{name:'Inspiration'})).toBeVisible();
  await fit(page,width,'Inspiration');
 }
 expect(calls).toEqual([]);
});
