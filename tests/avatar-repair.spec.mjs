import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {buildAvatarFilter} from '../app/src/main/assets/avatar-motion.js';

test('avatar motion handles 240 changing speech segments without FFmpeg parser overflow',async({},info)=>{
 test.skip(info.project.name!=='chromium');
 const envelope={segments:Array.from({length:240},(_,i)=>({end:(i+1)/10,amp:i%2}))};
 execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=s=160x90:d=1','-f','lavfi','-i','testsrc2=s=160x120:d=1','-filter_complex',buildAvatarFilter({w:160,h:284,envelope}),'-map','[v]','-t','0.3','-f','null','-']);
});

test('Google avatar voices have working preview and selection, consent, sample text, cache and quota feedback',async({page},info)=>{
 const wav=info.outputPath('preview.wav');execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','sine=frequency=400:duration=0.4','-c:a','pcm_s16le',wav]);
 const requests=[];let limit=false;
 await page.addInitScript(()=>localStorage.setItem('vv_token','test-token'));
 await page.route('**/api/speech/config',r=>r.fulfill({json:{enabled:true}}));
 await page.route('**/api/speech',r=>{requests.push(r.request().postDataJSON());return limit?r.fulfill({status:429,json:{error:'FREE_SPEECH_LIMIT'}}):r.fulfill({contentType:'audio/wav',body:readFileSync(wav)});});
 await page.goto('/avatar-studio.html');await page.locator('#voiceModeGoogle').check();
 await expect(page.locator('#googleVoiceNotice')).toContainText('3 requests');
 await page.locator('#googlePreview').click();await expect(page.locator('#googleVoiceNotice')).toContainText('consent');expect(requests).toHaveLength(0);
 await page.locator('#googleTextConsent').check();await page.locator('#googleVoicePicker summary').click();
 await expect(page.locator('#googleVoiceOptions .voice-option')).toHaveCount(8);
 await page.getByRole('button',{name:'Play Charon',exact:true}).click();
 await expect(page.locator('#googleAudioPreview')).toBeVisible();await expect.poll(()=>page.locator('#googleAudioPreview').evaluate(a=>a.duration)).toBeGreaterThan(.2);
 expect(requests).toHaveLength(1);expect(requests[0]).toMatchObject({voice:'Charon',language:'en-US',consent:true});expect(requests[0].text.length).toBeGreaterThan(10);
 await page.locator('[data-voice="Charon"] .voice-option-select').click();await expect(page.locator('#googleVoice')).toHaveValue('Charon');
 await page.locator('#googlePreview').click();await expect(page.locator('#googleVoiceNotice')).toContainText(/Previewing|Preview ready/);expect(requests).toHaveLength(1);
 await page.locator('#googleStop').click();expect(await page.locator('#googleAudioPreview').evaluate(a=>a.paused)).toBe(true);
 limit=true;await page.getByRole('button',{name:'Play Puck',exact:true}).click();await expect(page.locator('#googleVoiceNotice')).toContainText('daily voice limit');
 await expect(page.locator('#voiceModeDevice')).toBeVisible();
 await page.reload();await page.locator('#voiceModeGoogle').check();await expect(page.locator('#googleVoice')).toHaveValue('Charon');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});

test('avatar quality is unlocked and persists for anonymous users',async({page})=>{
 await page.goto('/avatar-studio.html');
 for(const quality of ['720','1080','2160']){await page.locator('#avatarOutputQuality').selectOption(quality);await expect(page.locator('#avatarOutputQuality')).toHaveValue(quality);}
 await page.reload();await expect(page.locator('#avatarOutputQuality')).toHaveValue('2160');
 await expect(page.locator('.avatar-hero')).not.toContainText('Full quality in Basic');
});

test('real avatar WASM export completes with long changing narration and saves playable audio/video',async({page},info)=>{
 test.skip(info.project.name!=='chromium');test.setTimeout(180000);
 const source=info.outputPath('source.mp4'),photo=info.outputPath('portrait.png'),voice=info.outputPath('voice.wav');
 execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','testsrc2=size=160x90:rate=24:duration=0.6','-c:v','libx264','-pix_fmt','yuv420p',source]);
 execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','testsrc2=size=160x120','-frames:v','1',photo]);
 execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','aevalsrc=if(lt(mod(t\\,0.2)\\,0.1)\\,sin(2*PI*400*t)*0.4\\,0):s=16000:d=24','-c:a','pcm_s16le',voice]);
 await page.goto('/avatar-studio.html');
 await page.locator('#avatarVideo').setInputFiles(source);await page.locator('#avatarPhoto').setInputFiles(photo);await page.locator('#voiceModeOwn').check();await page.locator('#avatarAudio').setInputFiles(voice);await page.locator('#avatarText').fill('Long narration parser regression.');await page.locator('#voiceConsent').check();
 const download=page.waitForEvent('download',{timeout:150000});await page.locator('#avatarGenerate').click();
 await expect(page.locator('#avatarProgressPercent')).toHaveText('100%',{timeout:150000});
 const file=await download,metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',await file.path()],{encoding:'utf8'}));
 expect(metadata.streams.find(s=>s.codec_type==='video')).toMatchObject({width:720,height:1280,codec_name:'h264'});expect(metadata.streams.find(s=>s.codec_type==='audio').codec_name).toBe('aac');
 await page.reload();await expect(page.locator('#avatarHistory')).toContainText('Ready');await expect(page.locator('#avatarResult video')).toBeVisible();
});
