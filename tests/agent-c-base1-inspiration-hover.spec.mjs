import {test,expect} from '@playwright/test';

// BASE1-C7: synthetic, zero-spend browser evidence for the one remaining
// Inspiration "Load more" hover color; no user accounts or AI generation.
const entry=(id)=>({
 id,title:'Fixture '+id,slug:'fixture-'+id,category:'Editorial',kind:'video',
 description:'Mocked, owner-neutral browser fixture',
 previewUrl:'/nonexistent-c7-fixture.webp',prompt:'A fictional city poster',
 aspectRatio:'1:1',actionTarget:'studio',requiredInputTypes:[],active:true,featured:true,rightsBasis:'owned',rightsNote:'Synthetic test only',
 defaultSettings:{ratio:'1:1'},defaultModel:null
});

test('BASE1-C7 Home Inspiration card remains accessible on hover and filters without paid POST',async({page},testInfo)=>{
 test.setTimeout(120000);
 await page.route('**/api/config',r=>r.fulfill({json:{billingConfigured:false,features:{aiApps:true,inspiration:true,productVideo:false,onboarding:false},plans:{}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/auth/email/status',r=>r.fulfill({json:{configured:false}}));
 const paid=[];let inspirationCalls=0;
 page.on('request',request=>{
  if(request.method()==='POST'&&/\/api\/(?:studio\/jobs|billing|payments|ai-wallet|speech\/generate)/.test(new URL(request.url()).pathname))paid.push(request.url());
 });
 await page.route('**/api/inspiration**',route=>{
  inspirationCalls++;
  const offset=Number(new URL(route.request().url()).searchParams.get('offset')||'0');
  return route.fulfill({json:{
   items:[entry(offset===0?'first':'second')],
   categories:['Editorial'],ratios:['1:1'],
   pagination:{limit:24,offset,nextOffset:offset===0?24:null,hasMore:offset===0}
  }});
 });
 for(const width of [320,375,390,768,1448]){
  await page.setViewportSize({width,height:820});
  const previousCalls=inspirationCalls;
  await page.goto('/deepsyq.html?c7Width='+width+'#inspirationPreview',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>inspirationCalls).toBeGreaterThan(previousCalls);
  const card=page.locator('#inspirationPreviewGrid .inspiration-preview-card').first();
  await expect(card).toBeVisible({timeout:15000});await card.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await card.hover();
  const hoverBorder=await card.evaluate(el=>getComputedStyle(el).borderTopColor);
  expect(hoverBorder,'Home Inspiration hover remains violet at '+width).toBe('rgb(146, 91, 255)');
  if(width===390)await page.screenshot({path:testInfo.outputPath('home-inspiration-hover-'+width+'.png'),fullPage:true});
  await card.click();
  await expect(page.getByRole('dialog').getByRole('button',{name:'Create yours'})).toBeEnabled();
  await expect(page.getByRole('dialog').getByRole('button',{name:'Clone & Try'})).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  const imageTab=page.locator('[data-inspiration-kind="image"]');await imageTab.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await imageTab.click();
  await expect(page.locator('#inspirationPreviewGrid button')).toHaveCount(0);
  await expect(page.locator('#inspirationEmpty')).toHaveText('No images yet.');
 }
 expect(paid,'No AI/Stripe/generation POST in fixture').toEqual([]);
});
