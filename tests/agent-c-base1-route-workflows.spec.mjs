import {test,expect} from '@playwright/test';

// BASE §1 / owner Issue298 / Agent C acceptance. Entirely synthetic API fixtures.
// No actual AI model is called, no credits or customer accounts are touched.
const templates=[
 {id:'i',title:'Fixture Image',category:'Art',generationType:'image',promptTemplate:'An original watercolor city'},
 {id:'v',title:'Fixture Video',category:'Film',generationType:'video',promptTemplate:'Slow orbit around a fictional landscape'},
 {id:'a',title:'Fixture Audio',category:'Music',generationType:'audio',promptTemplate:'A short original ambient melody'},
 {id:'p',title:'Fixture Product',category:'Advertising',generationType:'product_video',
  requiredInputTypes:['image','product_name'],promptTemplate:'Show {{product_name}} with warm studio lighting'}
];
const inspiration=[
 {id:'owned-fixture',title:'Fixture Inspiration',slug:'fixture-inspiration',category:'Editorial',
  kind:'image',description:'Synthetic route test only',previewUrl:'/fixture-not-a-real-image.webp',
  prompt:'A blue botanical poster',aspectRatio:'2:3',actionTarget:'studio',
  requiredInputTypes:[],defaultSettings:{ratio:'2:3'},defaultModel:null}
];

async function mocks(page){
 await page.route('**/api/templates',route=>route.fulfill({json:{items:templates}}));
 await page.route('**/api/inspiration?**',route=>route.fulfill({json:{
  items:inspiration,categories:['Editorial'],ratios:['2:3'],
  pagination:{limit:24,offset:0,nextOffset:null,hasMore:false}
 }}));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{
  enabled:false,ownerOnly:true,publicGenerationEnabled:false,
  models:[],catalog:[],translation:{enabled:false}
 }}));
 await page.route('**/api/config',route=>route.fulfill({json:{
  googleClientId:'',billingConfigured:false,features:{aiApps:true,inspiration:true,productVideo:true},
  plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},
   lifetime:{price:2999,currency:'eur'}}
 }}));
 await page.route('**/api/auth/email/status',route=>route.fulfill({json:{configured:false}}));
}
function writeCounter(page){
 let count=0;
 page.on('request',request=>{
  const url=new URL(request.url());
  if(request.method()==='POST'&&/\/api\/(?:studio\/jobs|billing|payments|ai-wallet|speech\/generate)/.test(url.pathname))count++;
 });
 return ()=>count;
}
function checkViewport(page){
 return page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
}

test('BASE1-C 13 named screens exist; Home paths preserve PR296 History and real Studio types',async({page})=>{
 await mocks(page);
 const routes=[
  'deepsyq.html','generate-studio.html?studio=image','generate-studio.html?studio=video',
  'generate-studio.html?studio=audio','ai-apps.html','inspiration.html','product-video.html',
  'free-tools.html','avatar-studio.html','generate-studio.html?view=history',
  'ai-pricing.html','index.html#profile','audio-studio.html'
 ];
 for(const route of routes){
  const response=await page.request.get('/'+route);
  expect(response.status(),route).toBe(200);
  expect(await response.text(),route).toContain('<html');
 }
 await page.goto('/deepsyq.html');
 const sidebar=page.locator('#sidebar');
 for(const [label,href] of [
  ['Image studio','generate-studio.html?studio=image'],
  ['Video studio','generate-studio.html?studio=video'],
  ['Audio studio','generate-studio.html?studio=audio'],
  ['History','generate-studio.html?view=history'],
  ['Canvas','#quickCreateForm']
 ]){
  // Mobile Home deliberately keeps its rail inert until the user opens it;
  // inspect the actual anchor's destination without falsely requiring visibility.
  await expect(sidebar.locator('a[aria-label="'+label+'"]')).toHaveAttribute('href',href);
 }
 await page.goto('/ai-apps.html');
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 for(const [label,href] of [
  ['AI Apps','ai-apps.html'],['Inspiration','inspiration.html'],
  ['Tools','free-tools.html'],['Pricing','ai-pricing.html'],
  ['History','generate-studio.html?view=history'],
  ['My Creations','deepsyq.html#recentCreations']
 ]){
  await expect(nav.getByRole('link',{name:label,exact:true})).toHaveAttribute('href',href);
 }
 await expect(nav.getByRole('link',{name:'AI Agents — coming soon'})).toHaveAttribute('href','deepsyq.html#agentFeature');
});

test('BASE1-C all four supported AI Apps types prepare the correct Studio prompt, no paid POST',async({page})=>{
 await mocks(page);
 const paid=writeCounter(page);
 const expected=[
  ['Fixture Image','image','An original watercolor city'],
  ['Fixture Video','video','Slow orbit around a fictional landscape'],
  ['Fixture Audio','audio','A short original ambient melody'],
  ['Fixture Product','video','Show Sample Tote with warm studio lighting']
 ];
 for(const [title,kind,prompt] of expected){
  await page.goto('/ai-apps.html');
  await expect(page.locator('.app-card')).toHaveCount(4);
  const card=page.locator('.app-card').filter({hasText:title});
  if(title==='Fixture Product')await card.getByLabel('Product name').fill('Sample Tote');
  await card.getByRole('button',{name:'Use template'}).click();
  await expect(page).toHaveURL(new RegExp('studio='+kind+'&from=template'));
  await expect(page.locator('#prompt')).toHaveValue(prompt);
  await expect(page.locator('#consent')).not.toBeChecked();
  expect(paid()).toBe(0);
 }
});

test('BASE1-C Inspiration kind, query, preview and Create/Prompt/Clone lead to real Studio safely',async({page})=>{
 await mocks(page);
 const paid=writeCounter(page);
 for(const [label,action] of [
  ['Create yours','create'],['Use this prompt','prompt'],['Clone and Try','clone']
 ]){
  await page.goto('/inspiration.html');
  await expect(page.locator('#gallery .card')).toHaveCount(1);
  await expect(page.locator('#gallery .card')).toContainText('Fixture Inspiration');
  await page.getByRole('button',{name:label,exact:true}).click();
  await expect(page).toHaveURL(new RegExp('studio=image&from=inspiration&action='+action));
  await expect(page.locator('#prompt')).toHaveValue('A blue botanical poster');
  await expect(page.locator('#consent')).not.toBeChecked();
  expect(paid()).toBe(0);
 }
 await page.goto('/inspiration.html');
 await page.getByRole('button',{name:'Videos',exact:true}).click();
 await expect(page.locator('[data-kind="video"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#category')).toBeAttached();
 await expect(page.locator('#ratio')).toBeAttached();
});

test('BASE1-C owned AI Apps/Inspiration/Tools remain usable at 320, 375 and 768px',async({page})=>{
 await mocks(page);
 const paid=writeCounter(page);
 for(const width of [320,375,768]){
  await page.setViewportSize({width,height:812});
  await page.goto('/ai-apps.html');
  await expect(page.locator('#search')).toBeVisible();
  await expect(page.locator('#type')).toBeVisible();
  await expect(page.locator('.app-card')).toHaveCount(4);
  const apps=await checkViewport(page);
  expect(apps.scrollWidth,'AI Apps horizontal overflow '+width).toBeLessThanOrEqual(width+1);
  await page.goto('/inspiration.html');
  await expect(page.locator('#gallery .card')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Create yours'})).toBeVisible();
  const gallery=await checkViewport(page);
  if(gallery.scrollWidth>width+1){
   const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')]
    .filter(el=>{const rect=el.getBoundingClientRect();return rect.right>innerWidth+1&&rect.width>0;})
    .slice(0,8).map(el=>({tag:el.tagName,cls:String(el.className).slice(0,90),
     right:Math.round(el.getBoundingClientRect().right)})));
   console.log('Inspiration overflow diagnostic',width,JSON.stringify(offenders));
  }
  expect(gallery.scrollWidth,'Inspiration horizontal overflow '+width).toBeLessThanOrEqual(width+1);
  if(width===320){
   const brand=page.locator('body > header a.brand');
   const brandTap=await brand.evaluate(link=>{
    const r=link.getBoundingClientRect();
    const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return hit===link||link.contains(hit);
   });
   expect(brandTap,'Inspiration brand must not sit underneath mobile drawer toggle').toBe(true);
  }
  const toggle=page.locator('.ds-site-mobile-toggle');
  if(await toggle.isVisible()){
   await toggle.click();
   await expect(toggle).toHaveAttribute('aria-expanded','true');
   await expect(page.locator('#dsSiteSidebar nav a[href="free-tools.html"]')).toBeVisible();
   await page.keyboard.press('Escape');
   await expect(toggle).toHaveAttribute('aria-expanded','false');
  }
  await page.goto('/free-tools.html');
  const back=page.locator('main.tools header a.tool-back');
  await expect(back).toBeVisible();
  const canReceiveTap=await back.evaluate(link=>{
   const r=link.getBoundingClientRect();
   const p=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
   return p===link||link.contains(p);
  });
  expect(canReceiveTap,'Tools Back is overlapped at '+width).toBe(true);
  await expect(page.locator('a[href="audio-studio.html"].audio-launch-card')).toBeVisible();
  await expect(page.locator('a[href="avatar-studio.html"].avatar-launch-card')).toBeVisible();
  await back.click();
  await expect(page).toHaveURL(/\/deepsyq\.html$/);
 }
 expect(paid()).toBe(0);
});

test('BASE1-C Studio real Model chooser is reachable at small widths without paid dispatch',async({page})=>{
 await mocks(page);
 const paid=writeCounter(page);
 for(const width of [320,375,768]){
  await page.setViewportSize({width,height:812});
  await page.goto('/generate-studio.html?studio=image');
  const button=page.locator('#modelButton');
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('#modelDialog')).toBeVisible();
  await page.locator('#modelDialog [data-close="modelDialog"]').click();
  await expect(page.locator('#modelDialog')).toBeHidden();
 }
 expect(paid()).toBe(0);
});
