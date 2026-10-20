import {test,expect} from '@playwright/test';

// C11: genuinely new widths/retirement/three current Studio types/rights-neutral
// Inspiration filters. Synthetic local fixtures; no AI, billing, Stripe or upload.
const widths=[320,375,390,768,1448];
const models=[
 {id:'c11-photo',title:'Original Photo',category:'Design',generationType:'image',promptTemplate:'A fictional glass garden'},
 {id:'c11-film',title:'Original Film',category:'Motion',generationType:'video',promptTemplate:'A fictional whale above clouds'},
 {id:'c11-voice',title:'Original Narration',category:'Audio',generationType:'audio',promptTemplate:'A fictional narrator introduces a garden'},
 {id:'c11-agent',title:'Autonomous task soon',category:'Automation',generationType:'agent',requiredInputTypes:['external_agent'],promptTemplate:'No working agent'},
 {id:'c11-old',title:'Retired Product Video template',category:'Retired',generationType:'product_video',promptTemplate:'Retired'}
];
const inspiration=[
 {id:'fictional-image',slug:'fictional-image',title:'Fictional painting',description:'Synthetic, no real licensed photo',category:'Paintings',kind:'image',aspectRatio:'1:1',prompt:'Original fictional painting of flowers',defaultModel:'c11-unconnected-provider-model',previewUrl:'/unavailable-fixture.png',actionTarget:'studio',requiredInputTypes:[],rightsBasis:'owned',rightsNote:'Synthetic test only'},
 {id:'fictional-video',slug:'fictional-video',title:'Fictional animation',description:'Synthetic, no real licensed clip',category:'Motion',kind:'video',aspectRatio:'16:9',prompt:'Original animation of a floating island',previewUrl:'/unavailable-fixture.mp4',actionTarget:'studio',requiredInputTypes:[],rightsBasis:'owned',rightsNote:'Synthetic test only'}
];
async function fixtures(page){
 await page.route('**/api/templates',r=>r.fulfill({json:{items:models}}));
 await page.route('**/api/inspiration?**',r=>{
  const url=new URL(r.request().url()),q=url.searchParams;
  const filtered=inspiration.filter(i=>
   (!q.get('kind')||q.get('kind')==='all'||i.kind===q.get('kind'))&&
   (!q.get('category')||i.category===q.get('category'))&&
   (!q.get('ratio')||i.aspectRatio===q.get('ratio'))&&
   (!q.get('q')||(i.title+' '+i.description+' '+i.prompt).toLowerCase().includes(q.get('q').toLowerCase()))
  );
  r.fulfill({json:{items:filtered,categories:['Paintings','Motion'],ratios:['1:1','16:9'],
   pagination:{offset:0,limit:24,hasMore:false,nextOffset:null}}});
 });
 await page.route('**/api/studio/config',r=>r.fulfill({json:{
  enabled:false,ownerOnly:true,publicGenerationEnabled:false,models:[],catalog:[]
 }}));
 await page.route('**/api/config',r=>r.fulfill({json:{
  billingConfigured:false,googleClientId:'',features:{aiApps:true,inspiration:true,productVideo:false}
 }}));
 await page.route('**/api/speech/config',r=>r.fulfill({json:{enabled:false}}));
 await page.route('**/api/auth/email/status',r=>r.fulfill({json:{configured:false}}));
}
function noPaid(page){
 const writes=[];page.on('request',q=>{
  if(q.method()==='POST'&&/\/api\/(studio\/jobs|ai-billing|billing|payments|ai-wallet|speech\/generate|ai-provider)/.test(new URL(q.url()).pathname))writes.push(q.url());
 });return writes;
}
async function fit(page,width,label){
 const actual=await page.evaluate(()=>document.documentElement.scrollWidth);
 expect(actual,label+' horizontal overflow at '+width).toBeLessThanOrEqual(width+1);
}
test('C11 retired Product Video HTTP404; only Image Video Audio working paths, Agent honest Coming Soon across five widths',async({page})=>{
 await fixtures(page);const writes=noPaid(page);
 for(const path of ['/product-video.html','/product-video'])
  expect((await page.request.get(path)).status(),path).toBe(404);
 for(const width of widths){
  await page.setViewportSize({width,height:850});
  await page.goto('/ai-apps.html');
  const values=await page.locator('#type option').evaluateAll(options=>options.map(o=>o.value));
  expect(values).toEqual(['','image','video','audio']);
  await expect(page.locator('.app-card')).toHaveCount(4);
  await expect(page.locator('#apps')).not.toContainText('Retired Product Video');
  await expect(page.locator('a[href*="product-video"]')).toHaveCount(0);
  await expect(page.locator('.app-card').filter({hasText:'Autonomous task soon'})
   .getByRole('button',{name:'Workflow pending'})).toBeDisabled();
  const agent=page.locator('#dsSiteSidebar [aria-label="Agent coming soon"]');
  await expect(agent).toHaveCount(1);
  expect(await agent.evaluate(el=>el.tagName)).toBe('SPAN');
  await fit(page,width,'AI Apps');
  const drawer=page.locator('.ds-site-mobile-toggle');
  if(width<=900){
   await expect(drawer).toBeVisible();await drawer.click();
   await expect(drawer).toHaveAttribute('aria-expanded','true');
   await page.keyboard.press('Escape');
   await expect(drawer).toHaveAttribute('aria-expanded','false');
  }else await expect(drawer).toBeHidden();
  for(const [name,kind,prompt] of [
   ['Original Photo','image','A fictional glass garden'],
   ['Original Film','video','A fictional whale above clouds'],
   ['Original Narration','audio','A fictional narrator introduces a garden']
  ]){
   await page.goto('/ai-apps.html');
   await page.locator('.app-card').filter({hasText:name})
    .getByRole('button',{name:'Use template'}).click();
   await expect(page).toHaveURL(new RegExp('generate-studio\\.html\\?studio='+kind+'&from=template'));
   await expect(page.locator('#prompt')).toHaveValue(prompt);
   await expect(page.locator('#consent')).not.toBeChecked();
  }
  await page.goto('/generate-studio.html?studio=video');
  await expect(page.locator('#prompt')).toBeVisible();
  await expect(page.locator('a[href*="product-video"]')).toHaveCount(0);
  await fit(page,width,'Studio Video');
 }
 expect(writes).toEqual([]);
});

test('C11 everyday Audio/Tools, Avatar Back, menu Escape work at all owner widths',async({page})=>{
 await fixtures(page);const writes=noPaid(page);
 for(const width of widths){
  await page.setViewportSize({width,height:850});
  await page.goto('/free-tools.html');
  await expect(page.locator('[data-hub-tool="tts"]')).toHaveAttribute('href','audio-studio.html?tool=tts');
  await expect(page.locator('[data-hub-tool="stt"]')).toHaveAttribute('href','audio-studio.html?tool=stt');
  await fit(page,width,'Tools');
  await page.locator('nav.tools-direct-launches a[href="avatar-studio.html?from=tools"]').click();
  await expect(page).toHaveURL(/avatar-studio\.html\?from=tools$/);
  await expect(page.locator('[data-av="back"]')).toHaveAttribute('href','free-tools.html');
  await page.locator('[data-av="back"]').click();
  await expect(page).toHaveURL(/free-tools\.html$/);
  await page.goto('/audio-studio.html?tool=tts');
  await expect(page.locator('#speechText')).toBeVisible();
  await expect(page.locator('#speechGenerate')).toBeDisabled();
  await expect(page.locator('#transcribeFile')).toBeHidden();
  await fit(page,width,'Audio TTS');
  const drawer=page.locator('.ds-site-mobile-toggle');
  if(width<=900){
   await drawer.click();await expect(drawer).toHaveAttribute('aria-expanded','true');
   await page.keyboard.press('Escape');
   await expect(drawer).toHaveAttribute('aria-expanded','false');
  }
  await page.goto('/audio-studio.html?tool=stt');
  await expect(page.locator('#transcribeFile')).toBeVisible();
  await expect(page.locator('#speechText')).toBeHidden();
  await page.goto('/avatar-studio.html');
  await expect(page.locator('[data-av="back"]')).toHaveAttribute('href','index.html');
 }
 expect(writes).toEqual([]);
});

test('C11 Inspiration existing rights-gated API fixtures: filters, categories and Create yours handoff are truthful',async({page})=>{
 await fixtures(page);const writes=noPaid(page);
 for(const width of widths){
  await page.setViewportSize({width,height:850});
  await page.goto('/inspiration.html');
  await expect(page.locator('#gallery .card')).toHaveCount(2);
  // Model preferences are NOT evidence of a configured/available paid provider.
  await expect(page.locator('#gallery .card').filter({hasText:'Fictional painting'}))
   .not.toContainText('c11-unconnected-provider-model');
  await fit(page,width,'Inspiration');
  await expect(page.locator('#category option')).toHaveCount(3);
  await page.getByRole('button',{name:'Videos',exact:true}).click();
  await expect(page.locator('#gallery .card')).toHaveCount(1);
  await expect(page.locator('#gallery')).toContainText('Fictional animation');
  await page.locator('#category').selectOption('Motion');
  await expect(page.locator('#gallery .card')).toHaveCount(1);
  await page.locator('#ratio').selectOption('1:1');
  await expect(page.locator('#gallery .card')).toHaveCount(0);
  await expect(page.locator('#gallery')).toContainText('No owner-approved inspiration matches');
  await page.locator('#ratio').selectOption('16:9');
  await expect(page.locator('#gallery .card')).toHaveCount(1);
  await page.getByRole('button',{name:'Create yours'}).click();
  await expect(page).toHaveURL(/generate-studio\.html\?studio=video&from=inspiration&action=create/);
  await expect(page.locator('#prompt')).toHaveValue('Original animation of a floating island');
  await expect(page.locator('#consent')).not.toBeChecked();
  await page.goto('/inspiration.html?kind=image');
  await expect(page.locator('#gallery .card')).toHaveCount(1);
  await page.getByRole('button',{name:'Use this prompt'}).click();
  await expect(page).toHaveURL(/studio=image&from=inspiration&action=prompt/);
  await expect(page.locator('#prompt')).toHaveValue('Original fictional painting of flowers');
  await expect(page.locator('#consent')).not.toBeChecked();
 }
 expect(writes).toEqual([]);
});
