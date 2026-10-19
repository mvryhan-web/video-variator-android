import {test,expect} from '@playwright/test';

// Owner BASE1 C4. Real pages and browser CSS; synthetic owned fixture inputs.
// Test is offline/no-spend: no purchases, provider calls, user records or real media.
const types=[
 {id:'c4-image',title:'Synthetic C4 visual card',category:'Design',
  generationType:'image',promptTemplate:'A fictional teal paper sculpture'}
];
async function setup(page){
 await page.route('**/api/templates',route=>route.fulfill({json:{items:types}}));
 await page.route('**/api/config',route=>route.fulfill({json:{features:{aiApps:true},
   googleClientId:'',billingConfigured:false}}));
}
function paidCounter(page){
 let requests=0;
 page.on('request',request=>{
  const url=new URL(request.url());
  if(request.method()==='POST'&&/\/api\/(?:studio\/jobs|billing|payments|speech\/generate)/.test(url.pathname)) requests++;
 });
 return ()=>requests;
}
async function styleOf(locator){
 return locator.evaluate(el=>{
  const s=getComputedStyle(el),r=el.getBoundingClientRect();
  return {shadow:s.boxShadow,image:s.backgroundImage,background:s.backgroundColor,
   opacity:Number(s.opacity),radius:s.borderRadius,
   rect:{width:r.width,right:r.right},disabled:el.disabled||false};
 });
}
for(const width of [320,375,768,1280]){
 test('BASE1-C4 existing AI Apps card inherits owner neon depth, not a duplicate '+width,async({page})=>{
  await setup(page);
  await page.setViewportSize({width,height:850});
  const paid=paidCounter(page);
  await page.goto('/ai-apps.html');
  const card=page.locator('.app-card').filter({hasText:'Synthetic C4 visual card'});
  await expect(card).toHaveCount(1);
  const normal=await styleOf(card);
  expect(normal.shadow,'Card must have subtle owner navy/neon shadow').not.toBe('none');
  expect(normal.rect.right,'No horizontal card overflow').toBeLessThanOrEqual(width+1);
  const button=card.getByRole('button',{name:'Use template'});
  await expect(button).toBeEnabled();
  await button.focus();
  await expect.poll(async()=> (await styleOf(card)).shadow)
   .not.toBe(normal.shadow);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth))
   .toBeLessThanOrEqual(width+1);
  expect(paid()).toBe(0);
 });

 test('BASE1-C4 local background remover keeps disabled and real enabled neon, '+width,async({page})=>{
  await page.setViewportSize({width,height:850});
  const paid=paidCounter(page);
  await page.goto('/simple-background-remover.html');
  const erase=page.locator('#erase');
  await expect(erase).toBeDisabled();
  const before=await styleOf(erase);
  expect(before.shadow,'Inactive action cannot look active').toBe('none');
  expect(before.image,'Inactive action must not show paid-style active gradient').toBe('none');
  expect(before.opacity).toBeLessThan(0.85);

  // Generate a tiny genuine local PNG on this browser; never upload it.
  const base64=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=8;c.height=8;
   c.getContext('2d').fillStyle='#04a9b7';
   c.getContext('2d').fillRect(0,0,8,8);
   return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#photo').setInputFiles({
   name:'synthetic-c4-local.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')
  });
  await expect(erase).toBeEnabled();
  const after=await styleOf(erase);
  expect(after.image,'Enabled C4 action uses owner violet/pink gradient').toContain('linear-gradient');
  expect(after.shadow,'Enabled action has luminous depth').not.toBe('none');
  expect(after.radius,'Rounded owner CTA, same button semantics').toBe('12px');
  expect(after.rect.right,'Control remains within narrow viewport').toBeLessThanOrEqual(width+1);
  await erase.click();
  await expect(page.locator('#download')).toBeEnabled();
  await expect(page.locator('#status')).toContainText('Transparent PNG ready');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth))
   .toBeLessThanOrEqual(width+1);
  expect(paid()).toBe(0);
 });
}
