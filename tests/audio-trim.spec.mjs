import {test,expect} from '@playwright/test';

test('audio trimmer is visible and works in-browser without server audio upload or credits',async({page})=>{
 let networkUploads=0;
 page.on('request',r=>{if(r.method()==='POST'&&(/api\/studio|api\/speech|upload/.test(r.url())))networkUploads++;});
 await page.addInitScript(()=>{
  window.FFmpegWASM={FFmpeg:class {
   async load(){}
   async writeFile(name,bytes){this.input={name,length:bytes.length};}
   async exec(args){this.args=args;return 0;}
   async readFile(){return new Uint8Array([73,68,51,3,0,0,0,0,0]);}
   terminate(){}
  }};
 });
 await page.goto('/audio-studio.html');
 await expect(page.getByRole('heading',{name:'Audio Trimmer'})).toBeVisible();
 await expect(page.locator('#trimGenerate')).toBeDisabled();
 await page.locator('#trimFile').setInputFiles({name:'fixture.wav',mimeType:'audio/wav',buffer:Buffer.from('RIFF-not-audio-test')});
 await page.locator('#trimStart').fill('1');
 await page.locator('#trimEnd').fill('3');
 await expect(page.locator('#trimGenerate')).toBeEnabled();
 await page.locator('#trimGenerate').click();
 await expect(page.locator('#trimStatus')).toHaveText('Done. Review the result before using it.');
 await expect(page.locator('#trimResult audio')).toHaveCount(1);
 const downloaded=page.waitForEvent('download');
 await page.locator('#trimResult').getByRole('button',{name:'Download'}).click();
 expect((await downloaded).suggestedFilename()).toBe('Deepsyq-fixture-trimmed.mp3');
 expect(networkUploads).toBe(0);
});

test('Russian audio trimmer validates range before doing any encoding',async({browser})=>{
 const context=await browser.newContext({locale:'ru-RU'});
 const page=await context.newPage();
 await page.goto('/audio-studio.html');
 await expect(page.getByRole('heading',{name:'Обрезать аудио'})).toBeVisible();
 await page.locator('#trimFile').setInputFiles({name:'short.wav',mimeType:'audio/wav',buffer:Buffer.from('RIFF-test')});
 await page.locator('#trimStart').fill('5');
 await page.locator('#trimEnd').fill('3');
 await expect(page.locator('#trimGenerate')).toBeDisabled();
 await context.close();
});

function syntheticWav(){
 const samples=8000*3,bytes=Buffer.alloc(44+samples*2);
 bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVE',8);
 bytes.write('fmt ',12);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);
 bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(8000,24);bytes.writeUInt32LE(16000,28);
 bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);
 bytes.write('data',36);bytes.writeUInt32LE(samples*2,40);
 for(let i=0;i<samples;i++)bytes.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/8000)*8000),44+i*2);
 return bytes;
}
test('real bundled FFmpeg.wasm trims synthetic WAV into a valid downloadable MP3 without API calls',async({page})=>{
 test.setTimeout(120000);
 let calls=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(speech|studio|generation)/.test(r.url()))calls++;});
 await page.goto('/audio-studio.html');
 await page.locator('#trimFile').setInputFiles({name:'sine-wave.wav',mimeType:'audio/wav',buffer:syntheticWav()});
 await page.locator('#trimStart').fill('0.5');
 await page.locator('#trimEnd').fill('1.5');
 await page.locator('#trimGenerate').click();
 await expect(page.locator('#trimStatus')).toHaveText('Done. Review the result before using it.',{timeout:110000});
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#trimResult').getByRole('button',{name:'Download'}).click();
 const file=await downloadPromise;
 expect(file.suggestedFilename()).toBe('Deepsyq-sine-wave-trimmed.mp3');
 const {readFile}=await import('node:fs/promises');
 const bytes=await readFile(await file.path());
 expect(bytes.length).toBeGreaterThan(1024);
 expect(bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0)).toBe(true);
 expect(calls).toBe(0);
});
