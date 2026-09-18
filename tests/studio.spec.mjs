import {test,expect} from '@playwright/test';
import {subtitleFiles} from '../app/src/main/assets/ai-media.js';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

test('subtitle timestamps clamp the final cue and escape preview markup',()=>{
 const s=subtitleFiles([{timestamp:[0,1.25],text:'Hello <world>'},{timestamp:[1.25,null],text:'Final cue'}],2);
 expect(s.srt).toContain('00:00:01,250 --> 00:00:02,000');expect(s.vtt).toContain('Hello &lt;world>');expect(s.srt).toContain('Hello <world>');
});
test('AI tools disclose limits, load models only on request and fit mobile',async({page})=>{
 let modelRequests=0;page.on('request',r=>{if(/huggingface|hf\.co/.test(r.url()))modelRequests++;});
 await page.goto('/ai-tools.html');await expect(page.locator('#aiExplanation')).toContainText('photos of people');await page.locator('#aiRun').click();await expect(page.locator('#aiStatus')).toContainText('Choose a file');
 await page.locator('#aiTool').selectOption('subtitles');await expect(page.locator('#aiLanguageLabel')).toBeVisible();await expect(page.locator('#aiExplanation')).toContainText('not burned');
 await page.locator('#aiTool').selectOption('video');await expect(page.locator('#aiColorLabel')).toBeVisible();await expect(page.locator('#aiExplanation')).toContainText('first 3 seconds');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(modelRequests).toBe(0);
});
test('invalid portrait recovers without sending user files',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});await page.goto('/ai-tools.html');await page.locator('#aiFile').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('bad')});await page.locator('#aiRun').click();await expect(page.locator('#aiStatus')).toContainText('Could not finish');await expect(page.locator('#aiRun')).toBeEnabled();expect(posts).toBe(0);
});
test('dashboard metrics are compact and pricing fits without changing prices',async({page},info)=>{
 await page.goto('/');await expect(page.locator('.statsGrid .stat b').first()).toBeVisible();expect(await page.locator('.statsGrid .stat b').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeLessThanOrEqual(16);
 await page.screenshot({path:info.outputPath('dashboard.png'),fullPage:true});await page.locator('.navBtn[data-view="plans"]').evaluate(e=>e.click());await expect(page.locator('#plansView')).toHaveClass(/active/);await page.screenshot({path:info.outputPath('pricing.png'),fullPage:true});for(const price of ['$9','$24','$99'])await expect(page.locator('#plansView').getByText(price,{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('real local models produce a transparent PNG, captions and a playable background video',async({page},info)=>{
 test.skip(info.project.name!=='chromium');test.setTimeout(600000);let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log(m.text());});
 await page.goto('/ai-tools.html');
 const png=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=160;c.height=160;const x=c.getContext('2d');x.fillStyle='#b4dbea';x.fillRect(0,0,160,160);x.fillStyle='#edbc98';x.beginPath();x.arc(80,55,28,0,7);x.fill();x.fillStyle='#434877';x.fillRect(45,83,70,77);return Array.from(new Uint8Array(await(await new Promise(r=>c.toBlob(r))).arrayBuffer()));});
 await page.locator('#aiFile').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(png)});await page.locator('#aiRun').click();await expect(page.locator('#aiStatus')).toContainText(/Done\.|Could not finish/,{timeout:240000});await expect(page.locator('#aiStatus')).toContainText('Done.');
 const alpha=await page.locator('#aiResult img').evaluate(async img=>{await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);return {width:c.width,transparent:x.getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v<255)};});expect(alpha.width).toBe(160);expect(alpha.transparent).toBe(true);
 const wav=info.outputPath('speech.wav');execFileSync('espeak-ng',['-w',wav,'Hello. This is a video. Welcome to our studio.']);
 await page.locator('#aiTool').selectOption('subtitles');await page.locator('#aiLanguage').selectOption('english');await page.locator('#aiFile').setInputFiles({name:'speech.wav',mimeType:'audio/wav',buffer:readFileSync(wav)});await page.locator('#aiRun').click();await expect(page.locator('#aiStatus')).toContainText(/Done\.|Could not finish/,{timeout:240000});await expect(page.locator('#aiStatus')).toContainText('Done.');await expect(page.locator('#aiResult textarea')).toHaveValue(/hello|video|studio/i);
 const mp4=info.outputPath('video.mp4');execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=blue:s=160x160:d=0.6','-f','lavfi','-i','sine=frequency=440:duration=0.6','-c:v','libx264','-c:a','aac','-shortest',mp4],{stdio:'ignore'});
 await page.locator('#aiTool').selectOption('video');await page.locator('#aiFile').setInputFiles({name:'video.mp4',mimeType:'video/mp4',buffer:readFileSync(mp4)});await page.locator('#aiRun').click();await expect(page.locator('#aiStatus')).toContainText(/Done\.|Could not finish/,{timeout:120000});await expect(page.locator('#aiStatus')).toContainText('Done.');await expect.poll(()=>page.locator('#aiResult video').evaluate(v=>v.duration)).toBeGreaterThan(0);expect(posts).toBe(0);
});

test('native camera opens with the current prompt settings',async({page})=>{await page.addInitScript(()=>{window.AndroidBridge={openTeleprompter:(...args)=>window.cameraArgs=args};});await page.goto('/free-tools.html');await page.locator('#script').fill('Read this script');await page.locator('#cameraOpen').click();expect(await page.evaluate(()=>window.cameraArgs)).toEqual(['Read this script',30,36,false]);});
test('browser camera records a playable local video and scrolls only during recording',async({browser},info)=>{
 test.skip(info.project.name!=='chromium');const context=await browser.newContext({permissions:['camera','microphone']});const page=await context.newPage();await page.goto('http://127.0.0.1:3000/free-tools.html');await page.locator('#script').fill('Hello from our studio.\n'.repeat(100));await page.locator('#cameraOpen').click();await expect(page.locator('#play')).toBeEnabled();await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await expect.poll(()=>page.locator('#prompter').evaluate(e=>e.scrollTop)).toBeGreaterThan(15);await page.locator('#play').click();await expect(page.locator('#cameraResults video')).toBeVisible();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');const d=page.waitForEvent('download');await page.locator('#cameraResults button').first().click();expect((await d).suggestedFilename()).toMatch(/VideoUniquifier-Prompter-.*\.(mp4|webm)/);await page.locator('#cameraClose').click();expect(await page.locator('#cameraPreview').evaluate(v=>v.srcObject)).toBe(null);await context.close();
});
