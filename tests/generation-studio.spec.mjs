import {test,expect} from '@playwright/test';
test('mobile studio has clear sections, no false generation and no overflow',async({page})=>{await page.setViewportSize({width:390,height:844});let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});await page.goto('/generate-studio.html');await expect(page.locator('#taskTitle')).toHaveText('Create a video');await page.locator('#prompt').fill('Ocean');await page.locator('#consent').check();await expect(page.locator('#generate')).toBeDisabled();await expect(page.locator('#availability')).toContainText('not enabled');await page.locator('[data-kind=image]').click();await expect(page.locator('#taskTitle')).toHaveText('Create an image');await expect(page.locator('#ratio option')).toHaveCount(5);await page.locator('[data-kind=music]').click();await page.locator('#settingsButton').click();await expect(page.locator('#musicOptions')).toBeVisible();await page.locator('#musicMode').selectOption('instrumental');await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('#referenceBox')).toBeHidden();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(posts).toBe(0);});
test('config exposes readiness without secrets and disabled endpoint fails closed',async({request})=>{const r=await request.get('/api/studio/config');expect(r.status()).toBe(200);const c=await r.json();expect(c.enabled).toBe(false);expect(c.ownerOnly).toBe(true);expect(c.translation.enabled).toBe(false);const post=await request.post('/api/studio/jobs',{data:{kind:'image',prompt:'test',consent:true}});expect(post.status()).toBe(503);});
test('Russian device language and retained per-studio draft',async({browser})=>{const context=await browser.newContext({locale:'ru-RU'});const page=await context.newPage();await page.goto('/generate-studio.html');await expect(page.locator('h1')).toHaveText('Ваша идея. Создайте её.');await page.locator('#prompt').fill('Море');await page.locator('[data-kind=image]').click();await page.locator('#prompt').fill('Цветок');await page.locator('[data-kind=video]').click();await expect(page.locator('#prompt')).toHaveValue('Море');await context.close();});
test('mocked contract result can preview download and delete; not a provider generation test',async({page})=>{const cfg={enabled:true,models:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1'],references:3,enabled:true},{kind:'video',label:'Fixture video',ratios:['16:9'],references:1,enabled:false}]};await page.route('**/api/studio/config',r=>r.fulfill({json:cfg}));await page.route('**/api/studio/jobs',r=>r.fulfill({status:202,json:{id:'fixture'}}));await page.route('**/api/studio/jobs/fixture',r=>r.fulfill({json:r.request().method()==='DELETE'?{ok:true}:{id:'fixture',status:'ready',mime:'image/png'}}));await page.route('**/api/studio/jobs/fixture/media',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')}));await page.goto('/generate-studio.html');await page.locator('[data-kind=image]').click();await page.locator('#prompt').fill('Fixture');await page.locator('#consent').check();await page.locator('#generate').click();await expect(page.locator('#media img')).toBeVisible();const download=page.waitForEvent('download');await page.locator('#download').click();expect((await download).suggestedFilename()).toBe('Deepsyq-fixture.png');await page.locator('#remove').click();await expect(page.locator('#media img')).toHaveCount(0);await expect(page.locator('#status')).toContainText('deleted');});

test('Android bridge uses configured backend without loading FFmpeg',async({page})=>{await page.addInitScript(()=>window.AndroidBridge={getApiBase:()=>'https://native-api.example.test'});await page.route('**/generate-studio.html',async r=>{const response=await r.fetch();const headers={...response.headers()};delete headers['content-security-policy'];await r.fulfill({response,headers});});let called=false;await page.route('https://native-api.example.test/api/studio/config',r=>{called=true;return r.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{enabled:false,models:[]}});});await page.goto('/generate-studio.html');await expect(page.locator('#taskTitle')).toHaveText('Create a video');expect(called).toBe(true);expect(await page.evaluate(()=>!!window.vuRuntimeReady)).toBe(false);});

test('three direct studio links and model/settings dialogs work on small phones',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 for(const [studio,title] of [['image','Create an image'],['audio','Create audio'],['video','Create a video']]){await page.goto('/generate-studio.html?studio='+studio);await expect(page.locator('#taskTitle')).toHaveText(title);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.locator('#modelButton').click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:/Seedance 2.0/}).click();await expect(page.locator('#modelButton')).toContainText('Seedance 2.0');await expect(page.locator('#availability')).toContainText('not enabled');await expect(page.locator('[data-t=consent]')).toContainText('BytePlus');await page.locator('#prompt').fill('Video');await page.locator('#consent').check();await expect(page.locator('#generate')).toBeDisabled();
 await page.locator('#settingsButton').click();await page.getByRole('button',{name:'1:1',exact:true}).click();await expect(page.locator('#ratio')).toHaveValue('1:1');await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('#settingsButton')).toContainText('1:1');
 await page.locator('#modelButton').click();await page.keyboard.press('Escape');await expect(page.locator('#modelDialog')).not.toBeVisible();
});
test('audio speech preparation and history do not send paid or fake requests',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});await page.goto('/generate-studio.html?studio=audio');await page.locator('#settingsButton').click();await page.locator('#musicMode').selectOption('voice');await expect(page.locator('#voiceSettings')).toBeVisible();await page.locator('#voiceLanguage').selectOption({label:'Russian'});await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('#modelButton')).toContainText('Google AI Voice');await expect(page.locator('#generate')).toBeDisabled();
 await page.locator('#modelButton').click();await page.getByRole('button',{name:/Seed Speech 2.0/}).click();await expect(page.locator('#availability')).toContainText('not connected');await page.locator('#showHistory').click();await expect(page.locator('#historyEmpty')).toBeVisible();await expect(page.locator('#resumeJob')).toBeHidden();await page.locator('#showCreate').click();await expect(page.locator('#empty')).toBeVisible();expect(posts).toBe(0);
});
test('reference photo preview, draft retention and clear are local',async({page})=>{
 await page.goto('/generate-studio.html?studio=image');await page.locator('#references').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});await expect(page.locator('#refPreview img')).toHaveCount(1);await page.locator('[data-kind=video]').click();await page.locator('[data-kind=image]').click();await expect(page.locator('#refPreview img')).toHaveCount(1);await page.locator('#clearRefs').click();await expect(page.locator('#refPreview img')).toHaveCount(0);
});

test('consent names the provider and resets when model or studio changes',async({page})=>{await page.goto('/generate-studio.html?studio=image');await page.locator('#consent').check();await page.locator('#modelButton').click();await page.getByRole('button',{name:/Seedream 4.5/}).click();await expect(page.locator('#consent')).not.toBeChecked();await expect(page.locator('[data-t=consent]')).toContainText('BytePlus');await page.locator('#consent').check();await page.locator('[data-kind=video]').click();await expect(page.locator('#consent')).not.toBeChecked();await expect(page.locator('[data-t=consent]')).toContainText('Google');});

test('saved generation history renders and reopens a durable result',async({page})=>{
 // Existing History mock simulates a signed-in owner; real History rejects guests.
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-mocked-owner'));
 const cfg={enabled:true,models:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1'],references:0,enabled:true}],catalog:[{kind:'image',label:'Fixture',id:'fixture',ratios:['1:1'],references:0,enabled:true,adapter:true,provider:'Google'}]};
 await page.route('**/api/studio/config',r=>r.fulfill({json:cfg}));
 await page.route('**/api/studio/jobs**',r=>{
  if(r.request().method()==='GET')return r.fulfill({json:{items:[{id:'saved-1',kind:'image',status:'ready',provider:'Google',model:'fixture',prompt:'Saved product prompt',createdAt:'2026-10-15T08:00:00.000Z'}]}});
  return r.continue();
 });
 await page.route('**/api/studio/jobs/saved-1',r=>r.fulfill({json:{id:'saved-1',kind:'image',status:'ready',provider:'Google',model:'fixture',mime:'image/png'}}));
 await page.route('**/api/studio/jobs/saved-1/media',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')}));
 await page.goto('/generate-studio.html?studio=image');await page.locator('#showHistory').click();
 await expect(page.locator('.history-card')).toHaveCount(1);await expect(page.locator('.history-card')).toContainText('fixture');await expect(page.locator('.history-card')).toContainText('Google');await expect(page.locator('.history-card')).toContainText('Saved product prompt');
 await page.getByRole('button',{name:'Reuse prompt'}).click();await expect(page.locator('#prompt')).toHaveValue('Saved product prompt');await page.locator('#showHistory').click();
 await page.getByRole('button',{name:'Open'}).click();await expect(page.locator('#media img')).toBeVisible();await expect(page.locator('#showCreate')).toHaveAttribute('aria-pressed','true');
});

test('Studio honors server-selected preferred enabled model',async({page})=>{
 const cfg={enabled:true,models:[{kind:'video',id:'byteplus-seedance-2',label:'Seedance 2.0',ratios:['16:9','9:16','1:1'],references:1,enabled:true}],catalog:[
  {id:'veo-3.1-lite-generate-preview',label:'Veo 3.1 Lite',kind:'video',provider:'Google',adapter:true,ratios:['16:9','9:16'],references:1,enabled:true,quality:'720p',duration:'8 seconds'},
  {id:'byteplus-seedance-2',label:'Seedance 2.0',kind:'video',provider:'BytePlus',adapter:true,ratios:['16:9','9:16','1:1'],references:1,enabled:true,quality:'720p',duration:'5 seconds'}
 ]};
 await page.route('**/api/studio/config',r=>r.fulfill({json:cfg}));
 await page.goto('/generate-studio.html?studio=video');
 await expect(page.locator('#modelButton')).toContainText('Seedance 2.0');
 await expect(page.locator('[data-t=consent]')).toContainText('BytePlus');
});


test('history filters and actions never auto-regenerate a paid job',async({page})=>{
 // Existing History mock simulates a signed-in owner; real History rejects guests.
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-mocked-owner'));
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
 await page.goto('/generate-studio.html?studio=image');await page.locator('#showHistory').click();await expect(page.locator('.history-card')).toHaveCount(2);await expect(page.locator('.history-thumb')).toHaveCount(1);expect(imageMedia).toBe(1);expect(videoMedia).toBe(0);
});


test('Studio explains the signed-in plan generation limits',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','basic-user'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:true,pricingConfigured:false,models:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1'],references:0,enabled:true}],catalog:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1'],references:0,enabled:true,adapter:true,provider:'Google'}]}}));
 await page.route('**/api/studio/access',r=>r.fulfill({json:{allowed:true,scope:'public',plan:'basic',maxConcurrent:2,maxPerHour:12,activeJobs:1,jobsThisHour:4,reason:null,walletReady:true,pricingConfigured:true}}));
 await page.goto('/generate-studio.html?studio=image');await expect(page.locator('#accessInfo')).toBeVisible();await expect(page.locator('#accessInfo')).toContainText('2 active generation');await expect(page.locator('#accessInfo')).toContainText('12 per hour');await expect(page.locator('#accessInfo')).toContainText('1/2 active');await expect(page.locator('#accessInfo')).toContainText('4/12 in the last hour');
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
 await page.getByRole('button',{name:/Seedance 2.0/}).click();
 await page.locator('#settingsButton').click();
 await expect(page.locator('#videoDuration option')).toHaveCount(5);
 await page.locator('#videoDuration').selectOption('15');
 await expect(page.locator('#videoDuration')).toHaveValue('15');
 await page.locator('#settingsDialog [data-close=settingsDialog]').last().click();
 await page.locator('[data-kind=image]').click();
 await expect(page.locator('#videoDurationLabel')).toBeHidden();
 expect(posts).toBe(0);
});

test('Seedance image modes follow attached photo count without posting paid jobs',async({page})=>{
 let jobPosts=0;page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio/jobs')jobPosts++;});
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#modelButton').click();
 await page.getByRole('button',{name:/Seedance 2.0/}).click();
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
 await page.getByRole('button',{name:/Seedance 2.0/}).click();
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
 await expect(page.locator('#videoDraftBar')).toBeVisible();
 await expect(page.locator('#consent')).not.toBeChecked();
 page.once('dialog',d=>d.accept());
 await page.locator('#clearVideoDraft').click();
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
 await page.getByRole('button',{name:/Seedance 2.0/}).click();
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
 // Existing History mock simulates a signed-in owner; real History rejects guests.
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-mocked-owner'));
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

test('BASE 24: latest History filter wins when an earlier server response arrives late',async({page})=>{
 // Existing History mock simulates a signed-in owner; real History rejects guests.
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-mocked-owner'));
 // Two real browser HTTP responses deliberately complete out of order.
 // Filtering is read-only and must never submit a paid generation task.
 let firstRequest,releaseOld,olderDone;
 const olderSeen=new Promise(resolve=>firstRequest=resolve);
 const oldRelease=new Promise(resolve=>releaseOld=resolve);
 const oldCompleted=new Promise(resolve=>olderDone=resolve);
 let posts=0;
 page.on('request',request=>{if(request.method()==='POST')posts++;});
 await page.route('**/api/studio/jobs?filter=*',async route=>{
  const filter=new URL(route.request().url()).searchParams.get('filter');
  const entry=filter==='all'?
   {id:'old',kind:'video',status:'failed',model:'old-model',prompt:'Old result from All'}:
   {id:'new',kind:'image',status:'ready',model:'new-model',prompt:'Current image result'};
  if(filter==='all'){
   firstRequest();
   await oldRelease;
  }
  try{await route.fulfill({json:{items:[entry]}});}catch(_){}
  if(filter==='all')olderDone();
 });
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#showHistory').click();
 await olderSeen;
 await page.locator('[data-history-filter=image]').click();
 await expect(page.locator('.history-card')).toHaveCount(1);
 await expect(page.locator('.history-card')).toContainText('Current image result');
 releaseOld();
 await oldCompleted;
 await page.waitForTimeout(150);
 await expect(page.locator('.history-card')).toHaveCount(1);
 await expect(page.locator('.history-card')).toContainText('Current image result');
 await expect(page.locator('.history-card')).not.toContainText('Old result from All');
 await expect(page.locator('[data-history-filter=image]')).toHaveAttribute('aria-pressed','true');
 expect(posts).toBe(0);
});

test('BASE 24: leaving History invalidates its in-flight result before another visit',async({page})=>{
 // Existing History mock simulates a signed-in owner; real History rejects guests.
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-mocked-owner'));
 let releaseFirst,firstSeen,firstDone,allCalls=0;
 const firstStarted=new Promise(resolve=>firstSeen=resolve);
 const oldRelease=new Promise(resolve=>releaseFirst=resolve);
 const oldCompleted=new Promise(resolve=>firstDone=resolve);
 await page.route('**/api/studio/jobs?filter=all',async route=>{
  allCalls++;
  const old=allCalls===1;
  if(old){firstSeen();await oldRelease;}
  try{await route.fulfill({json:{items:[{id:old?'older':'latest',kind:'image',status:'ready',
   model:old?'old-model':'latest-model',prompt:old?'Earlier History visit':'New History visit'}]}});}catch(_){}
  if(old)firstDone();
 });
 let posts=0;
 page.on('request',request=>{if(request.method()==='POST')posts++;});
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#showHistory').click();
 await firstStarted;
 await page.locator('#showCreate').click();
 await expect(page.locator('#historyList')).toBeHidden();
 await page.locator('#showHistory').click();
 await expect(page.locator('.history-card')).toContainText('New History visit');
 releaseFirst();
 await oldCompleted;
 await page.waitForTimeout(150);
 await expect(page.locator('.history-card')).toHaveCount(1);
 await expect(page.locator('.history-card')).toContainText('New History visit');
 expect(posts).toBe(0);
});

test('BASE 24: late image media after changing filters never creates a stale object URL',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vv_token','history-synthetic-thumbnail-owner'));
 await page.addInitScript(()=>{
  window.__historyUrlCreated=0;
  const native=URL.createObjectURL.bind(URL);
  URL.createObjectURL=function(blob){window.__historyUrlCreated++;return native(blob);};
 });
 let mediaStarted,releaseMedia,completed;
 const mediaSeen=new Promise(resolve=>mediaStarted=resolve);
 const mediaRelease=new Promise(resolve=>releaseMedia=resolve);
 const mediaCompleted=new Promise(resolve=>completed=resolve);
 await page.route('**/api/studio/jobs?filter=*',r=>{
  const filter=new URL(r.request().url()).searchParams.get('filter');
  const image={id:'late-photo',kind:'image',status:'ready',prompt:'Old image media',model:'image-fixture'};
  const video={id:'current-video',kind:'video',status:'processing',prompt:'Current video only',model:'video-fixture'};
  return r.fulfill({json:{items:filter==='video'?[video]:[image]}});
 });
 await page.route('**/api/studio/jobs/late-photo/media',async r=>{
  mediaStarted();await mediaRelease;
  try{await r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});}catch(_){}
  completed();
 });
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#showHistory').click();
 await mediaSeen;
 await page.locator('[data-history-filter=video]').click();
 await expect(page.locator('.history-card')).toContainText('Current video only');
 const before=await page.evaluate(()=>window.__historyUrlCreated);
 releaseMedia();await mediaCompleted;
 await page.waitForTimeout(150);
 expect(await page.evaluate(()=>window.__historyUrlCreated)).toBe(before);
 await expect(page.locator('.history-card')).not.toContainText('Old image media');
});

test('BASE 24: leaving History revokes already-created temporary image URLs',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vv_token','history-synthetic-thumbnail-owner'));
 await page.addInitScript(()=>{
  window.__historyUrlCreated=0;window.__historyUrlRevoked=0;
  const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=function(blob){window.__historyUrlCreated++;return create(blob);};
  URL.revokeObjectURL=function(url){window.__historyUrlRevoked++;return revoke(url);};
 });
 await page.route('**/api/studio/jobs?filter=all',r=>r.fulfill({json:{items:[
  {id:'thumb-photo',kind:'image',status:'ready',prompt:'Owned thumbnail',model:'fixture'}
 ]}}));
 await page.route('**/api/studio/jobs/thumb-photo/media',r=>r.fulfill({contentType:'image/png',
  body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')}));
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#showHistory').click();
 await expect(page.locator('.history-thumb')).toBeVisible();
 const before=await page.evaluate(()=>({created:window.__historyUrlCreated,revoked:window.__historyUrlRevoked}));
 expect(before.created).toBeGreaterThan(0);
 await page.locator('#showCreate').click();
 await expect(page.locator('#historyList')).toBeHidden();
 await expect.poll(()=>page.evaluate(()=>window.__historyUrlRevoked)).toBeGreaterThan(before.revoked);
});

test('BASE 24: History cards label reserved credits separately from server-confirmed charges',async({page})=>{
 // Existing History mock simulates a signed-in owner; real History rejects guests.
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-mocked-owner'));
 const items=[
  {id:'charged-image',kind:'image',status:'ready',model:'image-fixture',prompt:'Confirmed settled image',creditsReserved:12,creditsCharged:10},
  {id:'reserved-video',kind:'video',status:'processing',model:'video-fixture',prompt:'Pending server job',creditsReserved:8,creditsCharged:0},
  {id:'free-image',kind:'image',status:'failed',model:'image-fixture',prompt:'Unknown settlement',creditsReserved:0,creditsCharged:0}
 ];
 await page.route('**/api/studio/jobs?filter=all',r=>r.fulfill({json:{items}}));
 let paidPosts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))paidPosts++;});
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#showHistory').click();
 await expect(page.locator('.history-card')).toHaveCount(3);
 const settled=page.locator('.history-card').filter({hasText:'Confirmed settled image'});
 await expect(settled).toContainText('Charged: 10 AI credits');
 await expect(settled).not.toContainText('12 AI credits');
 const pending=page.locator('.history-card').filter({hasText:'Pending server job'});
 await expect(pending).toContainText('Reserved per server: 8 AI credits');
 await expect(pending).not.toContainText('Charged:');
 const unknown=page.locator('.history-card').filter({hasText:'Unknown settlement'});
 await expect(unknown).not.toContainText('Charged:');
 await expect(unknown).not.toContainText('Reserved per server:');
 expect(paidPosts).toBe(0);
});

test('BASE 24: Music History filter is visible on narrow screens, read-only and does not show other kinds',async({page})=>{
 // Existing History mock simulates a signed-in owner; real History rejects guests.
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-mocked-owner'));
 await page.setViewportSize({width:320,height:740});
 const cfg={enabled:false,ownerOnly:true,models:[],catalog:[]};
 await page.route('**/api/studio/config',r=>r.fulfill({json:cfg}));
 let lastFilter='',posts=0;
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))posts++;});
 await page.route('**/api/studio/jobs**',r=>{
   const u=new URL(r.request().url());
   if(r.request().method()!=='GET')return r.fulfill({status:500,json:{error:'UNEXPECTED_WRITE'}});
   lastFilter=u.searchParams.get('filter')||'all';
   const items=lastFilter==='music'?[{id:'music-owned',kind:'music',status:'ready',
     prompt:'Original customer audio',provider:'Google',model:'fixture-music',settings:{musicMode:'song'},
     createdAt:'2026-10-16T08:02:00Z'}]:[];
   return r.fulfill({json:{filter:lastFilter,items}});
 });
 await page.goto('/generate-studio.html?studio=audio');
 await page.locator('#showHistory').click();
 await expect(page.locator('[data-history-filter=music]')).toBeVisible();
 await page.locator('[data-history-filter=music]').click();
 await expect.poll(()=>lastFilter).toBe('music');
 await expect(page.locator('[data-history-filter=music]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.history-card')).toHaveCount(1);
 await expect(page.locator('.history-card')).toContainText('Original customer audio');
 await expect(page.locator('.history-card')).not.toContainText('Image');
 expect(posts).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('BASE 24: account rotation clears History and rejects a delayed previous-user response',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-account-A'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 let started,releaseOld,finished,paidPosts=0;
 const oldSeen=new Promise(resolve=>started=resolve);
 const oldRelease=new Promise(resolve=>releaseOld=resolve);
 const oldFinished=new Promise(resolve=>finished=resolve);
 page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/api/studio/jobs'))paidPosts++;});
 await page.route('**/api/studio/jobs?filter=*',async route=>{
  const headers=route.request().headers(),account=headers.authorization||'';
  if(account==='Bearer history-account-A'){
   started();await oldRelease;
   try{await route.fulfill({json:{items:[{id:'account-a',kind:'music',status:'ready',
    prompt:'PRIVATE ACCOUNT A ORIGINAL SONG'}]}});}catch(_){}
   finished();
  }else{
   await route.fulfill({json:{items:[{id:'account-b',kind:'music',status:'ready',
    prompt:'Account B independent song'}]}});
  }
 });
 await page.goto('/generate-studio.html?studio=audio');
 await page.locator('#showHistory').click();
 await oldSeen;
 await page.evaluate(()=>{
  localStorage.setItem('vv_token','history-account-B');
  dispatchEvent(new StorageEvent('storage',{key:'vv_token',newValue:'history-account-B'}));
 });
 await expect(page.locator('#historyList')).toContainText('Account changed');
 await expect(page.locator('.history-card')).toHaveCount(0);
 await page.locator('[data-history-filter=music]').click();
 await expect(page.locator('.history-card')).toContainText('Account B independent song');
 releaseOld();await oldFinished;
 await expect(page.locator('.history-card')).toHaveCount(1);
 await expect(page.locator('#historyList')).not.toContainText('PRIVATE ACCOUNT A');
 expect(paidPosts).toBe(0);
});

test('BASE 24: a previously displayed private History card disappears on cross-tab logout',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-account-A'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 let paidPosts=0;
 page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/api/studio/jobs'))paidPosts++;});
 await page.route('**/api/studio/jobs?filter=*',r=>r.fulfill({json:{items:[
  {id:'a-saved',kind:'video',status:'failed',prompt:'PRIVATE ACCOUNT A SECRET PROMPT'}
 ]}}));
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#showHistory').click();
 await expect(page.locator('#historyList')).toContainText('PRIVATE ACCOUNT A SECRET PROMPT');
 await page.evaluate(()=>{
  localStorage.removeItem('vv_token');
  dispatchEvent(new StorageEvent('storage',{key:'vv_token',newValue:null}));
 });
 await expect(page.locator('.history-card')).toHaveCount(0);
 await expect(page.locator('#historyList')).not.toContainText('PRIVATE ACCOUNT A');
 await expect(page.locator('#historyList')).toContainText('Account changed');
 expect(paidPosts).toBe(0);
});

test('BASE 24: History card actions cannot reuse previous-account prompts after silent same-tab token rotation',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','silent-account-A'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/studio/jobs?filter=*',r=>r.fulfill({json:{items:[
  {id:'account-a-private',kind:'image',status:'failed',
   prompt:'PRIVATE ACCOUNT A ARTWORK PROMPT',createdAt:'2026-10-17T08:00:00Z'}
 ]}}));
 let paidPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))paidPosts++;});
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#showHistory').click();
 await expect(page.locator('#historyList')).toContainText('PRIVATE ACCOUNT A ARTWORK PROMPT');
 await page.evaluate(()=>localStorage.setItem('vv_token','silent-account-B'));
 // There is deliberately no storage event within the same browser tab.
 await page.getByRole('button',{name:'Reuse prompt'}).click();
 await expect(page.locator('#historyList')).not.toContainText('PRIVATE ACCOUNT A');
 await expect(page.locator('#historyList')).toContainText('Account changed');
 await expect(page.locator('#prompt')).not.toHaveValue('PRIVATE ACCOUNT A ARTWORK PROMPT');
 expect(paidPosts).toBe(0);
});


test('BASE 24: delayed old-account History Download cannot save another account media',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','saved-account-A'));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 const audio={id:'old-owned-music',kind:'music',status:'ready',prompt:'PRIVATE ACCOUNT A MUSIC',
  createdAt:'2026-10-17T08:00:00Z',model:'saved-music'};
 await page.route('**/api/studio/jobs?filter=*',route=>route.fulfill({json:{items:[audio]}}));
 let markStarted,release,finished,downloads=0,paidPosts=0;
 const started=new Promise(resolve=>markStarted=resolve);
 const held=new Promise(resolve=>release=resolve);
 const settled=new Promise(resolve=>finished=resolve);
 page.on('download',()=>downloads++);
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))paidPosts++;});
 await page.route('**/api/studio/jobs/old-owned-music/media',async route=>{
  markStarted();await held;
  try{await route.fulfill({body:Buffer.from('SYNTHETIC PRIVATE AUDIO'),contentType:'audio/mpeg'});}catch(_){}
  finished();
 });
 await page.goto('/generate-studio.html?studio=audio');
 await page.locator('#showHistory').click();
 await expect(page.locator('.history-card')).toContainText('PRIVATE ACCOUNT A MUSIC');
 await page.locator('.history-card').getByRole('button',{name:'Download'}).click();
 await started;
 // Native storage events are not delivered to the tab that calls setItem.
 await page.evaluate(()=>localStorage.setItem('vv_token','saved-account-B'));
 release();await settled;
 await expect(page.locator('.history-card')).toHaveCount(0);
 await expect(page.locator('#historyList')).not.toContainText('PRIVATE ACCOUNT A');
 expect(downloads).toBe(0);
 expect(paidPosts).toBe(0);
});

for(const operation of ['Download','Edit image']){
 test('BASE 24: old-account History '+operation+' HTTP error never appears in new-account status',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vv_token','old-error-owner-A'));
  await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
  const media={id:'old-image-for-error',kind:'image',status:'ready',
   prompt:'OLD ACCOUNT PRIVATE IMAGE',model:'fixture-image',createdAt:'2026-10-17T08:00:00Z'};
  await page.route('**/api/studio/jobs?filter=*',r=>r.fulfill({json:{items:[media]}}));
  let resolveStarted,release,paidPosts=0;
  const started=new Promise(resolve=>resolveStarted=resolve),held=new Promise(resolve=>release=resolve);
  page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/studio/jobs')paidPosts++;});
  await page.route('**/api/studio/jobs/old-image-for-error/media',async route=>{
   resolveStarted();await held;
   try{await route.fulfill({status:503,json:{error:'PRIVATE_A_ERROR_MUST_NOT_DISPLAY'}});}catch(_){}
  });
  await page.goto('/generate-studio.html?studio=image&view=history');
  await expect(page.locator('.history-card')).toContainText('OLD ACCOUNT PRIVATE IMAGE');
  await page.locator('.history-card').getByRole('button',{name:operation,exact:true}).click();
  await started;
  await page.evaluate(()=>localStorage.setItem('vv_token','new-error-owner-B'));
  release();
  await expect(page.locator('.history-card')).toHaveCount(0);
  await expect(page.locator('#historyList')).not.toContainText('OLD ACCOUNT PRIVATE IMAGE');
  await expect(page.locator('#status')).not.toContainText('PRIVATE_A_ERROR_MUST_NOT_DISPLAY');
  expect(paidPosts).toBe(0);
 });
}

test('BASE 24: a changed account cannot confirm deletion of a previous account result',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','delete-account-A'));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/studio/jobs?filter=*',route=>route.fulfill({json:{items:[
  {id:'old-owned-delete',kind:'video',status:'failed',prompt:'PRIVATE ACCOUNT A FAILED JOB',
   createdAt:'2026-10-17T08:00:00Z'}
 ]}}));
 let deletes=0,paidPosts=0;
 page.on('request',req=>{
  if(req.method()==='DELETE'&&req.url().includes('/api/studio/jobs/'))deletes++;
  if(req.method()==='POST'&&req.url().includes('/api/studio/jobs'))paidPosts++;
 });
 await page.goto('/generate-studio.html?studio=video');
 await page.locator('#showHistory').click();
 await expect(page.locator('.history-card')).toContainText('PRIVATE ACCOUNT A FAILED JOB');
 // Hold a synchronous confirmation only while the account token rotates via
 // the browser's dialog handler; the delete operation checks session again.
 // Use addInitScript replacement to make the confirmation rotate the token.
 await page.evaluate(()=>{
  window.confirm=()=>{
   localStorage.setItem('vv_token','delete-account-B');
   return true;
  };
 });
 await page.locator('.history-card').getByRole('button',{name:'Delete'}).click();
 await expect(page.locator('#historyList')).not.toContainText('PRIVATE ACCOUNT A');
 expect(deletes).toBe(0);
 expect(paidPosts).toBe(0);
});


for(const deleteStatus of [200,503]){
 test('BASE 24: delayed History Delete '+deleteStatus+' after silent account change cannot alter next session',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vv_token','delayed-delete-account-A'));
  await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
  let reads=0,deleted=0,paidPosts=0;
  page.on('request',request=>{
   if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/studio/jobs')paidPosts++;
  });
  await page.route('**/api/studio/jobs?filter=*',route=>{
   reads++;
   const own=route.request().headers().authorization==='Bearer delayed-delete-account-A';
   return route.fulfill({json:{items:own?
    [{id:'old-delayed-delete',kind:'video',status:'failed',prompt:'PRIVATE A DELAYED DELETE',createdAt:'2026-10-17T08:00:00Z'}]:
    [{id:'new-owned-save',kind:'video',status:'failed',prompt:'B INDEPENDENT SAVED RESULT',createdAt:'2026-10-17T09:00:00Z'}]}});
  });
  let deleteArrived,releaseDelete,deleteResponded;
  const started=new Promise(resolve=>deleteArrived=resolve);
  const held=new Promise(resolve=>releaseDelete=resolve);
  const finished=new Promise(resolve=>deleteResponded=resolve);
  await page.route('**/api/studio/jobs/old-delayed-delete',async route=>{
   if(route.request().method()!=='DELETE')return route.fulfill({status:405});
   deleted++;deleteArrived();await held;
   try{await route.fulfill(deleteStatus===200?{json:{ok:true}}:{status:503,json:{error:'STUDIO_STORAGE_UNAVAILABLE'}});}catch(_){}
   deleteResponded();
  });
  await page.goto('/generate-studio.html?studio=video&view=history');
  await expect(page.locator('.history-card')).toContainText('PRIVATE A DELAYED DELETE');
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Delete'}).click();
  await started;
  // A real silent token switch in the same tab emits no native storage event.
  await page.evaluate(()=>localStorage.setItem('vv_token','delayed-delete-account-B'));
  releaseDelete();await finished;
  await expect(page.locator('#historyList')).toContainText('Account changed');
  await expect(page.locator('#historyList')).not.toContainText('PRIVATE A DELAYED DELETE');
  await expect(page.locator('#status')).not.toContainText('Result deleted.');
  expect(deleted).toBe(1);
  expect(reads).toBe(1); // A's delayed response must not silently fetch B's History.
  await page.locator('[data-history-filter=video]').click();
  await expect(page.locator('.history-card')).toContainText('B INDEPENDENT SAVED RESULT');
  await expect(page.locator('.history-card')).not.toContainText('PRIVATE A');
  expect(paidPosts).toBe(0);
 });
}

for(const authChange of ['cross-tab logout','silent same-tab account switch','silent same-tab video interaction','silent same-tab History navigation','silent same-tab History filter switch']){
 test('BASE 24: opened saved History video is revoked on '+authChange,async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vv_token','opened-result-account-A'));
  await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
  let generated=0,downloaded=0;
  page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/studio/jobs')generated++;});
  page.on('download',()=>downloaded++);
  await page.route('**/api/studio/jobs?filter=*',route=>{
   const own=route.request().headers()['authorization']==='Bearer opened-result-account-A';
   return route.fulfill({json:{items:own?[
    {id:'old-ready-video',kind:'video',status:'ready',prompt:'ACCOUNT A PRIVATE VIDEO',model:'fixture-video',
     mime:'video/mp4',createdAt:'2026-10-17T08:00:00Z'}
   ]:[]}});
  });
  await page.route('**/api/studio/jobs/old-ready-video',route=>route.fulfill({json:{
   id:'old-ready-video',kind:'video',status:'ready',model:'fixture-video',mime:'video/mp4'
  }}));
  await page.route('**/api/studio/jobs/old-ready-video/media',route=>route.fulfill({
   contentType:'video/mp4',body:Buffer.from('FAKE VIDEO BYTES IN PRIVATE HISTORY TEST')
  }));
  await page.goto('/generate-studio.html?studio=video&view=history');
  await expect(page.locator('.history-card')).toContainText('ACCOUNT A PRIVATE VIDEO');
  await page.locator('.history-card').getByRole('button',{name:'Open',exact:true}).click();
  await expect(page.locator('#media video')).toHaveCount(1);
  await expect(page.locator('#actions')).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('vu_generation_job'))).toBe('old-ready-video');
  if(authChange==='cross-tab logout'){
   await page.evaluate(()=>{
    localStorage.removeItem('vv_token');
    dispatchEvent(new StorageEvent('storage',{key:'vv_token',oldValue:'opened-result-account-A',newValue:null}));
   });
  }else{
   if(authChange==='silent same-tab History filter switch'){
    await page.locator('#showHistory').click();
    await expect(page.locator('.history-card')).toContainText('ACCOUNT A PRIVATE VIDEO');
   }
   await page.evaluate(()=>localStorage.setItem('vv_token','opened-result-account-B'));
   // Same-tab account changes emit no native storage event. Guard all entry points.
   if(authChange==='silent same-tab video interaction')await page.locator('#media video').click({force:true});
   else if(authChange==='silent same-tab History navigation')await page.locator('#showHistory').click();
   else if(authChange==='silent same-tab History filter switch')await page.locator('[data-history-filter=image]').click();
   else await page.locator('#actions #download').click();
  }
  await expect(page.locator('#media video')).toHaveCount(0);
  await expect(page.locator('#actions')).toBeHidden();
  await expect(page.locator('#status')).toContainText('previous saved result was hidden');
  expect(await page.evaluate(()=>sessionStorage.getItem('vu_generation_job'))).toBeNull();
  expect(generated).toBe(0);
  expect(downloaded).toBe(0);
 });
}

for(const endPreview of ['leave History','cross-tab logout']){
 test('BASE 24: active saved media fetch is aborted when user '+endPreview,async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vv_token','history-abort-owner-A'));
  await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
  await page.route('**/api/studio/jobs?filter=*',r=>r.fulfill({json:{items:[
   {id:'history-abort-video',kind:'video',status:'ready',
    prompt:'PRIVATE IN-FLIGHT VIDEO A',createdAt:'2026-10-17T08:00:00Z'}
  ]}}));
  let paid=0;page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio/jobs')paid++;});
  await page.goto('/generate-studio.html?studio=video&view=history');
  await page.evaluate(()=>{
   const original=window.fetch.bind(window);window.__mediaFetchStarted=false;window.__mediaFetchAborted=false;
   window.fetch=(input,options)=>{
    if(!String(input).includes('/api/studio/jobs/history-abort-video/media'))return original(input,options);
    window.__mediaFetchStarted=true;
    return new Promise((_resolve,reject)=>{
     const signal=options?.signal;
     if(!signal){reject(Error('MISSING_PREVIEW_ABORT_SIGNAL'));return;}
     const abort=()=>{window.__mediaFetchAborted=true;reject(new DOMException('aborted','AbortError'));};
     if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
    });
   };
  });
  await page.getByRole('button',{name:'Preview media'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__mediaFetchStarted)).toBe(true);
  if(endPreview==='leave History')await page.locator('#showCreate').click();
  else await page.evaluate(()=>{
   localStorage.setItem('vv_token','history-abort-owner-B');
   dispatchEvent(new StorageEvent('storage',{key:'vv_token',oldValue:'history-abort-owner-A',newValue:'history-abort-owner-B'}));
  });
  await expect.poll(()=>page.evaluate(()=>window.__mediaFetchAborted)).toBe(true);
  await expect(page.locator('.history-inline-media video')).toHaveCount(0);
  if(endPreview==='cross-tab logout'){
   await expect(page.locator('.history-card')).toHaveCount(0);
   await expect(page.locator('#historyList')).not.toContainText('PRIVATE IN-FLIGHT VIDEO A');
  }
  expect(paid).toBe(0);
 });
}

for(const streamingCase of ['missing Content-Length exceeds 128 MiB','account changes midstream']){
 test('BASE 24: saved media stream '+streamingCase+' fails closed without a paid POST',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vv_token','stream-history-account-A'));
  await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
  await page.route('**/api/studio/jobs?filter=*',r=>r.fulfill({json:{items:[
   {id:'streamed-private-video',kind:'video',status:'ready',
    prompt:'ACCOUNT A STREAMED PRIVATE MEDIA',mime:'video/mp4',createdAt:'2026-10-17T08:00:00Z'}
  ]}}));
  let paidPosts=0;page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio/jobs')paidPosts++;});
  await page.goto('/generate-studio.html?studio=video&view=history');
  await expect(page.locator('.history-card')).toContainText('ACCOUNT A STREAMED PRIVATE MEDIA');
  await page.evaluate(mode=>{
   const fetchOriginal=window.fetch.bind(window);
   window.__historyStreamCancelled=false;
   window.fetch=(input,opts)=>{
    if(!String(input).includes('/api/studio/jobs/streamed-private-video/media'))return fetchOriginal(input,opts);
    let count=0;
    return Promise.resolve({
     headers:new Headers({'content-type':'video/mp4'}),
     body:{getReader:()=>({
      read:async()=>{
       count++;
       if(mode==='account changes midstream')localStorage.setItem('vv_token','stream-history-account-B');
       if(count<=2)return {done:false,value:{byteLength:70*1024*1024}};
       return {done:true};
      },
      cancel:async()=>{window.__historyStreamCancelled=true;},
      releaseLock:()=>{}
     })}
    });
   };
  },streamingCase);
  await page.getByRole('button',{name:'Preview media'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__historyStreamCancelled)).toBe(true);
  await expect(page.locator('.history-inline-media video')).toHaveCount(0);
  if(streamingCase==='account changes midstream'){
   await expect(page.locator('.history-card')).toHaveCount(0);
   await expect(page.locator('#historyList')).toContainText('Account changed');
  }else{
   await expect(page.locator('#historyList')).toContainText('too large');
  }
  expect(paidPosts).toBe(0);
 });
}

for(const mediaOutcome of ['200','503']){
 test('BASE 24: delayed inline History preview '+mediaOutcome+' clears old account after silent login change',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vv_token','preview-flight-A'));
  await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
  let startedResolve,release,paid=0;
  const started=new Promise(resolve=>startedResolve=resolve),held=new Promise(resolve=>release=resolve);
  page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio/jobs')paid++;});
  await page.route('**/api/studio/jobs?filter=*',r=>r.fulfill({json:{items:[
   {id:'saved-video-old',kind:'video',status:'ready',prompt:'PRIVATE OLD USER A PREVIEW',
    mime:'video/mp4',createdAt:'2026-10-17T08:00:00Z'}
  ]}}));
  await page.route('**/api/studio/jobs/saved-video-old/media',async r=>{
   startedResolve();await held;
   try{
    if(mediaOutcome==='503')await r.fulfill({status:503,json:{error:'PRIVATE_OLD_USER_A_NETWORK_FAILURE'}});
    else await r.fulfill({contentType:'video/mp4',body:Buffer.from('SYNTHETIC OLD USER VIDEO')});
   }catch(_){}
  });
  await page.goto('/generate-studio.html?studio=video&view=history');
  await expect(page.locator('.history-card')).toContainText('PRIVATE OLD USER A PREVIEW');
  await page.getByRole('button',{name:'Preview media'}).click();
  await started;
  await page.evaluate(()=>localStorage.setItem('vv_token','preview-flight-B'));
  release();
  await expect(page.locator('.history-card')).toHaveCount(0);
  await expect(page.locator('.history-inline-media video')).toHaveCount(0);
  await expect(page.locator('#historyList')).toContainText('Account changed');
  await expect(page.locator('#status')).not.toContainText('PRIVATE_OLD_USER_A_NETWORK_FAILURE');
  expect(paid).toBe(0);
 });
}

for(const interaction of ['play','keydown']){
 test('BASE 24: old-account inline saved video cannot be accessed through '+interaction+' without a click',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vv_token','history-preview-owner-A'));
  await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
  let paidPosts=0;
  page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/studio/jobs')paidPosts++;});
  await page.route('**/api/studio/jobs?filter=*',r=>r.fulfill({json:{items:[
   {id:'private-inline-media-A',kind:'video',status:'ready',prompt:'PRIVATE INLINE ACCOUNT A',model:'fixture-video',
    mime:'video/mp4',createdAt:'2026-10-17T08:00:00Z'}
  ]}}));
  await page.route('**/api/studio/jobs/private-inline-media-A/media',r=>r.fulfill({
   contentType:'video/mp4',body:Buffer.from('FAKE PRIVATE VIDEO')
  }));
  await page.goto('/generate-studio.html?studio=video&view=history');
  await expect(page.locator('.history-card')).toContainText('PRIVATE INLINE ACCOUNT A');
  await page.getByRole('button',{name:'Preview media'}).click();
  await expect(page.locator('.history-inline-media video')).toHaveCount(1);
  await page.evaluate(()=>localStorage.setItem('vv_token','history-preview-owner-B'));
  await page.evaluate(type=>{
   const media=document.querySelector('.history-inline-media video');
   if(type==='play')media.dispatchEvent(new Event('play',{bubbles:false,cancelable:true}));
   else media.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));
  },interaction);
  await expect(page.locator('.history-inline-media video')).toHaveCount(0);
  await expect(page.locator('.history-card')).toHaveCount(0);
  await expect(page.locator('#historyList')).toContainText('Account changed');
  expect(paidPosts).toBe(0);
 });
}

test('BASE 24: 51 saved results remain accessible in user-owned History without a second paid job',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','fixture-history-owner'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 const originals=Array.from({length:51},(_,i)=>({
  id:'owned-old-'+String(i).padStart(3,'0'),kind:'video',status:'failed',
  prompt:'Original saved prompt '+i,model:'fixture-video',createdAt:'2026-10-17T08:00:00Z'
 }));
 const offsets=[],paidPosts=[];
 page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/api/studio/jobs'))paidPosts.push(req.url());});
 await page.route('**/api/studio/jobs?filter=*',r=>{
  const url=new URL(r.request().url()),filter=url.searchParams.get('filter'),offset=Number(url.searchParams.get('offset')||0);
  offsets.push({filter,offset});
  const filtered=filter==='all'?originals:[];
  return r.fulfill({json:{items:filtered.slice(offset,offset+50),
   hasMore:offset+50<filtered.length,nextOffset:offset+50<filtered.length?offset+50:null}});
 });
 await page.setViewportSize({width:390,height:844});
 await page.goto('/generate-studio.html?studio=video&view=history');
 await expect(page.locator('.history-card')).toHaveCount(50);
 await expect(page.locator('[data-history-more]')).toHaveText('Load older results');
 await page.locator('[data-history-more]').click();
 await expect(page.locator('.history-card')).toHaveCount(51);
 await expect(page.locator('.history-card').last()).toContainText('Original saved prompt 50');
 await expect(page.locator('[data-history-more]')).toHaveCount(0);
 await expect(page.locator('[data-history-filter=all]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-history-filter=image]')).toBeVisible();
 await page.locator('[data-history-filter=image]').click();
 await expect(page.locator('.history-card')).toHaveCount(0);
 await expect(page.locator('[data-history-more]')).toHaveCount(0);
 expect(offsets).toEqual([{filter:'all',offset:0},{filter:'all',offset:50},{filter:'image',offset:0}]);
 expect(paidPosts).toEqual([]);
});

test('BASE 24: delayed older History page cannot overwrite a new filter or leak stale results',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','fixture-history-owner'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 let started,release,completed,paidPosts=0;
 const oldSeen=new Promise(resolve=>started=resolve),oldRelease=new Promise(resolve=>release=resolve);
 const oldDone=new Promise(resolve=>completed=resolve);
 page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/api/studio/jobs'))paidPosts++;});
 await page.route('**/api/studio/jobs?filter=*',async r=>{
  const u=new URL(r.request().url()),filter=u.searchParams.get('filter'),offset=Number(u.searchParams.get('offset')||0);
  if(filter==='all'&&offset===50){
   started();await oldRelease;
   try{await r.fulfill({json:{items:[{id:'stale-older',kind:'music',status:'failed',prompt:'STALE OLDER PRIVATE PAGE'}],hasMore:false,nextOffset:null}});}catch(_){}
   completed();return;
  }
  const image={id:'current-photo',kind:'image',status:'failed',prompt:'Current Images filter only'};
  const items=filter==='image'?[image]:[{id:'first-page',kind:'video',status:'failed',prompt:'First page entry'}];
  return r.fulfill({json:{items,hasMore:filter==='all',nextOffset:filter==='all'?50:null}});
 });
 await page.goto('/generate-studio.html?view=history');
 await expect(page.locator('[data-history-more]')).toBeVisible();
 await page.locator('[data-history-more]').click();
 await oldSeen;
 await page.locator('[data-history-filter=image]').click();
 await expect(page.locator('.history-card')).toContainText('Current Images filter only');
 release();await oldDone;
 await expect(page.locator('.history-card')).toHaveCount(1);
 await expect(page.locator('#historyList')).not.toContainText('STALE OLDER PRIVATE PAGE');
 expect(paidPosts).toBe(0);
});

test('BASE 24: an old-account History Open never displays a late saved-media response',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-open-A'));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/studio/jobs?filter=*',route=>route.fulfill({json:{items:[
  {id:'private-open',kind:'video',status:'ready',model:'fixture',prompt:'SECRET ACCOUNT A PHOTO',
   createdAt:'2026-10-17T08:00:00.000Z',creditsReserved:0,creditsCharged:0}
 ]}}));
 let started,release,mediaRequests=0,paidPosts=0;
 const seen=new Promise(resolve=>started=resolve);
 const blocked=new Promise(resolve=>release=resolve);
 page.on('request',req=>{if(req.method()==='POST'&&/\/api\/studio\/jobs/.test(req.url()))paidPosts++;});
 await page.route('**/api/studio/jobs/private-open',async route=>{
  started();
  await blocked;
  try{await route.fulfill({json:{id:'private-open',kind:'video',status:'ready',mime:'video/mp4'}});}catch(_){}
 });
 await page.route('**/api/studio/jobs/private-open/media',route=>{
  mediaRequests++;
  return route.fulfill({contentType:'video/mp4',body:Buffer.from('OLD_PRIVATE_PHOTO')});
 });
 await page.goto('/generate-studio.html?studio=video&view=history');
 await expect(page.locator('.history-card')).toHaveCount(1);
 await page.locator('.history-card').getByRole('button',{name:'Open'}).click();
 await seen;
 await page.evaluate(()=>localStorage.setItem('vv_token','history-open-B'));
 release();
 await expect(page.locator('#historyList')).not.toContainText('SECRET ACCOUNT A PHOTO');
 await expect(page.locator('#media video')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('vu_generation_job'))).toBeNull();
 expect(mediaRequests).toBe(0);
 expect(paidPosts).toBe(0);
});

test('BASE 24: an old-account History Open cannot show delayed private ready media',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-media-A'));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/studio/jobs?filter=*',route=>route.fulfill({json:{items:[
  {id:'private-ready',kind:'video',status:'ready',model:'fixture',prompt:'SECRET PREVIOUS IMAGE',
   createdAt:'2026-10-17T08:00:00.000Z',creditsReserved:0,creditsCharged:0}
 ]}}));
 await page.route('**/api/studio/jobs/private-ready',route=>route.fulfill({
  json:{id:'private-ready',kind:'video',status:'ready',mime:'video/mp4'}}));
 let started,release,paidPosts=0;
 const seen=new Promise(resolve=>started=resolve);
 const blocked=new Promise(resolve=>release=resolve);
 page.on('request',req=>{if(req.method()==='POST'&&/\/api\/studio\/jobs/.test(req.url()))paidPosts++;});
 await page.route('**/api/studio/jobs/private-ready/media',async route=>{
  started();await blocked;
  try{await route.fulfill({contentType:'video/mp4',body:Buffer.from('PRIVATE_OLD_ACCOUNT_IMAGE')});}catch(_){}
 });
 await page.goto('/generate-studio.html?studio=video&view=history');
 await expect(page.locator('.history-card')).toHaveCount(1);
 await page.locator('.history-card').getByRole('button',{name:'Open'}).click();
 await seen;
 await page.evaluate(()=>localStorage.setItem('vv_token','history-media-B'));
 release();
 await expect(page.locator('#historyList')).not.toContainText('SECRET PREVIOUS IMAGE');
 await expect(page.locator('#media video')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('vu_generation_job'))).toBeNull();
 expect(paidPosts).toBe(0);
});

test('BASE 24: delayed old-account video status check cannot update the new user\'s History',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-video-A'));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/studio/jobs?filter=*',route=>route.fulfill({json:{items:[
  {id:'private-video-status',kind:'video',status:'processing',prompt:'PRIVATE ACCOUNT A VIDEO',
   model:'private-model',createdAt:'2026-10-17T08:00:00Z'}
 ]}}));
 let started,release,mediaReads=0,paidPosts=0;
 const seen=new Promise(resolve=>started=resolve),held=new Promise(resolve=>release=resolve);
 page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/api/studio/jobs'))paidPosts++;});
 await page.route('**/api/studio/jobs/private-video-status',async route=>{
  started();await held;
  try{await route.fulfill({json:{id:'private-video-status',kind:'video',status:'ready',mime:'video/mp4'}});}catch(_){}
 });
 await page.route('**/api/studio/jobs/private-video-status/media',route=>{
  mediaReads++;return route.fulfill({contentType:'video/mp4',body:'FORBIDDEN_PRIVATE_MEDIA'});
 });
 await page.goto('/generate-studio.html?studio=video&view=history');
 await expect(page.locator('.history-card')).toContainText('PRIVATE ACCOUNT A VIDEO');
 await page.locator('.history-card').getByRole('button',{name:'Check status'}).click();
 await seen;
 await page.evaluate(()=>localStorage.setItem('vv_token','history-video-B'));
 release();
 await expect(page.locator('#historyList')).not.toContainText('PRIVATE ACCOUNT A VIDEO');
 await expect(page.locator('.history-card')).toHaveCount(0);
 await expect(page.locator('#status')).not.toContainText('Video is ready');
 expect(mediaReads).toBe(0);
 expect(paidPosts).toBe(0);
});


for(const action of ['Reuse prompt','Regenerate']){
 test('BASE 24: History '+action+' prompt is scrubbed before the next account edits Studio',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vv_token','history-draft-A'));
  await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
  let paid=0;
  page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio/jobs')paid++;});
  await page.route('**/api/studio/jobs?filter=*',r=>{
   const owner=r.request().headers()['authorization']==='Bearer history-draft-A';
   return r.fulfill({json:{items:owner?[{
    id:'private-history-prompt',kind:'video',status:'failed',prompt:'SECRET HISTORY ORIGINAL PROMPT A',
    createdAt:'2026-10-17T08:00:00Z',model:'test-video'
   }]:[]}});
  });
  await page.goto('/generate-studio.html?studio=video&view=history');
  await page.locator('.history-card').getByRole('button',{name:action,exact:true}).click();
  await expect(page.locator('#prompt')).toHaveValue('SECRET HISTORY ORIGINAL PROMPT A');
  await page.evaluate(()=>localStorage.setItem('vv_token','history-draft-B'));
  await page.locator('#prompt').click();
  await expect(page.locator('#prompt')).toHaveValue('');
  await page.locator('#showHistory').click();
  await expect(page.locator('.history-card')).toHaveCount(0);
  await expect(page.locator('#historyList')).not.toContainText('SECRET HISTORY ORIGINAL PROMPT A');
  expect(paid).toBe(0);
 });
}
test('BASE 24: switched account cannot recover History prompt via an earlier Studio kind draft',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-other-kind-A'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/studio/jobs?filter=*',r=>r.fulfill({json:{items:[
  {id:'saved-kind-A',kind:'image',status:'failed',prompt:'ACCOUNT A HISTORY IMAGE PRIVATE PROMPT',
   createdAt:'2026-10-17T08:00:00Z'}
 ]}}));
 let paid=0;page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio/jobs')paid++;});
 await page.goto('/generate-studio.html?studio=video&view=history');
 await page.locator('.history-card').getByRole('button',{name:'Reuse prompt'}).click();
 await expect(page.locator('#prompt')).toHaveValue('ACCOUNT A HISTORY IMAGE PRIVATE PROMPT');
 await page.locator('[data-kind=video]').click();
 await page.evaluate(()=>localStorage.setItem('vv_token','history-other-kind-B'));
 await page.locator('[data-kind=image]').click();
 await expect(page.locator('#prompt')).toHaveValue('');
 expect(paid).toBe(0);
});

test('BASE 24: saved History Open Continue Image reference is cleared on account rotation',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','open-edit-image-A'));
 const model={kind:'image',label:'Fixture image',id:'image-fixture-owner-scope',ratios:['1:1'],
  references:2,enabled:true,adapter:true,provider:'Test',quality:'1K'};
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:false,ownerOnly:true,models:[model],catalog:[model]}}));
 let submitted=0;page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio/jobs')submitted++;});
 await page.route('**/api/studio/jobs?filter=*',r=>r.fulfill({json:{items:[{
  id:'saved-open-image-A',kind:'image',status:'ready',model:model.id,
  prompt:'PRIVATE IMAGE OPEN ACCOUNT A',createdAt:'2026-10-17T08:00:00Z'
 }]}}));
 await page.route('**/api/studio/jobs/saved-open-image-A',r=>r.fulfill({json:{
  id:'saved-open-image-A',kind:'image',status:'ready',mime:'image/png'
 }}));
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 await page.route('**/api/studio/jobs/saved-open-image-A/media',r=>r.fulfill({contentType:'image/png',body:png}));
 await page.goto('/generate-studio.html?studio=image&view=history');
 await expect(page.locator('.history-card')).toContainText('PRIVATE IMAGE OPEN ACCOUNT A');
 await page.locator('.history-card').getByRole('button',{name:'Open',exact:true}).click();
 await expect(page.locator('#continueImage')).toBeVisible();
 await page.locator('#continueImage').click();
 await expect(page.locator('#refPreview img')).toHaveCount(1);
 await page.evaluate(()=>localStorage.setItem('vv_token','open-edit-image-B'));
 await page.locator('#prompt').click();
 await expect(page.locator('#refPreview img')).toHaveCount(0);
 await expect(page.locator('#prompt')).toHaveValue('');
 expect(submitted).toBe(0);
});

test('BASE 24: History Edit image may not append old-account reference after delayed local decode',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','history-edit-A'));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.route('**/api/studio/jobs?filter=*',route=>route.fulfill({json:{items:[
  {id:'old-account-photo',kind:'image',status:'ready',model:'fixture-image',
   prompt:'SECRET OLD ACCOUNT IMAGE',createdAt:'2026-10-17T08:00:00Z'}
 ]}}));
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 await page.route('**/api/studio/jobs/old-account-photo/media',route=>route.fulfill({contentType:'image/png',body:png}));
 let paidPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))paidPosts++;});
 await page.goto('/generate-studio.html?studio=image&view=history');
 await expect(page.locator('.history-card')).toContainText('SECRET OLD ACCOUNT IMAGE');
 await page.evaluate(()=>{
  const native=window.createImageBitmap.bind(window);
  window.createImageBitmap=async(...args)=>{
   window.__historyBitmapStarted=true;
   await new Promise(resolve=>{window.__historyBitmapRelease=resolve;});
   return native(...args);
  };
 });
 await page.locator('.history-card').getByRole('button',{name:'Edit image'}).click();
 await expect.poll(()=>page.evaluate(()=>!!window.__historyBitmapStarted)).toBe(true);
 await page.evaluate(()=>{
  localStorage.setItem('vv_token','history-edit-B');
  document.querySelector('#prompt').value='CURRENT USER B DRAFT';
  window.__historyBitmapRelease();
 });
 await expect(page.locator('#historyList')).not.toContainText('SECRET OLD ACCOUNT IMAGE');
 await expect(page.locator('#prompt')).toHaveValue('CURRENT USER B DRAFT');
 await expect(page.locator('#refPreview img')).toHaveCount(0);
 expect(paidPosts).toBe(0);
});
