import {test,expect} from '@playwright/test';

test('portrait AI is the only local AI experiment exposed',async({page})=>{
 let modelRequests=0;page.on('request',r=>{if(/huggingface|hf\.co/.test(r.url()))modelRequests++;});
 await page.goto('/free-tools.html');
 await expect(page.getByText('Portrait cutout')).toBeVisible();
 await expect(page.getByText('Avatar Narrator')).toBeVisible();
 await expect(page.getByText('Auto captions')).toHaveCount(0);
 await expect(page.getByText('Video background')).toHaveCount(0);
 await page.goto('/ai-tools.html');
 await expect(page.getByRole('heading',{name:'Portrait Cutout'})).toBeVisible();
 await expect(page.locator('#aiExplanation')).toContainText('photos of people');
 await page.locator('#aiRun').click();
 await expect(page.locator('#aiStatus')).toContainText('Choose a photo');
 expect(modelRequests).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('invalid portrait recovers without sending user files',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.goto('/ai-tools.html');
 await page.locator('#aiFile').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('bad')});
 await page.locator('#aiRun').click();
 await expect(page.locator('#aiStatus')).toContainText('Could not finish');
 await expect(page.locator('#aiRun')).toBeEnabled();
 expect(posts).toBe(0);
});

test('dashboard metrics stay compact and plans keep prices plus 5 10 15 variants',async({page},info)=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.statsGrid .stat b').first()).toBeVisible();
 expect(await page.locator('.statsGrid .stat b').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeLessThanOrEqual(16);
 await page.screenshot({path:info.outputPath('dashboard-5.3.png'),fullPage:true});
 await page.locator('.navBtn[data-view="plans"]').evaluate(e=>e.click());
 await expect(page.locator('#plansView')).toHaveClass(/active/);
 for(const price of ['$9','$24','$99'])await expect(page.locator('#plansView').getByText(price,{exact:true})).toBeVisible();
 for(const name of ['Basic','Pro','Business'])await expect(page.locator('#plansView').getByText(name,{exact:true}).first()).toBeVisible();
 await expect(page.locator('#plansView')).toContainText('Up to 5 variations');
 await expect(page.locator('#plansView')).toContainText('Up to 10 variations');
 await expect(page.locator('#plansView')).toContainText('Up to 15 variations');
 await expect(page.locator('#plansView')).toContainText('Avatar Narrator');
 await page.screenshot({path:info.outputPath('pricing-5.3.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Avatar Narrator is plan-gated and requires user consent before generation',async({page})=>{
 await page.route('**/api/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{email:'test@example.com',usage:{plan:'basic',active:true,limit:750,used:0,remaining:750,unit:'credits'}}})}));
 await page.addInitScript(()=>localStorage.setItem('vv_token','test-token'));
 await page.goto('/avatar-studio.html');
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
 await expect(page.getByText(/free local version uses subtle avatar motion/i)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('real local portrait model produces a transparent PNG',async({page},info)=>{
 test.skip(info.project.name!=='chromium');test.setTimeout(300000);
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.goto('/ai-tools.html');
 const png=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=160;c.height=160;const x=c.getContext('2d');x.fillStyle='#b4dbea';x.fillRect(0,0,160,160);x.fillStyle='#edbc98';x.beginPath();x.arc(80,55,28,0,7);x.fill();x.fillStyle='#434877';x.fillRect(45,83,70,77);return Array.from(new Uint8Array(await(await new Promise(r=>c.toBlob(r))).arrayBuffer()));});
 await page.locator('#aiFile').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(png)});
 await page.locator('#aiRun').click();
 await expect(page.locator('#aiStatus')).toContainText(/Done\.|Could not finish/,{timeout:240000});
 await expect(page.locator('#aiStatus')).toContainText('Done.');
 const alpha=await page.locator('#aiResult img').evaluate(async img=>{await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);return {width:c.width,transparent:x.getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v<255)};});
 expect(alpha.width).toBe(160);expect(alpha.transparent).toBe(true);expect(posts).toBe(0);
});

test('native camera opens with the current prompt settings',async({page})=>{
 await page.addInitScript(()=>{window.AndroidBridge={openTeleprompter:(...args)=>window.cameraArgs=args};});
 await page.goto('/free-tools.html');await page.locator('#script').fill('Read this script');await page.locator('#cameraOpen').click();
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
