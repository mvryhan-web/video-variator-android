import {test,expect} from '@playwright/test';

test('Portrait Cutout is removed and Avatar Narrator remains exposed',async({page})=>{
 test.setTimeout(60000);
 await page.goto('/free-tools.html',{waitUntil:'domcontentloaded',timeout:45000});
 await expect(page.getByText('Portrait cutout')).toHaveCount(0);
 await expect(page.getByText('Avatar Narrator')).toBeVisible();
 await expect(page.locator('a[href*="ai-tools"]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('dashboard metrics stay compact and plans include Lifetime plus 5 10 15 variants',async({page},info)=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.statsGrid .stat b').first()).toBeVisible();
 expect(await page.locator('.statsGrid .stat b').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeLessThanOrEqual(16);
 await page.screenshot({path:info.outputPath('dashboard-5.3.png'),fullPage:true});
 await page.locator('.navBtn[data-view="plans"]').evaluate(e=>e.click());
 await expect(page.locator('#plansView')).toHaveClass(/active/);
 for(const price of ['$9','$24','$99','€2,999'])await expect(page.locator('#plansView').getByText(price,{exact:true})).toBeVisible();
 for(const name of ['Basic','Pro','Business','Lifetime'])await expect(page.locator('#plansView').getByText(name,{exact:true}).first()).toBeVisible();
 await expect(page.locator('.planBtn[data-plan="lifetime"]')).toHaveText('Get Lifetime');
 await expect(page.locator('.lifetimeCard')).toContainText('Unlimited');
 await expect(page.locator('.lifetimeCard')).toContainText(/future features included/i);
 await expect(page.locator('#plansView')).toContainText(/up to 5 variations/i);
 await expect(page.locator('#plansView')).toContainText(/up to 10 variations/i);
 await expect(page.locator('#plansView')).toContainText(/up to 15 variations/i);
 await expect(page.locator('#plansView')).toContainText('Avatar Narrator');
 await page.screenshot({path:info.outputPath('pricing-5.3.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Lifetime account is permanent unlimited and unlocks every current processing option',async({page},info)=>{
 test.skip(info.project.name!=='chromium');
 await page.route('**/api/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{email:'lifetime@example.com',usage:{plan:'lifetime',active:true,limit:2147483647,used:0,remaining:2147483647,unlimited:true,allFeatures:true,unit:'credits',status:'lifetime',currentPeriodEnd:null}}})}));
 await page.addInitScript(()=>localStorage.setItem('vv_token','lifetime-test-token'));
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#currentPlan')).toHaveText('Lifetime');
 await expect(page.locator('#creditText')).toHaveText('Unlimited');
 await expect(page.locator('#remainingCount')).toHaveText('∞');
 await expect(page.locator('#planStatus')).toHaveText('Permanent');
 await expect(page.locator('#planAccessHint')).toContainText('all current & future features');
 for(const value of ['gentle','balanced','dynamic'])await expect(page.locator('#mode option[value="'+value+'"]')).toBeEnabled();
 for(const value of ['720','1080','2160'])await expect(page.locator('#quality option[value="'+value+'"]')).toBeEnabled();
 await expect(page.locator('#variantCount option[value="15"]')).toBeEnabled();
 await expect(page.locator('#cancelSubscriptionBtn')).toBeDisabled();
 const cfg=await page.evaluate(()=>fetch('/api/config').then(r=>r.json()));
 expect(cfg.plans.lifetime).toMatchObject({price:2999,currency:'eur',unlimited:true,allFeatures:true,oneTime:true});
});


test('Avatar Narrator is plan-gated and requires user consent before generation',async({page})=>{
 test.setTimeout(60000);
 await page.route('**/api/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{email:'test@example.com',usage:{plan:'basic',active:true,limit:750,used:0,remaining:750,unit:'credits'}}})}));
 await page.addInitScript(()=>localStorage.setItem('vv_token','test-token'));
 await page.goto('/avatar-studio.html',{waitUntil:'domcontentloaded',timeout:45000});
 await expect(page.getByRole('heading',{name:'Avatar Narrator'})).toBeVisible();
 await expect(page.locator('#avatarPlan')).toContainText('Basic');
 await expect(page.locator('#avatarGenerate')).toBeDisabled();
 await page.locator('#avatarVideo').setInputFiles({name:'source.mp4',mimeType:'video/mp4',buffer:Buffer.from([0,1,2,3])});
 await page.locator('#avatarPhoto').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71])});
 await page.locator('#avatarAudio').setInputFiles({name:'voice.m4a',mimeType:'audio/mp4',buffer:Buffer.from([0,1,2,3])});
 await page.locator('#avatarText').fill('Explain what is happening in the source video.');
 await expect(page.locator('#avatarGenerate')).toBeDisabled();
 await page.locator('#voiceConsent').check();
 await expect(page.locator('#avatarGenerate')).toBeEnabled();
 await expect(page.locator('.motion-note')).toBeVisible();
 await expect(page.locator('.motion-note')).toContainText(/reacts to narration loudness|реагирует на громкость речи|réagit au volume de la narration|реагує на гучність мовлення/i);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('native camera opens with the current prompt settings',async({page})=>{
 await page.addInitScript(()=>{window.AndroidBridge={openTeleprompter:(...args)=>window.cameraArgs=args};});
 await page.goto('/free-tools.html',{waitUntil:'domcontentloaded'});await page.locator('#script').fill('Read this script');await page.locator('#cameraOpen').click();
 expect(await page.evaluate(()=>window.cameraArgs)).toEqual(['Read this script',30,36,false]);
});

test('browser camera records a playable local video and scrolls only during recording',async({browser},info)=>{
 test.skip(info.project.name!=='chromium');const context=await browser.newContext({permissions:['camera','microphone']});const page=await context.newPage();
 await page.goto('http://127.0.0.1:3000/free-tools.html');await page.locator('#script').fill('Hello from our studio.\n'.repeat(100));await page.locator('#cameraOpen').click();
 await expect(page.locator('#play')).toBeEnabled();await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect.poll(()=>page.locator('#prompter').evaluate(e=>e.scrollTop)).toBeGreaterThan(15);await page.locator('#play').click();await expect(page.locator('#cameraResults video')).toBeVisible();
 const d=page.waitForEvent('download');await page.locator('#cameraResults button').first().click();expect((await d).suggestedFilename()).toMatch(/VideoUniquifier-Prompter-.*\.(mp4|webm)/);
 await page.locator('#cameraClose').click();expect(await page.locator('#cameraPreview').evaluate(v=>v.srcObject)).toBe(null);await context.close();
});
