import {test,expect} from '@playwright/test';

async function setup(page,options,postedTarget=null){
 await page.addInitScript(()=>{
  localStorage.setItem('vv_token','new-user-test');
  localStorage.setItem('deepsyq_onboarding_pending','1');
 });
 await page.route('**/api/config',r=>r.fulfill({json:{googleClientId:'',billingConfigured:false,
  plans:{},features:{aiApps:false,inspiration:false,onboarding:true}}}));
 await page.route('**/api/me',r=>r.fulfill({json:{user:{id:'new-user',name:'New user',isAdmin:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{ownerOnly:true,enabled:false,models:[],catalog:[]}}));
 await page.route('**/api/auth/email/status',r=>r.fulfill({json:{configured:false}}));
 const submitted=[];
 await page.route('**/api/onboarding',r=>{
  if(r.request().method()==='POST'){
   const goal=r.request().postDataJSON().goal;submitted.push(goal);
   return r.fulfill({json:{ok:true,goal,target:postedTarget||options.find(x=>x.id===goal)?.target}});
  }
  return r.fulfill({json:{completed:false,options}});
 });
 return submitted;
}

test('BASE 45: without D schema migration, new account sees only approved Image/Video',async({page})=>{
 const sent=await setup(page,[{id:'image',target:'/generate-studio.html?studio=image'},
  {id:'video',target:'/generate-studio.html?studio=video'}]);
 let paidPosts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))paidPosts++;});
 await page.goto('/deepsyq.html');
 await expect(page.locator('#onboardingModal')).toBeVisible();
 await expect(page.locator('[data-onboarding-goal]')).toHaveCount(2);
 await expect(page.locator('[data-onboarding-goal=avatar]')).toHaveCount(0);
 await page.locator('[data-onboarding-goal=image]').click();
 await expect(page).toHaveURL(/generate-studio.html\?studio=image/);
 expect(sent).toEqual(['image']);expect(paidPosts).toBe(0);
});

test('BASE 45: backend-authorized Avatar can route to existing workflow without a paid job',async({page})=>{
 const options=[{id:'image',target:'/generate-studio.html?studio=image'},
  {id:'video',target:'/generate-studio.html?studio=video'},
  {id:'avatar',target:'/avatar-studio.html'}];
 const sent=await setup(page,options);
 let paidPosts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))paidPosts++;});
 await page.goto('/deepsyq.html');
 await expect(page.locator('[data-onboarding-goal]')).toHaveCount(3);
 await expect(page.locator('[data-onboarding-goal=product_ads]')).toHaveCount(0);
 await page.locator('[data-onboarding-goal=avatar]').click();
 await expect(page).toHaveURL(/avatar-studio.html/);
 expect(sent).toEqual(['avatar']);expect(paidPosts).toBe(0);
});

test('BASE 45: unsafe server redirect cannot leave this origin or clear pending setup',async({page})=>{
 const sent=await setup(page,[{id:'image',target:'/generate-studio.html?studio=image'}],
  'https://attacker.example/collect');
 await page.goto('/deepsyq.html');
 await expect(page.locator('#onboardingModal')).toBeVisible();
 await page.locator('[data-onboarding-goal=image]').click();
 await expect(page.locator('#onboardingStatus')).toContainText('Could not save your choice');
 await expect(page).toHaveURL(/deepsyq.html/);
 expect(await page.evaluate(()=>localStorage.getItem('deepsyq_onboarding_pending'))).toBe('1');
 expect(sent).toEqual(['image']);
});

test('BASE 45: cancelled product goal remains hidden even if the backend offers it',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('vv_token','new-user-test');
  localStorage.setItem('deepsyq_onboarding_pending','1');
 });
 await page.route('**/api/config',r=>r.fulfill({json:{googleClientId:'',plans:{},
  features:{inspiration:false,aiApps:false,onboarding:true}}}));
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'New user',isAdmin:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{ownerOnly:true,enabled:false,models:[]}}));
 await page.route('**/api/onboarding',r=>r.fulfill({json:{completed:false,options:[
  {id:'image',target:'/generate-studio.html?studio=image'},
  {id:'product_ads',target:'/product-video.html'}
 ]}}));
 await page.goto('/deepsyq.html');
 await expect(page.locator('#onboardingModal')).toBeVisible();
 await expect(page.locator('[data-onboarding-goal=image]')).toHaveCount(1);
 await expect(page.locator('[data-onboarding-goal=product_ads]')).toHaveCount(0);
});

test('BASE 45: old account onboarding GET cannot open the new account modal',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('vv_token','account-A');
  localStorage.setItem('deepsyq_onboarding_pending','1');
 });
 await page.route('**/api/config',r=>r.fulfill({json:{googleClientId:'',plans:{},
  features:{inspiration:false,aiApps:false,onboarding:true}}}));
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Account A',isAdmin:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{ownerOnly:true,enabled:false,models:[]}}));
 let start,release,finished;
 const seen=new Promise(resolve=>start=resolve),hold=new Promise(resolve=>release=resolve);
 const done=new Promise(resolve=>finished=resolve);
 await page.route('**/api/onboarding',async route=>{
  start();await hold;
  try{await route.fulfill({json:{completed:false,options:[{id:'image',target:'/generate-studio.html?studio=image'}]}});}catch(_){}
  finished();
 });
 await page.goto('/deepsyq.html',{waitUntil:'commit'});
 await seen;
 await page.evaluate(()=>localStorage.setItem('vv_token','account-B'));
 release();await done;
 await expect(page.locator('#onboardingModal')).toBeHidden();
 await expect(page.locator('[data-onboarding-goal]')).toHaveCount(2); // static placeholders never displayed
 expect(await page.evaluate(()=>localStorage.getItem('deepsyq_onboarding_pending'))).toBe('1');
});

test('BASE 45: switching accounts while onboarding POST is pending cannot redirect or clear setup',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('vv_token','account-A');
  localStorage.setItem('deepsyq_onboarding_pending','1');
 });
 await page.route('**/api/config',r=>r.fulfill({json:{googleClientId:'',plans:{},
  features:{inspiration:false,aiApps:false,onboarding:true}}}));
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Account A',isAdmin:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{ownerOnly:true,enabled:false,models:[]}}));
 let start,release,finished;
 const seen=new Promise(resolve=>start=resolve),hold=new Promise(resolve=>release=resolve);
 const done=new Promise(resolve=>finished=resolve);
 await page.route('**/api/onboarding',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{completed:false,
   options:[{id:'image',target:'/generate-studio.html?studio=image'}]}});
  start();await hold;
  try{await route.fulfill({json:{ok:true,goal:'image',target:'/generate-studio.html?studio=image'}});}catch(_){}
  finished();
 });
 await page.goto('/deepsyq.html');
 await expect(page.locator('#onboardingModal')).toBeVisible();
 await page.locator('[data-onboarding-goal=image]').click();
 await seen;
 await page.evaluate(()=>localStorage.setItem('vv_token','account-B'));
 release();await done;
 await expect(page.locator('#onboardingModal')).toBeHidden();
 await expect(page).toHaveURL(/deepsyq.html/);
 expect(await page.evaluate(()=>localStorage.getItem('deepsyq_onboarding_pending'))).toBe('1');
});


for(const ownerCase of ['same owner','silently switched account']){
 test('BASE 45: dismiss onboarding for '+ownerCase+' preserves only the correct pending marker',async({page})=>{
  await setup(page,[{id:'image',target:'/generate-studio.html?studio=image'}]);
  await page.goto('/deepsyq.html');
  await expect(page.locator('#onboardingModal')).toBeVisible();
  if(ownerCase==='silently switched account')
   await page.evaluate(()=>localStorage.setItem('vv_token','second-account-B'));
  await page.locator('#onboardingLater').click();
  await expect(page.locator('#onboardingModal')).toBeHidden();
  const marker=await page.evaluate(()=>localStorage.getItem('deepsyq_onboarding_pending'));
  expect(marker).toBe(ownerCase==='same owner'?null:'1');
 });
}
test('BASE 45: late failed onboarding POST cannot show old-user errors or consume new-user setup',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('vv_token','new-user-test');
  localStorage.setItem('deepsyq_onboarding_pending','1');
 });
 await page.route('**/api/config',r=>r.fulfill({json:{plans:{},googleClientId:'',
  features:{onboarding:true,aiApps:false,inspiration:false}}}));
 await page.route('**/api/me',r=>r.fulfill({json:{user:{name:'Original user',isAdmin:false}}}));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{ownerOnly:true,enabled:false,models:[]}}));
 let seen,release,finished;
 const started=new Promise(resolve=>seen=resolve),hold=new Promise(resolve=>release=resolve),done=new Promise(resolve=>finished=resolve);
 await page.route('**/api/onboarding',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{completed:false,options:[
   {id:'image',target:'/generate-studio.html?studio=image'}]}});
  seen();await hold;
  try{await route.fulfill({status:503,json:{error:'ONBOARDING_UNAVAILABLE'}});}catch(_){}
  finished();
 });
 await page.goto('/deepsyq.html');
 await expect(page.locator('#onboardingModal')).toBeVisible();
 await page.locator('[data-onboarding-goal=image]').click({noWaitAfter:true});
 await started;
 await page.evaluate(()=>localStorage.setItem('vv_token','new-account-B'));
 release();await done;
 await expect(page.locator('#onboardingModal')).toBeHidden();
 await expect(page.locator('#onboardingStatus')).not.toContainText('Could not save your choice');
 expect(await page.evaluate(()=>localStorage.getItem('deepsyq_onboarding_pending'))).toBe('1');
 expect(new URL(page.url()).pathname).toBe('/deepsyq.html');
});


for(const operation of ['click previous option','focus previous modal','keyboard previous option','return to tab']){
 test('BASE 45: silent account switch must scrub stale modal before '+operation,async({page})=>{
  const posted=await setup(page,[{id:'image',target:'/generate-studio.html?studio=image'}]);
  await page.goto('/deepsyq.html');
  await expect(page.locator('#onboardingModal')).toBeVisible();
  await page.evaluate(()=>localStorage.setItem('vv_token','other-session-account-B'));
  if(operation==='click previous option')
   await page.locator('[data-onboarding-goal=image]').evaluate(el=>
    el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));
  else if(operation==='focus previous modal')
   await page.locator('#onboardingLater').evaluate(el=>
    el.dispatchEvent(new FocusEvent('focusin',{bubbles:true,cancelable:true})));
  else if(operation==='keyboard previous option')
   await page.locator('[data-onboarding-goal=image]').evaluate(el=>
    el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));
  else await page.evaluate(()=>dispatchEvent(new Event('focus')));
  await expect(page.locator('#onboardingModal')).toBeHidden();
  expect(await page.evaluate(()=>localStorage.getItem('deepsyq_onboarding_pending'))).toBe('1');
  expect(posted).toEqual([]);
  expect(new URL(page.url()).pathname).toBe('/deepsyq.html');
 });
}
