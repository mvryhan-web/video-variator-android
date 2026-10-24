import {test,expect} from '@playwright/test';
// Google login is not exercised in this local UI suite (googleClientId is empty).
// Keep the external SDK from delaying load/pageshow and the privacy reset.
test.beforeEach(async({page})=>{
 await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'application/javascript',body:''}));
});

async function chooseStudio(page,kind){await page.locator('#studioTypePicker').click();await page.locator('#studioTypeMenu [data-kind="'+kind+'"]').click();}
test('mobile studio has clear sections, no false generation and no overflow',async({page})=>{await page.setViewportSize({width:390,height:844});let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});await page.goto('/generate-studio.html');await expect(page.locator('#taskTitle')).toHaveText('Light up your creation with Deepsyq');await page.locator('#prompt').fill('Ocean');await page.locator('#consent').check();await expect(page.locator('#generate')).toBeDisabled();await expect(page.locator('#availability')).toContainText('not enabled');await chooseStudio(page,'image');await expect(page.locator('#taskTitle')).toHaveText('Light up your creation with Deepsyq');await expect(page.locator('#ratio option')).toHaveCount(5);await chooseStudio(page,'music');await page.locator('#settingsButton').click();await expect(page.locator('#musicOptions')).toBeVisible();await page.locator('#musicMode').selectOption('instrumental');await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('#referenceBox')).toBeHidden();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(posts).toBe(0);});
test('config exposes readiness without secrets and disabled endpoint fails closed',async({request})=>{const r=await request.get('/api/studio/config');expect(r.status()).toBe(200);const c=await r.json();expect(c.enabled).toBe(false);expect(c.ownerOnly).toBe(true);expect(c.translation.enabled).toBe(false);const post=await request.post('/api/studio/jobs',{data:{kind:'image',prompt:'test',consent:true}});expect(post.status()).toBe(503);});
test('Russian device language and retained per-studio draft',async({browser})=>{const context=await browser.newContext({locale:'ru-RU'});const page=await context.newPage();await page.goto('/generate-studio.html');await expect(page.locator('h1#taskTitle')).toHaveText('Оживите свою идею с Deepsyq');await expect(page.locator('[data-t=consent]')).toContainText('выбранной модели');await expect(page.locator('[data-t=consent]')).not.toContainText(/Google|BytePlus/);await page.locator('#prompt').fill('Море');await chooseStudio(page,'image');await page.locator('#prompt').fill('Цветок');await chooseStudio(page,'video');await expect(page.locator('#prompt')).toHaveValue('Море');await context.close();});
test('mocked contract result confirms selected service and current credits before posting, then previews, downloads and deletes',async({page})=>{
 const cfg={enabled:true,models:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1'],references:3,enabled:true}],catalog:[{kind:'image',label:'Fixture',id:'fixture',provider:'Google',adapter:true,ratios:['1:1'],references:3,enabled:true}]};
 await page.route('**/api/studio/config',r=>r.fulfill({json:cfg}));
 let jobPosts=0,estimatePosts=0,jobBody;
 await page.route('**/api/studio/estimate',async r=>{estimatePosts++;return r.fulfill({json:{kind:'image',model:'fixture',credits:7,quantity:1,perImageCredits:7,unit:'AI credits'}});});
 await page.route('**/api/studio/jobs',async r=>{if(r.request().method()==='POST'){jobPosts++;jobBody=r.request().postDataJSON();return r.fulfill({status:202,json:{id:'fixture',status:'ready'}});}return r.fulfill({json:{items:[]}});});
 await page.route('**/api/studio/jobs/fixture',r=>r.fulfill({json:r.request().method()==='DELETE'?{ok:true}:{id:'fixture',status:'ready',mime:'image/png'}}));
 await page.route('**/api/studio/jobs/fixture/media',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')}));
 await page.goto('/generate-studio.html');await chooseStudio(page,'image');await page.locator('#prompt').fill('Fixture');await page.locator('#consent').check();
 page.once('dialog',d=>d.dismiss());await page.locator('#generate').click();await expect(page.locator('#status')).toContainText('cancelled');expect(estimatePosts).toBe(1);expect(jobPosts).toBe(0);
 page.once('dialog',async d=>{expect(d.message()).toContain('selected AI service');expect(d.message()).toContain('Fixture');expect(d.message()).toContain('7 AI credits');await d.accept();});
 await page.locator('#generate').click();await expect(page.locator('#media img')).toBeVisible();expect(jobPosts).toBe(1);expect(jobBody.expectedCredits).toBe(7);
 expect(jobBody.consent).toBe(true);const download=page.waitForEvent('download');await page.locator('#download').click();expect((await download).suggestedFilename()).toBe('Deepsyq-fixture.png');await page.locator('#remove').click();await expect(page.locator('#media img')).toHaveCount(0);await expect(page.locator('#status')).toContainText('deleted');
});

test('Android bridge uses configured backend without loading FFmpeg',async({page})=>{await page.addInitScript(()=>window.AndroidBridge={getApiBase:()=>'https://native-api.example.test'});await page.route('**/generate-studio.html',async r=>{const response=await r.fetch();const headers={...response.headers()};delete headers['content-security-policy'];await r.fulfill({response,headers});});let called=false;await page.route('https://native-api.example.test/api/studio/config',r=>{called=true;return r.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{enabled:false,models:[]}});});await page.goto('/generate-studio.html');await expect(page.locator('#taskTitle')).toHaveText('Light up your creation with Deepsyq');expect(called).toBe(true);expect(await page.evaluate(()=>!!window.vuRuntimeReady)).toBe(false);});

test('three direct studio links and model/settings dialogs work on small phones',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 for(const [studio,title] of [['image','Light up your creation with Deepsyq'],['audio','Light up your creation with Deepsyq'],['video','Light up your creation with Deepsyq']]){await page.goto('/generate-studio.html?studio='+studio);await expect(page.locator('#taskTitle')).toHaveText(title);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.locator('#modelButton').click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('#modelDialog')).toContainText('Seedance 2.0 Mini');await page.getByRole('button',{name:/^Seedance 2\.0 Text or up to/}).click();await expect(page.locator('#modelButton')).toContainText('Seedance 2.0');await expect(page.locator('#availability')).toContainText('not enabled');await expect(page.locator('[data-t=consent]')).toContainText('selected model and its service');await expect(page.locator('[data-t=consent]')).not.toContainText('BytePlus');await page.locator('#prompt').fill('Video');await page.locator('#consent').check();await expect(page.locator('#generate')).toBeDisabled();
 await page.locator('#settingsButton').click();await page.getByRole('button',{name:'1:1',exact:true}).click();await expect(page.locator('#ratio')).toHaveValue('1:1');await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('#settingsButton')).toContainText('1:1');
 await page.locator('#modelButton').click();await page.keyboard.press('Escape');await expect(page.locator('#modelDialog')).not.toBeVisible();
});
test('audio speech preparation and history do not send paid or fake requests',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});await page.goto('/generate-studio.html?studio=audio');await page.locator('#settingsButton').click();await page.locator('#musicMode').selectOption('voice');await expect(page.locator('#voiceSettings')).toBeVisible();await page.locator('#voiceLanguage').selectOption({label:'Russian'});await expect.poll(()=>page.locator('#settingsDialog').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=11&&r.bottom<=innerHeight-11;})).toBe(true);await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('#modelButton')).toContainText('AI Voice Preview');await expect(page.locator('#generate')).toBeDisabled();
 await page.locator('#modelButton').click();await page.getByRole('button',{name:/Seed Speech 2.0/}).click();await expect(page.locator('#availability')).toContainText('not connected');await page.locator('#showHistory').click();await expect(page.locator('#historyEmpty')).toBeVisible();await expect(page.locator('#resumeJob')).toBeHidden();await page.locator('#showCreate').click();await expect(page.locator('#empty')).toBeVisible();expect(posts).toBe(0);
});
test('reference photo preview, draft retention and clear are local',async({page})=>{
 await page.goto('/generate-studio.html?studio=image');await page.locator('#references').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});await expect(page.locator('#refPreview img')).toHaveCount(1);await chooseStudio(page,'video');await chooseStudio(page,'image');await expect(page.locator('#refPreview img')).toHaveCount(1);await page.locator('#clearRefs').click();await expect(page.locator('#refPreview img')).toHaveCount(0);
});

test('consent is provider-neutral and resets when model or studio changes',async({page})=>{await page.goto('/generate-studio.html?studio=image');const consent=page.locator('[data-t=consent]');await expect(consent).toContainText('selected model and its service');await expect(consent).not.toContainText(/Google|BytePlus/);await page.locator('#consent').check();await page.locator('#modelButton').click();await page.getByRole('button',{name:/Seedream 4.5/}).click();await expect(page.locator('#consent')).not.toBeChecked();await expect(consent).toContainText('selected model and its service');await expect(consent).not.toContainText(/Google|BytePlus/);await page.locator('#consent').check();await chooseStudio(page,'video');await expect(page.locator('#consent')).not.toBeChecked();await expect(consent).toContainText('selected model and its service');await expect(consent).not.toContainText(/Google|BytePlus/);});

test('saved generation history renders and reopens a durable result',async({page})=>{
 const cfg={enabled:true,models:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1'],references:0,enabled:true}],catalog:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1'],references:0,enabled:true,adapter:true,provider:'Google'}]};
 await page.route('**/api/studio/config',r=>r.fulfill({json:cfg}));
 await page.route('**/api/studio/jobs**',r=>{
  if(r.request().method()==='GET')return r.fulfill({json:{items:[{id:'saved-1',kind:'image',status:'ready',provider:'Google',model:'fixture',prompt:'Saved product prompt',createdAt:'2026-10-15T08:00:00.000Z'}]}});
  return r.continue();
 });
 await page.route('**/api/studio/jobs/saved-1',r=>r.fulfill({json:{id:'saved-1',kind:'image',status:'ready',provider:'Google',model:'fixture',mime:'image/png'}}));
 await page.route('**/api/studio/jobs/saved-1/media',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')}));
 await page.goto('/generate-studio.html?studio=image');await page.locator('#showHistory').click();
 await expect(page.locator('.history-card')).toHaveCount(1);await expect(page.locator('.history-card')).toContainText('Fixture');await expect(page.locator('.history-card')).not.toContainText('Google');await expect(page.locator('.history-card')).toContainText('Saved product prompt');
 await page.getByRole('button',{name:'Reuse prompt'}).click();await expect(page.locator('#prompt')).toHaveValue('Saved product prompt');await page.locator('#showHistory').click();
 await page.locator('.history-card').getByRole('button',{name:'Open',exact:true}).click();await expect(page.locator('#media img')).toBeVisible();await expect(page.locator('#showCreate')).toHaveAttribute('aria-pressed','true');
});

test('Studio honors server-selected preferred enabled model',async({page})=>{
 const cfg={enabled:true,models:[{kind:'video',id:'byteplus-seedance-2',label:'Seedance 2.0',ratios:['16:9','9:16','1:1'],references:1,enabled:true}],catalog:[
  {id:'veo-3.1-lite-generate-preview',label:'Veo 3.1 Lite',kind:'video',provider:'Google',adapter:true,ratios:['16:9','9:16'],references:1,enabled:true,quality:'720p',duration:'8 seconds'},
  {id:'byteplus-seedance-2',label:'Seedance 2.0',kind:'video',provider:'BytePlus',adapter:true,ratios:['16:9','9:16','1:1'],references:1,enabled:true,quality:'720p',duration:'5 seconds'}
 ]};
 await page.route('**/api/studio/config',r=>r.fulfill({json:cfg}));
 await page.goto('/generate-studio.html?studio=video');
 await expect(page.locator('#modelButton')).toContainText('Seedance 2.0');
 await expect(page.locator('[data-t=consent]')).toContainText('selected model and its service');
});


test('history filters and actions never auto-regenerate a paid job',async({page})=>{
 const cfg={enabled:true,models:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1','16:9'],references:0,enabled:true}],catalog:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1','16:9'],references:0,enabled:true,adapter:true,provider:'Google'}]};
 await page.route('**/api/studio/config',r=>r.fulfill({json:cfg}));
 let posts=0,lastFilter='';
 await page.route('**/api/studio/jobs**',async r=>{
  const u=new URL(r.request().url());
  if(r.request().method()==='POST'){posts++;return r.fulfill({status:500,json:{error:'UNEXPECTED_POST'}});}
  if(r.request().method()==='DELETE')return r.fulfill({json:{ok:true}});
  lastFilter=u.searchParams.get('filter')||'all';
  const item={id:'history-1',kind:'image',status:'ready',provider:'Google',model:'fixture',prompt:'Reusable prompt',settings:{ratio:'16:9'},mime:'image/png',creditsReserved:9,creditsCharged:9,createdAt:'2026-10-15T08:00:00.000Z'};
  return r.fulfill({json:{filter:lastFilter,items:[item]}});
 });
 await page.route('**/api/studio/jobs/history-1/media',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')}));
 await page.goto('/generate-studio.html?studio=image');await page.locator('#showHistory').click();await expect(page.locator('.history-card')).toContainText('9 AI credits');
 await page.locator('[data-history-filter=image]').click();await expect.poll(()=>lastFilter).toBe('image');
 await page.getByRole('button',{name:'Regenerate'}).click();await expect(page.locator('#prompt')).toHaveValue('Reusable prompt');await expect(page.locator('#ratio')).toHaveValue('16:9');expect(posts).toBe(0);
 await page.locator('#showHistory').click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download'}).click();expect((await download).suggestedFilename()).toBe('Deepsyq-history-1.png');expect(posts).toBe(0);
});


test('AI wallet shows configured packs and opens Stripe only after click',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','wallet-user'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/ai-billing/config',r=>r.fulfill({json:{enabled:true,mode:'live',livePaymentsEnabled:true,unit:'AI credits',packs:[{sku:'starter',credits:1000,amount:499,currency:'eur'}],rates:[],revision:'r1'}}));
 await page.route('**/api/ai-wallet/balance',r=>r.fulfill({json:{available:120,reserved:10,debt:0}}));
 let checkoutCalls=0;await page.route('**/api/ai-billing/checkout',async r=>{checkoutCalls++;return r.fulfill({json:{url:'https://checkout.stripe.com/c/pay/cs_test_fixture',id:'cs_fixture',mode:'live'}});});
 await page.route('https://checkout.stripe.com/**',r=>r.fulfill({contentType:'text/html',body:'<title>Stripe fixture</title><h1>Stripe Checkout</h1>'}));
 await page.goto('/generate-studio.html?studio=image');await expect(page.locator('#walletButton')).toBeVisible();await expect(page.locator('#walletBalance')).toHaveText('120');expect(checkoutCalls).toBe(0);
 await page.locator('#walletButton').click();await expect(page.locator('#walletDialog')).toBeVisible();await expect(page.locator('#creditPacks')).toContainText('1,000 AI credits');await page.getByRole('button',{name:'Continue to Stripe'}).click();await expect(page).toHaveURL(/checkout\.stripe\.com/);expect(checkoutCalls).toBe(1);
});


test('wallet activity and Stripe return never claim payment before webhook confirmation',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','wallet-user'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/ai-billing/config',r=>r.fulfill({json:{enabled:true,mode:'live',livePaymentsEnabled:true,packs:[],rates:[],revision:'r1'}}));
 await page.route('**/api/ai-wallet/balance',r=>r.fulfill({json:{available:850,reserved:50,debt:0}}));
 await page.route('**/api/ai-wallet/history',r=>r.fulfill({json:{items:[{kind:'purchase',available_delta:1000,reserved_delta:0,debt_delta:0,created_at:'2026-10-15T10:00:00Z'},{kind:'reserve',available_delta:-50,reserved_delta:50,debt_delta:0,created_at:'2026-10-15T10:05:00Z'},{kind:'captured',available_delta:0,reserved_delta:-50,debt_delta:0,created_at:'2026-10-15T10:06:00Z'}]}}));
 await page.goto('/generate-studio.html?studio=image&ai_checkout=returned');
 await expect(page.locator('#walletDialog')).toBeVisible();await expect(page.locator('#walletStatus')).toContainText('Credits appear only after Stripe confirms');await expect(page.locator('#walletHistory')).toContainText('Credit purchase');await expect(page.locator('#walletHistory')).toContainText('Generation reserve');await expect(page.locator('#walletBalance')).toHaveText('850');
});



test('wallet balance and activity remain viewable when AI credit pack checkout is OFF',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','wallet-user'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/ai-billing/config',r=>r.fulfill({json:{enabled:false,mode:'test',livePaymentsEnabled:false,
  unit:'AI credits',packs:[],rates:[],revision:null,reason:'PAYMENTS_NOT_ACTIVATED'}}));
 let walletReads=0,historyReads=0,checkoutPosts=0;
 await page.route('**/api/ai-wallet/balance',r=>{walletReads++;return r.fulfill({json:{available:42,reserved:8,debt:0}})});
 await page.route('**/api/ai-wallet/history',r=>{historyReads++;return r.fulfill({json:{items:[{kind:'reserve',
  available_delta:-8,reserved_delta:8,debt_delta:0,created_at:'2026-10-15T10:00:00Z'}]}})});
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/ai-billing/checkout'))checkoutPosts++});
 await page.goto('/generate-studio.html?studio=image');
 await expect(page.locator('#walletButton')).toBeVisible();
 await expect(page.locator('#walletBalance')).toHaveText('42');
 await page.locator('#walletButton').click();
 await expect(page.locator('#walletSummary')).toContainText('42');
 await expect(page.locator('#walletSummary')).toContainText('8');
 await expect(page.locator('#walletHistory')).toContainText('Generation reserve');
 await expect(page.locator('#walletMode')).toContainText('Credit purchases are not active');
 await expect(page.locator('#creditPacks article')).toHaveCount(0);
 expect(walletReads).toBeGreaterThan(0);
 expect(historyReads).toBeGreaterThan(0);
 expect(checkoutPosts).toBe(0);
});

test('Studio shows a server-priced credit estimate without sending prompt or media',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','owner'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:true,ownerOnly:true,pricingConfigured:true,models:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1'],references:1,enabled:true}],catalog:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1'],references:1,enabled:true,adapter:true,provider:'Google'}]}}));
 let estimateBody=null;await page.route('**/api/studio/estimate',r=>{estimateBody=r.request().postDataJSON();return r.fulfill({json:{credits:12,unit:'AI credits',model:'fixture',kind:'image',routing:{smart:false,candidates:['fixture']}}});});
 await page.goto('/generate-studio.html?studio=image');await expect(page.locator('#creditEstimate')).toContainText('12 AI credits');expect(estimateBody.prompt).toBeUndefined();expect(estimateBody.references).toBeUndefined();expect(estimateBody.consent).toBeUndefined();expect(estimateBody.referenceCount).toBe(0);
});


test('History lazily previews ready images without touching video media',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-user'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:true,pricingConfigured:false,models:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1'],references:0,enabled:true}],catalog:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1'],references:0,enabled:true,adapter:true,provider:'Google'}]}}));
 let imageMedia=0,videoMedia=0;
 await page.route('**/api/studio/jobs?filter=all',r=>r.fulfill({json:{items:[{id:'img-1',kind:'image',status:'ready',provider:'Google',model:'fixture',prompt:'Image prompt',settings:{ratio:'1:1'},mime:'image/png',createdAt:'2026-10-15T08:00:00Z'},{id:'vid-1',kind:'video',status:'ready',provider:'Google',model:'fixture-video',prompt:'Video prompt',settings:{ratio:'16:9'},mime:'video/mp4',createdAt:'2026-10-15T08:01:00Z'}]}}));
 await page.route('**/api/studio/jobs/img-1/media',r=>{imageMedia++;return r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});});
 await page.route('**/api/studio/jobs/vid-1/media',r=>{videoMedia++;return r.fulfill({contentType:'video/mp4',body:'video'});});
 await page.goto('/generate-studio.html?studio=image');await page.locator('#showHistory').click();await expect(page.locator('.history-card')).toHaveCount(2);await page.locator('.history-preview[data-kind="image"]').scrollIntoViewIfNeeded();await expect(page.locator('.history-thumb')).toHaveCount(1);expect(imageMedia).toBe(1);expect(videoMedia).toBe(0);
});


test('Studio keeps signed-in plan limits accurate even when quickstart hides the verbose preflight panel',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','basic-user'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:true,pricingConfigured:false,models:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1'],references:0,enabled:true}],catalog:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1'],references:0,enabled:true,adapter:true,provider:'Google'}]}}));
 await page.route('**/api/studio/access',r=>r.fulfill({json:{allowed:true,scope:'public',plan:'basic',maxConcurrent:2,maxPerHour:12,activeJobs:1,jobsThisHour:4,reason:null,walletReady:true,pricingConfigured:true}}));
 await page.goto('/generate-studio.html?studio=image');await expect(page.locator('#accessInfo')).toBeHidden();await expect(page.locator('#accessInfo')).toContainText('2 active generation');await expect(page.locator('#accessInfo')).toContainText('12 per hour');await expect(page.locator('#accessInfo')).toContainText('1/2 active');await expect(page.locator('#accessInfo')).toContainText('4/12 in the last hour');
});

test('video selectors follow real Veo/Seedance capabilities without submitting jobs',async({page})=>{
 let posts=0;page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))posts++;});
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#settingsButton').click();
 await expect(page.locator('#videoResolutionLabel')).toBeVisible();
 await expect(page.locator('#videoDurationLabel')).toBeVisible();
 await expect(page.locator('#videoDuration option')).toHaveCount(3);
 await page.locator('#videoDuration').selectOption('4');
 await expect(page.locator('#settingsButton')).toContainText('4s');
 await page.locator('#videoResolution').selectOption('1080p');
 await expect(page.locator('#videoDuration')).toHaveValue('8');
 await expect(page.locator('#videoDuration option')).toHaveCount(1);
 await page.locator('#settingsDialog [data-close=settingsDialog]').last().click();
 await page.locator('#modelButton').click();
 await page.getByRole('button',{name:/^Seedance 2\.0 Text or up to/}).click();
 await page.locator('#settingsButton').click();
 await expect(page.locator('#videoDuration option')).toHaveCount(5);
 await page.locator('#videoDuration').selectOption('15');
 await expect(page.locator('#videoDuration')).toHaveValue('15');
 await page.locator('#settingsDialog [data-close=settingsDialog]').last().click();
 await chooseStudio(page,'image');
 await expect(page.locator('#videoDurationLabel')).toBeHidden();
 expect(posts).toBe(0);
});

test('Seedance image modes follow attached photo count without posting paid jobs',async({page})=>{
 let jobPosts=0;page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio/jobs')jobPosts++;});
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#modelButton').click();
 await page.getByRole('button',{name:/^Seedance 2\.0 Text or up to/}).click();
 const image={name:'frame.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')};
 await page.locator('#settingsButton').click();
 await expect(page.locator('#videoInputMode')).toHaveValue('text');
 await page.locator('#settingsDialog [data-close=settingsDialog]').last().click();
 await page.locator('#references').setInputFiles(image);
 await page.locator('#settingsButton').click();
 await expect(page.locator('#videoInputMode')).toHaveValue('first_frame');
 await page.locator('#videoInputMode').selectOption('reference_image');
 await page.locator('#settingsDialog [data-close=settingsDialog]').last().click();
 await page.locator('#references').setInputFiles({...image,name:'last.png'});
 await page.locator('#settingsButton').click();
 await expect(page.locator('#videoInputMode')).toHaveValue('reference_image');
 await expect(page.locator('#videoInputMode option')).toHaveCount(2);
 await page.locator('#videoInputMode').selectOption('first_last');
 await page.locator('#settingsDialog [data-close=settingsDialog]').last().click();
 await page.locator('#references').setInputFiles({...image,name:'third.png'});
 await page.locator('#settingsButton').click();
 await expect(page.locator('#videoInputMode')).toHaveValue('reference_image');
 await expect(page.locator('#videoInputMode option')).toHaveCount(1);
 await page.locator('#settingsDialog [data-close=settingsDialog]').last().click();
 await page.locator('#clearRefs').click();
 await page.locator('#settingsButton').click();
 await expect(page.locator('#videoInputMode')).toHaveValue('text');
 expect(jobPosts).toBe(0);
});

test('video prompt and model settings restore privately after tab reload without any provider request',async({page})=>{
 let jobPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio/jobs')jobPosts++;});
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#modelButton').click();
 await page.getByRole('button',{name:/^Seedance 2\.0 Text or up to/}).click();
 await page.locator('#prompt').fill('A calm mountain sunrise with slowly moving clouds');
 await page.locator('#settingsButton').click();
 await page.locator('#videoResolution').selectOption('1080p');
 await page.locator('#videoDuration').selectOption('15');
 await page.locator('#settingsDialog [data-close=settingsDialog]').last().click();
 await page.reload();
 await expect(page.locator('#prompt')).toHaveValue('A calm mountain sunrise with slowly moving clouds');
 await expect(page.locator('#modelButton')).toContainText('Seedance 2.0');
 await expect(page.locator('#videoResolution')).toHaveValue('1080p');
 await expect(page.locator('#videoDuration')).toHaveValue('15');
 // Compact quickstart intentionally hides the verbose banner when no photo recovery is required.
 await expect(page.locator('#videoDraftBar')).toBeHidden();
 await expect(page.locator('#consent')).not.toBeChecked();
 page.once('dialog',d=>d.accept());
 // The existing clear handler must still work even while quickstart hides its verbose banner.
 await page.locator('#clearVideoDraft').evaluate(button=>button.click());
 await page.reload();
 await expect(page.locator('#prompt')).toHaveValue('');
 expect(jobPosts).toBe(0);
});
test('recovered Seedance first and last frames require both photos again, never store photos',async({page})=>{
 let jobPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio/jobs')jobPosts++;});
 const img=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 const photo=name=>({name,mimeType:'image/png',buffer:img});
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#modelButton').click();
 await page.getByRole('button',{name:/^Seedance 2\.0 Text or up to/}).click();
 await page.locator('#prompt').fill('A sunset transitions into night');
 await page.locator('#references').setInputFiles([photo('first.png'),photo('last.png')]);
 await expect(page.locator('#refPreview img')).toHaveCount(2);
 await page.locator('#settingsButton').click();
 await page.locator('#videoInputMode').selectOption('first_last');
 await page.locator('#settingsDialog [data-close=settingsDialog]').last().click();
 await page.reload();
 await expect(page.locator('#refPreview img')).toHaveCount(0);
 await expect(page.locator('#videoDraftMessage')).toContainText('Attach 2 reference photo');
 await expect(page.locator('#videoInputMode')).toHaveValue('text');
 await expect(page.locator('#generate')).toBeDisabled();
 await page.locator('#references').setInputFiles(photo('first-new.png'));
 await expect(page.locator('#videoDraftMessage')).toContainText('1 added so far');
 await page.locator('#references').setInputFiles(photo('last-new.png'));
 await expect(page.locator('#refPreview img')).toHaveCount(2);
 await expect(page.locator('#videoInputMode')).toHaveValue('first_last');
 await expect(page.locator('#videoDraftSkipPhotos')).toBeHidden();
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(jobPosts).toBe(0);
});
test('video History checks an existing task without resubmitting or downloading media',async({page})=>{
 const cfg={enabled:true,models:[{kind:'video',label:'Video fixture',id:'fixture-video',ratios:['16:9'],references:0,enabled:true}],catalog:[{kind:'video',label:'Video fixture',id:'fixture-video',ratios:['16:9'],references:0,enabled:true,adapter:true,provider:'Google'}]};
 await page.route('**/api/studio/config',r=>r.fulfill({json:cfg}));
 let statusChecks=0,mediaDownloads=0,jobPosts=0,jobStatus='processing';
 page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio/jobs')jobPosts++;});
 await page.route('**/api/studio/jobs?filter=video',r=>r.fulfill({json:{items:[{id:'running-video',kind:'video',status:jobStatus,model:'fixture-video',prompt:'Sample video',provider:'Google',createdAt:'2026-10-15T12:00:00Z'}]}}));
 await page.route('**/api/studio/jobs/running-video',r=>{
  statusChecks++;if(statusChecks===2)jobStatus='ready';
  return r.fulfill({json:{id:'running-video',kind:'video',status:jobStatus,mime:jobStatus==='ready'?'video/mp4':null,retryAfterSeconds:5}});
 });
 await page.route('**/api/studio/jobs/running-video/media',r=>{mediaDownloads++;return r.fulfill({contentType:'video/mp4',body:''});});
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#showHistory').click();
 await page.locator('[data-history-filter=video]').click();
 await expect(page.getByRole('button',{name:'Check status'})).toBeVisible();
 await page.getByRole('button',{name:'Check status'}).click();
 await expect(page.locator('#status')).toContainText('still processing');
 await expect(page.locator('.history-status')).toHaveText('Processing');
 await page.getByRole('button',{name:'Check status'}).click();
 await expect(page.locator('#status')).toContainText('Video is ready');
 await expect(page.locator('.history-status')).toHaveText('Ready');
 expect(statusChecks).toBe(2);
 expect(jobPosts).toBe(0);
 expect(mediaDownloads).toBe(0); // Only the explicit Open action may fetch video bytes.
});

// Owner acceptance: Home keeps its dialog; Studio panels anchor to composer controls. No provider dispatch.
for(const viewport of [{width:1448,height:900},{width:390,height:844},{width:320,height:740},{width:844,height:390}]){
 for(const [studio,title] of [['image','Light up your creation with Deepsyq'],['video','Light up your creation with Deepsyq'],['audio','Light up your creation with Deepsyq']]){
 test(`studio model/settings windows: ${studio} uses button-anchored panels at ${viewport.width}x${viewport.height}`,async({page},info)=>{
  await page.setViewportSize(viewport);
  let posts=0;page.on('request',request=>{if(request.method()==='POST')posts++;});
  const assertCentered=async dialog=>{
   await expect(dialog).toBeVisible();
   const bounds=await dialog.boundingBox();expect(bounds).not.toBeNull();
   expect(Math.abs(bounds.x+bounds.width/2-viewport.width/2)).toBeLessThan(3);
   expect(Math.abs(bounds.y+bounds.height/2-viewport.height/2)).toBeLessThan(3);
   expect(bounds.x).toBeGreaterThanOrEqual(12);expect(bounds.y).toBeGreaterThanOrEqual(12);
   expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width-12);
   expect(bounds.y+bounds.height).toBeLessThanOrEqual(viewport.height-12);
   expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  };
   const assertAnchored=async(dialog,anchor)=>{
    await expect(dialog).toBeVisible();
    await expect.poll(()=>dialog.evaluate(el=>({left:el.style.left,top:el.style.top}))).not.toEqual({left:'',top:''});
    await expect.poll(async()=>{const b=await dialog.boundingBox();return Boolean(b&&b.x>=11&&b.y>=11);}).toBe(true);
    const bounds=await dialog.boundingBox(),button=await anchor.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(11);expect(bounds.y).toBeGreaterThanOrEqual(11);
    expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width-11);expect(bounds.y+bounds.height).toBeLessThanOrEqual(viewport.height-11);
    expect(Math.min(Math.abs(button.y-bounds.y-bounds.height),Math.abs(bounds.y-button.y-button.height))).toBeLessThanOrEqual(10);
    expect(await dialog.evaluate(el=>getComputedStyle(el,'::backdrop').backdropFilter)).toBe('none');
    expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   };
   await page.goto('/deepsyq.html');
   if(viewport.width<=760)await page.locator('#menu').click();
   const trigger=page.locator(`[data-open-models="${studio}"]`);
   await trigger.click();
   const chooser=page.getByRole('dialog',{name:studio[0].toUpperCase()+studio.slice(1)+' models',exact:true});
   await assertCentered(chooser);
   await expect(trigger).toHaveAttribute('aria-expanded','true');
   await page.keyboard.press('Escape');await expect(chooser).not.toBeVisible();
   await expect(trigger).toHaveAttribute('aria-expanded','false');await expect(trigger).toBeFocused();
   // Close the mobile drawer through its actual control before using the content cards.
   if(viewport.width<=760){await page.locator('#menu').click();await expect(page.locator('body')).not.toHaveClass(/menu-open/);}
   await page.locator(`#homeQuickBar .home-compose-mode[href^="generate-studio.html?studio=${studio}&"]`).click();
   await expect(page).toHaveURL(new RegExp('studio='+studio));
   await expect(page.locator('#taskTitle')).toHaveText(title);
   await expect(page.locator('.studio-shell>.studio-nav')).toHaveCount(0);
   await expect(page.locator('#studioTypePicker')).toBeVisible();
   await page.locator('#studioTypePicker').click();await assertAnchored(page.locator('#studioTypeMenu'),page.locator('#studioTypePicker'));
   await expect(page.locator('#studioTypeMenu [data-kind="'+(studio==='audio'?'music':studio)+'"]')).toHaveAttribute('aria-pressed','true');
   await page.keyboard.press('Escape');await expect(page.locator('#studioTypePicker')).toBeFocused();
   await page.locator('#prompt').fill('My local draft');
   await page.locator('#modelButton').click();
   const models=page.locator('#modelDialog');await assertAnchored(models,page.locator('#modelButton'));
   if(viewport.width===1448)await page.screenshot({path:info.outputPath(studio+'-model-popover.png')});
   const choices=models.locator('.model-card');await expect(choices.first()).toBeVisible();
   const choice=choices.nth(Math.min(1,await choices.count()-1));const label=await choice.locator('strong').innerText();
   await choice.click();await expect(models).not.toBeVisible();
   await expect(page.locator('#modelButton')).toContainText(label);await expect(page.locator('#modelButton')).toBeFocused();
   await page.locator('#modelButton').click();
   await expect(models.locator('.model-card[aria-pressed="true"] strong')).toHaveText(label);
   await page.keyboard.press('Escape');await expect(models).not.toBeVisible();
   await expect(page.locator('#modelButton')).toBeFocused();
   await page.locator('#settingsButton').click();
   const settings=page.locator('#settingsDialog');await assertAnchored(settings,page.locator('#settingsButton'));
   if(studio==='audio'){await expect(settings.locator('.composer-setting-title')).toBeHidden();await expect(settings.locator('#ratioChoices')).toBeHidden();}else await expect(settings.locator('.composer-setting-title')).toBeVisible();
   if(viewport.width===1448)await page.screenshot({path:info.outputPath(studio+'-settings-popover.png')});
   await settings.getByRole('button',{name:'Done',exact:true}).click();await expect(settings).not.toBeVisible();
   await expect(page.locator('#settingsButton')).toBeFocused();
   await expect(page.locator('#prompt')).toHaveValue('My local draft');
   await expect(page.locator('#generate')).toBeDisabled();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(posts).toBe(0);
 });
 }
}
