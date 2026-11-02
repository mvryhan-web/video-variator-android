import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {buildAvatarFilter,envelopeFromSamples} from '../app/src/main/assets/avatar-motion.js';

test('100-video trial preserves the two videos already used',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_trial_used','2'));
 await page.goto('/');await expect(page.locator('#creditText')).toHaveText('2 / 100');await expect(page.locator('#remainingCount')).toHaveText('98');
});
test('delete a saved Avatar removes result and job blobs, persists after reload, and cancel retains it',async({page})=>{
 await page.goto('/avatar-studio.html');
 await page.evaluate(async()=>{const job={id:'delete-fixture',status:'done',createdAt:new Date().toISOString(),sourceKey:'delete-fixture/source',photoKey:'delete-fixture/photo',voiceKey:'delete-fixture/voice',outputKey:'delete-fixture/output',outputName:'delete-fixture.mp4'};for(const key of [job.sourceKey,job.photoKey,job.voiceKey,job.outputKey])await window.VUPersistentMedia.put(key,new Blob(['fixture'],{type:'video/mp4'}));localStorage.setItem('vu_avatar_jobs_v2',JSON.stringify([job]));localStorage.setItem('vv_history',JSON.stringify([{id:job.id,name:job.outputName,mediaCacheKey:job.outputKey}]));});
 await page.reload();await expect(page.locator('#avatarHistory .delete-result')).toBeVisible();
 page.once('dialog',d=>d.dismiss());await page.locator('#avatarHistory .delete-result').click();await expect(page.locator('#avatarHistory .avatar-history-row')).toHaveCount(1);
 page.once('dialog',d=>d.accept());await page.locator('#avatarHistory .delete-result').click();await expect(page.locator('#avatarHistory .avatar-history-row')).toHaveCount(0);
 await page.reload();await expect(page.locator('#avatarHistory .avatar-history-row')).toHaveCount(0);
 expect(await page.evaluate(async()=>({blob:!!await window.VUPersistentMedia.get('delete-fixture/output'),source:!!await window.VUPersistentMedia.get('delete-fixture/source'),history:JSON.parse(localStorage.getItem('vv_history'))}))).toEqual({blob:false,source:false,history:[]});
});
test('audio workspace disables unconfigured Google voices and supports editable text download/delete',async({page})=>{
 await page.goto('/audio-studio.html');await expect(page.locator('#speechAvailability')).toContainText('owner setup');await expect(page.locator('#speechGenerate')).toBeDisabled();
 await expect(page.locator('#speechVoice option')).toHaveCount(8);await expect(page.locator('#speechLanguage option[value="en-US"]')).toHaveCount(1);
 await page.locator('#transcript').fill('My editable narration.');await expect(page.locator('#saveText')).toBeEnabled();
 const download=page.waitForEvent('download');await page.locator('#saveText').click();expect((await download).suggestedFilename()).toBe('VideoUniquifier-transcript.txt');
 await page.locator('#clearText').click();await expect(page.locator('#transcript')).toHaveValue('');await expect(page.locator('#saveText')).toBeDisabled();
 await page.locator('#transcribeStart').click();await expect(page.locator('#transcribeStatus')).toContainText('Choose a file');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
test('local avatar has measurable portrait motion with steady speech and stops during silence',async({},info)=>{
 test.skip(info.project.name!=='chromium');const voice=Float32Array.from({length:32000},(_,i)=>i<16000?Math.sin(i*.2)*.2:0),envelope=envelopeFromSamples(voice);expect(envelope.segments.some(s=>s.amp>.5)).toBe(true);expect(envelope.segments.at(-1).amp).toBe(0);
 const filter=buildAvatarFilter({w:160,h:284,envelope,mouth:{x:50,y:62,width:28}}),out=info.outputPath('moving-avatar.mp4'),portrait=info.outputPath('still-portrait.png');
 execFileSync('ffmpeg',['-y','-f','lavfi','-i','testsrc2=size=160x120','-frames:v','1',portrait],{stdio:'ignore'});
 execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=black:size=160x90:rate=24:duration=2','-loop','1','-framerate','24','-i',portrait,'-filter_complex',filter,'-map','[v]','-t','2','-c:v','libx264','-crf','0','-pix_fmt','yuv420p',out],{stdio:'ignore'});
 const frame=t=>execFileSync('ffmpeg',['-v','error','-ss',String(t),'-i',out,'-frames:v','1','-vf','crop=160:120:0:164','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);
 expect(Buffer.compare(frame(.1),frame(.65))).not.toBe(0);expect(Buffer.compare(frame(1.4),frame(1.8))).toBe(0);
});
test('real local MP3 and video transcription without uploading media',async({page},info)=>{
 test.skip(info.project.name!=='chromium');test.setTimeout(300000);
 const wav=info.outputPath('speech.wav'),mp3=info.outputPath('speech.mp3'),video=info.outputPath('speech.mp4');
 execFileSync('espeak-ng',['-v','en-us','-s','140','-w',wav,'Hello, welcome to the video studio. This is a test of speech recognition.']);
 execFileSync('ffmpeg',['-y','-i',wav,'-c:a','libmp3lame',mp3],{stdio:'ignore'});
 execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=blue:size=160x90:rate=15','-i',wav,'-shortest','-c:v','libx264','-c:a','aac',video],{stdio:'ignore'});
 const posts=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await page.goto('/audio-studio.html');await page.locator('#transcribeLanguage').selectOption('en');
 for(const [name,type,path] of [['speech.mp3','audio/mpeg',mp3],['speech.mp4','video/mp4',video]]){
  await page.locator('#transcribeFile').setInputFiles({name,mimeType:type,buffer:readFileSync(path)});await page.locator('#transcribeStart').click();await expect(page.locator('#transcript')).toHaveValue(/welcome|studio|recognition/i,{timeout:240000});
  await expect(page.locator('#transcribeStart')).toBeEnabled();await page.locator('#clearText').click();
 }
 expect(posts).toEqual([]);
});

test('text narration uses explicit consent and exports a real MP3 with working download, share and delete',async({page},info)=>{
 test.skip(info.project.name!=='chromium');test.setTimeout(120000);
 const wav=info.outputPath('tts-fixture.wav');execFileSync('ffmpeg',['-y','-f','lavfi','-i','sine=frequency=400:sample_rate=24000:duration=1','-c:a','pcm_s16le',wav],{stdio:'ignore'});
 let submitted;
 await page.addInitScript(()=>{localStorage.setItem('vv_token','test-only-token');window.sharedFiles=[];Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async x=>{window.sharedFiles.push(x.files[0].name);}});});
 await page.route('**/api/speech/config',r=>r.fulfill({json:{enabled:true}}));
 await page.route('**/api/speech',r=>{submitted=r.request().postDataJSON();return r.fulfill({contentType:'audio/wav',body:readFileSync(wav)});});
 await page.goto('/audio-studio.html');await page.locator('#speechText').fill('Hello, this is my narration.');await expect(page.locator('#speechGenerate')).toBeDisabled();await page.locator('#speechConsent').check();await page.locator('#speechGenerate').click();
 await expect(page.locator('#speechResult audio')).toBeVisible({timeout:90000});await expect.poll(()=>page.locator('#speechResult audio').evaluate(a=>a.duration)).toBeGreaterThan(.9);
 expect(submitted).toEqual({text:'Hello, this is my narration.',voice:'Kore',language:'en-US',consent:true});
 const wait=page.waitForEvent('download');await page.locator('#speechResult').getByRole('button',{name:'Download MP3',exact:true}).click();const download=await wait;expect(download.suggestedFilename()).toMatch(/\.mp3$/);
 const codec=execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=codec_name','-of','default=nw=1:nk=1',await download.path()],{encoding:'utf8'}).trim();expect(codec).toBe('mp3');
 await page.locator('#speechResult').getByRole('button',{name:'Share',exact:true}).click();expect(await page.evaluate(()=>window.sharedFiles)).toEqual(['VideoUniquifier-voice.mp3']);
 await page.locator('#speechResult').getByRole('button',{name:'Delete',exact:true}).click();await expect(page.locator('#speechResult audio')).toHaveCount(0);
});
