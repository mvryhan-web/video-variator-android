import {test,expect} from '@playwright/test';

async function stubSignedInHome(page){
 await page.addInitScript(()=>localStorage.setItem('vv_token','fixture-account-A'));
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Account A',isAdmin:false}}}));
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{},googleClientId:'',
  billingConfigured:false,features:{onboarding:false,inspiration:false,aiApps:false,productVideo:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/ai-wallet/balance',r=>r.fulfill({status:403,json:{error:'PUBLIC_AI_NOT_READY'}}));
}

const oldUserJob={id:'old-1',kind:'image',status:'ready',prompt:'PRIVATE: Account A original garden picture',createdAt:'2026-10-16T10:00:00Z'};
const newUserJob={id:'new-2',kind:'image',status:'ready',prompt:'PRIVATE: Account B own landscape picture',createdAt:'2026-10-16T10:01:00Z'};

test('BASE 25: an old account HTTP reply cannot show old private prompts after token rotation',async({page})=>{
 await stubSignedInHome(page);
 let requestSeen,releaseOld;
 const seen=new Promise(resolve=>requestSeen=resolve);
 const hold=new Promise(resolve=>releaseOld=resolve);
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))posts++;});
 await page.route('**/api/studio/jobs?filter=all',async r=>{
  requestSeen();
  await hold;
  try{await r.fulfill({json:{items:[oldUserJob]}});}catch(_){}
 });
 // Do not wait for full page load: the module's authorized History fetch is intentionally held.
 await page.goto('/deepsyq.html',{waitUntil:'commit'});
 await seen;
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-B'));
 releaseOld();
 await expect(page.locator('#recentCreationsGrid .recent-creation')).toHaveCount(0);
 await expect(page.locator('#recentCreationsStatus')).toContainText('Account changed');
 await expect(page.locator('#recentCreationsGrid')).not.toContainText('PRIVATE: Account A');
 expect(posts).toBe(0);
});

test('BASE 25: cross-tab logout event removes existing private cards immediately',async({page})=>{
 await stubSignedInHome(page);
 await page.route('**/api/studio/jobs?filter=all',r=>r.fulfill({json:{items:[oldUserJob]}}));
 await page.goto('/deepsyq.html');
 await expect(page.locator('#recentCreationsGrid')).toContainText('PRIVATE: Account A');
 await page.evaluate(()=>{
  localStorage.removeItem('vv_token');
  dispatchEvent(new StorageEvent('storage',{key:'vv_token',newValue:null}));
 });
 await expect(page.locator('#recentCreationsGrid .recent-creation')).toHaveCount(0);
 await expect(page.locator('#recentCreationsStatus')).toContainText('Sign in');
});

test('BASE 25: a freshly authenticated response still displays only four safe read-only links',async({page})=>{
 await stubSignedInHome(page);
 const items=[newUserJob,...Array.from({length:5},(_,i)=>({...newUserJob,id:'id-'+i,prompt:'Owned '+i}))];
 await page.route('**/api/studio/jobs?filter=all',r=>r.fulfill({json:{items}}));
 let post=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))post++;});
 await page.goto('/deepsyq.html');
 await expect(page.locator('#recentCreationsGrid .recent-creation')).toHaveCount(4);
 await expect(page.locator('#recentCreationsGrid')).toContainText('PRIVATE: Account B');
 const links=page.locator('#recentCreationsGrid .recent-creation');
 await expect(links.first()).toHaveAttribute('href','generate-studio.html?view=history');
 expect(post).toBe(0);
});

test('BASE 25: local logout clears sensitive cards synchronously before navigation',async({page})=>{
 await stubSignedInHome(page);
 await page.route('**/api/studio/jobs?filter=all',r=>r.fulfill({json:{items:[oldUserJob]}}));
 await page.goto('/deepsyq.html');
 await expect(page.locator('#recentCreationsGrid')).toContainText('PRIVATE: Account A');
 // An actual click removes account-local data immediately, even if the
 // subsequent browser reload has not completed yet.
 await page.locator('#logout').click({noWaitAfter:true});
 await expect(page.locator('#recentCreationsGrid')).not.toContainText('PRIVATE: Account A');
 await expect(page.locator('#recentCreationsStatus')).toContainText('Sign in');
});


for(const interaction of ['click old card','keyboard old card','focus old card']){
 test('BASE 25: same-tab owner switch blocks '+interaction+' and removes private recent cards',async({page})=>{
  await stubSignedInHome(page);
  await page.route('**/api/studio/jobs?filter=all',r=>r.fulfill({json:{items:[oldUserJob]}}));
  let paidPosts=0;
  page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio/jobs')paidPosts++;});
  await page.goto('/deepsyq.html');
  await expect(page.locator('#recentCreationsGrid')).toContainText('PRIVATE: Account A');
  await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-B'));
  const recent=page.locator('#recentCreationsGrid .recent-creation').first();
  if(interaction==='click old card')await recent.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));
  else if(interaction==='keyboard old card'){
   // Dispatch the keyboard event on the stale link so its capture listener
   // prevents activation before the old owner is wiped.
   await recent.evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));
  }else await recent.evaluate(el=>el.dispatchEvent(new FocusEvent('focusin',{bubbles:true,cancelable:true})));
  await expect(page.locator('#recentCreationsGrid .recent-creation')).toHaveCount(0);
  await expect(page.locator('#recentCreationsStatus')).toContainText('Account changed');
  await expect(page.locator('#recentCreationsGrid')).not.toContainText('PRIVATE: Account A');
  expect(new URL(page.url()).pathname).toBe('/deepsyq.html');
  expect(paidPosts).toBe(0);
 });
}
test('BASE 25: returning window focus scrubs previous account recent cards before click',async({page})=>{
 await stubSignedInHome(page);
 await page.route('**/api/studio/jobs?filter=all',r=>r.fulfill({json:{items:[oldUserJob]}}));
 await page.goto('/deepsyq.html');
 await expect(page.locator('#recentCreationsGrid')).toContainText('PRIVATE: Account A');
 await page.evaluate(()=>{
  localStorage.setItem('vv_token','fixture-account-B');
  dispatchEvent(new Event('focus'));
 });
 await expect(page.locator('#recentCreationsGrid .recent-creation')).toHaveCount(0);
 await expect(page.locator('#recentCreationsStatus')).toContainText('Account changed');
});
