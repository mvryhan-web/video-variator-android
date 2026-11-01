import {test,expect} from '@playwright/test';

const rows=[
 {id:'byteplus-seedream-4-5',kind:'image',provider:'BytePlus',label:'Seedream 4.5',adapter:true,enabled:true,control:{priority:100,enabledOverride:null,maintenance:false}},
 {id:'byteplus-seedream-5-lite',kind:'image',provider:'BytePlus',label:'Seedream 5 Lite',adapter:true,enabled:true,control:{priority:100,enabledOverride:null,maintenance:false}},
 {id:'veo-3.1-lite-generate-preview',kind:'video',provider:'Google',label:'Veo Lite',adapter:true,enabled:false,control:{priority:50,enabledOverride:null,maintenance:false}},
 {id:'catalog-only-model',kind:'image',provider:'Unknown',label:'Unverified',adapter:false,enabled:false,control:{priority:100}}
];
async function prepare(page,{owner=true}={}){
 await page.addInitScript(()=>localStorage.setItem('vv_token','owner-test-only'));
 const writes=[];
 await page.route('**/api/me',route=>route.fulfill({json:{user:{id:'synthetic-owner',isAdmin:owner}}}));
 await page.route('**/api/studio/admin/**',route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()==='GET'&&url.pathname==='/api/studio/admin/models')
   return route.fulfill({json:{items:rows}});
  if(request.method()==='PATCH'&&url.pathname.startsWith('/api/studio/admin/providers/')){
   writes.push({url:url.pathname,body:request.postDataJSON(),headers:request.headers()});
   return route.fulfill({json:{kind:request.postDataJSON().kind,provider:'BytePlus',modelIds:rows.slice(0,2).map(m=>m.id)}});
  }
  return route.fulfill({status:503,json:{error:'NO_EXTERNAL_SERVICES_IN_BROWSER_TEST'}});
 });
 await page.goto('/deepsyq-admin.html');
 return writes;
}
test('BASE9 only verified owner can see group controls, no mutations on load',async({page})=>{
 const writes=await prepare(page);
 await expect(page.locator('.provider-group-card')).toHaveCount(2);
 await expect(page.locator('#providerGroups')).not.toContainText('Unverified');
 await expect(page.locator('.provider-group-card').first()).toContainText('BytePlus');
 expect(writes).toEqual([]);
});
test('BASE9 explicit confirmed pause and restore use audited owner endpoint only; cancel has zero writes',async({page})=>{
 const writes=await prepare(page);
 const card=page.locator('.provider-group-card').filter({hasText:'BytePlus'});
 await expect(card).toBeVisible();
 page.once('dialog',dialog=>dialog.dismiss());
 await card.getByRole('button',{name:'Pause all'}).click();
 expect(writes).toHaveLength(0);
 page.once('dialog',dialog=>dialog.accept());
 await card.getByRole('button',{name:'Pause all'}).click();
 await expect.poll(()=>writes.length).toBe(1);
 expect(writes[0].url).toBe('/api/studio/admin/providers/BytePlus');
 expect(writes[0].body).toEqual({kind:'image',enabled:false,maintenance:true});
 expect(writes[0].headers.authorization).toBe('Bearer owner-test-only');
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('.provider-group-card').filter({hasText:'BytePlus'}).getByRole('button',{name:'Restore defaults'}).click();
 await expect.poll(()=>writes.length).toBe(2);
 expect(writes[1].body).toEqual({kind:'image',enabled:null,maintenance:false});
});
test('BASE9 priority only accepts whole bounded value; owner UI fits narrow viewport',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 const writes=await prepare(page);
 const card=page.locator('.provider-group-card').filter({hasText:'BytePlus'});
 await expect(card).toBeVisible();
 await card.getByRole('spinbutton',{name:'BytePlus image priority'}).fill('10001');
 await card.getByRole('button',{name:'Save priority'}).click();
 await expect(card).toContainText('0 to 10000');
 expect(writes).toHaveLength(0);
 await card.getByRole('spinbutton',{name:'BytePlus image priority'}).fill('75');
 page.once('dialog',dialog=>dialog.accept());
 await card.getByRole('button',{name:'Save priority'}).click();
 await expect.poll(()=>writes.length).toBe(1);
 expect(writes[0].body).toEqual({kind:'image',priority:75});
 const width=await page.evaluate(()=>document.documentElement.scrollWidth);
 expect(width).toBeLessThanOrEqual(321);
});
