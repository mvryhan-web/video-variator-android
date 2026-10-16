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
