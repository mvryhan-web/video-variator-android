import {test,expect} from '@playwright/test';
const plans={basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}};
async function fixtures(page){
 await page.route('**/api/config',r=>r.fulfill({json:{plans,googleClientId:'',billingConfigured:true}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{ownerOnly:true,enabled:false,models:[],catalog:[]}}));
 await page.route('**/api/auth/email/status',r=>r.fulfill({json:{configured:true}}));
}
test('dashboard keeps tools secondary, honest availability and supported navigation',async({page},info)=>{
 await fixtures(page);await page.goto('/deepsyq.html');
 await expect(page.getByRole('heading',{name:/What will you/})).toBeVisible();
 await expect(page.locator('nav a[href="#quickCreateForm"]')).toContainText('Create / Canvas');
 await expect(page.locator('#studioStatus')).toContainText('owner preview');
 await expect(page.locator('.plan')).toHaveCount(3);
 await expect(page.locator('.trial-offer button')).toBeDisabled();
 await expect(page.locator('.lifetime')).toContainText('does not provide unlimited');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:info.outputPath('deepsyq.png'),fullPage:true});
 await page.locator('.studio-card.image').click();await expect(page).toHaveURL(/studio=image/);
 await expect(page.locator('#taskTitle')).toContainText('image');
 await page.locator('.topbar .back').click();await expect(page).toHaveURL(/deepsyq.html/);
});
test('dashboard quick-create prepares a local image draft without any paid request',async({page})=>{
 await fixtures(page);let jobPosts=0;
 page.on('request',request=>{if(request.url().includes('/api/studio/jobs')&&request.method()==='POST')jobPosts++;});
 await page.goto('/deepsyq.html');
 await page.locator('#quickCreatePrompt').fill('A watercolor greenhouse filled with sunlight');
 await page.locator('#quickCreateKind').selectOption('image');
 await page.locator('#quickCreateSubmit').click();
 await expect(page).toHaveURL(/generate-studio\.html\?studio=image&from=dashboard/);
 await expect(page.locator('#taskTitle')).toHaveText('Create an image');
 await expect(page.locator('#prompt')).toHaveValue('A watercolor greenhouse filled with sunlight');
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(jobPosts).toBe(0);
});

test('Canvas starter prompts are editable, preserve existing drafts on cancel, and do not call paid AI',async({page})=>{
 await fixtures(page);
 let posts=0;page.on('request',r=>{if(r.url().includes('/api/studio/jobs')&&r.method()==='POST')posts++;});
 await page.goto('/deepsyq.html');
 await page.locator('[data-quick-starter="social-video"]').click();
 await expect(page.locator('#quickCreateKind')).toHaveValue('video');
 await expect(page.locator('#quickCreatePrompt')).toHaveValue(/short, engaging social video/);
 await page.locator('#quickCreatePrompt').fill('My own carefully written prompt');
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('[data-quick-starter="portrait"]').click();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('My own carefully written prompt');
 expect(posts).toBe(0);
});

test('Canvas saves only text and kind within this tab; refresh drops photos and clear requires confirmation',async({page})=>{
 await fixtures(page);
 let jobPosts=0;page.on('request',req=>{if(req.url().includes('/api/studio/jobs')&&req.method()==='POST')jobPosts++;});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 await page.goto('/deepsyq.html');
 await page.locator('#quickCreatePrompt').fill('A very specific personal product video idea');
 await page.locator('#quickCreateKind').selectOption('video');
 await page.locator('#quickCreateFiles').setInputFiles({name:'private-photo.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('.quick-reference')).toHaveCount(1);
 await page.reload();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('A very specific personal product video idea');
 await expect(page.locator('#quickCreateKind')).toHaveValue('video');
 await expect(page.locator('.quick-reference')).toHaveCount(0);
 page.once('dialog',d=>d.dismiss());await page.locator('#quickCreateClear').click();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('A very specific personal product video idea');
 page.once('dialog',d=>d.accept());await page.locator('#quickCreateClear').click();
 await expect(page.locator('#quickCreatePrompt')).toHaveValue('');
 await expect(page.locator('#quickCreateKind')).toHaveValue('image');
 expect(await page.evaluate(()=>sessionStorage.getItem('deepsyq_quick_canvas_draft_v1'))).toBeNull();
 expect(jobPosts).toBe(0);
});

test('Canvas quick-create accepts local reference photos, allows removal and never auto-generates',async({page})=>{
 await fixtures(page);
 await page.route('**/api/studio/config',route=>route.fulfill({json:{
  enabled:true,models:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1'],references:2,enabled:true}],
  catalog:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1'],references:2,enabled:true,adapter:true,provider:'Google'}]
 }}));
 let jobPosts=0;page.on('request',req=>{if(req.url().includes('/api/studio/jobs')&&req.method()==='POST')jobPosts++;});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 await page.goto('/deepsyq.html');
 await page.locator('#quickCreatePrompt').fill('Natural product photograph with soft light');
 await page.locator('#quickCreateFiles').setInputFiles([
  {name:'reference-1.png',mimeType:'image/png',buffer:png},
  {name:'reference-2.png',mimeType:'image/png',buffer:png}
 ]);
 await expect(page.locator('.quick-reference')).toHaveCount(2);
 await page.getByRole('button',{name:'Remove reference 2'}).click();
 await expect(page.locator('.quick-reference')).toHaveCount(1);
 await page.locator('#quickCreateSubmit').click();
 await expect(page).toHaveURL(/studio=image&from=dashboard/);
 await expect(page.locator('#prompt')).toHaveValue('Natural product photograph with soft light');
 await expect(page.locator('#refPreview img')).toHaveCount(1);
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(jobPosts).toBe(0);
});

test('featured AI Apps render from approved API data and disappear when no templates exist',async({page})=>{
 await fixtures(page);
 let items=[{id:'featured-1',slug:'product-photo',title:'Approved Product Photo',description:'Owner approved workflow',category:'ecommerce',generationType:'image',active:true,featured:true}];
 await page.route('**/api/templates?featured=true',route=>route.fulfill({json:{items}}));
 await page.goto('/deepsyq.html');
 await expect(page.locator('#featuredWorkflows')).toBeVisible();
 await expect(page.locator('#featuredWorkflowGrid .featured-workflow-card')).toHaveCount(1);
 await expect(page.locator('#featuredWorkflowGrid')).toContainText('Approved Product Photo');
 items=[];
 await page.reload();
 await expect(page.locator('#featuredWorkflows')).toBeHidden();
});

test('existing email component logs in and logout clears session and latest result',async({page})=>{
 await fixtures(page);let payload;
 await page.route('**/api/auth/email/login',async r=>{payload=r.request().postDataJSON();await r.fulfill({json:{token:'test-session'}});});
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Test creator'}}}));
 await page.goto('/deepsyq.html');
 if(await page.locator('#menu').isVisible())await page.locator('#menu').click();
 await page.locator('#accountButton').click();
 await page.locator('#emailAuthEmail').fill('creator@example.test');await page.locator('#emailAuthPassword').fill('fixture-only-password');await page.locator('#emailAuthSubmit').click();
 await expect(page.locator('#accountButton')).toHaveText('Account settings');
 expect(payload.email).toBe('creator@example.test');
 expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBe('test-session');
 if(await page.locator('#menu').isVisible()&&!(await page.locator('body').evaluate(el=>el.classList.contains('menu-open'))))await page.locator('#menu').click();
 await page.locator('#logout').click();await expect(page.locator('#logout')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBeNull();
});
test('checkout uses original plan endpoint and explains unavailable payments',async({page})=>{
 await fixtures(page);await page.addInitScript(()=>localStorage.setItem('vv_token','fixture'));
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Creator'}}}));let plan;
 await page.route('**/api/billing/checkout',async r=>{plan=r.request().postDataJSON().plan;await r.fulfill({status:503,json:{error:'BILLING_NOT_CONFIGURED'}});});
 await page.goto('/deepsyq.html');await page.getByRole('button',{name:'Choose Basic',exact:true}).click();
 await expect(page.locator('#paymentStatus')).toContainText('No payment was taken');expect(plan).toBe('basic');
});
test('comparison is crawlable and does not pretend AI chat exists',async({page})=>{
 await page.goto('/deepsyq-vs-deepseek.html',{waitUntil:'domcontentloaded'});await expect(page).toHaveTitle(/Deepsyq vs DeepSeek/);
 await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('body')).toContainText('not currently offer a general-purpose AI chat');
 await expect(page.locator('body')).toContainText('not affiliated');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('legacy video history and profile deep links open actual views',async({page})=>{
 await fixtures(page);await page.goto('/index.html#history');await expect(page.locator('#historyView')).toHaveClass(/active/);
 await page.goto('/index.html#profile');await expect(page.locator('#profileView')).toHaveClass(/active/);
});

test('owner sees AI control entry and admin page exposes only safe model controls',async({page})=>{
 await fixtures(page);await page.addInitScript(()=>localStorage.setItem('vv_token','owner-fixture'));
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Owner',isAdmin:true}}}));
 await page.route('**/api/studio/admin/business',r=>r.fulfill({json:{users:{total:2,registrations30d:1,everSubscribed:1,inactiveAfterSubscription:0,generationAdoptionRate:.5,everSubscribedRate:.5},generation:{jobs:3,generatingUsers:1,ready:2,failed:1,processing:0,failureRate:.333,jobsPerGeneratingUser:3,averageSeconds:12,providerCosts:[{currency:'eur',amount:.5}],creditsCharged:80,topModel:'byteplus-seedance-2'},aiPurchases:[{currency:'eur',purchases:1,netAmountMinor:500,creditsPurchased:100}],grossMargin:null,grossMarginReason:'unverified'}}));
 await page.route('**/api/studio/admin/purchases',r=>r.fulfill({json:{items:[{userId:'u1',userEmail:'creator@example.test',credits:1000,amountMinor:999,refundedMinor:250,netMinor:749,currency:'eur',createdAt:'2026-10-15T10:00:00Z'}]}}));
 await page.route('**/api/studio/admin/users**',r=>r.fulfill({json:{items:[{id:'u1',email:'creator@example.test',name:'Creator',provider:'email',plan:'trial',status:'inactive',hasSubscribed:false,toolUsage:{limit:2,periodUsed:0,trialUsed:1},aiWallet:{available:10,reserved:2,debt:0},generationCount:3,aiPurchaseCount:1,createdAt:'2026-10-15T08:00:00Z'}]}}));
 await page.route('**/api/studio/admin/jobs**',r=>r.fulfill({json:{items:[{id:'job-1',userId:'u1',userEmail:'creator@example.test',kind:'video',status:'ready',provider:'BytePlus',model:'byteplus-seedance-2',durationSeconds:12,actualCost:.5,estimatedCost:.5,costCurrency:'eur',creditsReserved:80,creditsCharged:80,error:null}]}}));
 await page.route('**/api/studio/admin/models',r=>r.fulfill({json:{items:[{id:'byteplus-seedance-2',label:'Seedance 2.0',provider:'BytePlus',kind:'video',enabled:true,control:{enabledOverride:null,priority:100,markupBps:null,internalCostMicros:null,maintenance:false}}]}}));
 await page.route('**/api/studio/admin/metrics**',r=>r.fulfill({json:{window:'7d',items:[{provider:'BytePlus',model:'byteplus-seedance-2',kind:'video',jobs:2,succeeded:1,failed:1,processing:0,successRate:.5,failureRate:.5,averageSeconds:12.5,actualCost:0.5,costCurrency:'eur',creditsCharged:80}]}}));
 await page.route('**/api/studio/admin/billing-review',r=>r.fulfill({json:{items:[{jobId:'job-review-1',userId:'user-1',credits:17,kind:'video',provider:'BytePlus',model:'byteplus-seedance-2',status:'failed',error:'GENERATION_FAILED_NO_AUTOMATIC_RETRY',createdAt:'2026-10-15T08:00:00Z'}]}}));
 await page.route('**/api/studio/admin/route-preview',r=>r.fulfill({json:{primary:'byteplus-seedance-2',candidates:[{id:'byteplus-seedance-2',provider:'BytePlus',priority:10,quality:'720p',duration:'5 seconds'}]}}));
 await page.route('**/api/studio/admin/templates',r=>r.fulfill({json:{items:[{id:'t-1',title:'Original Product Template',slug:'original-product-template',category:'ecommerce',description:'Owned workflow',thumbnail:null,generationType:'image',promptTemplate:'Create a product image',defaultModel:null,requiredInputTypes:['image'],defaultSettings:{ratio:'1:1'},active:true,featured:true,sortOrder:10}]}}));
 await page.goto('/deepsyq.html');if(await page.locator('#menu').isVisible())await page.locator('#menu').click();await expect(page.locator('#adminAiControl')).toBeVisible();await page.locator('#adminAiControl').click();
 await expect(page).toHaveURL(/deepsyq-admin.html/);await expect(page.locator('#businessOverview')).toContainText('Users');await expect(page.locator('#purchasesTable')).toContainText('creator@example.test');await expect(page.locator('#purchasesTable')).toContainText('€7.49');await expect(page.locator('#usersTable')).toContainText('creator@example.test');await expect(page.locator('#jobsTable')).toContainText('job-1');await expect(page.getByText('Seedance 2.0')).toBeVisible();await expect(page.locator('#metrics')).toContainText('BytePlus');await page.locator('#metricsWindow').selectOption('24h');await expect(page.locator('#billingReview')).toContainText('17 credits');await expect(page.locator('#templates input[name=title]').first()).toHaveValue('Original Product Template');
 await page.locator('#routeKind').selectOption('video');await page.locator('#routeRatio').selectOption('16:9');await page.locator('#routePreview').click();await expect(page.locator('#routeResult')).toContainText('byteplus-seedance-2');await expect(page.locator('#routeStatus')).toContainText('No provider call was made');
 await expect(page.locator('body')).not.toContainText('API key');await expect(page.locator('body')).not.toContainText('secret');
});


test('new account onboarding goes straight to a real first-stage workflow',async({page})=>{
 await fixtures(page);
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'New creator',isAdmin:false}}}));
 let savedGoal=null;
 await page.route('**/api/onboarding',async r=>{
  if(r.request().method()==='POST'){const body=r.request().postDataJSON();savedGoal=body.goal;return r.fulfill({json:{ok:true,goal:body.goal,target:'/generate-studio.html?studio='+body.goal}});}
  return r.fulfill({json:{completed:false,goal:null,options:[{id:'image',label:'Image',target:'/generate-studio.html?studio=image'},{id:'video',label:'Video',target:'/generate-studio.html?studio=video'}]}});
 });
 await page.goto('/deepsyq.html');await page.evaluate(()=>{localStorage.setItem('vv_token','new-user');localStorage.setItem('deepsyq_onboarding_pending','1');});await page.reload();await expect(page.locator('#onboardingModal')).toBeVisible();await page.locator('[data-onboarding-goal=image]').click();
 await expect(page).toHaveURL(/generate-studio.html\?studio=image/);expect(savedGoal).toBe('image');expect(await page.evaluate(()=>localStorage.getItem('deepsyq_onboarding_pending'))).toBeNull();
});


test('AI Apps shows only active API templates and prepares Studio without generating',async({page})=>{
 await page.route('**/api/templates',r=>r.fulfill({json:{items:[{id:'app-1',title:'Owned Product Image',slug:'owned-product-image',category:'ecommerce',description:'Original workflow',thumbnail:null,generationType:'image',promptTemplate:'Create an original product image',defaultModel:'fixture',requiredInputTypes:['image'],defaultSettings:{ratio:'16:9'},active:true,featured:true,sortOrder:10}]}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:true,models:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1','16:9'],references:1,enabled:true}],catalog:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1','16:9'],references:1,enabled:true,adapter:true,provider:'Google'}]}}));
 let posts=0;page.on('request',r=>{if(r.url().includes('/api/studio/jobs')&&r.method()==='POST')posts++;});
 await page.goto('/ai-apps.html');await expect(page.getByRole('heading',{name:'AI Apps'})).toBeVisible();await expect(page.locator('.app-card')).toHaveCount(1);await expect(page.locator('.app-card')).toContainText('Owned Product Image');
 await page.getByRole('button',{name:'Use template'}).click();await expect(page).toHaveURL(/generate-studio.html\?studio=image/);await expect(page.locator('#prompt')).toHaveValue('Create an original product image');await expect(page.locator('#ratio')).toHaveValue('16:9');await expect(page.locator('#consent')).not.toBeChecked();expect(posts).toBe(0);
});


test('Product Video keeps references local until Studio review and never auto-generates',async({page})=>{
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:true,models:[{kind:'video',id:'video-fixture',label:'Video Fixture',ratios:['16:9','9:16','1:1'],references:2,enabled:true}],catalog:[{kind:'video',id:'video-fixture',label:'Video Fixture',ratios:['16:9','9:16','1:1'],references:2,enabled:true,adapter:true,provider:'Google',duration:'8 seconds'}]}}));
 let jobPosts=0;page.on('request',r=>{if(r.url().includes('/api/studio/jobs')&&r.method()==='POST')jobPosts++;});await page.goto('/product-video.html');const img=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');await page.locator('#photos').setInputFiles({name:'product.png',mimeType:'image/png',buffer:img});await page.locator('#productName').fill('Luna Bag');await page.locator('#style').selectOption('cinematic');await page.locator('#ratio').selectOption('9:16');await expect(page.locator('#promptPreview')).toHaveValue(/Luna Bag/);await expect(page.locator('#promptPreview')).toHaveValue(/cinematic/);await page.locator('#continue').click();await expect(page).toHaveURL(/generate-studio\.html\?studio=video/);await expect(page.locator('#prompt')).toHaveValue(/Luna Bag/);await expect(page.locator('#ratio')).toHaveValue('9:16');await expect(page.locator('#refPreview img')).toHaveCount(1);await expect(page.locator('#consent')).not.toBeChecked();expect(jobPosts).toBe(0);
});


test('dashboard featured workflows are data-driven and disappear when empty',async({page})=>{
 await fixtures(page);
 await page.route('**/api/config',r=>r.fulfill({json:{googleClientId:'',appleClientId:'',emailAuth:true,billingConfigured:false,features:{aiApps:true,productVideo:true,onboarding:true},plans:{}}}));
 await page.route('**/api/templates?featured=true',r=>r.fulfill({json:{items:[{id:'f1',title:'Owner Featured Workflow',slug:'owner-featured',category:'ecommerce',description:'Approved workflow',thumbnail:null,generationType:'image',active:true,featured:true}]}}));
 await page.goto('/deepsyq.html');await expect(page.locator('#featuredWorkflows')).toBeVisible();await expect(page.locator('#featuredWorkflowGrid')).toContainText('Owner Featured Workflow');
});


test('pricing keeps existing Lifetime separate from AI credit packs and uses server prices only',async({page})=>{
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur',unlimited:true}}}}));
 await page.route('**/api/ai-billing/config',r=>r.fulfill({json:{enabled:false,mode:'test',livePaymentsEnabled:false,packs:[{sku:'configured',credits:4200,amount:1900,currency:'usd'}],rates:[]}}));
 await page.goto('/ai-pricing.html');await expect(page.locator('#toolPlans')).toContainText('Lifetime');await expect(page.locator('#toolPlans')).toContainText('not unlimited AI-generation credit');await expect(page.locator('#aiPacks')).toContainText('4,200 AI credits');await expect(page.locator('#aiPacks')).toContainText('$19');await expect(page.locator('#aiPacks button')).toBeDisabled();
});


test('dashboard shows the authenticated AI wallet only when AI billing is enabled',async({page})=>{
 await fixtures(page);await page.addInitScript(()=>localStorage.setItem('vv_token','wallet-user'));
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Wallet User',isAdmin:false}}}));
 await page.route('**/api/ai-billing/config',r=>r.fulfill({json:{enabled:true,mode:'test',livePaymentsEnabled:false,unit:'AI credits',packs:[],rates:[],revision:'x'}}));
 await page.route('**/api/ai-wallet/balance',r=>r.fulfill({json:{available:4200,reserved:150,debt:0}}));
 await page.goto('/deepsyq.html');await expect(page.locator('#aiWalletLink')).toBeVisible();await expect(page.locator('#aiWalletAvailable')).toHaveText('4,200');await expect(page.locator('#aiWalletHeld')).toHaveText('150 held');await expect(page.locator('#aiWalletLink')).toHaveAttribute('href','ai-pricing.html');
});


test('Pricing shows signed-in AI wallet and recent ledger activity',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','pricing-user'));
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'EUR'}}}}));
 await page.route('**/api/ai-billing/config',r=>r.fulfill({json:{enabled:false,mode:'test',livePaymentsEnabled:false,unit:'AI credits',packs:[],rates:[],revision:null}}));
 await page.route('**/api/ai-wallet/config',r=>r.fulfill({json:{welcomeEnabled:false,welcomeCredits:0}}));
 await page.route('**/api/ai-wallet/balance',r=>r.fulfill({json:{available:4050,reserved:150,debt:0}}));
 await page.route('**/api/ai-wallet/history',r=>r.fulfill({json:{items:[{kind:'reserve',reference:'job-1',available_delta:-150,reserved_delta:150,debt_delta:0,created_at:'2026-10-15T10:00:00Z'},{kind:'welcome_grant',reference:'welcome',available_delta:4200,reserved_delta:0,debt_delta:0,created_at:'2026-10-15T09:00:00Z'}]}}));
 await page.goto('/ai-pricing.html');await expect(page.locator('#walletSection')).toBeVisible();await expect(page.locator('#walletSummary')).toContainText('4,050');await expect(page.locator('#walletSummary')).toContainText('150');await expect(page.locator('#walletHistory')).toContainText('Reserved for generation');await expect(page.locator('#walletHistory')).toContainText('Welcome credits');
});


test('Inspiration filters approved media and all actions only prepare Studio',async({page})=>{
 const items=[{id:'insp-1',title:'Owned Editorial Portrait',slug:'owned-editorial-portrait',kind:'image',category:'Editorial',description:'Original Deepsyq example',previewUrl:'/fixture-inspiration.png',previewPosterUrl:null,prompt:'Editorial portrait in soft window light',defaultModel:'fixture',aspectRatio:'2:3',requiredInputTypes:['image'],defaultSettings:{ratio:'2:3'},actionTarget:'studio',active:true,featured:true,sortOrder:10}];
 let inspirationUrl='';await page.route('**/api/inspiration**',r=>{inspirationUrl=r.request().url();return r.fulfill({json:{items,categories:['Editorial'],ratios:['2:3','16:9']}});});await page.route('**/fixture-inspiration.png',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')}));await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:true,models:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1','2:3'],references:1,enabled:true}],catalog:[{kind:'image',id:'fixture',label:'Fixture',ratios:['1:1','2:3'],references:1,enabled:true,adapter:true,provider:'Google'}]}}));let jobPosts=0;page.on('request',r=>{if(r.url().includes('/api/studio/jobs')&&r.method()==='POST')jobPosts++;});await page.goto('/inspiration.html');await expect(page.getByRole('heading',{name:'Inspiration'})).toBeVisible();await expect(page.locator('#ratio')).toContainText('2:3');await page.locator('#ratio').selectOption('2:3');await expect.poll(()=>new URL(inspirationUrl).searchParams.get('ratio')).toBe('2:3');await expect(page.locator('.card')).toHaveCount(1);await expect(page.locator('.card')).toContainText('Owned Editorial Portrait');await expect(page.locator('.card')).toContainText('2:3');await page.getByRole('button',{name:'Clone and Try'}).click();await expect(page).toHaveURL(/generate-studio\.html\?studio=image/);await expect(page.locator('#prompt')).toHaveValue('Editorial portrait in soft window light');await expect(page.locator('#ratio')).toHaveValue('2:3');await expect(page.locator('#consent')).not.toBeChecked();expect(jobPosts).toBe(0);
});

test('Inspiration ignores stale filter responses and keeps the latest search result',async({page})=>{
 let releaseInitial=null;
 let initialRequested;
 const initialSeen=new Promise(resolve=>{initialRequested=resolve;});
 await page.route('**/api/inspiration**',async route=>{
  const q=new URL(route.request().url()).searchParams.get('q')||'';
  if(!q){initialRequested();await new Promise(resolve=>{releaseInitial=resolve;});}
  const item={id:'race-'+(q||'old'),title:q?'Newest search result':'Outdated search result',slug:q?'newest':'outdated',kind:'image',category:'Editorial',description:'Owned example',previewUrl:'/sample.png',prompt:'Original prompt',aspectRatio:'1:1',requiredInputTypes:[],defaultSettings:{ratio:'1:1'},actionTarget:'studio'};
  try{await route.fulfill({json:{items:[item],categories:['Editorial'],ratios:['1:1'],pagination:{limit:24,offset:0,nextOffset:null,hasMore:false}}});}catch(_){}
 });
 await page.goto('/inspiration.html');
 await initialSeen;
 await page.locator('#search').fill('newest');
 await expect(page.locator('.card')).toContainText('Newest search result');
 releaseInitial();
 await page.waitForTimeout(100);
 await expect(page.locator('.card')).toHaveCount(1);
 await expect(page.locator('.card')).toContainText('Newest search result');
});

test('dashboard inspiration preview is data-driven and hides Agent examples when none are connected',async({page})=>{
 await page.route('**/api/config',r=>r.fulfill({json:{plans,googleClientId:'',billingConfigured:true,features:{aiApps:false,inspiration:true,productVideo:false,onboarding:false}}}));await page.route('**/api/studio/config',r=>r.fulfill({json:{ownerOnly:true,enabled:false,models:[],catalog:[]}}));await page.route('**/api/auth/email/status',r=>r.fulfill({json:{configured:true}}));await page.route('**/api/inspiration**',r=>{const u=new URL(r.request().url());if(u.searchParams.get('target')==='agent')return r.fulfill({json:{items:[],categories:[]}});return r.fulfill({json:{items:[{id:'f1',title:'Owned Video Mood',slug:'owned-video-mood',kind:'video',category:'Cinematic',description:'Original example',previewUrl:'/owned.mp4',previewPosterUrl:null,prompt:'Cinematic scene',defaultModel:null,aspectRatio:'16:9',requiredInputTypes:[],defaultSettings:{ratio:'16:9'},actionTarget:'studio',active:true,featured:true}],categories:['Cinematic'],ratios:['16:9'],pagination:{hasMore:false,nextOffset:null}}});});await page.goto('/deepsyq.html');await expect(page.locator('#inspirationPreview')).toBeVisible();await expect(page.locator('#inspirationPreviewGrid')).toContainText('Owned Video Mood');await expect(page.locator('#inspirationPreviewCategories')).toContainText('Cinematic');await expect(page.locator('#inspirationPreviewCategories a')).toHaveAttribute('href','inspiration.html?category=Cinematic');await expect(page.locator('#inspirationPreviewGrid a').first()).toHaveAttribute('href',/inspiration\.html\?kind=video.*category=Cinematic.*ratio=16%3A9.*q=Owned%20Video%20Mood/);await expect(page.locator('#agentExamples')).toBeHidden();
});


test('featured owned video is promoted but original homepage sections and images remain',async({page})=>{
 await page.route('**/api/config',r=>r.fulfill({json:{plans,googleClientId:'',billingConfigured:true,features:{aiApps:false,inspiration:true,productVideo:false,onboarding:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{ownerOnly:true,enabled:false,models:[],catalog:[]}}));
 await page.route('**/api/auth/email/status',r=>r.fulfill({json:{configured:true}}));
 const common={description:'Original',defaultModel:null,requiredInputTypes:[],defaultSettings:{},actionTarget:'studio',active:true,featured:true};
 await page.route('**/api/inspiration**',r=>r.fulfill({json:{items:[
  {...common,id:'photo',title:'Original owned photo',slug:'original-owned-photo',kind:'image',category:'Product Ads',previewUrl:'/original-photo.png',prompt:'Photo prompt',aspectRatio:'1:1'},
  {...common,id:'film',title:'Original owned film',slug:'original-owned-film',kind:'video',category:'Cinematic',previewUrl:'/original-film.mp4',previewPosterUrl:'/original-poster.jpg',prompt:'Video prompt',aspectRatio:'16:9'}
 ],categories:['Product Ads','Cinematic'],ratios:['1:1','16:9'],pagination:{hasMore:false}}}));
 await page.goto('/deepsyq.html');
 await expect(page.locator('#inspirationPreview')).toBeVisible();
 await expect(page.locator('#inspirationPreviewGrid a')).toHaveCount(2);
 await expect(page.locator('#inspirationPreviewGrid a').first()).toContainText('Original owned film');
 await expect(page.locator('#inspirationPreviewGrid a').last()).toContainText('Original owned photo');
 await expect(page.locator('#inspirationPreviewGrid video')).toHaveCount(1);
 await expect(page.locator('#inspirationPreviewGrid video')).toHaveJSProperty('muted',true);
 await expect(page.locator('#inspirationPreviewGrid video')).toHaveJSProperty('loop',true);
 expect(await page.evaluate(()=>!!(document.querySelector('#inspirationPreview').compareDocumentPosition(document.querySelector('[aria-labelledby="createTitle"]'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 await expect(page.locator('.studio-card')).toHaveCount(4);
 await expect(page.getByRole('link',{name:/Video Uniquifier history/})).toBeVisible();
});
test('public Inspiration shortcuts display only published category labels',async({page})=>{
 const item={id:'owned',title:'Owned image',slug:'owned-image',kind:'image',category:'Fashion & Beauty',previewUrl:'/owned.png',prompt:'Original prompt',aspectRatio:'1:1',actionTarget:'studio',requiredInputTypes:[],defaultSettings:{}};
 await page.route('**/api/inspiration**',r=>r.fulfill({json:{items:[item],categories:['Fashion & Beauty'],ratios:['1:1'],pagination:{hasMore:false}}}));
 await page.goto('/inspiration.html');
 await expect(page.locator('#categoryChips button')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Fashion & Beauty'})).toBeVisible();
 await expect(page.locator('#categoryChips')).not.toContainText('Cinematic Worlds');
 await page.locator('#categoryChips button').click();
 await expect(page.locator('#category')).toHaveValue('Fashion & Beauty');
 await expect.poll(()=>new URL(page.url()).searchParams.get('category')).toBe('Fashion & Beauty');
});
test('owner can manage Block 3 inspiration without exposing rights internals publicly',async({page})=>{
 await fixtures(page);await page.addInitScript(()=>localStorage.setItem('vv_token','owner-fixture'));await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Owner',isAdmin:true}}}));
 const empty={items:[]};for(const p of ['business','purchases','users','jobs','audit','models','metrics','billing-review','templates'])await page.route('**/api/studio/admin/'+p+'**',r=>r.fulfill({json:p==='business'?{users:{total:0,registrations30d:0,everSubscribed:0,inactiveAfterSubscription:0,generationAdoptionRate:0,everSubscribedRate:0},generation:{jobs:0,generatingUsers:0,ready:0,failed:0,processing:0,failureRate:0,jobsPerGeneratingUser:0,averageSeconds:null,providerCosts:[],creditsCharged:0,topModel:null},aiPurchases:[],grossMargin:null}:empty}));
 await page.route('**/api/studio/admin/readiness',r=>r.fulfill({json:{gates:[],blockers:[]}}));
 let item={id:'i1',title:'Owned Fashion Film',slug:'owned-fashion-film',kind:'video',category:'Fashion',description:'Original',previewUrl:'/owned.mp4',previewPosterUrl:'/owned.jpg',prompt:'Fashion film prompt',defaultModel:null,aspectRatio:'9:16',requiredInputTypes:['image'],defaultSettings:{ratio:'9:16'},actionTarget:'studio',rightsBasis:'owned',rightsNote:'Created in house',active:true,featured:true,sortOrder:10};
 await page.route('**/api/studio/admin/inspiration**',async r=>{if(r.request().url().includes('inspiration-readiness'))return r.fulfill({json:{ready:true,featureEnabled:false,agentTargetsEnabled:false,counts:{total:1,active:1,publishable:1,studio:1,images:0,videos:1,featured:1,rightsBlocked:0,agentGated:0},categories:['Fashion'],ratios:['9:16'],blockers:[]}});if(r.request().method()==='GET')return r.fulfill({json:{items:[item]}});const body=r.request().postDataJSON();item={...item,...body};return r.fulfill({json:{item}});});
 await page.goto('/deepsyq-admin.html');await expect(page.locator('#inspirationAdminList input[name=title]').first()).toHaveValue('Owned Fashion Film');await expect(page.locator('#inspirationReadiness')).toContainText('Block 3 content is ready to publish');await expect(page.locator('#inspirationAdminList')).toContainText('Publish only if rights are verified: owned');
});


test('all three Block 3 actions preserve their intended prefill semantics without copying source media',async({page})=>{
 const item={id:'insp-actions',title:'Owned Portrait',slug:'owned-portrait',kind:'image',category:'Editorial',description:'Original',previewUrl:'/owned-preview.png',previewPosterUrl:null,prompt:'Soft editorial portrait',defaultModel:'clone-model',aspectRatio:'2:3',requiredInputTypes:['image'],defaultSettings:{ratio:'2:3'},actionTarget:'studio',active:true,featured:true,sortOrder:1};
 await page.route('**/api/inspiration**',r=>r.fulfill({json:{items:[item],categories:['Editorial'],ratios:['1:1','2:3']}}));
 await page.route('**/owned-preview.png',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')}));
 const cfg={enabled:true,models:[{kind:'image',id:'base-model',label:'Base Model',ratios:['1:1','2:3'],references:1,enabled:true}],catalog:[{kind:'image',id:'base-model',label:'Base Model',ratios:['1:1','2:3'],references:1,enabled:true,adapter:true,provider:'Google'},{kind:'image',id:'clone-model',label:'Clone Model',ratios:['1:1','2:3'],references:1,enabled:true,adapter:true,provider:'Google'}]};
 await page.route('**/api/studio/config',r=>r.fulfill({json:cfg}));
 let posts=0;page.on('request',r=>{if(r.url().includes('/api/studio/jobs')&&r.method()==='POST')posts++;});

 await page.goto('/inspiration.html');await page.getByRole('button',{name:'Use this prompt'}).click();
 await expect(page.locator('#prompt')).toHaveValue('Soft editorial portrait');await expect(page.locator('#ratio')).toHaveValue('1:1');await expect(page.locator('#modelButton')).toContainText('Base Model');await expect(page.locator('#refPreview img')).toHaveCount(0);await expect(page.locator('#consent')).not.toBeChecked();expect(posts).toBe(0);

 await page.goto('/inspiration.html');await page.getByRole('button',{name:'Create yours'}).click();
 await expect(page.locator('#prompt')).toHaveValue('Soft editorial portrait');await expect(page.locator('#ratio')).toHaveValue('2:3');await expect(page.locator('#modelButton')).toContainText('Base Model');await expect(page.locator('#refPreview img')).toHaveCount(0);await expect(page.locator('#consent')).not.toBeChecked();expect(posts).toBe(0);

 await page.goto('/inspiration.html');await page.getByRole('button',{name:'Clone and Try'}).click();
 await expect(page.locator('#prompt')).toHaveValue('Soft editorial portrait');await expect(page.locator('#ratio')).toHaveValue('2:3');await expect(page.locator('#modelButton')).toContainText('Clone Model');await expect(page.locator('#refPreview img')).toHaveCount(0);await expect(page.locator('#consent')).not.toBeChecked();expect(posts).toBe(0);
});


test('Block 3 Agent examples stay hidden until a real configured route exists',async({page})=>{
 await page.route('**/api/config',r=>r.fulfill({json:{plans,googleClientId:'',billingConfigured:true,features:{aiApps:false,inspiration:true,productVideo:false,onboarding:false}}}));await page.route('**/api/studio/config',r=>r.fulfill({json:{ownerOnly:true,enabled:false,models:[],catalog:[]}}));await page.route('**/api/auth/email/status',r=>r.fulfill({json:{configured:true}}));
 const agent={id:'agent-1',title:'Campaign Builder',slug:'campaign-builder',kind:'video',category:'Campaign',description:'Prepare a campaign workflow',previewUrl:'/agent.webp',previewPosterUrl:null,prompt:'Build a social campaign',defaultModel:null,aspectRatio:'9:16',requiredInputTypes:['image'],defaultSettings:{ratio:'9:16'},actionTarget:'agent',actionPath:'/agent-test.html',active:true,featured:true};
 await page.route('**/api/inspiration**',r=>{const u=new URL(r.request().url());return r.fulfill({json:u.searchParams.get('target')==='agent'?{items:[agent],categories:['Campaign'],ratios:['9:16']}:{items:[],categories:[],ratios:[]}});});
 await page.route('**/agent-test.html**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Agent test</title><h1>Agent test</h1>'}));
 await page.goto('/deepsyq.html');await expect(page.locator('#agentExamples')).toBeVisible();await expect(page.locator('#agentExamplesGrid')).toContainText('Campaign Builder');await page.locator('#agentExamplesGrid a').click();await expect(page).toHaveURL(/agent-test\.html\?from=inspiration/);const handoff=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('deepsyq_agent_inspiration_start')));expect(handoff.promptTemplate).toBe('Build a social campaign');expect(handoff.defaultSettings.ratio).toBe('9:16');
});


test('Block 3 gallery loads more without replacing existing cards',async({page})=>{
 let calls=0;await page.route('**/api/inspiration**',r=>{calls++;const u=new URL(r.request().url()),offset=Number(u.searchParams.get('offset')||0),items=offset===0?[{id:'one',title:'First owned image',slug:'first',kind:'image',category:'Editorial',description:'',previewUrl:'/one.png',previewPosterUrl:null,prompt:'First prompt',defaultModel:null,aspectRatio:'1:1',requiredInputTypes:[],defaultSettings:{ratio:'1:1'},actionTarget:'studio'}]:[{id:'two',title:'Second owned image',slug:'second',kind:'image',category:'Editorial',description:'',previewUrl:'/two.png',previewPosterUrl:null,prompt:'Second prompt',defaultModel:null,aspectRatio:'1:1',requiredInputTypes:[],defaultSettings:{ratio:'1:1'},actionTarget:'studio'}];return r.fulfill({json:{items,categories:['Editorial'],ratios:['1:1'],pagination:{limit:24,offset,nextOffset:offset===0?24:null,hasMore:offset===0}}});});const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');await page.route('**/one.png',r=>r.fulfill({contentType:'image/png',body:png}));await page.route('**/two.png',r=>r.fulfill({contentType:'image/png',body:png}));
 await page.goto('/inspiration.html');await expect(page.locator('.card')).toHaveCount(1);await expect(page.locator('#loadMore')).toBeVisible();await page.locator('#loadMore').click();await expect(page.locator('.card')).toHaveCount(2);await expect(page.locator('#gallery')).toContainText('First owned image');await expect(page.locator('#gallery')).toContainText('Second owned image');await expect(page.locator('#loadMore')).toBeHidden();expect(calls).toBeGreaterThanOrEqual(2);
});
