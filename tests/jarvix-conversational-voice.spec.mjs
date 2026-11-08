import {test,expect} from '@playwright/test';

function shortSilentWav(){
 const samples=2400;const wav=Buffer.alloc(44+samples*2);
 wav.write('RIFF',0);wav.writeUInt32LE(36+samples*2,4);
 wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);
 wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
 wav.writeUInt32LE(24000,24);wav.writeUInt32LE(48000,28);
 wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
 wav.write('data',36);wav.writeUInt32LE(samples*2,40);
 return wav;
}
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  class FakeRecognition{
   constructor(){this.continuous=false;this.interimResults=false;this.lang='';this.started=false;window.__voiceStt=this;}
   start(){this.started=true;this.onstart?.();}
   abort(){this.started=false;this.onend?.();}
   stop(){this.started=false;this.onend?.();}
   emit(text){this.onresult?.({resultIndex:0,results:[{0:{transcript:text},isFinal:true}]});}
  }
  window.SpeechRecognition=FakeRecognition;
  window.webkitSpeechRecognition=FakeRecognition;
 });
 await page.route('**/api/studio/jobs*',r=>r.abort('blockedbyclient'));
 await page.route('**/api/jarvix/voice-config',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  configured:true,speechModelInstalled:true,engine:'VoxCPM2',languages:['ru','en','fr','es']})}));
 await page.route('**/api/jarvix/tts',r=>r.fulfill({status:200,contentType:'audio/wav',body:shortSilentWav()}));
});
for(const [size,name] of [[{width:1280,height:800},'desktop'],[{width:390,height:844},'mobile']]){
 test('F2 '+name+': distinct right-of-mic Voice Mode -> existing conversation -> natural language turns -> safe navigation',async({page})=>{
  await page.setViewportSize(size);
  let calls=0;
  await page.route('**/api/jarvix/chat',r=>{
   calls++;
   const body=JSON.parse(r.request().postData()||'{}');
   r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    ok:true,reply:body.message.includes('вторая')?'Это второй ответ, контекст сохранён.':'Я могу говорить на любые темы и помогать с DEEPSYQ.',provider:'mock-browser-fixture'
   })});
  });
  await page.goto('/jarvix-chat.html');
  await expect(page.locator('#jMic')).toBeVisible();
  await expect(page.locator('#jTalk')).toBeVisible();
  expect(await page.evaluate(()=>document.getElementById('jTalk').previousElementSibling?.id)).toBe('jMic');
  await expect(page.locator('#jTalk')).toHaveAttribute('aria-pressed','false');
  await page.click('#jTalk');
  await expect(page.locator('#jTalk')).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>window.__voiceStt.emit('Привет Джарвис'));
  await expect(page.locator('.j-message.user')).toContainText('Привет Джарвис');
  await expect(page.locator('.j-message.assistant')).toContainText('Я могу говорить на любые темы');
  await expect.poll(()=>calls).toBe(1);
  await expect(page.locator('#jTalk')).toHaveAttribute('data-voice-phase','listening',{timeout:10000});
  await page.evaluate(()=>window.__voiceStt.emit('Это вторая тема'));
  await expect(page.locator('.j-message.user')).toHaveCount(2);
  await expect(page.locator('.j-message.assistant').last()).toContainText('Это второй ответ');
  await expect.poll(()=>calls).toBe(2);
  await expect(page.locator('#jTalk')).toHaveAttribute('data-voice-phase','listening',{timeout:10000});
  await page.evaluate(()=>window.__voiceStt.emit('Открой видео студию'));
  await expect(page).toHaveURL(/generate-studio\.html\?studio=video/,{timeout:10000});
  expect(calls).toBe(2,'local allowlisted navigation must not incur an AI call');
 });
}
test('F2: voice Stop closes browser recognizer; old speech-dictation microphone remains',async({page})=>{
 await page.goto('/jarvix-chat.html');
 await page.click('#jTalk');
 await expect(page.locator('#jTalk')).toHaveAttribute('aria-pressed','true');
 await page.click('#jTalk');
 await expect(page.locator('#jTalk')).toHaveAttribute('aria-pressed','false');
 expect(await page.evaluate(()=>window.__voiceStt.started)).toBe(false);
 await page.click('#jMic');
 await expect(page.locator('#jMic')).toHaveAttribute('aria-pressed','true');
 await page.click('#jMic');
 await expect(page.locator('#jMic')).toHaveAttribute('aria-pressed','false');
});
