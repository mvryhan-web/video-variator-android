import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// Run on native Chromium ONLY via the dedicated workflow command; no skips.
// This is a REAL local FFmpeg.wasm encode and downloaded MP4, not mocked core.
test('A31 BASE27 actual local Gentle landscape MP4 export and download',async({page},info)=>{
 test.setTimeout(240000);
 const fixture=info.outputPath('a31-offline-source.mp4');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi',
  '-i','testsrc2=size=96x64:rate=12:duration=0.5','-an',
  '-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',fixture]);
 const paid=[];
 page.on('request',req=>{
  const path=new URL(req.url()).pathname;
  if(req.method()==='POST'&&/^\/api\/(?:studio\/jobs|ai-billing|billing\/checkout|stripe|generation)/.test(path))
   paid.push(path);
 });
 await page.goto('/index.html');
 await expect(page.locator('body.vu-reference')).toBeVisible();
 await page.locator('.vu-format-button[data-ratio="16:9"]').click();
 await expect(page.locator('#aspectRatio')).toHaveValue('16:9');
 const gentle=page.locator('.vu-mode-card[data-mode="gentle"]');
 await expect(gentle).toBeEnabled();
 await gentle.click();
 await expect(page.locator('#mode')).toHaveValue('gentle');
 const quality=page.locator('.vu-quality-button[data-quality="720"]');
 await expect(quality).toBeEnabled();
 await quality.click();
 await expect(page.locator('#quality')).toHaveValue('720');
 await page.locator('#vuVariantChoice').selectOption('1');
 await page.locator('#fileInput').setInputFiles(fixture);
 await expect(page.locator('#startBtn')).toBeEnabled();
 await page.locator('#startBtn').click();
 await expect(page.locator('#resultsCard')).toBeVisible({timeout:210000});
 await page.locator('.vu-history-button').click();
 const row=page.locator('#historyList .historyItem').first();
 await expect(row).toContainText('a31-offline-source_variant_1.mp4');
 const downloadEvent=page.waitForEvent('download',{timeout:30000});
 await row.getByRole('button',{name:/Download|Скачать|Télécharger/i}).click();
 const downloaded=await downloadEvent;
 expect(downloaded.suggestedFilename()).toMatch(/\.mp4$/);
 const out=await downloaded.path();
 const bytes=readFileSync(out);
 expect(bytes.length).toBeGreaterThan(1000);
 expect(bytes.subarray(4,8).toString('ascii')).toBe('ftyp');
 const probe=JSON.parse(execFileSync('ffprobe',
  ['-v','error','-show_entries','stream=codec_type,width,height:format=duration','-of','json',out],
  {encoding:'utf8'}));
 expect(probe.streams.some(s=>s.codec_type==='video'&&s.width===1280&&s.height===720)).toBe(true);
 expect(Number(probe.format.duration)).toBeGreaterThan(0);
 expect(paid).toEqual([]);
});
