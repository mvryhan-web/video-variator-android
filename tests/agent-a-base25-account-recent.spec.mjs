import {test,expect} from '@playwright/test';

// BASE 25/Home policy (owner change 2026-10-25): Home no longer displays
// private Recent creations, My creations or Video projects. These tests now
// guard the stronger invariant: never fetch/render private Studio history on Home.
// Studio's own history and account isolation tests remain unchanged.
async function stubHome(page, signedIn = false) {
 if (signedIn) await page.addInitScript(() => localStorage.setItem('vv_token','fixture-account-A'));
 await page.route('**/api/me', r => r.fulfill({json:{user:{name:'Account A',isAdmin:false}}}));
 await page.route('**/api/config', r => r.fulfill({json:{plans:{},googleClientId:'',
  billingConfigured:false,features:{onboarding:false,inspiration:false,aiApps:false,productVideo:false}}}));
 await page.route('**/api/studio/config', r => r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/ai-wallet/balance', r => r.fulfill({status:403,json:{error:'PUBLIC_AI_NOT_READY'}}));
}

const removedSelectors=['#history','#recentCreations','#recentCreationsStatus',
 '#recentCreationsGrid','.history-links'];

async function expectHistoryRemoved(page) {
 for(const selector of removedSelectors) await expect(page.locator(selector)).toHaveCount(0);
 await expect(page.getByText('Your work, within reach')).toHaveCount(0);
 await expect(page.getByText('Recent creations',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Video projects',{exact:true})).toHaveCount(0);
}

test('BASE 25: anonymous Home has no Recent creations section or private cards',async({page})=>{
 await stubHome(page);
 await page.goto('/deepsyq.html');
 await expectHistoryRemoved(page);
 await expect(page.locator('a[aria-label="History"]')).toHaveAttribute('href','generate-studio.html?view=history');
});

test('BASE 25: signed-in Home must not request or display private Studio jobs',async({page})=>{
 await stubHome(page,true);
 let jobGets=0,jobPosts=0;
 page.on('request',r=>{
  if(new URL(r.url()).pathname==='/api/studio/jobs'){
   if(r.method()==='GET')jobGets++;
   if(r.method()==='POST')jobPosts++;
  }
 });
 await page.route('**/api/studio/jobs?filter=all',r=>r.fulfill({json:{items:[
  {id:'old-1',kind:'image',status:'ready',prompt:'PRIVATE: Account A original garden picture'}]}}));
 await page.goto('/deepsyq.html');
 await expectHistoryRemoved(page);
 await expect(page.locator('body')).not.toContainText('PRIVATE: Account A');
 expect(jobGets).toBe(0);
 expect(jobPosts).toBe(0);
});

test('BASE 25: same-tab A→B and cross-tab logout do not restore Home private cards',async({page})=>{
 await stubHome(page,true);
 let jobRequests=0;
 page.on('request',r=>{if(new URL(r.url()).pathname==='/api/studio/jobs')jobRequests++;});
 await page.goto('/deepsyq.html');
 await page.evaluate(()=>{
  localStorage.setItem('vv_token','fixture-account-B');
  dispatchEvent(new Event('focus'));
  dispatchEvent(new StorageEvent('storage',{key:'vv_token',newValue:'fixture-account-B'}));
 });
 await expectHistoryRemoved(page);
 await page.evaluate(()=>{
  localStorage.removeItem('vv_token');
  dispatchEvent(new StorageEvent('storage',{key:'vv_token',newValue:null}));
 });
 await expectHistoryRemoved(page);
 expect(jobRequests).toBe(0);
});
