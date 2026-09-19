import {test,expect} from '@playwright/test';

async function openView(page,name){
  await page.locator(`.navBtn[data-view="${name}"]`).evaluate(el=>el.click());
  await expect(page.locator(`#${name}View`)).toHaveClass(/active/);
}

test.beforeEach(async({page})=>{
  await page.route(/accounts\.google\.com|appleid\.cdn-apple\.com|unpkg\.com/,route=>route.abort());
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page).toHaveTitle(/Video Uniquifier/);
});

test('loads rebranded dashboard with zero of two free trial videos',async({page})=>{
  await expect(page.getByRole('heading',{name:'Dashboard'})).toBeVisible();
  await expect(page.locator('#creditText')).toHaveText('0 / 2');
  await expect(page.getByText('Turn your old video into fresh new versions')).toBeVisible();
  await expect(page.getByText('One video. Many versions.')).toBeVisible();
  await expect(page.locator('#resultsCard')).toBeHidden();
  await expect(page.getByText('Video Uniquifier',{exact:true}).first()).toBeVisible();
});

test('loads FFmpeg wrapper from same-origin when external CDN is blocked',async({page})=>{
  await expect.poll(()=>page.evaluate(()=>!!window.FFmpegWASM?.FFmpeg),{timeout:10000}).toBe(true);
});

test('serves the FFmpeg core from same-origin',async({request})=>{
  for(const path of ['/vendor/ffmpeg/ffmpeg.js','/vendor/ffmpeg/ffmpeg-core.js','/vendor/ffmpeg/ffmpeg-core.wasm']){
    const response=await request.head(path);
    expect(response.status()).toBe(200);
  }
});

test('FFmpeg engine boots with the production worker',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium');
  test.setTimeout(120000);
  const ok=await page.evaluate(async()=>{
    const toBlobURL=async(url,type)=>{
      const r=await fetch(url);
      if(!r.ok)throw new Error(`HTTP ${r.status}: ${url}`);
      return URL.createObjectURL(new Blob([await r.arrayBuffer()],{type}));
    };
    const ffmpeg=new window.FFmpegWASM.FFmpeg();
    const classWorkerURL=await toBlobURL('/ffmpeg-worker.js','text/javascript');
    const origin=location.origin;
    const coreURL=`${origin}/vendor/ffmpeg/ffmpeg-core.js`;
    const wasmURL=`${origin}/vendor/ffmpeg/ffmpeg-core.wasm`;
    try{
      await ffmpeg.load({classWorkerURL,coreURL,wasmURL});
      return true;
    }finally{
      try{ffmpeg.terminate();}catch(_){ }
      URL.revokeObjectURL(classWorkerURL);
    }
  });
  expect(ok).toBe(true);
});

test('trial unlocks all modes plus 720p 1080p and 4K',async({page})=>{
  await expect(page.locator('#folderBtn')).toHaveCount(0);
  const mode=page.locator('#mode');
  await expect(mode).toBeEnabled();
  await expect(mode.locator('option[value="gentle"]')).not.toHaveAttribute('disabled','');
  await expect(mode.locator('option[value="balanced"]')).not.toHaveAttribute('disabled','');
  await expect(mode.locator('option[value="dynamic"]')).not.toHaveAttribute('disabled','');
  await mode.selectOption('balanced');
  await expect(mode).toHaveValue('balanced');
  await mode.selectOption('dynamic');
  await expect(mode).toHaveValue('dynamic');
  await mode.selectOption('gentle');
  await expect(mode).toHaveValue('gentle');

  const quality=page.locator('#quality');
  await expect(quality).toBeEnabled();
  await expect(quality.locator('option[value="720"]')).not.toHaveAttribute('disabled','');
  await expect(quality.locator('option[value="1080"]')).not.toHaveAttribute('disabled','');
  await expect(quality.locator('option[value="2160"]')).not.toHaveAttribute('disabled','');
  await quality.selectOption('1080');
  await expect(quality).toHaveValue('1080');
  await quality.selectOption('2160');
  await expect(quality).toHaveValue('2160');
  await quality.selectOption('720');
  await expect(quality).toHaveValue('720');

  await expect(page.locator('#variantCount option[value="10"]')).toHaveAttribute('disabled','');
  await expect(page.locator('#variantCount option[value="15"]')).toHaveAttribute('disabled','');
});

test('Pro unlocks 10 variations and Business unlocks 15',async({page})=>{
  await page.locator('#currentPlan').evaluate(el=>el.textContent='Pro');
  await expect(page.locator('#variantCount option[value="10"]')).not.toHaveAttribute('disabled','');
  await expect(page.locator('#variantCount option[value="15"]')).toHaveAttribute('disabled','');
  await page.locator('#currentPlan').evaluate(el=>el.textContent='Business');
  await expect(page.locator('#variantCount option[value="15"]')).not.toHaveAttribute('disabled','');
});

test('back button is available outside dashboard',async({page})=>{
  await openView(page,'history');
  await expect(page.locator('#backBtn')).toBeVisible();
  await page.locator('#backBtn').click();
  await expect(page.locator('#dashboardView')).toHaveClass(/active/);
});

test('pricing explains Basic Pro and Business in output terms',async({page})=>{
  await openView(page,'plans');
  const planNames=page.locator('#plansView .priceCard .planName');
  await expect(planNames.nth(0)).toHaveText('Basic');
  await expect(planNames.nth(1)).toHaveText('Pro');
  await expect(planNames.nth(2)).toHaveText('Business');
  await expect(page.getByText('750',{exact:true})).toBeVisible();
  await expect(page.getByText('2,250',{exact:true})).toBeVisible();
  await expect(page.getByText('15,000',{exact:true})).toBeVisible();
  await expect(page.getByText('≈ 50 × 15-sec outputs')).toBeVisible();
  await expect(page.getByText('≈ 150 × 15-sec outputs')).toBeVisible();
  await expect(page.getByText('≈ 1,000 × 15-sec outputs')).toBeVisible();
  const cards=page.locator('#plansView .priceCard');
  await expect(cards.nth(0).locator('.planBenefits')).toContainText('Local processing + automatic saving');
  await expect(cards.nth(1).locator('.planBenefits')).toContainText('Gentle + Balance processing modes');
  await expect(cards.nth(2).locator('.planBenefits')).toContainText('All processing modes + highest 4K quality');
  await expect(cards.nth(0).locator('.planUnit')).toHaveText('Gentle mode · Avatar Narrator included');
  await expect(cards.nth(1).locator('.planUnit')).toHaveText('More control · Avatar Narrator included');
  await expect(cards.nth(2).locator('.planUnit')).toHaveText('High-volume workflow · Avatar Narrator included');
  await expect(page.getByRole('button',{name:'Choose Basic'})).toBeVisible();
});

test('completed trial replaces creation controls with compact plan choices',async({page})=>{
  await page.evaluate(()=>localStorage.setItem('vv_trial_used','2'));
  await page.reload();
  await expect(page.locator('#trialCompleteUpsell')).toBeVisible();
  await expect(page.getByText('Free trial complete')).toBeVisible();
  await expect(page.locator('.trialPlanMini')).toHaveCount(3);
  await expect(page.locator('#startBtn')).toBeHidden();
  await page.locator('.trialPlanMini[data-plan="pro"]').click();
  await expect(page.locator('#plansView')).toHaveClass(/active/);
});

test('supports vertical and landscape output controls',async({page})=>{
  const format=page.locator('#aspectRatio');
  await expect(format).toBeVisible();
  await format.selectOption('16:9');
  await expect(format).toHaveValue('16:9');
  await format.selectOption('9:16');
  await expect(format).toHaveValue('9:16');
});

test('analytics profile product explanation and FAQ are reachable',async({page})=>{
  await openView(page,'analytics');
  await expect(page.locator('#analyticsView').getByRole('heading',{name:'Analytics'})).toBeVisible();
  await openView(page,'profile');
  await expect(page.locator('#profileView').getByRole('heading',{name:'Profile & Settings'})).toBeVisible();
  await expect(page.getByText('Privacy & security')).toBeVisible();
  await expect(page.getByRole('button',{name:'Cancel subscription'})).toBeVisible();
  await openView(page,'faq');
  await expect(page.getByText('One original can become many finished versions')).toBeVisible();
  await expect(page.getByText('What changes can Video Uniquifier make?')).toBeVisible();
  await expect(page.getByText('What is the difference between Basic, Pro and Business?')).toBeVisible();
  await expect(page.getByText('How do credits work?')).toBeVisible();
  await expect(page.getByText('What processing modes are included?')).toBeVisible();
  await expect(page.getByText('How is my data protected?')).toBeVisible();
});

test('mobile views do not create horizontal overflow',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'));
  for(const view of ['dashboard','history','analytics','profile','plans','faq']){
    if(view!=='dashboard')await openView(page,view);
    const sizes=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,viewport:window.innerWidth}));
    expect(sizes.doc).toBeLessThanOrEqual(sizes.viewport+1);
    expect(sizes.body).toBeLessThanOrEqual(sizes.viewport+1);
  }
});


test('processing state never shows the ready card at the same time',async({page})=>{
  const progress=page.locator('#progressCard');
  const results=page.locator('#resultsCard');
  await results.evaluate(el=>{el.hidden=false;});
  await expect(results).toBeVisible();
  await progress.evaluate(el=>{el.hidden=false;});
  await expect(progress).toBeVisible();
  await expect(results).toBeHidden();
});


test('primary navigation and non-destructive controls respond without client errors',async({page,request})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const view of ['history','analytics','plans','faq','profile','dashboard']){
    await openView(page,view);
    await expect(page.locator('#'+view+'View')).toHaveClass(/active/);
  }

  await page.locator('#signInBtn').click();
  await expect(page.locator('#authModal')).toBeVisible();
  await page.locator('.modalClose').click();
  await expect(page.locator('#authModal')).toBeHidden();

  await openView(page,'plans');
  for(const plan of ['basic','pro','business']){
    await page.locator('.planBtn[data-plan="'+plan+'"]').click();
    await expect(page.locator('#authModal')).toBeVisible();
    await page.locator('.modalClose').click();
  }

  await openView(page,'profile');
  await expect(page.locator('#manageBillingBtn')).toBeDisabled();
  await expect(page.locator('#cancelSubscriptionBtn')).toBeDisabled();
  await page.locator('#checkUpdateBtn').click();
  await expect(page.locator('#updateStatus')).not.toHaveText('');

  await openView(page,'history');
  await page.locator('#clearHistoryBtn').click();
  await expect(page.locator('#historyEmpty')).toBeVisible();

  const dimensions=await page.locator('button:visible').evaluateAll(btns=>btns.map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height,text:b.textContent.trim()})));
  for(const d of dimensions){expect(d.w, d.text).toBeGreaterThanOrEqual(32);expect(d.h, d.text).toBeGreaterThanOrEqual(32);}

  for(const path of ['/free-tools.html','/avatar-studio.html','/ai-tools.html']){
    const res=await request.get(path);expect(res.status(),path).toBe(200);
  }
  expect(errors).toEqual([]);
});

test('premium creator UI exposes clear trust and plan positioning',async({page})=>{
  await expect(page.locator('.heroTrust')).toBeVisible();
  await expect(page.locator('.heroTrust')).toContainText('Local processing');
  await expect(page.locator('.heroTrust')).toContainText('Private by design');
  await expect(page.locator('.heroTrust')).toContainText('Automatic saving');
  await expect(page.locator('.picker b')).toHaveText('Drop a video here or browse');
  await openView(page,'plans');
  await expect(page.locator('[data-plan-audience="basic"]')).toContainText('everyday creators');
  await expect(page.locator('[data-plan-audience="pro"]')).toContainText('growing creators');
  await expect(page.locator('[data-plan-audience="business"]')).toContainText('high-volume teams');
  const disabled=page.locator('#startBtn');
  await openView(page,'dashboard');
  await expect(disabled).toBeDisabled();
  const contrast=await disabled.evaluate(el=>({color:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
  expect(contrast.color).not.toBe(contrast.bg);
});


test('authenticated billing controls call the intended endpoints without client errors',async({page})=>{
  const errors=[];let checkoutCalls=0,portalCalls=0,cancelCalls=0;
  page.on('pageerror',e=>errors.push(e.message));
  const json=body=>({status:200,contentType:'application/json',body:JSON.stringify(body)});
  await page.route('**/api/config',route=>route.fulfill(json({
    googleClientId:'test-google',appleClientId:'test-apple',appleRedirectUri:'https://example.test/apple',
    billingConfigured:true,plans:{basic:{price:9,limit:750,unit:'credits'},pro:{price:24,limit:2250,unit:'credits'},business:{price:99,limit:15000,unit:'credits'}},
    privacy:{httpsRequired:true,localVideoProcessing:true,rawVideoUploadDisabled:true}
  })));
  await page.route('**/api/me',route=>route.fulfill(json({user:{id:'u1',email:'creator@example.com',name:'Creator',isAdmin:false,usage:{plan:'pro',limit:2250,used:120,remaining:2130,active:true,unlimited:false,unit:'credits',status:'active',currentPeriodEnd:null}}})));
  await page.route('**/api/analytics',route=>route.fulfill(json({analytics:{credits:120,outputs:8,seconds:120,successes:8,attempts:8,errors:0}})));
  await page.route('**/api/history',route=>route.fulfill(json({history:[]})));
  await page.route('**/api/billing/checkout',async route=>{checkoutCalls++;await route.fulfill(json({url:'http://127.0.0.1:3000/?checkout=pro'}));});
  await page.route('**/api/billing/portal',async route=>{portalCalls++;await route.fulfill(json({url:'http://127.0.0.1:3000/?portal=1'}));});
  await page.route('**/api/billing/cancel',async route=>{cancelCalls++;await route.fulfill(json({ok:true}));});
  await page.addInitScript(()=>localStorage.setItem('vv_token','test-token'));
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#currentPlan')).toHaveText('Pro');

  await openView(page,'plans');
  await page.locator('.planBtn[data-plan="pro"]').click();
  await expect(page).toHaveURL(/checkout=pro/);
  expect(checkoutCalls).toBe(1);

  await openView(page,'profile');
  await expect(page.locator('#manageBillingBtn')).toBeEnabled();
  await page.locator('#manageBillingBtn').click();
  await expect(page).toHaveURL(/portal=1/);
  expect(portalCalls).toBe(1);

  page.on('dialog',dialog=>dialog.accept());
  await openView(page,'profile');
  await page.locator('#cancelSubscriptionBtn').click();
  await expect.poll(()=>cancelCalls).toBe(1);

  await page.locator('#signInBtn').click();
  await expect(page.locator('#signInBtn')).toHaveText('Sign in');
  expect(await page.evaluate(()=>localStorage.getItem('vv_token'))).toBeNull();
  expect(errors).toEqual([]);
});


test('Avatar free test enables split-screen creation without recorded audio and previews selected device voice',async({page})=>{
  await page.addInitScript(()=>{
    window.__spoken=[];window.__speechCanceled=0;
    window.SpeechSynthesisUtterance=function(text){this.text=text;this.lang='';this.voice=null;this.onstart=null;this.onend=null;this.onerror=null;};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      onvoiceschanged:null,
      getVoices(){return[
        {name:'Test Voice One',lang:'en-US',default:true},
        {name:'Test Voice Two',lang:'en-GB',default:false}
      ];},
      cancel(){window.__speechCanceled++;},
      speak(utter){window.__spoken.push({text:utter.text,voice:utter.voice?.name||'',lang:utter.lang});utter.onstart?.();}
    }});
  });
  await page.goto('/avatar-studio.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#avatarPlan')).toContainText('Free test');
  await expect(page.locator('#avatarGenerate')).toBeDisabled();
  await expect(page.locator('#avatarStopSpeak')).toBeDisabled();

  await expect(page.locator('#avatarPreviewText')).toHaveCount(0);
  await page.locator('#avatarVoice').selectOption('1');
  await expect.poll(()=>page.evaluate(()=>window.__spoken.length)).toBe(1);
  expect((await page.evaluate(()=>window.__spoken[0])).voice).toBe('Test Voice Two');
  await expect(page.locator('#avatarSelectVoice')).not.toHaveClass(/selected/);
  await page.locator('#avatarSelectVoice').click();
  await expect(page.locator('#avatarSelectVoice')).toHaveClass(/selected/);
  await expect(page.locator('#voicePreviewStatus')).toContainText('Voice selected: Test Voice Two');
  await expect(page.locator('#avatarStopSpeak')).toBeEnabled();
  await page.locator('#avatarStopSpeak').click();
  await expect.poll(()=>page.evaluate(()=>window.__speechCanceled)).toBeGreaterThan(0);
  await expect(page.locator('#avatarStopSpeak')).toBeDisabled();

  await page.locator('#avatarText').fill('This is my avatar test.');
  await page.locator('#avatarSpeak').click();
  await expect.poll(()=>page.evaluate(()=>window.__spoken.at(-1)?.text)).toBe('This is my avatar test.');

  await page.locator('#avatarVideo').setInputFiles({name:'source.mp4',mimeType:'video/mp4',buffer:Buffer.from('video')});
  await page.locator('#avatarPhoto').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from('image')});
  await page.locator('#voiceConsent').check();
  await expect(page.locator('#avatarGenerate')).toBeEnabled();
  await expect(page.locator('#avatarReadyHint')).toContainText('Ready to create');
});
