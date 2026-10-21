import {test,expect} from '@playwright/test';

// Synthetic published gallery items for no-spend browser acceptance only.
// No example is seeded into the real DB or presented as licensed customer media.
const item={
 id:'synthetic-c22',title:'Synthetic editorial example',slug:'synthetic-editorial',
 kind:'video',category:'Editorial',description:'Fixture only',
 previewUrl:'/does-not-exist-synthetic.webp',prompt:'Make a cinematic botanical portrait',
 defaultModel:'fixture-model',aspectRatio:'2:3',requiredInputTypes:['image'],
 defaultSettings:{ratio:'2:3'},actionTarget:'studio'
};
async function gallery(page,entry=item){
 await page.route('**/api/config',r=>r.fulfill({json:{features:{inspiration:true},plans:{}}}));
 await page.route('**/api/inspiration?**',route=>route.fulfill({json:{
  items:[entry],categories:[entry.category],ratios:[entry.aspectRatio],
  pagination:{limit:24,offset:0,nextOffset:null,hasMore:false}
 }}));
}
async function denyKey(page,key){
 await page.addInitScript(blocked=>{
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(name,value){
   if(name===blocked)throw new DOMException('Storage disabled by test policy','SecurityError');
   return original.call(this,name,value);
  };
 },key);
}
function countPaidPosts(page){
 let posts=0;
 page.on('request',request=>{if(request.method()==='POST'&&/\/api\/studio\/(?:jobs|generat|estimate)/.test(request.url()))posts++;});
 return ()=>posts;
}

test('all three Inspiration → Studio actions fail closed with accessible detail-panel error when storage is denied',async({page})=>{
 const paid=countPaidPosts(page);
 await denyKey(page,'deepsyq_template_start');
 await gallery(page);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/inspiration.html');
 await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(1);
 const before=page.url();
 await page.getByRole('button',{name:'View Synthetic editorial example inspiration'}).click();
 for(const name of ['Create yours','Use this prompt','Clone & Try']){
  await page.getByRole('dialog').getByRole('button',{name}).click();
  await expect(page.getByRole('dialog').locator('[role="alert"]')).toBeVisible();
  await expect(page.getByRole('dialog').locator('[role="alert"]')).toContainText('could not prepare this inspiration');
  expect(page.url()).toBe(before);
  await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(1);
 }
 expect(errors).toEqual([]);
 expect(paid()).toBe(0);
});

test('Home excludes agent entries from the Studio inspiration gallery',async({page})=>{
 const paid=countPaidPosts(page);await gallery(page,{...item,actionTarget:'agent',actionPath:'/agent.html'});await page.goto('/inspiration.html');await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(0);await expect(page).toHaveURL(/deepsyq\.html#inspirationPreview$/);expect(paid()).toBe(0);
});

test('available tab storage preserves prepared Clone handoff and navigates to Video Studio with zero generation',async({page})=>{
 const paid=countPaidPosts(page);
 await gallery(page);
 // Deterministic neutral destination: verify handoff without booting any billable Studio API.
 await page.route('**/generate-studio.html?**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Test Studio</title><h1>Local Studio destination</h1>'}));
 await page.goto('/inspiration.html');
 await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(1);
 await page.getByRole('button',{name:'View Synthetic editorial example inspiration'}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Clone & Try'}).click();
 await expect(page).toHaveURL(/generate-studio\.html\?studio=video&from=inspiration&action=clone$/);
 const payload=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('deepsyq_template_start')));
 expect(payload).toMatchObject({
  id:'synthetic-c22',source:'inspiration',action:'clone',generationType:'video',
  promptTemplate:'Make a cinematic botanical portrait',defaultModel:'fixture-model',
  defaultSettings:{ratio:'2:3'},requiredInputTypes:['image']
 });
 expect(paid()).toBe(0);
});
