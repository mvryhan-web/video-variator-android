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


for(const signal of ['cross-tab storage', 'same-tab focus']){
 test('A18 BASE 24/25: Chrome Studio History already showing A prompts and credits is scrubbed on '+signal+' account B',async({page})=>{
  // Fake local HTTP only; no real auth, provider generation, payment or storage.
  await stubSignedInHome(page);
  let paidPosts=0;
  page.on('request',r=>{
   if(r.method()==='POST'&&/\/api\/(studio\/jobs|ai-wallet|billing)/.test(new URL(r.url()).pathname))paidPosts++;
  });
  const a={id:'history-a-18',kind:'image',status:'failed',model:'mock-image',provider:'Mock',
   prompt:'PRIVATE_ACCOUNT_A_STUDIO_HISTORY_PROMPT',creditsCharged:37,createdAt:'2026-10-21T07:00:00Z'};
  await page.route('**/api/studio/jobs?filter=all',route=>route.fulfill({json:{items:[a]}}));
  await page.goto('/generate-studio.html?studio=image',{waitUntil:'domcontentloaded'});
  await page.locator('#showHistory').click();
  const history=page.locator('#historyList');
  await expect(history.locator('.history-card')).toHaveCount(1);
  await expect(history).toContainText('PRIVATE_ACCOUNT_A_STUDIO_HISTORY_PROMPT');
  await expect(history).toContainText('37 AI credits');
  await page.evaluate(signal=>{
   const oldValue=localStorage.getItem('vv_token');
   localStorage.setItem('vv_token','fixture-account-B');
   if(signal==='cross-tab storage')dispatchEvent(new StorageEvent('storage',{key:'vv_token',oldValue,newValue:'fixture-account-B'}));
   else dispatchEvent(new Event('focus'));
  },signal);
  // Existing History late-GET guard is NOT sufficient: these are already
  // rendered A records, not a pending response. Must disappear synchronously.
  await expect(history.locator('.history-card')).toHaveCount(0,{timeout:4000});
  await expect(history).not.toContainText('PRIVATE_ACCOUNT_A_STUDIO_HISTORY_PROMPT');
  await expect(history).not.toContainText('37 AI credits');
  expect(paidPosts).toBe(0);
 });
}


test('A19 owner Studio privacy: account B never inherits A image prompt or reference image after storage event',async({page})=>{
 await stubSignedInHome(page);
 // The shared Home stub has catalog:[]; provide an honest local image model
 // with reference capability so this test exercises an ATTACHED photo.
 await page.route('**/api/studio/config',route=>route.fulfill({json:{
  enabled:false,ownerOnly:true,imageBatchEnabled:false,
  models:[{id:'gemini-3.1-flash-image',kind:'image',enabled:false}],
  catalog:[{id:'gemini-3.1-flash-image',kind:'image',label:'Mock image',provider:'Mock',
   adapter:false,enabled:false,ratios:['1:1'],references:3,quality:'1K',
   capabilities:{resolutions:['1K'],outputFormats:['png']}}]
 }}));
 let paidPosts=0;
 page.on('request',req=>{if(req.method()==='POST'&&/\/api\/studio\/jobs(?:\?|$)/.test(new URL(req.url()).pathname))paidPosts++;});
 await page.goto('/generate-studio.html?studio=image');
 // The Studio module initializes asynchronously; do not attach a file before
 // its actual onchange handler and configured image model are ready.
 await page.waitForFunction(()=>typeof document.getElementById('references')?.onchange==='function');
 await expect(page.locator('#referenceBox')).toBeVisible();
 const prompt=page.locator('#prompt'),tiles=page.locator('#refPreview .studio-reference-tile');
 await prompt.fill('PRIVATE_ACCOUNT_A_IMAGE_EDITOR_PROMPT');
 const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/ngAAAABJRU5ErkJggg==','base64');
 await page.locator('#references').setInputFiles({name:'a-private-picture.png',mimeType:'image/png',buffer:tinyPng});
 await expect(tiles).toHaveCount(1);
 await expect(prompt).toHaveValue('PRIVATE_ACCOUNT_A_IMAGE_EDITOR_PROMPT');
 await page.evaluate(()=>{
  const oldValue=localStorage.getItem('vv_token');
  localStorage.setItem('vv_token','fixture-account-B');
  dispatchEvent(new StorageEvent('storage',{key:'vv_token',oldValue,newValue:'fixture-account-B'}));
 });
 // Actual image bytes were attached to the editor; reset must be immediate,
 // not merely prevent old History GET or block provider generation.
 await expect(prompt).toBeEmpty({timeout:4000});
 await expect(tiles).toHaveCount(0);
 expect(paidPosts).toBe(0);
});
