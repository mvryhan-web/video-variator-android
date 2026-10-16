import {test,expect} from '@playwright/test';

const templates=[
 {id:'owned-image',title:'Editorial Portrait',description:'Original editorial lighting',category:'Editorial',generationType:'image',promptTemplate:'Original portrait concept',active:true},
 {id:'owned-video',title:'Product Reel',description:'A short product video concept',category:'Marketing',generationType:'product_video',promptTemplate:'Original product reel concept',active:true},
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

 await page.locator('#search').fill('product');
 await page.locator('#type').selectOption('video');
 await page.locator('#category').selectOption('Marketing');
 await expect(page.locator('.app-card')).toHaveCount(1);
 await expect(page.locator('#apps')).toContainText('Product Reel');
 await expect(page.locator('#status')).toHaveText('1 of 3 active templates shown.');
 await expect.poll(()=>new URL(page.url()).searchParams.get('category')).toBe('Marketing');
 await expect.poll(()=>new URL(page.url()).searchParams.get('type')).toBe('video');

 await page.reload();
 await expect(page.locator('#category')).toHaveValue('Marketing');
 await expect(page.locator('#search')).toHaveValue('product');
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
 await page.locator('.app-card').filter({hasText:'Product Reel'}).getByRole('button',{name:'Use template'}).click();
 await expect(page).toHaveURL(/generate-studio\\.html\\?studio=video&from=template/);
 await expect(page.locator('#prompt')).toHaveValue('Original product reel concept');
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(jobPosts).toBe(0);
});
