import {test,expect} from '@playwright/test';
test('batch photos are local, produce smaller files and do not consume credits',async({page})=>{
  let uploads=0;page.on('request',r=>{if(r.method()==='POST')uploads++;});
  await page.goto('/free-tools.html');
  const bytes=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=800;const x=c.getContext('2d');const d=x.createImageData(c.width,c.height);let seed=17;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return seed>>>24;};for(let i=0;i<d.data.length;i+=4){d.data[i]=next();d.data[i+1]=next();d.data[i+2]=next();d.data[i+3]=255;}x.putImageData(d,0,0);return Array.from(new Uint8Array(await(await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer()));});
  await page.locator('#files').setInputFiles(['one.png','two.png'].map(name=>({name,mimeType:'image/png',buffer:Buffer.from(bytes)})));
  await page.locator('#run').click();await expect(page.locator('#status')).toHaveText('Done');await expect(page.locator('#outputs article')).toHaveCount(2);
  const download=page.waitForEvent('download');await page.locator('#outputs button').first().click();const file=await download;expect(file.suggestedFilename()).toMatch(/-compressed\.jpg$/);const stream=await file.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);const saved=Buffer.concat(chunks);expect(saved.length).toBeLessThan(bytes.length);expect(saved.subarray(0,2).toString('hex')).toBe('ffd8');expect(uploads).toBe(0);
});
test('invalid image fails visibly; another valid input is still possible',async({page})=>{await page.goto('/free-tools.html');await page.locator('#files').setInputFiles({name:'broken.jpg',mimeType:'image/jpeg',buffer:Buffer.from('invalid')});await page.locator('#run').click();await expect(page.locator('#status')).toContainText('Could not process');await expect(page.locator('#run')).toBeEnabled();});
test('theme persists and camera teleprompter requires an explicit action',async({page})=>{await page.goto('/free-tools.html');await page.locator('#themeChoice').selectOption('light');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await page.locator('#script').fill('One line\n'.repeat(100));await expect(page.locator('#prompterText')).toContainText('One line');await expect(page.locator('#play')).toBeDisabled();await expect(page.locator('#cameraOpen')).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);});
test('real media extraction and compression create playable results',async({page},info)=>{
  test.skip(info.project.name!=='chromium');test.setTimeout(180000);await page.goto('/free-tools.html');
  await page.addScriptTag({url:'/vendor/ffmpeg/ffmpeg.js'});
  const input=await page.evaluate(async()=>{const e=new FFmpegWASM.FFmpeg();const url=URL.createObjectURL(await(await fetch('/ffmpeg-worker.js')).blob());await e.load({classWorkerURL:url,coreURL:location.origin+'/vendor/ffmpeg/ffmpeg-core.js',wasmURL:location.origin+'/vendor/ffmpeg/ffmpeg-core.wasm'});const rc=await e.exec(['-f','lavfi','-i','color=c=blue:s=320x240:d=1','-f','lavfi','-i','sine=frequency=440:duration=1','-c:v','libx264','-c:a','aac','-shortest','test.mp4']);if(rc)throw Error('fixture');const b=await e.readFile('test.mp4');e.terminate();URL.revokeObjectURL(url);return Array.from(b);});
  for(const mode of ['audio','video']){await page.locator('#operation').selectOption(mode);await page.locator('#files').setInputFiles({name:'test.mp4',mimeType:'video/mp4',buffer:Buffer.from(input)});await page.locator('#run').click();await expect(page.locator('#status')).toHaveText('Done',{timeout:120000});const media=page.locator('#outputs '+(mode==='audio'?'audio':'video'));await expect.poll(()=>media.evaluate(e=>Number.isFinite(e.duration)&&e.duration>0)).toBe(true);}
});


test('Free Tools presents Avatar then Photo Video Audio and keeps Speed on the right on mobile',async({page},testInfo)=>{
  await page.goto('/free-tools.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.avatar-launch-card')).toBeVisible();
  const order=await page.locator('.quick-tool-item').evaluateAll(items=>items.map(x=>x.getAttribute('data-mode-card')));
  expect(order).toEqual(['photo','video','audio']);
  await expect(page.locator('.quick-tool-item').nth(0)).toContainText(/Photo|Фото/);
  await expect(page.locator('.quick-tool-item').nth(1)).toContainText(/Video|Видео|Vidéo/);
  await expect(page.locator('.quick-tool-item').nth(2)).toContainText(/Audio|Аудио/);
  await page.locator('[data-tool="video"]').evaluate(el=>el.click());
  await expect(page.locator('#operation')).toHaveValue('video');
  await expect(page.locator('#files')).toHaveAttribute('accept','video/*');
  const compact=await page.locator('.compact-actions button').evaluateAll(btns=>btns.map(b=>({w:b.getBoundingClientRect().width,viewport:innerWidth})));
  for(const b of compact)expect(b.w).toBeLessThan(b.viewport*.8);
  if(testInfo.project.name.includes('mobile')){
    const pos=await page.evaluate(()=>({font:document.querySelector('.font-setting').getBoundingClientRect().left,speed:document.querySelector('.speed-setting').getBoundingClientRect().left}));
    expect(pos.speed).toBeGreaterThan(pos.font);
  }
});
