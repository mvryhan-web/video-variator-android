import {test,expect} from '@playwright/test';

const templates=[
 {id:'owned-image',title:'Editorial Portrait',description:'Original editorial lighting',category:'Editorial',generationType:'image',promptTemplate:'Original portrait concept',active:true},
 {id:'owned-video',title:'Demo Reel',description:'An original demonstration concept',category:'Marketing',generationType:'video',promptTemplate:'Original demonstration film concept',active:true},
 {id:'owned-audio',title:'Brand Voiceover',description:'Narration workflow',category:'Marketing',generationType:'audio',promptTemplate:'Original voiceover concept',active:true}
];

test('AI Apps local search, formats, categories and shareable URL preserve real API results without spending',async({page})=>{
 await page.route('**/api/templates',route=>route.fulfill({json:{items:templates}}));
 let creates=0;
 page.on('request',request=>{if(request.url().includes('/api/studio/jobs')&&request.method()==='POST')creates++;});
 await page.goto('/ai-apps.html?q=portrait&type=image');
 await expect(page.locator('#search')).toHaveValue('portrait');
 await expect(page.locator('#type')).toHaveValue('image');
 await expect(page.locator('.app-card')).toHaveCount(1);
 await expect(page.locator('#apps')).toContainText('Editorial Portrait');

 await page.locator('#search').fill('demo');
 await page.locator('#type').selectOption('video');
 await page.locator('#category').selectOption('Marketing');
 await expect(page.locator('.app-card')).toHaveCount(1);
 await expect(page.locator('#apps')).toContainText('Demo Reel');
 await expect(page.locator('#status')).toHaveText('1 of 3 active templates shown.');
 await expect.poll(()=>new URL(page.url()).searchParams.get('category')).toBe('Marketing');
 await expect.poll(()=>new URL(page.url()).searchParams.get('type')).toBe('video');

 await page.reload();
 await expect(page.locator('#category')).toHaveValue('Marketing');
 await expect(page.locator('#search')).toHaveValue('demo');
 await expect(page.locator('.app-card')).toHaveCount(1);

 await page.getByRole('button',{name:'Clear filters'}).click();
 await expect(page.locator('.app-card')).toHaveCount(3);
 await expect(page.locator('#status')).toHaveText('3 of 3 active templates shown.');
 await expect.poll(()=>new URL(page.url()).searchParams.has('q')).toBe(false);
 expect(creates).toBe(0);
});

test('AI Apps reports no published content and API errors without inventing templates',async({page})=>{
 await page.route('**/api/templates',route=>route.fulfill({json:{items:[]}}));
 await page.goto('/ai-apps.html');
 await expect(page.locator('.app-card')).toHaveCount(0);
 await expect(page.locator('#status')).toContainText('No active AI Apps templates');
 await expect(page.getByRole('link',{name:'Open Image Studio'})).toBeVisible();
 await page.route('**/api/templates',route=>route.fulfill({status:503,json:{error:'TEMPLATES_UNAVAILABLE'}}));
 await page.reload();
 await expect(page.locator('#status')).toContainText('temporarily unavailable');
 await expect(page.locator('.app-card')).toHaveCount(0);
});


test('AI Apps can retry a temporary template API outage without losing URL filters or generating',async({page})=>{
 let attempts=0,jobPosts=0;
 await page.route('**/api/templates',route=>{
  attempts++;
  if(attempts===1)return route.fulfill({status:503,json:{error:'TEMPLATES_UNAVAILABLE'}});
  return route.fulfill({json:{items:templates}});
 });
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))jobPosts++;});
 await page.goto('/ai-apps.html?q=portrait&type=image');
 await expect(page.locator('#status')).toContainText('temporarily unavailable');
 await expect(page.locator('.app-card')).toHaveCount(0);
 await page.getByRole('button',{name:'Retry loading templates'}).click();
 await expect(page.locator('#search')).toHaveValue('portrait');
 await expect(page.locator('#type')).toHaveValue('image');
 await expect(page.locator('.app-card')).toHaveCount(1);
 await expect(page.locator('#apps')).toContainText('Editorial Portrait');
 expect(attempts).toBe(2);
 expect(jobPosts).toBe(0);
});

test('Use template prepares existing Studio with consent unchecked and no paid generation',async({page})=>{
 let jobPosts=0;
 await page.route('**/api/templates',route=>route.fulfill({json:{items:templates}}));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{ownerOnly:true,enabled:false,models:[],catalog:[]}}));
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))jobPosts++;});
 await page.goto('/ai-apps.html');
 await page.locator('.app-card').filter({hasText:'Demo Reel'}).getByRole('button',{name:'Use template'}).click();
 await expect(page).toHaveURL(/studio=video&from=template/);
 await expect(page.locator('#prompt')).toHaveValue('Original demonstration film concept');
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(jobPosts).toBe(0);
});

test('AI Apps only enables workflows with inputs supported by the existing Studio handoff',async({page})=>{
 const variants=[
  {id:'needs-video',title:'Video reference workflow',description:'Must upload video',category:'Commercial',generationType:'video',requiredInputTypes:['video'],promptTemplate:'Original video scene'},
  {id:'needs-logo',title:'Logo-required video workflow',description:'Must upload logo and name',category:'Commercial',generationType:'video',requiredInputTypes:['logo','product_name'],promptTemplate:'Original product ad'},
  {id:'needs-photo',title:'Image reference workflow',description:'Add a photo yourself',category:'Photography',generationType:'image',requiredInputTypes:['image'],promptTemplate:'Original image styling'}
 ];
 let jobPosts=0;
 await page.route('**/api/templates',route=>route.fulfill({json:{items:variants}}));
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))jobPosts++;});
 await page.goto('/ai-apps.html');
 const video=page.locator('.app-card').filter({hasText:'Video reference workflow'});
 const logo=page.locator('.app-card').filter({hasText:'Logo-required video workflow'});
 const image=page.locator('.app-card').filter({hasText:'Image reference workflow'});
 await expect(video.getByRole('button',{name:'Workflow pending'})).toBeDisabled();
 await expect(logo.getByRole('button',{name:'Workflow pending'})).toBeDisabled();
 await expect(video).toContainText('not yet available through Studio');
 await expect(logo).toContainText('not yet available through Studio');
 await expect(image.getByRole('button',{name:'Use template'})).toBeEnabled();
 await expect(image).toContainText('not attached automatically');
 expect(jobPosts).toBe(0);
});

test('AI Apps reveals large real API catalogs in batches and resets paging on filter changes',async({page})=>{
 const many=Array.from({length:25},(_,i)=>({
  id:'catalog-'+i,title:'Template '+i,description:'A genuine active workflow',category:'Photography',
  generationType:'image',promptTemplate:'Original prompt '+i,active:true
 }));
 await page.route('**/api/templates',route=>route.fulfill({json:{items:many}}));
 await page.goto('/ai-apps.html');
 await expect(page.locator('.app-card')).toHaveCount(12);
 await expect(page.locator('#status')).toHaveText('Showing 12 of 25 matching templates (25 active templates loaded).');
 await page.getByRole('button',{name:/Load more templates/}).click();
 await expect(page.locator('.app-card')).toHaveCount(24);
 await page.getByRole('button',{name:/Load more templates/}).click();
 await expect(page.locator('.app-card')).toHaveCount(25);
 await expect(page.locator('#loadMore')).toBeHidden();
 await page.locator('#search').fill('Template 20');
 await expect(page.locator('.app-card')).toHaveCount(1);
 await expect(page.locator('#loadMore')).toBeHidden();
 await page.locator('#search').fill('');
 await expect(page.locator('.app-card')).toHaveCount(12);
});

test('AI Apps catalog remains usable without page-level horizontal overflow',async({page})=>{
 const enough=Array.from({length:16},(_,index)=>({
  id:'mobile-'+index,title:'Mobile-ready template '+index,description:'Active original template',
  category:'Creative',generationType:'image',promptTemplate:'Create an original scene'
 }));
 await page.route('**/api/templates',route=>route.fulfill({json:{items:enough}}));
 await page.goto('/ai-apps.html');
 await expect(page.locator('.app-card')).toHaveCount(12);
 await expect(page.locator('#search')).toBeVisible();
 await expect(page.locator('#type')).toBeVisible();
 await expect(page.locator('#loadMore')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:/Load more templates/}).click();
 await expect(page.locator('.app-card')).toHaveCount(16);
});

test('AI Apps displays real template prompt and supported settings only after Preview, without spending',async({page})=>{
 const owner={
  id:'owned-preview',title:'Video Preview',description:'Approved original creative workflow',
  category:'Creative',generationType:'video',requiredInputTypes:['image'],
  promptTemplate:'Film a creative portrait against a violet backdrop.',defaultModel:'owner-configured-model',
  defaultSettings:{ratio:'9:16',durationSeconds:8,privateAuditToken:'MUST_NOT_APPEAR'},active:true
 };
 let posts=0;
 await page.route('**/api/templates',route=>route.fulfill({json:{items:[owner]}}));
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))posts++;});
 await page.goto('/ai-apps.html');
 const card=page.locator('.app-card');
 await expect(card.locator('.template-preview-prompt')).toBeHidden();
 await card.getByText('Preview workflow').click();
 await expect(card.locator('.template-preview-prompt')).toHaveText(owner.promptTemplate);
 await expect(card.locator('.template-preview-content')).toContainText('owner-configured-model');
 await expect(card.locator('.template-preview-content')).toContainText('9:16');
 await expect(card.locator('.template-preview-content')).toContainText('Duration (seconds)');
 await expect(card.locator('.template-preview-content')).not.toContainText('MUST_NOT_APPEAR');
 expect(posts).toBe(0);
});

test('AI Apps template preview renders untrusted prompt as text and stays useful for unavailable workflows',async({page})=>{
 const template={id:'blocked-preview',title:'Offline reference workflow',description:'No working logo upload',
  category:'Ads',generationType:'video',requiredInputTypes:['logo'],
  promptTemplate:'<img src=x onerror="window.__promptExecuted=true"> Write an original ad.',active:true};
 await page.route('**/api/templates',route=>route.fulfill({json:{items:[template]}}));
 await page.goto('/ai-apps.html');
 const card=page.locator('.app-card');
 await expect(card.getByRole('button',{name:'Workflow pending'})).toBeDisabled();
 await card.getByText('Preview workflow').click();
 await expect(card.locator('.template-preview-prompt')).toContainText('<img src=x onerror=');
 await expect(card.locator('.template-preview-prompt img')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__promptExecuted===true)).toBe(false);
 await expect(card.locator('.template-preview-content')).toContainText('logo');
});


test('BASE #29 AI Apps navigation reaches separate My Creations, History, Credits and Pricing without paid generation',async({page})=>{
 await page.route('**/api/templates',route=>route.fulfill({json:{items:[]}}));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{ownerOnly:true,enabled:false,models:[],catalog:[]}}));
 let paidJobs=0;
 page.on('request',r=>{if(r.url().includes('/api/studio/jobs')&&r.method()==='POST')paidJobs++;});
 await page.goto('/ai-apps.html');
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 const creations=nav.getByRole('link',{name:'My Creations',exact:true});
 const historyLink=nav.getByRole('link',{name:'History',exact:true});
 const credits=nav.getByRole('link',{name:'Credits',exact:true});
 const pricing=nav.getByRole('link',{name:'Pricing',exact:true});
 await expect(creations).toHaveAttribute('href','deepsyq.html#recentCreations');
 await expect(historyLink).toHaveAttribute('href','generate-studio.html?view=history');
 await expect(credits).toHaveAttribute('href','ai-pricing.html#aiCreditSection');
 await expect(pricing).toHaveAttribute('href','ai-pricing.html');
 await credits.click();
 await expect(page).toHaveURL(/ai-pricing\.html#aiCreditSection$/);
 await page.goto('/ai-apps.html');
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'My Creations',exact:true}).click();
 await expect(page).toHaveURL(/deepsyq\.html#recentCreations$/);
 await expect(page.locator('#recentCreations')).toBeAttached();
 await page.goto('/ai-apps.html');
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'History',exact:true}).click();
 await expect(page).toHaveURL(/generate-studio\.html\?/);
 await expect.poll(()=>page.evaluate(()=>new URL(location.href).searchParams.get('view'))).toBe('history');
 await expect(page.locator('#showHistory')).toHaveAttribute('aria-pressed','true');
 expect(paidJobs).toBe(0);
});

test('BASE #19 catalog outage retains retry without a retired workflow link',async({page})=>{
 await page.route('**/api/templates',route=>route.fulfill({status:503,json:{error:'TEMPLATES_UNAVAILABLE'}}));
 await page.goto('/ai-apps.html');
 await expect(page.locator('#status')).toContainText('temporarily unavailable');
 await expect(page.getByRole('button',{name:'Retry loading templates'})).toBeVisible();
 await expect(page.locator('a[href*="product-video"]')).toHaveCount(0);
 await expect(page.locator('.app-card')).toHaveCount(0);
});

test('BASE #30: real long template metadata stays readable at 320px and 390px without redesign',async({page},info)=>{
 const word='OriginalCreativeProductName'.repeat(5);
 const category='HandmadeCampaignCollection'.repeat(4);
 await page.route('**/api/templates',route=>route.fulfill({json:{items:[
  {id:'long-template',title:word,description:'Original workflow '+word,category,generationType:'image',promptTemplate:'Create original visuals for '+word,requiredInputTypes:[],active:true},
  {id:'blocked-template',title:'Requires reference video',description:'Owner source needed',category:'Video',generationType:'video',promptTemplate:'No generation without source',requiredInputTypes:['video'],active:true}
 ]}}));
 let posts=0;
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))posts++;});
 for(const width of [320,390]){
  await page.setViewportSize({width,height:760});
  await page.goto('/ai-apps.html');
  await expect(page.locator('.app-card')).toHaveCount(2);
  const first=page.locator('.app-card').first();
  const bounds=await first.evaluate(card=>{
   const rect=card.getBoundingClientRect();
   return {right:rect.right,children:[card.querySelector('h3'),card.querySelector('.app-meta span')].map(e=>e.getBoundingClientRect().right)};
  });
  for(const right of bounds.children)expect(right).toBeLessThanOrEqual(bounds.right+1);
  await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
  const navTouch=await page.getByRole('navigation',{name:'Main navigation'}).locator('a').first().evaluate(e=>e.getBoundingClientRect().height);
  expect(navTouch).toBeGreaterThanOrEqual(44);
  await first.getByText('Preview workflow').click();
  await expect(first.locator('.template-preview-prompt')).toContainText(word);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  if(width===390)await page.screenshot({path:info.outputPath('base30-ai-apps-390.png'),fullPage:true});
 }
 await expect(page.locator('.app-card').last().getByRole('button',{name:'Workflow pending'})).toBeDisabled();
 expect(posts).toBe(0);
});

test('BASE #30: mobile and desktop Quick Create hand off to Studio without generating',async({page})=>{
 let posts=0;
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))posts++;});
 await page.goto('/deepsyq.html');
 await expect(page.locator('#homeQuickPrompt')).toBeVisible();
 await page.locator('#homeQuickPrompt').fill('Original product announcement in a cinematic studio');
 await page.locator('[data-home-kind="video"]').click();
 await expect(page).toHaveURL(/generate-studio\.html\?studio=video&from=home/);
 await expect(page.locator('#prompt')).toHaveValue('Original product announcement in a cinematic studio');
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(posts).toBe(0);
});
