import {test,expect} from '@playwright/test';

// BASE1-C7: synthetic, zero-spend browser evidence for the one remaining
// Inspiration "Load more" hover color; no user accounts or AI generation.
const entry=(id)=>({
 id,title:'Fixture '+id,slug:'fixture-'+id,category:'Editorial',kind:'image',
 description:'Mocked, owner-neutral browser fixture',
 previewUrl:'/nonexistent-c7-fixture.webp',prompt:'A fictional city poster',
 aspectRatio:'1:1',actionTarget:'studio',requiredInputTypes:[],
 defaultSettings:{ratio:'1:1'},defaultModel:null
});

test('BASE1-C7 Inspiration enabled Load More has owner neon hover and real pagination, never paid POST',async({page},testInfo)=>{
 const paid=[];
 page.on('request',request=>{
  if(request.method()==='POST'&&/\/api\/(?:studio\/jobs|billing|payments|ai-wallet|speech\/generate)/.test(new URL(request.url()).pathname))paid.push(request.url());
 });
 await page.route('**/api/inspiration?**',route=>{
  const offset=Number(new URL(route.request().url()).searchParams.get('offset')||'0');
  route.fulfill({json:{
   items:[entry(offset===0?'first':'second')],
   categories:['Editorial'],ratios:['1:1'],
   pagination:{limit:24,offset,nextOffset:offset===0?24:null,hasMore:offset===0}
  }});
 });
 for(const width of [320,375,390,768,1448]){
  await page.setViewportSize({width,height:820});
  await page.goto('/inspiration.html');
  const loadMore=page.getByRole('button',{name:'Load more inspiration'});
  await expect(loadMore).toBeVisible();
  await expect(loadMore).toBeEnabled();
  // Existing rights-neutral image card actions remain accessible; do not navigate/pay.
  const card=page.locator('#gallery .card').first();
  await expect(card.getByRole('button',{name:'Create yours'})).toBeEnabled();
  await expect(card.getByRole('button',{name:'Clone and Try'})).toBeEnabled();
  await loadMore.hover();
  const actual=await loadMore.evaluate(el=>{
   const s=getComputedStyle(el);
   return {border:s.borderTopColor,color:s.color,background:s.backgroundColor};
  });
  console.log('BASE1-C7 computed hover',testInfo.project.name,width,JSON.stringify(actual));
  await page.screenshot({path:testInfo.outputPath('inspiration-load-more-'+width+'.png'),fullPage:true});
  expect(actual.border,'dark-theme enabled Load More hover border at '+width).toBe('rgb(146, 91, 255)');
  expect(actual.color,'dark-theme enabled Load More hover text at '+width).toBe('rgb(234, 208, 255)');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth),'No page overflow '+width).toBeLessThanOrEqual(width+1);
  await loadMore.click();
  await expect(page.locator('#gallery .card')).toHaveCount(2);
  await expect(loadMore).toBeHidden();
 }
 expect(paid,'No AI/Stripe/generation POST in fixture').toEqual([]);
});
