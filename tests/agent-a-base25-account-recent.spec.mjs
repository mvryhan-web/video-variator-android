import {test,expect} from '@playwright/test';
// A24 negative source baseline reminder: these same strict browser expectations
// pass on owner #368 candidate but stay unmerged while DEV lacks that fix.

async function stubSignedInHome(page){
 // Initialize A only once per tab: preserve real B/logout token through the
 // safe document reload initiated by owner #368 account-boundary handling.
 await page.addInitScript(()=>{if(!sessionStorage.getItem('agent-a-account-fixture-init')){sessionStorage.setItem('agent-a-account-fixture-init','1');localStorage.setItem('vv_token','fixture-account-A');}});
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
 // Capture the immediate scrub in the SAME JS task as the storage event.
 // Owner #368 may synchronously start a safe reload, so a second page.evaluate
 // would race with navigation (Execution context was destroyed).
 const visibleAfter=await page.evaluate(()=>{
  const oldValue=localStorage.getItem('vv_token');
  localStorage.setItem('vv_token','fixture-account-B');
  dispatchEvent(new StorageEvent('storage',{key:'vv_token',oldValue,newValue:'fixture-account-B'}));
  return {prompt:document.getElementById('prompt').value,
   imageTiles:document.querySelectorAll('#refPreview .studio-reference-tile').length,
   token:localStorage.getItem('vv_token')};
 });
 expect(visibleAfter).toEqual({prompt:'',imageTiles:0,token:'fixture-account-B'});
 expect(paidPosts).toBe(0);
});


// A22: distinct account lifecycle acceptance, using actual Chromium/WebKit
// browser pages and local synthetic tokens; no external account or AI charge.
const a22History={id:'history-a22-1',kind:'image',status:'failed',model:'mock-image',provider:'Mock',
 prompt:'PRIVATE_ACCOUNT_A22_HISTORY_AFTER_LOGOUT',creditsCharged:29,createdAt:'2026-10-21T08:00:00Z'};

test('A22 P0: local logout storage event immediately removes already-rendered A Studio History',async({page})=>{
 await stubSignedInHome(page);
 let paidPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio\/jobs|billing|ai-wallet)/.test(new URL(r.url()).pathname))paidPosts++;});
 await page.route('**/api/studio/jobs?filter=all',r=>r.fulfill({json:{items:[a22History]}}));
 await page.goto('/generate-studio.html?view=history');
 const history=page.locator('#historyList');
 await expect(history).toContainText('PRIVATE_ACCOUNT_A22_HISTORY_AFTER_LOGOUT');
 await expect(history).toContainText('29 AI credits');
 const immediate=await page.evaluate(()=>{
  const oldValue=localStorage.getItem('vv_token');
  localStorage.removeItem('vv_token');
  dispatchEvent(new StorageEvent('storage',{key:'vv_token',oldValue,newValue:null}));
  return {token:localStorage.getItem('vv_token'),
   cards:document.querySelectorAll('#historyList .history-card').length,
   retainedPrompt:document.getElementById('historyList').textContent.includes('PRIVATE_ACCOUNT_A22_HISTORY_AFTER_LOGOUT')};
 });
 expect(immediate).toEqual({token:null,cards:0,retainedPrompt:false});
 expect(paidPosts).toBe(0);
});

test('A22 P0: simulated persisted BFCache pageshow scrubs A History before B interaction',async({page})=>{
 await stubSignedInHome(page);
 let paidPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio\/jobs|billing|ai-wallet)/.test(new URL(r.url()).pathname))paidPosts++;});
 await page.route('**/api/studio/jobs?filter=all',r=>r.fulfill({json:{items:[a22History]}}));
 await page.goto('/generate-studio.html?view=history');
 const history=page.locator('#historyList');
 await expect(history).toContainText('PRIVATE_ACCOUNT_A22_HISTORY_AFTER_LOGOUT');
 const after=await page.evaluate(()=>{
  localStorage.setItem('vv_token','fixture-account-B');
  // Synthetic persisted pageshow probes the handler even if CI browsers
  // disable real BFCache; real browser Back is checked in the next test.
  dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
  return {token:localStorage.getItem('vv_token'),
   cards:document.querySelectorAll('#historyList .history-card').length,
   retainedPrompt:document.getElementById('historyList').textContent.includes('PRIVATE_ACCOUNT_A22_HISTORY_AFTER_LOGOUT')};
 });
 expect(after).toEqual({token:'fixture-account-B',cards:0,retainedPrompt:false});
 expect(paidPosts).toBe(0);
});

test('A22 P0: real Back then refresh must not restore A History after switching to B',async({page})=>{
 // Initialize A exactly once: normal page reload/Back must retain B's token,
 // unlike the one-navigation stubSignedInHome fixture.
 await page.addInitScript(()=>{
  if(!sessionStorage.getItem('a22-browser-session-initialized')){
   sessionStorage.setItem('a22-browser-session-initialized','1');
   localStorage.setItem('vv_token','fixture-account-A');
  }
  window.__a22PageShows=[];
  addEventListener('pageshow',event=>window.__a22PageShows.push(Boolean(event.persisted)));
 });
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{},googleClientId:'',
  billingConfigured:false,features:{onboarding:false,inspiration:false,aiApps:false,productVideo:false}}}));
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Synthetic account',isAdmin:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/ai-wallet/balance',r=>r.fulfill({status:403,json:{error:'PUBLIC_AI_NOT_READY'}}));
 let aGets=0,bGets=0,paidPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio\/jobs|billing|ai-wallet)/.test(new URL(r.url()).pathname))paidPosts++;});
 await page.route('**/api/studio/jobs?filter=all',r=>{
  const auth=r.request().headers()['authorization']||'';
  const isA=auth==='Bearer fixture-account-A';
  if(isA)aGets++;else bGets++;
  return r.fulfill({json:{items:isA?[a22History]:[]}});
 });
 await page.goto('/generate-studio.html?view=history');
 await expect(page.locator('#historyList')).toContainText('PRIVATE_ACCOUNT_A22_HISTORY_AFTER_LOGOUT');
 await page.goto('/ai-pricing.html');
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-B'));
 await page.goBack({waitUntil:'domcontentloaded'});
 const back=await page.evaluate(()=>({
  token:localStorage.getItem('vv_token'),
  retainedPrompt:document.getElementById('historyList')?.textContent.includes('PRIVATE_ACCOUNT_A22_HISTORY_AFTER_LOGOUT')||false,
  persistedPageShow:window.__a22PageShows?.includes(true)||false
 }));
 // If the browser restores the old document through BFCache, A's previously
 // rendered DOM must be scrubbed. A new document must request B-only rows.
 expect(back.token).toBe('fixture-account-B');
 expect.soft(back.retainedPrompt,'Back result, native BFCache persisted='+back.persistedPageShow).toBe(false);
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#historyList')).not.toContainText('PRIVATE_ACCOUNT_A22_HISTORY_AFTER_LOGOUT');
 await expect(page.locator('#historyList .history-card')).toHaveCount(0);
 expect(aGets).toBeGreaterThan(0);
 expect(bGets).toBeGreaterThan(0);
 expect(paidPosts).toBe(0);
});


// A23: actionable stale History handlers must not cross the account boundary.
// A silent same-tab token rotation is intentional: the user's subsequent
// pointerdown/focus/click is the LAST chance to reject A-scoped DOM actions.
test('A23 P0: stale A History Reuse cannot copy A prompt into account B editor on click',async({page})=>{
 await stubSignedInHome(page);
 const item={id:'history-a23-reuse',kind:'image',status:'failed',provider:'Mock',
  prompt:'PRIVATE_ACCOUNT_A23_REUSE_PROMPT',createdAt:'2026-10-21T09:00:00Z'};
 let paidPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(studio|ai-wallet|billing)/.test(new URL(r.url()).pathname))paidPosts++;});
 await page.route('**/api/studio/jobs?filter=all',r=>{
  const auth=r.request().headers()['authorization']||'';
  return r.fulfill({json:{items:auth==='Bearer fixture-account-A'?[item]:[]}});
 });
 await page.goto('/generate-studio.html?view=history');
 await expect(page.locator('#historyList')).toContainText(item.prompt);
 const reuse=page.locator('#historyList .history-card .history-actions button').filter({hasText:'Reuse prompt'});
 await expect(reuse).toBeVisible();
 await reuse.scrollIntoViewIfNeeded();
 const rect=await reuse.boundingBox();expect(rect).not.toBeNull();
 // Real mouse input raises pointerdown/focus events and finally a click.
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-B'));
 await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
 // Real pointerdown may trigger a safe document reload. Query the fresh
 // B document through locator retries, not a stale frame execution context.
 await expect.poll(async()=>{
  try{return await page.evaluate(()=>({
   token:localStorage.getItem('vv_token'),
   safePrompt:!document.getElementById('prompt')?.value.includes('PRIVATE_ACCOUNT_A23_REUSE_PROMPT'),
   safeHistory:!document.getElementById('historyList')?.textContent.includes('PRIVATE_ACCOUNT_A23_REUSE_PROMPT')
  }));}
  catch(error){
   // Expected during owner #368's account-boundary page reload: retry
   // the NEW document, never accidentally count a destroyed A context PASS.
   if(/Execution context was destroyed|navigation/i.test(String(error)))return null;
   throw error;
  }
 },{timeout:10000}).toEqual({token:'fixture-account-B',safePrompt:true,safeHistory:true});
 expect(paidPosts).toBe(0);
});

test('A23 P0: stale A History Delete does not issue B-auth DELETE against old A job',async({page})=>{
 await stubSignedInHome(page);
 const item={id:'history-a23-delete',kind:'image',status:'failed',provider:'Mock',
  prompt:'PRIVATE_ACCOUNT_A23_DELETE_JOB',createdAt:'2026-10-21T09:00:00Z'};
 const crossAccountDeletes=[],paidPosts=[];
 page.on('request',r=>{
  const path=new URL(r.url()).pathname;
  if(r.method()==='DELETE'&&path==='/api/studio/jobs/history-a23-delete')
   crossAccountDeletes.push({authFromB:r.headers()['authorization']==='Bearer fixture-account-B',path});
  if(r.method()==='POST'&&/\/api\/(studio|ai-wallet|billing)/.test(path))paidPosts.push(path);
 });
 await page.route('**/api/studio/jobs?filter=all',r=>{
  const auth=r.request().headers()['authorization']||'';
  return r.fulfill({json:{items:auth==='Bearer fixture-account-A'?[item]:[]}});
 });
 // Deliberately enforce server ownership: the bug under test is the client
 // dispatch ATTEMPT, not proof of any deletion of another account's data.
 await page.route('**/api/studio/jobs/history-a23-delete',r=>
  r.fulfill({status:403,json:{error:'FORBIDDEN'}}));
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('/generate-studio.html?view=history');
 await expect(page.locator('#historyList')).toContainText(item.prompt);
 const remove=page.locator('#historyList .history-card .history-actions button').filter({hasText:'Delete'});
 await expect(remove).toBeVisible();
 await remove.scrollIntoViewIfNeeded();
 const rect=await remove.boundingBox();expect(rect).not.toBeNull();
 await page.evaluate(()=>localStorage.setItem('vv_token','fixture-account-B'));
 await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
 // Report the actual B-credential mutation attempt independently of whether
 // the stale A card also remains onscreen after the server's forced 403.
 await page.waitForTimeout(150);
 expect.soft(crossAccountDeletes,'Never send B token to delete an old A job').toEqual([]);
 expect.soft(paidPosts,'A stale History action must not start a paid job').toEqual([]);
 await expect(page.locator('#historyList')).not.toContainText('PRIVATE_ACCOUNT_A23_DELETE_JOB');
});
