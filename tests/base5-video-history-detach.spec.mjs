import {test,expect} from '@playwright/test';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
async function setup(page){
 await page.addInitScript(()=>{if(!localStorage.getItem('vv_token'))localStorage.setItem('vv_token','fixture');});
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:true,
  models:[{kind:'video',id:'veo-3.1-lite-generate-preview',enabled:true}],
  catalog:[{kind:'video',id:'veo-3.1-lite-generate-preview',label:'Veo',
    provider:'Google',adapter:true,enabled:true,references:1,ratios:['16:9','9:16'],
    quality:'720p',duration:'8 seconds',
    capabilities:{ratios:['16:9','9:16'],maxReferences:1,videoInputModes:['text','first_frame'],
     resolutions:['720p'],durations:[8],durationSeconds:8}}]}}));
 await page.route('**/api/studio/access',r=>r.fulfill({json:{allowed:true,scope:'owner'}}));
 await page.route('**/api/studio/jobs?filter=*',r=>r.fulfill({json:{items:[{
  id:'old-text-video',kind:'video',status:'ready',provider:'Google',
  model:'veo-3.1-lite-generate-preview',prompt:'Original text-only sunset video',
  settings:{ratio:'16:9',videoInputMode:'text',referenceCount:0,videoResolution:'720p',videoDuration:8},
  createdAt:'2026-10-16T09:00:00.000Z'}]}}));
}
test('BASE #5: History Regenerate text-only Video confirms and removes unrelated current photos, no paid POST',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);let paid=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))paid++;});
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#prompt').fill('Different current prompt');
 await page.locator('#references').setInputFiles({name:'current.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('#refPreview img')).toHaveCount(1);
 await page.locator('#showHistory').click();
 const regenerate=page.locator('.history-card .history-actions button').filter({hasText:'Regenerate'});
 page.once('dialog',d=>d.dismiss());await regenerate.click();
 await expect(page.locator('#showHistory')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#refPreview img')).toHaveCount(1);
 page.once('dialog',d=>d.accept());await regenerate.click();
 await expect(page.locator('#showCreate')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#prompt')).toHaveValue('Original text-only sunset video');
 await expect(page.locator('#refPreview img')).toHaveCount(0);
 await expect(page.locator('#videoInputMode')).toHaveValue('text');
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(paid).toBe(0);
});
test('BASE #5: History Reuse prompt-only retains current Video photos',async({page})=>{
 await page.setViewportSize({width:320,height:740});await setup(page);let paid=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))paid++;});
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#references').setInputFiles({name:'current.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('#refPreview img')).toHaveCount(1);
 await page.locator('#showHistory').click();
 await page.locator('.history-card .history-actions button').filter({hasText:'Reuse prompt'}).click();
 await expect(page.locator('#refPreview img')).toHaveCount(1);
 expect(paid).toBe(0);
});


test('BASE #5: video History uses original queued/running/succeeded/failed labels, never treats Delete as Cancel',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await setup(page);
 let paid=0,deleteCalls=0;
 page.on('request',r=>{
  if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))paid++;
  if(r.method()==='DELETE'&&r.url().includes('/api/studio/jobs'))deleteCalls++;
 });
 const statusRows=['queued','processing','finalizing','ready','failed','cancelled','processing'];
 await page.route('**/api/studio/jobs?filter=*',route=>route.fulfill({json:{items:statusRows.map((status,i)=>({
  id:'lifecycle-'+i,kind:'video',status,error:i===6?'STATUS_UNKNOWN_NO_AUTOMATIC_RETRY':null,provider:'Google',
  model:'veo-3.1-lite-generate-preview',prompt:'Lifecycle status test',
  settings:{ratio:'16:9',videoInputMode:'text',referenceCount:0},
  createdAt:'2026-10-17T08:00:00.000Z'
 }))}}));
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#showHistory').click();
 await expect(page.locator('.history-card')).toHaveCount(7);
 const labels=['Queued','Running','Running','Succeeded','Failed','Cancelled','Status uncertain · review needed'];
 for(let i=0;i<statusRows.length;i++){
  const card=page.locator('.history-card').nth(i);
  await expect(card.locator('.history-status')).toHaveAttribute('data-status',statusRows[i]);
  await expect(card.locator('.history-status')).toHaveText(labels[i]);
 }
 await expect(page.locator('.history-card').nth(2).locator('.history-status')).toHaveAttribute('title',/credits are being settled/);
 await expect(page.locator('.history-card').nth(6).locator('.history-status')).toHaveAttribute('title',/No new generation or automatic refund/);
 const uncertain=page.locator('.history-card').nth(6);
 await expect(uncertain.locator('.history-actions button').filter({hasText:'Reuse prompt'})).toBeDisabled();
 await expect(uncertain.locator('.history-actions button').filter({hasText:'Regenerate'})).toBeDisabled();
 await expect(uncertain.locator('.history-actions button').filter({hasText:'Regenerate'})).toHaveAttribute('title',/Do not submit or charge/);
 await expect(uncertain.locator('.history-actions button').filter({hasText:'Check status'})).toBeEnabled();
 const running=page.locator('.history-card').nth(1);
 const remove=running.locator('.history-actions button').filter({hasText:'Delete'});
 await expect(remove).toBeDisabled();
 await expect(remove).toHaveAttribute('title',/not cancellation/);
 const cancelled=page.locator('.history-card').nth(5);
 await expect(cancelled.locator('.history-actions button').filter({hasText:'Open'})).toBeDisabled();
 expect(paid).toBe(0);
 expect(deleteCalls).toBe(0);
});



test('BASE #5: stale queued Video with lost provider task ID requires review and cannot spawn a history replay',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);
 let generationPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))generationPosts++;});
 await page.route('**/api/studio/jobs?filter=*',route=>route.fulfill({json:{items:[{
  id:'stale-queued-video',kind:'video',status:'queued',
  error:'STATUS_UNKNOWN_NO_AUTOMATIC_RETRY',provider:'Google',
  model:'veo-3.1-lite-generate-preview',prompt:'Unique paid video request',
  createdAt:'2026-10-17T08:00:00.000Z',settings:{videoInputMode:'text',referenceCount:0}
 }]}}));
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#showHistory').click();
 const card=page.locator('.history-card');
 await expect(card.locator('.history-status')).toHaveAttribute('data-status','queued');
 await expect(card.locator('.history-status')).toContainText('Status uncertain');
 await expect(card.locator('.history-status')).toHaveAttribute('title',/No new generation or automatic refund/);
 await expect(card.locator('.history-actions button').filter({hasText:'Regenerate'})).toBeDisabled();
 await expect(card.locator('.history-actions button').filter({hasText:'Reuse prompt'})).toBeDisabled();
 await expect(card.locator('.history-actions button').filter({hasText:'Check status'})).toBeEnabled();
 await expect(card.locator('.history-actions button').filter({hasText:'Delete'})).toBeDisabled();
 expect(generationPosts).toBe(0);
});

test('BASE #5: lost Video POST response keeps the identical requestId across reload, never charges a changed prompt',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);
 const submissions=[],lookups=[];
 await page.route('**/api/studio/jobs/by-request/*',route=>{
  lookups.push(route.request().url());
  return route.fulfill({json:{id:'existing-video-id',kind:'video',status:'processing'}});
 });
 await page.route('**/api/studio/jobs',async route=>{
  if(route.request().method()!=='POST')return route.continue();
  submissions.push(route.request().postDataJSON());
  if(submissions.length===1)return route.abort('failed'); // Server may still have accepted it.
  return route.fulfill({status:200,json:{id:'existing-video-id',status:'processing',reused:true}});
 });
 await page.route('**/api/studio/jobs/existing-video-id',route=>route.fulfill({json:{
  id:'existing-video-id',kind:'video',status:'failed',error:'AI_GENERATION_FAILED',retryAfterSeconds:0
 }}));
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#prompt').fill('One exact video prompt');
 await page.locator('#consent').check();
 await page.locator('#generate').click();
 await expect.poll(()=>submissions.length).toBe(1);
 await expect(page.locator('#generate')).toBeEnabled(); // First transport failure did not charge another job.
 const pending=await page.evaluate(()=>Object.entries(sessionStorage).filter(([k])=>k.startsWith('deepsyq_video_pending_request_v1_')));
 expect(pending).toHaveLength(1);
 expect(pending[0][1]).not.toContain('One exact video prompt');
 await page.reload();
 await expect(page.locator('#prompt')).toHaveValue('One exact video prompt');
 await page.locator('#prompt').fill('Different payable prompt');
 await page.locator('#consent').check();
 await page.locator('#generate').click();
 await expect(page.locator('#status')).toContainText('A previous Video request may have reached the provider');
 expect(submissions).toHaveLength(1); // Different payload was blocked before the network.
 await page.locator('#prompt').fill('One exact video prompt');
 await page.locator('#consent').check();
 await page.locator('#generate').click();
 await expect.poll(()=>lookups.length).toBe(1);
 await expect.poll(async()=>page.locator('#status').textContent()).toContain('Generation could not finish');
 expect(submissions).toHaveLength(1); // Reattached to the original, no second paid POST.
 expect(lookups[0]).toContain(submissions[0].requestId);
 const after=await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('deepsyq_video_pending_request_v1_')));
 expect(after).toHaveLength(0); // Existing server job ID was received; no orphan client lock.
});


test('BASE #5: explicit 404 permits the same original Video requestId, never a fresh paid ID',async({page})=>{
 await setup(page);
 const posts=[];let lookups=0;
 await page.route('**/api/studio/jobs/by-request/*',route=>{
  lookups++;return route.fulfill({status:404,json:{error:'NOT_FOUND'}});
 });
 await page.route('**/api/studio/jobs',route=>{
  if(route.request().method()!=='POST')return route.continue();
  posts.push(route.request().postDataJSON());
  if(posts.length===1)return route.abort('failed');
  return route.fulfill({status:200,json:{id:'recovered-existing-video',kind:'video',reused:true}});
 });
 await page.route('**/api/studio/jobs/recovered-existing-video',route=>route.fulfill({json:{
  id:'recovered-existing-video',kind:'video',status:'failed',error:'AI_GENERATION_FAILED'
 }}));
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#prompt').fill('Unchanged video for safe retry');
 await page.locator('#consent').check();
 await page.locator('#generate').click();
 await expect.poll(()=>posts.length).toBe(1);
 await expect(page.locator('#generate')).toBeEnabled();
 await page.locator('#generate').click();
 await expect.poll(()=>posts.length).toBe(2);
 await expect.poll(()=>lookups).toBe(1);
 expect(posts[0].requestId).toBe(posts[1].requestId);
 await expect.poll(async()=>page.locator('#status').textContent()).toContain('Generation could not finish');
});

test('BASE #5: failed original-job lookup blocks retry without spending a second provider request',async({page})=>{
 await setup(page);
 const posts=[];let lookups=0;
 await page.route('**/api/studio/jobs/by-request/*',route=>{
  lookups++;return route.fulfill({status:503,json:{error:'STUDIO_STORAGE_UNAVAILABLE'}});
 });
 await page.route('**/api/studio/jobs',route=>{
  if(route.request().method()!=='POST')return route.continue();
  posts.push(route.request().postDataJSON());
  return route.abort('failed');
 });
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#prompt').fill('Never duplicate an uncertain video');
 await page.locator('#consent').check();
 await page.locator('#generate').click();
 await expect.poll(()=>posts.length).toBe(1);
 await expect(page.locator('#generate')).toBeEnabled();
 await page.locator('#generate').click();
 await expect.poll(()=>lookups).toBe(1);
 await expect(page.locator('#status')).toContainText('STUDIO_STORAGE_UNAVAILABLE');
 expect(posts).toHaveLength(1);
});


test('BASE #5: Video account change during a delayed POST never attaches the previous account result',async({page})=>{
 await setup(page);
 let resolveResponse=null,submits=0,oldAccountReads=0;
 await page.route('**/api/studio/jobs/old-account-video',route=>{
  oldAccountReads++;return route.fulfill({json:{id:'old-account-video',kind:'video',status:'ready',mime:'video/mp4'}});
 });
 await page.route('**/api/studio/jobs',async route=>{
  if(route.request().method()!=='POST')return route.continue();
  submits++;
  await new Promise(resolve=>{resolveResponse=resolve;});
  return route.fulfill({status:202,json:{id:'old-account-video',kind:'video',status:'processing'}});
 });
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#prompt').fill('Video for the first account only');
 await page.locator('#consent').check();
 await page.locator('#generate').click();
 await expect.poll(()=>submits).toBe(1);
 await page.evaluate(()=>localStorage.setItem('vv_token','second-fixture-account'));
 resolveResponse();
 await expect(page.locator('#status')).toContainText('Your signed-in account changed');
 expect(oldAccountReads).toBe(0);
 expect(submits).toBe(1);
 const pending=await page.evaluate(()=>[...Object.keys(sessionStorage)].filter(k=>k.startsWith('deepsyq_video_pending_request_v1_')));
 expect(pending).toHaveLength(1); // Preserve first account's request for its own recovery.
});


test('BASE #5: Video last-job auto-resume is account-scoped after reload',async({page})=>{
 await setup(page);
 let oldJobReads=0,submitted=0;
 await page.route('**/api/studio/jobs/old-account-video',route=>{
  oldJobReads++;return route.fulfill({json:{
   id:'old-account-video',kind:'video',status:'processing',retryAfterSeconds:20
  }});
 });
 await page.route('**/api/studio/jobs',route=>{
  if(route.request().method()!=='POST')return route.continue();
  submitted++;return route.fulfill({status:202,json:{id:'old-account-video',status:'processing'}});
 });
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#prompt').fill('Old account private Video job');
 await page.locator('#consent').check();
 await page.locator('#generate').click();
 await expect.poll(()=>submitted).toBe(1);
 await expect.poll(()=>oldJobReads).toBeGreaterThan(0);
 const saved=await page.evaluate(()=>sessionStorage.getItem('vu_generation_video_owner_scope'));
 expect(saved).toMatch(/^[0-9a-f]{32}$/);
 await page.evaluate(()=>localStorage.setItem('vv_token','a-second-account'));
 const beforeReload=oldJobReads;
 await page.reload();
 await page.waitForTimeout(200);
 expect(oldJobReads).toBe(beforeReload);
 expect(submitted).toBe(1);
 await expect(page.locator('#resumeJob')).toBeHidden();
 expect(await page.evaluate(()=>sessionStorage.getItem('vu_generation_video_owner_scope'))).toBe(saved);
});


test('BASE #5: late Video History status response from an old account is ignored',async({page})=>{
 await setup(page);
 let release,checks=0,providerCalls=0;
 await page.route('**/api/studio/jobs?filter=*',route=>route.fulfill({json:{items:[{
  id:'same-old-video',kind:'video',status:'processing',error:null,
  provider:'Google',prompt:'Private video from first user',createdAt:'2026-10-17T08:00:00Z'
 }]}}));
 await page.route('**/api/studio/jobs/same-old-video',async route=>{
  checks++;
  await new Promise(done=>{release=done});
  return route.fulfill({json:{id:'same-old-video',kind:'video',status:'ready',mime:'video/mp4'}});
 });
 page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/api/studio/jobs'))providerCalls++});
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#showHistory').click();
 await page.locator('.history-card .history-actions button').filter({hasText:'Check status'}).click();
 await expect.poll(()=>checks).toBe(1);
 await page.evaluate(()=>localStorage.setItem('vv_token','another-account'));
 release();
 await expect(page.locator('#status')).toContainText('Your signed-in account changed');
 await expect(page.locator('#status')).not.toContainText('Video is ready');
 expect(providerCalls).toBe(0);
});


test('BASE #5: switching login without reload cannot open prior Video History task',async({page})=>{
 await setup(page);
 let oldJobReads=0,paid=0;
 await page.route('**/api/studio/jobs?filter=*',route=>route.fulfill({json:{items:[{
  id:'old-account-video',kind:'video',status:'ready',mime:'video/mp4',
  provider:'Google',prompt:'Old account Video result',createdAt:'2026-10-17T08:00:00Z'
 }]}}));
 await page.route('**/api/studio/jobs/old-account-video',route=>{
  oldJobReads++;return route.fulfill({json:{id:'old-account-video',kind:'video',status:'ready',mime:'video/mp4'}});
 });
 page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/api/studio/jobs'))paid++});
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#showHistory').click();
 await expect(page.locator('.history-card')).toHaveCount(1);
 await page.evaluate(()=>localStorage.setItem('vv_token','changed-login'));
 await page.locator('.history-card .history-actions button').filter({hasText:'Open'}).click();
 await expect(page.locator('#status')).toContainText('Your signed-in account changed');
 expect(oldJobReads).toBe(0);
 expect(paid).toBe(0);
});


test('BASE #5: definite pre-dispatch Video rejection allows correcting prompt, no provider retry',async({page})=>{
 await setup(page);
 const posts=[];
 await page.route('**/api/studio/jobs',route=>{
  if(route.request().method()!=='POST')return route.continue();
  posts.push(route.request().postDataJSON());
  if(posts.length===1)return route.fulfill({status:400,json:{error:'INVALID_VIDEO_REFERENCES'}});
  return route.fulfill({status:202,json:{id:'corrected-video-job',kind:'video',status:'processing'}});
 });
 await page.route('**/api/studio/jobs/corrected-video-job',route=>route.fulfill({json:{
  id:'corrected-video-job',kind:'video',status:'failed',error:'AI_GENERATION_FAILED'
 }}));
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#prompt').fill('Incorrect original reference settings');
 await page.locator('#consent').check();
 await page.locator('#generate').click();
 await expect.poll(()=>posts.length).toBe(1);
 await expect(page.locator('#generate')).toBeEnabled();
 const afterValidation=await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('deepsyq_video_pending_request_v1_')));
 expect(afterValidation).toHaveLength(0);
 await page.locator('#prompt').fill('Corrected safe Video prompt');
 // Editing a provider-bound prompt revokes consent on purpose; a corrected
 // Video request must obtain fresh explicit approval before any POST.
 await expect(page.locator('#consent')).not.toBeChecked();
 await page.locator('#consent').check();
 await expect(page.locator('#generate')).toBeEnabled();
 await page.locator('#generate').click();
 await expect.poll(()=>posts.length).toBe(2);
 expect(posts[0].requestId).not.toBe(posts[1].requestId);
 await expect.poll(async()=>page.locator('#status').textContent()).toContain('Generation could not finish');
});
