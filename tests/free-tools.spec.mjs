import {mockToolAccess} from './helpers/tool-access-fixture.mjs';
import {test,expect} from '@playwright/test';
test('batch photos are local, produce smaller files and do not consume credits',async({page})=>{
  await mockToolAccess(page);let uploads=0;page.on('request',r=>{if(r.method()==='POST'&&!new URL(r.url()).pathname.startsWith('/api/tools/'))uploads++;});
  await page.goto('/free-tools.html?tool=photo');
  const bytes=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=800;const x=c.getContext('2d');const d=x.createImageData(c.width,c.height);let seed=17;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return seed>>>24;};for(let i=0;i<d.data.length;i+=4){d.data[i]=next();d.data[i+1]=next();d.data[i+2]=next();d.data[i+3]=255;}x.putImageData(d,0,0);return Array.from(new Uint8Array(await(await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer()));});
  await page.locator('#files').setInputFiles(['one.png','two.png'].map(name=>({name,mimeType:'image/png',buffer:Buffer.from(bytes)})));
  await page.locator('#run').click();await expect(page.locator('#status')).toHaveText('Done');await expect(page.locator('#outputs article')).toHaveCount(2);
  const download=page.waitForEvent('download');await page.locator('#outputs button').first().click();const file=await download;expect(file.suggestedFilename()).toMatch(/-compressed\.jpg$/);const stream=await file.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);const saved=Buffer.concat(chunks);expect(saved.length).toBeLessThan(bytes.length);expect(saved.subarray(0,2).toString('hex')).toBe('ffd8');expect(uploads).toBe(0);
});
test('invalid image fails visibly; another valid input is still possible',async({page})=>{await page.goto('/free-tools.html?tool=photo');await page.locator('#files').setInputFiles({name:'broken.jpg',mimeType:'image/jpeg',buffer:Buffer.from('invalid')});await page.locator('#run').click();await expect(page.locator('#status')).toContainText('Could not process');await expect(page.locator('#run')).toBeEnabled();});
test('theme persists and camera teleprompter requires an explicit action',async({page})=>{await page.goto('/free-tools.html?tool=photo');await page.locator('.hub-appearance summary').click();await page.locator('#themeChoice').selectOption('light');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await page.locator('#hubBack').click();await page.locator('[data-hub-tool=prompter]').click();await page.locator('#script').fill('One line\n'.repeat(100));await expect(page.locator('#prompterText')).toContainText('One line');await expect(page.locator('#play')).toBeDisabled();await expect(page.locator('#cameraOpen')).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);});
test('real media extraction and compression create playable results',async({page},info)=>{
  test.skip(info.project.name!=='chromium');test.setTimeout(180000);await mockToolAccess(page);await page.goto('/free-tools.html?tool=photo');
  await page.addScriptTag({url:'/vendor/ffmpeg/ffmpeg.js'});
  const input=await page.evaluate(async()=>{const e=new FFmpegWASM.FFmpeg();const url=URL.createObjectURL(await(await fetch('/ffmpeg-worker.js')).blob());await e.load({classWorkerURL:url,coreURL:location.origin+'/vendor/ffmpeg/ffmpeg-core.js',wasmURL:location.origin+'/vendor/ffmpeg/ffmpeg-core.wasm'});const rc=await e.exec(['-f','lavfi','-i','color=c=blue:s=320x240:d=1','-f','lavfi','-i','sine=frequency=440:duration=1','-c:v','libx264','-c:a','aac','-shortest','test.mp4']);if(rc)throw Error('fixture');const b=await e.readFile('test.mp4');e.terminate();URL.revokeObjectURL(url);return Array.from(b);});
  for(const mode of ['audio','video']){await page.goto('/free-tools.html?tool='+mode);await page.locator('#files').setInputFiles({name:'test.mp4',mimeType:'video/mp4',buffer:Buffer.from(input)});await page.locator('#run').click();await expect(page.locator('#status')).toHaveText('Done',{timeout:120000});const media=page.locator('#outputs '+(mode==='audio'?'audio':'video'));await expect.poll(()=>media.evaluate(e=>Number.isFinite(e.duration)&&e.duration>0)).toBe(true);}
});


test('mobile tools hub has eight clear tasks, separate screens and working back navigation',async({page},info)=>{
 await page.goto('/free-tools.html');
 await expect(page.locator('[data-hub-tool]')).toHaveCount(8);
 await expect(page.locator('.selected-tool-panel')).toBeHidden();
 await expect(page.locator('.teleprompter-card')).toBeHidden();
 await expect(page.locator('.avatar-launch-card,.cp-cta')).toHaveCount(0);
 if(info.project.name.includes('mobile')){
  const boxes=await page.locator('[data-hub-tool]').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));
  expect(boxes[0].y).toBe(boxes[1].y);expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('free-tools-hub.png'),fullPage:true});
 await page.locator('[data-hub-tool=video]').click();await expect(page.locator('#files')).toHaveAttribute('accept','video/*');
 await expect(page.locator('#operation')).toBeHidden();await expect(page.locator('#run')).toBeHidden();
 await page.locator('#hubBack').click();await expect(page.locator('[data-hub-tool=photo]')).toBeVisible();
 await page.goBack();await expect(page.locator('#hubTitle')).toHaveText('Compress video');
 await page.goForward();await page.locator('[data-hub-tool=prompter]').click();
 await expect(page.locator('#cameraOpen')).toBeVisible();await expect(page.locator('#cameraStage')).toBeHidden();
 await page.locator('#hubBack').click();
 for(const mode of ['tts','stt']){
  await page.locator('[data-hub-tool='+mode+']').click();
  await expect(page.locator(mode==='tts'?'#speechText':'#transcribeFile')).toBeVisible();
  await expect(page.locator(mode==='tts'?'#transcribeFile':'#speechText')).toBeHidden();
  await page.goBack();
 }
});
