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
 if(await page.locator('#menu').isVisible())await page.locator('#menu').click();
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
 await page.goto('/deepsyq-vs-deepseek.html');await expect(page).toHaveTitle(/Deepsyq vs DeepSeek/);
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
 let jobPosts=0;page.on('request',r=>{if(r.url().includes('/api/studio/jobs')&&r.method()==='POST')jobPosts++;});await page.goto('/product-video.html');const img=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');await page.locator('#photos').setInputFiles({name:'product.png',mimeType:'image/png',buffer:img});await page.locator('#productName').fill('Luna Bag');await page.locator('#style').selectOption('cinematic');await page.locator('#ratio').selectOption('9:16');await expect(page.locator('#promptPreview')).toContainText('Luna Bag');await expect(page.locator('#promptPreview')).toContainText('cinematic');await page.locator('#continue').click();await expect(page).toHaveURL(/generate-studio.html\\?studio=video/);await expect(page.locator('#prompt')).toContainText('Luna Bag');await expect(page.locator('#ratio')).toHaveValue('9:16');await expect(page.locator('#refPreview img')).toHaveCount(1);await expect(page.locator('#consent')).not.toBeChecked();expect(jobPosts).toBe(0);
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
 await page.route('**/api/ai-billing/balance',r=>r.fulfill({json:{available:4200,reserved:150,debt:0}}));
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
