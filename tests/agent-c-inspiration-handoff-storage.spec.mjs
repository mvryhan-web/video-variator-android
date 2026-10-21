import {test,expect} from '@playwright/test';

// Home Inspiration fixtures are synthetic; no provider jobs or paid generation.
const item={
 id:'synthetic-c22',title:'Synthetic cinematic video',slug:'synthetic-film',
 kind:'video',category:'Cinematic',description:'Fixture only',
 previewUrl:'/does-not-exist-synthetic.mp4',prompt:'Make a cinematic botanical scene',
 defaultModel:'fixture-model',aspectRatio:'16:9',requiredInputTypes:[],
 defaultSettings:{ratio:'16:9'},actionTarget:'studio'
};
async function gallery(page,entry=item){
 await page.route('**/api/config',route=>route.fulfill({json:{features:{inspiration:true},plans:{}}}));
 await page.route('**/api/inspiration?**',route=>route.fulfill({json:{
  items:[entry],categories:[entry.category],ratios:[entry.aspectRatio],
  pagination:{limit:12,offset:0,nextOffset:null,hasMore:false}
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
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/'))posts++;});
 return ()=>posts;
}
test('Home Inspiration prevents Studio navigation if preparation storage is blocked',async({page})=>{
 const paid=countPaidPosts(page);
 await denyKey(page,'deepsyq_template_start');
 await gallery(page);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/deepsyq.html#inspirationPreview');
 const card=page.locator('#inspirationPreviewGrid .inspiration-preview-card');
 await expect(card).toHaveCount(1);
 const before=page.url();
 await card.click();
 for(const name of ['Use this prompt','Clone & Try']){
  await page.getByRole('dialog').getByRole('button',{name}).click();
  await expect(page.getByRole('dialog').locator('[role="alert"]')).toContainText('Could not prepare Studio');
  expect(page.url()).toBe(before);
 }
 expect(errors).toEqual([]);
 expect(paid()).toBe(0);
});
test('Agent inspiration does not get mixed into Home Video/Image carousel',async({page})=>{
 const paid=countPaidPosts(page);
 await gallery(page,{...item,actionTarget:'agent',actionPath:'/agent.html'});
 await page.goto('/deepsyq.html#inspirationPreview');
 await expect(page.locator('#inspirationPreview')).toBeVisible({timeout:15000});
 await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(0);
 expect(paid()).toBe(0);
});
test('Allowed storage passes source video prompt to Video Studio without generating',async({page})=>{
 const paid=countPaidPosts(page);
 await gallery(page);
 await page.route('**/generate-studio.html?**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Test Studio</title><h1>Local Studio destination</h1>'}));
 await page.goto('/deepsyq.html#inspirationPreview');
 const card=page.locator('#inspirationPreviewGrid .inspiration-preview-card');
 await expect(card).toHaveCount(1);
 await card.click();
 await page.getByRole('dialog').getByRole('button',{name:'Clone & Try'}).click();
 await expect(page).toHaveURL(/generate-studio[.]html[?]studio=video&from=inspiration&action=clone$/);
 const payload=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('deepsyq_template_start')));
 expect(payload).toMatchObject({
  id:'synthetic-c22',source:'inspiration',action:'clone',generationType:'video',
  promptTemplate:'Make a cinematic botanical scene',defaultModel:'fixture-model',
  defaultSettings:{ratio:'16:9'},requiredInputTypes:[]
 });
 expect(paid()).toBe(0);
});
