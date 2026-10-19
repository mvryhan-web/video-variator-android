import {test,expect} from '@playwright/test';

// Synthetic published gallery items for no-spend browser acceptance only.
// No example is seeded into the real DB or presented as licensed customer media.
const item={
 id:'synthetic-c22',title:'Synthetic editorial example',slug:'synthetic-editorial',
 kind:'image',category:'Editorial',description:'Fixture only',
 previewUrl:'/does-not-exist-synthetic.webp',prompt:'Make a cinematic botanical portrait',
 defaultModel:'fixture-model',aspectRatio:'2:3',requiredInputTypes:['image'],
 defaultSettings:{ratio:'2:3'},actionTarget:'studio'
};
async function gallery(page,entry=item){
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

test('all three Inspiration → Studio actions fail closed with accessible card-local error when storage is denied',async({page})=>{
 const paid=countPaidPosts(page);
 await denyKey(page,'deepsyq_template_start');
 await gallery(page);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/inspiration.html');
 await expect(page.locator('#gallery .card')).toHaveCount(1);
 const before=page.url();
 for(const name of ['Create yours','Use this prompt','Clone and Try']){
  await page.getByRole('button',{name,exact:true}).click();
  await expect(page.locator('.card [role="alert"]')).toBeVisible();
  await expect(page.locator('.card [role="alert"]')).toContainText('could not prepare this inspiration');
  expect(page.url()).toBe(before);
  await expect(page.locator('#gallery .card')).toHaveCount(1);
 }
 expect(errors).toEqual([]);
 expect(paid()).toBe(0);
});

test('agent inspiration handoff also refuses navigation when scoped tab storage is blocked',async({page})=>{
 const paid=countPaidPosts(page);
 await denyKey(page,'deepsyq_agent_inspiration_start');
 await gallery(page,{...item,kind:'video',aspectRatio:'16:9',actionTarget:'agent',actionPath:'/agent.html'});
 await page.goto('/inspiration.html');
 await expect(page.locator('#gallery .card')).toHaveCount(1);
 await page.getByRole('button',{name:'Create yours'}).click();
 await expect(page.locator('.card [role="alert"]')).toContainText('could not prepare this inspiration');
 await expect(page).toHaveURL(/\/inspiration\.html$/);
 expect(paid()).toBe(0);
});

test('available tab storage preserves prepared Clone handoff and navigates to Image Studio with zero generation',async({page})=>{
 const paid=countPaidPosts(page);
 await gallery(page);
 // Deterministic neutral destination: verify handoff without booting any billable Studio API.
 await page.route('**/generate-studio.html?**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Test Studio</title><h1>Local Studio destination</h1>'}));
 await page.goto('/inspiration.html');
 await expect(page.locator('#gallery .card')).toHaveCount(1);
 await page.getByRole('button',{name:'Clone and Try'}).click();
 await expect(page).toHaveURL(/generate-studio\.html\?studio=image&from=inspiration&action=clone$/);
 const payload=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('deepsyq_template_start')));
 expect(payload).toMatchObject({
  id:'synthetic-c22',source:'inspiration',action:'clone',generationType:'image',
  promptTemplate:'Make a cinematic botanical portrait',defaultModel:'fixture-model',
  defaultSettings:{ratio:'2:3'},requiredInputTypes:['image']
 });
 expect(paid()).toBe(0);
});
