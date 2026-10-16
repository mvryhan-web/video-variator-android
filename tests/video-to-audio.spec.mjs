import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

function syntheticVideo(withSound){
 const dir=mkdtempSync(join(tmpdir(),'deepsyq-vta-'));
 try{
  const path=join(dir,'fixture.mp4');
  const args=['-hide_banner','-loglevel','error','-f','lavfi','-i',
   'color=c=blue:s=160x96:r=12'];
  if(withSound)args.push('-f','lavfi','-i','sine=frequency=440:sample_rate=16000');
  args.push('-t','2','-c:v','mpeg4','-q:v','10');
  if(withSound)args.push('-c:a','aac','-b:a','64k');
  else args.push('-an');
  args.push('-movflags','+faststart','-y',path);
  execFileSync('ffmpeg',args,{timeout:30000});
  return readFileSync(path);
 }finally{rmSync(dir,{recursive:true,force:true});}
}

test('Video to MP3 panel validates selection without calling providers',async({page})=>{
 let writes=0;
 page.on('request',r=>{if(r.method()==='POST')writes++;});
 await page.goto('/audio-studio.html');
 await expect(page.getByRole('heading',{name:'Video → MP3'})).toBeVisible();
 await expect(page.locator('#vtaGenerate')).toBeDisabled();
 await page.locator('#vtaFile').setInputFiles({name:'image.png',mimeType:'image/png',buffer:Buffer.from('PNG')});
 await expect(page.locator('#vtaGenerate')).toBeDisabled();
 await expect(page.locator('#vtaStatus')).toContainText('supported video');
 await page.locator('#vtaFile').setInputFiles({name:'my-video.mp4',mimeType:'video/mp4',buffer:Buffer.from('fake video')});
 await expect(page.locator('#vtaGenerate')).toBeEnabled();
 expect(writes).toBe(0);
});

test('real bundled FFmpeg.wasm converts actual MP4 with audio to a playable MP3 download',async({page})=>{
 test.setTimeout(120000);
 let writes=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\//.test(r.url()))writes++;});
 await page.goto('/audio-studio.html');
 await page.locator('#vtaFile').setInputFiles({name:'my-recording.mp4',mimeType:'video/mp4',buffer:syntheticVideo(true)});
 await page.locator('#vtaGenerate').click();
 await expect(page.locator('#vtaStatus')).toHaveText('MP3 ready. Play or save it below.',{timeout:105000});
 await expect(page.locator('#vtaResult audio')).toHaveCount(1);
 const next=page.waitForEvent('download');
 await page.locator('#vtaResult').getByRole('button',{name:'Download'}).click();
 const download=await next;
 expect(download.suggestedFilename()).toBe('Deepsyq-my-recording-audio.mp3');
 const bytes=readFileSync(await download.path());
 expect(bytes.length).toBeGreaterThan(1000);
 expect(bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0)).toBe(true);
 expect(writes).toBe(0);
});

test('MP4 with no audio track is rejected without empty downloadable media',async({page})=>{
 test.setTimeout(120000);
 await page.goto('/audio-studio.html');
 await page.locator('#vtaFile').setInputFiles({name:'silent.mp4',mimeType:'video/mp4',buffer:syntheticVideo(false)});
 await page.locator('#vtaGenerate').click();
 await expect(page.locator('#vtaStatus')).toHaveText('No supported audio track was found. Try another video.',{timeout:105000});
 await expect(page.locator('#vtaResult audio')).toHaveCount(0);
});

test('Russian Video to MP3 screen offers a localized conversion button',async({browser})=>{
 const context=await browser.newContext({locale:'ru-RU'});
 try{
  const page=await context.newPage();
  await page.goto('/audio-studio.html');
  await expect(page.getByRole('heading',{name:'Видео → MP3'})).toBeVisible();
  await expect(page.locator('#vtaGenerate')).toHaveText('Извлечь MP3');
 }finally{await context.close();}
});
