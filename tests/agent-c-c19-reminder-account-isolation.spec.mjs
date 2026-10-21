import {test,expect} from '@playwright/test';

// Synthetic signed-in accounts only. All data served from no-spend route stubs.
const A='C19-A',B='C19-B';
const reminder=who=>({id:'11111111-1111-4111-8111-111111111111',title:who+' private reminder',
 event_at:'2026-11-18T18:00:00.000Z',timezone:'UTC',recurrence:'none',channel:'push',
 date_local:'2026-11-18',time_local:'18:00',weekdays:[],advance_minutes:60});
const payload=(who,notes)=>({items:notes?[{id:'22222222-2222-4222-8222-222222222222',body:who+' private note'}]:[reminder(who)]});
async function setup(page,{holdA=false}={}){
 const pending=[],seen=[];
 await page.addInitScript(token=>localStorage.setItem('vv_token',token),A);
 await page.route('**/api/reminders**',async route=>{
  if(route.request().method()!=='GET')return route.abort();
  const who=route.request().headers().authorization?.endsWith(A)?A:B;
  const notes=new URL(route.request().url()).pathname.endsWith('/notes');
  seen.push({who,notes});
  if(who===A&&holdA)await new Promise(resolve=>pending.push(resolve));
  try{await route.fulfill({json:payload(who,notes)});}catch(_){/* Page closed. */}
 });
 await page.goto('/smart-reminders.html',{waitUntil:'domcontentloaded'});
 return {pending,seen};
}
test('C19 already-rendered account A reminder and note are scrubbed immediately on B refocus',async({page})=>{
 const paid=[];
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio|billing|payments|stripe|speech)/.test(new URL(r.url()).pathname))paid.push(r.url());});
 await setup(page);
 await expect(page.locator('#reminderList')).toContainText(A+' private reminder');
 await expect(page.locator('#notesList')).toContainText(A+' private note');
 await page.evaluate(token=>{localStorage.setItem('vv_token',token);window.dispatchEvent(new Event('focus'));},B);
 await expect(page.locator('#reminderList')).not.toContainText(A+' private reminder');
 await expect(page.locator('#notesList')).not.toContainText(A+' private note');
 await expect(page.locator('#reminderList')).toContainText(B+' private reminder');
 await expect(page.locator('#notesList')).toContainText(B+' private note');
 expect(paid).toEqual([]);
});
test('C19 delayed A GET can never insert A reminder or note after B focus',async({page})=>{
 const {pending,seen}=await setup(page,{holdA:true});
 await expect.poll(()=>pending.length).toBe(2);
 await page.evaluate(token=>{localStorage.setItem('vv_token',token);window.dispatchEvent(new Event('focus'));},B);
 await expect.poll(()=>seen.filter(x=>x.who===B).length).toBe(2);
 for(const release of pending)release();
 await expect(page.locator('#reminderList')).toContainText(B+' private reminder');
 await expect(page.locator('#notesList')).toContainText(B+' private note');
 await expect(page.locator('#reminderList')).not.toContainText(A+' private reminder');
 await expect(page.locator('#notesList')).not.toContainText(A+' private note');
});
