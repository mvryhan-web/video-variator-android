import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

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

  for(const path of ['/free-tools.html','/avatar-studio.html']){
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


test('Avatar voice list auditions in place and Select closes the list',async({page})=>{
  await page.addInitScript(()=>{
    window.__spoken=[];window.__speechCanceled=0;
    window.SpeechSynthesisUtterance=function(text){this.text=text;this.lang='';this.voice=null;this.onstart=null;this.onend=null;this.onerror=null;};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      onvoiceschanged:null,
      getVoices(){return[
        {name:'Test Voice One',lang:'en-US',voiceURI:'one',default:true},
        {name:'Test Voice Two',lang:'en-GB',voiceURI:'two',default:false}
      ];},
      cancel(){window.__speechCanceled++;},
      speak(utter){window.__spoken.push({text:utter.text,voice:utter.voice?.name||'',lang:utter.lang});utter.onstart?.();}
    }});
  });
  await page.goto('/avatar-studio.html',{waitUntil:'domcontentloaded'});
  await page.locator('#voiceModeDevice').check();
  await expect(page.locator('#avatarSpeak')).toHaveCount(0);
  await expect(page.locator('#avatarStopSpeak')).toHaveCount(0);
  await expect(page.locator('#avatarSelectVoice')).toHaveCount(0);
  await page.locator('#voicePickerToggle').click();
  await expect(page.locator('#voicePickerMenu')).toBeVisible();
  await expect(page.locator('.voice-option')).toHaveCount(2);
  await page.locator('.voice-option').nth(1).locator('.voice-option-preview').click();
  await expect.poll(()=>page.evaluate(()=>window.__spoken.length)).toBe(1);
  expect((await page.evaluate(()=>window.__spoken[0])).voice).toBe('Test Voice Two');
  await expect(page.locator('#voicePickerMenu')).toBeVisible();
  await page.locator('.voice-option').nth(1).locator('.voice-option-select').click();
  await expect(page.locator('#voicePickerMenu')).toBeHidden();
  await expect(page.locator('#voicePickerLabel')).toContainText('Test Voice Two');
  await expect(page.locator('#voicePreviewStatus')).toContainText('Selected: Test Voice Two');
});

test('Avatar project restores files text consent and selected voice after reload',async({page})=>{
  await page.addInitScript(()=>{
    window.SpeechSynthesisUtterance=function(text){this.text=text;};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{onvoiceschanged:null,getVoices(){return[{name:'Saved Voice',lang:'en-US',voiceURI:'saved',default:true}];},cancel(){},speak(){}}});
    window.AndroidBridge={synthesizeTtsVoice(){return true;}};
  });
  await page.goto('/avatar-studio.html',{waitUntil:'domcontentloaded'});
  await page.locator('#avatarVideo').setInputFiles({name:'remember.mp4',mimeType:'video/mp4',buffer:Buffer.from('video-data')});
  await page.locator('#avatarPhoto').setInputFiles({name:'remember.png',mimeType:'image/png',buffer:Buffer.from('image-data')});
  await page.locator('#avatarText').fill('Remember this narration.');
  await page.locator('#voiceConsent').check();
  await page.locator('#voicePickerToggle').click();
  await page.locator('.voice-option-select').first().click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vu_avatar_draft_v2')||'{}').files?.video?.name)).toBe('remember.mp4');
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#avatarText')).toHaveValue('Remember this narration.');
  await expect(page.locator('#voiceConsent')).toBeChecked();
  await expect(page.locator('#avatarVideoSaved')).toContainText('remember.mp4');
  await expect(page.locator('#avatarPhotoSaved')).toContainText('remember.png');
  await expect(page.locator('#voicePickerLabel')).toContainText('Saved Voice');
  await expect(page.locator('#avatarGenerate')).toBeEnabled();
});

test('main History restores cached Avatar video actions after restart',async({page})=>{
  await page.evaluate(async()=>{
    const blob=new Blob(['avatar-video'],{type:'video/mp4'});
    await window.VUPersistentMedia.put('avatar/test/output',blob);
    localStorage.setItem('vv_history',JSON.stringify([{id:'avatar-test',name:'VideoUniquifier-Avatar-test.mp4',sourceName:'source.mp4',createdAt:new Date().toISOString(),resolution:'720×1280',aspectRatio:'9:16',credits:0,saved:true,type:'avatar',mediaCacheKey:'avatar/test/output'}]));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await openView(page,'history');
  const row=page.locator('.historyItem').filter({hasText:'VideoUniquifier-Avatar-test.mp4'});
  await expect(row).toContainText('Avatar Narrator');
  await expect(row.getByRole('button',{name:'Download'})).toBeVisible();
  await expect(row.getByRole('button',{name:'Share'})).toBeVisible();
});


test('Android native voice list opens, previews David Voice, and Select closes it',async({page})=>{
  await page.addInitScript(()=>{
    window.__nativeSpoken=[];
    window.AndroidBridge={
      getTtsVoices(){return JSON.stringify([
        {name:'David Voice',lang:'en-US',voiceURI:'David Voice',native:true},
        {name:'Samantha Voice',lang:'en-US',voiceURI:'Samantha Voice',native:true}
      ]);},
      speakTtsVoice(name,text){window.__nativeSpoken.push({name,text});return true;},
      stopTtsVoice(){window.__nativeStopped=(window.__nativeStopped||0)+1;}
    };
  });
  await page.goto('/avatar-studio.html',{waitUntil:'domcontentloaded'});
  await page.locator('#voiceModeDevice').check();
  await page.locator('#avatarText').fill('Native voice preview text');
  await page.locator('#voicePickerToggle').click();
  await expect(page.locator('#voicePickerMenu')).toBeVisible();
  await expect(page.locator('.voice-option')).toHaveCount(2);
  const david=page.locator('.voice-option').filter({hasText:'David Voice'});
  await david.locator('.voice-option-preview').click();
  await expect.poll(()=>page.evaluate(()=>window.__nativeSpoken.length)).toBe(1);
  expect((await page.evaluate(()=>window.__nativeSpoken[0])).name).toBe('David Voice');
  await expect(page.locator('#voicePickerMenu')).toBeVisible();
  await david.locator('.voice-option-select').click();
  await expect(page.locator('#voicePickerMenu')).toBeHidden();
  await expect(page.locator('#voicePickerLabel')).toContainText('David Voice');
});

test('Avatar Record voice requests microphone, records, and Stop stores the recording',async({page})=>{
  await page.addInitScript(()=>{
    const track={stop(){window.__trackStopped=true;}};
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[track]})}});
    class FakeMediaRecorder{
      static isTypeSupported(){return true;}
      constructor(stream,opts){this.stream=stream;this.mimeType=opts?.mimeType||'audio/webm';this.state='inactive';this.ondataavailable=null;this.onstop=null;this.onerror=null;}
      start(){this.state='recording';}
      stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['voice-data'],{type:'audio/webm'})});this.onstop?.();}
    }
    Object.defineProperty(window,'MediaRecorder',{configurable:true,value:FakeMediaRecorder});
  });
  await page.goto('/avatar-studio.html',{waitUntil:'domcontentloaded'});
  await page.locator('#voiceModeOwn').check();
  await page.locator('#recordVoice').click();
  await expect(page.locator('#recordVoice')).toBeDisabled();
  await expect(page.locator('#stopVoice')).toBeEnabled();
  await expect(page.locator('#voiceStatus')).toContainText(/Recording|Запись|Enregistrement|Запис/);
  await page.locator('#stopVoice').click();
  await expect(page.locator('#recordVoice')).toBeEnabled();
  await expect(page.locator('#stopVoice')).toBeDisabled();
  await expect(page.locator('#voiceStatus')).toContainText(/recorded|записан|enregistr|записано/i);
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vu_avatar_draft_v2')||'{}').files?.voice?.name||'')).toContain('VideoUniquifier-avatar-voice');
  expect(await page.evaluate(()=>window.__trackStopped)).toBe(true);
});

test('Avatar generation shows percentage, auto-downloads, and leaves a downloadable History item',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium');
  await page.addInitScript(()=>{
    class FastFFmpeg{
      constructor(){this.handlers={};}
      on(name,fn){this.handlers[name]=fn;}
      async load(){return true;}
      async writeFile(){return true;}
      async exec(){this.handlers.progress?.({progress:.25});this.handlers.progress?.({progress:.75});this.handlers.progress?.({progress:1});return 0;}
      async readFile(){return new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109]);}
      terminate(){}
    }
    window.FFmpegWASM={FFmpeg:FastFFmpeg};
  });
  const source=testInfo.outputPath('avatar-progress-source.mp4');
  execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=black:s=160x90:d=0.4','-f','lavfi','-i','sine=frequency=440:duration=0.4','-shortest','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',source],{stdio:'ignore'});
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR42mNk+M9Qz0AEYBxVSFUAAN4ABf4F0kwAAAAASUVORK5CYII=','base64');
  await page.goto('/avatar-studio.html',{waitUntil:'domcontentloaded'});
  await page.locator('#avatarVideo').setInputFiles({name:'source.mp4',mimeType:'video/mp4',buffer:readFileSync(source)});
  await page.locator('#avatarPhoto').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:png});
  await page.locator('#voiceModeOwn').check();
  await page.locator('#avatarAudio').setInputFiles({name:'voice.webm',mimeType:'audio/webm',buffer:Buffer.from('voice-data')});
  await page.locator('#avatarText').fill('Create a short test video.');
  await page.locator('#voiceConsent').check();
  await expect(page.locator('#avatarGenerate')).toBeEnabled();
  const downloadPromise=page.waitForEvent('download',{timeout:30000});
  await page.locator('#avatarGenerate').click();
  await expect(page.locator('#avatarProgress')).toBeVisible();
  await expect.poll(async()=>parseInt((await page.locator('#avatarProgressPercent').textContent())||'0',10),{timeout:15000}).toBeGreaterThan(0);
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^VideoUniquifier-Avatar-.*\.mp4$/);
  await expect(page.locator('#avatarProgressPercent')).toHaveText('100%',{timeout:15000});
  const latest=page.locator('#avatarHistory .avatar-history-row').first();
  await expect(latest).toContainText(/Ready|Готово|Prêt/);
  await expect(latest.getByRole('button',{name:/Download|Скачать|Télécharger|Завантажити/})).toBeVisible();
});


test('Avatar narration is either Device voice or My voice and narration text is last',async({page})=>{
  await page.goto('/avatar-studio.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#deviceVoicePanel')).toBeHidden();
  await expect(page.locator('#ownVoicePanel')).toBeHidden();
  await page.locator('#voiceModeDevice').check();
  await expect(page.locator('#voiceModeDevice')).toBeChecked();
  await expect(page.locator('#voiceModeOwn')).not.toBeChecked();
  await expect(page.locator('#deviceVoicePanel')).toBeVisible();
  await expect(page.locator('#ownVoicePanel')).toBeHidden();
  await page.locator('#voiceModeOwn').check();
  await expect(page.locator('#voiceModeOwn')).toBeChecked();
  await expect(page.locator('#voiceModeDevice')).not.toBeChecked();
  await expect(page.locator('#ownVoicePanel')).toBeVisible();
  await expect(page.locator('#deviceVoicePanel')).toBeHidden();
  const order=await page.evaluate(()=>({
    voice:document.querySelector('.voice-source-section').compareDocumentPosition(document.querySelector('.avatar-text-last')),
    text:document.querySelector('.avatar-text-last').compareDocumentPosition(document.querySelector('.consent-line'))
  }));
  expect(order.voice & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(order.text & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('selected Android device voice is synthesized into Avatar export audio',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium');
  await page.addInitScript(()=>{
    window.__avatarWrites={};
    window.AndroidBridge={
      getTtsVoices(){return JSON.stringify([{name:'David Voice',lang:'en-US',voiceURI:'David Voice',native:true}]);},
      speakTtsVoice(){return true;},stopTtsVoice(){},
      synthesizeTtsVoice(name,text,id){window.__tts={name,text,id};setTimeout(()=>window.vuNativeTtsReady?.(id,true),0);return true;},
      getTtsAudioSize(){return 4;},
      getTtsAudioChunk(){return btoa(String.fromCharCode(1,2,3,4));},
      releaseTtsAudio(){window.__ttsReleased=true;}
    };
    class FastFFmpeg{
      constructor(){this.handlers={};}
      on(name,fn){this.handlers[name]=fn;}
      async load(){return true;}
      async writeFile(name,data){window.__avatarWrites[name]=Array.from(data);return true;}
      async exec(){this.handlers.progress?.({progress:1});return 0;}
      async readFile(){return new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109]);}
      terminate(){}
    }
    window.FFmpegWASM={FFmpeg:FastFFmpeg};
  });
  const source=testInfo.outputPath('avatar-device-voice-source.mp4');
  execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=black:s=160x90:d=0.35','-c:v','libx264','-pix_fmt','yuv420p',source],{stdio:'ignore'});
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR42mNk+M9Qz0AEYBxVSFUAAN4ABf4F0kwAAAAASUVORK5CYII=','base64');
  await page.goto('/avatar-studio.html',{waitUntil:'domcontentloaded'});
  await page.locator('#avatarVideo').setInputFiles({name:'source.mp4',mimeType:'video/mp4',buffer:readFileSync(source)});
  await page.locator('#avatarPhoto').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:png});
  await page.locator('#voiceModeDevice').check();
  await page.locator('#avatarText').fill('This should be spoken by David.');
  await page.locator('#voicePickerToggle').click();
  await page.locator('.voice-option-select').first().click();
  await page.locator('#voiceConsent').check();
  await expect(page.locator('#avatarGenerate')).toBeEnabled();
  await page.locator('#avatarGenerate').click();
  await expect(page.locator('#avatarProgressPercent')).toHaveText('100%',{timeout:15000});
  expect(await page.evaluate(()=>window.__tts.name)).toBe('David Voice');
  expect(await page.evaluate(()=>window.__tts.text)).toContain('spoken by David');
  expect(await page.evaluate(()=>window.__avatarWrites.voice)).toEqual([1,2,3,4]);
  expect(await page.evaluate(()=>window.__ttsReleased)).toBe(true);
});

test('free trial keeps selected 1080p and 4K instead of forcing 720p at start',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#currentPlan')).toHaveText('Free trial');
  await expect(page.locator('#quality option[value="1080"]')).toBeEnabled();
  await page.locator('#quality').selectOption('1080');
  await page.evaluate(()=>window.VideoVariatorUI?.enforcePlanControls?.());
  await expect(page.locator('#quality')).toHaveValue('1080');
  await page.locator('#quality').selectOption('2160');
  await page.evaluate(()=>window.VideoVariatorUI?.enforcePlanControls?.());
  await expect(page.locator('#quality')).toHaveValue('2160');
});
