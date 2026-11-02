import {test,expect} from '@playwright/test';

async function setup(page,onRequest=()=>null){
 let mutationPosts=0;
 page.on('request',request=>{
  if(request.method()!=='GET'&&/\/api\/studio\/admin\//.test(request.url()))mutationPosts++;
 });
 await page.route('**/api/me',route=>route.fulfill({json:{user:{id:'owner-test',isAdmin:true}}}));
 await page.route('**/api/studio/admin/**',route=>{
  const answer=onRequest(route,new URL(route.request().url()));
  if(answer)return answer;
  return route.fulfill({status:403,json:{error:'NOT_CONFIGURED_TEST'}});
 });
 await page.goto('/deepsyq.html');
 await page.evaluate(()=>localStorage.setItem('vv_token','owner-test-token'));
 await page.goto('/deepsyq-admin.html');
 await expect(page.locator('#userQuery')).toBeVisible();
 return ()=>mutationPosts;
}

test('BASE #38: pageshow with the same owner token must not force logout',async({page})=>{
 const mutations=await setup(page,(route,url)=>{
  if(url.pathname==='/api/studio/admin/users'||url.pathname==='/api/studio/admin/jobs')
   return route.fulfill({json:{items:[]}});
  return null;
 });
 // A BFCache page restore emits a truthy event argument. It must not be
 // misinterpreted as checkOwnerSession(force=true).
 await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
 await expect(page).toHaveURL(/\/deepsyq-admin\.html$/);
 await expect(page.locator('#userQuery')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBe('owner-test-token');
 expect(mutations()).toBe(0);
});

test('BASE #38: newer user search wins over late older result, with no admin writes',async({page})=>{
 let heldOld,oldStarted=false;
 const mutations=await setup(page,(route,url)=>{
  if(url.pathname==='/api/studio/admin/users'){
   const q=url.searchParams.get('q');
   if(q==='old'){heldOld=route;oldStarted=true;return true;}
   return route.fulfill({json:{items:q==='new'?[{name:'New user',email:'new@example.test',plan:'free',status:'active',aiWallet:{available:0,reserved:0,debt:0},generationCount:0,aiPurchaseCount:0,createdAt:'2026-01-01'}]:[]}});
  }
  if(url.pathname==='/api/studio/admin/jobs')return route.fulfill({json:{items:[]}});
  return null;
 });
 await page.locator('#userQuery').fill('old');
 await page.locator('#userSearch button').click();
 await expect.poll(()=>oldStarted).toBe(true);
 await page.locator('#userQuery').fill('new');
 await page.locator('#userSearch button').click();
 await expect(page.locator('#usersTable')).toContainText('new@example.test');
 await heldOld.fulfill({json:{items:[{name:'Older private record',email:'older@example.test',plan:'pro',status:'active',aiWallet:{available:50,reserved:0,debt:0},generationCount:5,aiPurchaseCount:1,createdAt:'2026-01-01'}]}});
 await expect(page.locator('#usersTable')).not.toContainText('older@example.test');
 await expect(page.locator('#usersStatus')).not.toContainText('Loading');
 expect(mutations()).toBe(0);
});

test('BASE #38: rapid job status filter cannot render a stale response',async({page})=>{
 let heldFailed,oldStarted=false;
 const mutations=await setup(page,(route,url)=>{
  if(url.pathname==='/api/studio/admin/users')return route.fulfill({json:{items:[]}});
  if(url.pathname==='/api/studio/admin/jobs'){
   const status=url.searchParams.get('status');
   if(status==='failed'){heldFailed=route;oldStarted=true;return true;}
   return route.fulfill({json:{items:status==='ready'?[{id:'ready-synthetic',userEmail:'creator@example.test',status:'ready',provider:'fixture',model:'none',durationSeconds:1,actualCost:null,estimatedCost:null,creditsCharged:0,creditsReserved:0,error:''}]:[]}});
  }
  return null;
 });
 await page.locator('#jobFilter').selectOption('failed');
 await expect.poll(()=>oldStarted).toBe(true);
 await page.locator('#jobFilter').selectOption('ready');
 await expect(page.locator('#jobsTable')).toContainText('ready-synthetic');
 await heldFailed.fulfill({json:{items:[{id:'failed-old',userEmail:'private@example.test',status:'failed',provider:'fixture',model:'none',durationSeconds:0,actualCost:null,estimatedCost:null,creditsCharged:0,creditsReserved:0,error:'old'}]}});
 await expect(page.locator('#jobsTable')).not.toContainText('failed-old');
 expect(mutations()).toBe(0);
});

test('BASE #38: latest metrics time window wins over a delayed obsolete range',async({page})=>{
 let heldOld,oldStarted=false;
 const mutations=await setup(page,(route,url)=>{
  if(url.pathname==='/api/studio/admin/users'||url.pathname==='/api/studio/admin/jobs')return route.fulfill({json:{items:[]}});
  if(url.pathname==='/api/studio/admin/metrics'){
   const win=url.searchParams.get('window');
   if(win==='24h'){heldOld=route;oldStarted=true;return true;}
   return route.fulfill({json:{window:win,items:win==='30d'?[{
    provider:'new-range',model:'fixture',kind:'video',jobs:1,succeeded:1,failed:0,processing:0,
    successRate:1,averageSeconds:2,actualCost:0,costCurrency:'usd',creditsCharged:0
   }]:[]}});
  }
  return null;
 });
 await page.locator('#metricsWindow').selectOption('24h');
 await expect.poll(()=>oldStarted).toBe(true);
 await page.locator('#metricsWindow').selectOption('30d');
 await expect(page.locator('#metrics')).toContainText('new-range');
 await heldOld.fulfill({json:{window:'24h',items:[{
  provider:'stale-range',model:'fixture',kind:'image',jobs:2,succeeded:1,failed:1,processing:0,
  successRate:.5,averageSeconds:4,actualCost:0,costCurrency:'usd',creditsCharged:0
 }]}});
 await expect(page.locator('#metrics')).not.toContainText('stale-range');
 await expect(page.locator('#metricsStatus')).toContainText('30d');
 expect(mutations()).toBe(0);
});

test('BASE #38: owner dashboard exits immediately when token rotates in another tab',async({page,context})=>{
 await setup(page,(route,url)=>{
  if(url.pathname==='/api/studio/admin/users'||url.pathname==='/api/studio/admin/jobs')return route.fulfill({json:{items:[]}});
  return null;
 });
 const other=await context.newPage();
 await other.goto('/deepsyq.html');
 await other.evaluate(()=>localStorage.setItem('vv_token','other-account-synthetic-token'));
 await expect(page).toHaveURL(/\/deepsyq\.html$/);
 await other.close();
});


test('BASE #38: restored history page cannot expose previous owner after a session change',async({page})=>{
 await setup(page,(route,url)=>{
  if(url.pathname==='/api/studio/admin/users'||url.pathname==='/api/studio/admin/jobs')return route.fulfill({json:{items:[]}});
  return null;
 });
 await page.evaluate(()=>{
  // Model the same-tab account replacement while a dashboard is suspended.
  // A native BFCache restore emits pageshow without rerunning this module.
  localStorage.setItem('vv_token','new-account-synthetic-token');
  window.dispatchEvent(new Event('pageshow'));
 });
 await expect(page).toHaveURL(/\/deepsyq\.html$/);
});


test('BASE #38: server-revoked owner token hides existing admin tables on HTTP 401',async({page})=>{
 let revoked=false;
 const mutations=await setup(page,(route,url)=>{
  if(url.pathname==='/api/studio/admin/users'){
   if(revoked)return route.fulfill({status:401,json:{error:'AUTH_REQUIRED'}});
   return route.fulfill({json:{items:[{
    name:'Prior owner data',email:'private-record@example.test',
    plan:'pro',status:'active',aiWallet:{available:0,reserved:0,debt:0},
    generationCount:0,aiPurchaseCount:0,createdAt:'2026-01-01'
   }]}});
  }
  if(url.pathname==='/api/studio/admin/jobs')return route.fulfill({json:{items:[]}});
  return null;
 });
 await expect(page.locator('#usersTable')).toContainText('private-record@example.test');
 revoked=true;
 await page.locator('#userQuery').fill('recheck');
 await page.locator('#userSearch button').click();
 await expect(page).toHaveURL(/\/deepsyq\.html$/);
 expect(mutations()).toBe(0);
});
