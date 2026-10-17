import {test,expect} from '@playwright/test';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
async function setup(page){
 await page.addInitScript(()=>localStorage.setItem('vv_token','fixture'));
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


test('BASE #5: lost Video POST response keeps the identical requestId across reload, never charges a changed prompt',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);
 const submissions=[];
 await page.route('**/api/studio/jobs',async route=>{
  if(route.request().method()!=='POST')return route.continue();
  submissions.push(route.request().postDataJSON());
  if(submissions.length===1)return route.abort('failed'); // Server may still have accepted it.
  return route.fulfill({status:200,json:{id:'existing-video-id',status:'processing',reused:true}});
 });
 await page.route('**/api/studio/jobs/existing-video-id',route=>route.fulfill({json:{
  id:'existing-video-id',kind:'video',status:'failed',error:'GENERATION_FAILED',retryAfterSeconds:0
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
 await expect.poll(()=>submissions.length).toBe(2);
 await expect.poll(async()=>page.locator('#status').textContent()).toContain('Generation failed');
 expect(submissions[0].requestId).toBe(submissions[1].requestId);
 expect(submissions[0].prompt).toBe(submissions[1].prompt);
 const after=await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('deepsyq_video_pending_request_v1_')));
 expect(after).toHaveLength(0); // Existing server job ID was received; no orphan client lock.
});
