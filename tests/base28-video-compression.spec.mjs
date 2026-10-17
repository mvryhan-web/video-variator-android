import {test,expect} from '@playwright/test';

const localEngineMock=[
 'export async function createEngine(){',
 ' return {',
 '  async writeFile(name,bytes){window.__ffmpegSpy.input={name,size:bytes.byteLength};},',
 '  async exec(args){window.__ffmpegSpy.args=args;return 0;},',
 '  async readFile(name){window.__ffmpegSpy.outputName=name;return new Uint8Array(window.__ffmpegSpy.outputSize??200);},',
 '  terminate(){window.__ffmpegSpy.terminated=true;}',
 ' };',
 '}',
 'export function saveLocal(){}',
 'export function subtitleFiles(){return [];}'
].join('\n');

test('BASE #28: video compression uses existing local FFmpeg and real size comparison',async({page})=>{
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.route('**/ai-media.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:localEngineMock}));
 await page.goto('/free-tools.html');
 const tile=page.locator('#mobileUtilityGrid a[data-utility="video-compress"]');
 await expect(tile).toHaveCount(1);
 await tile.click();
 await expect(page).toHaveURL(/mobile-utility\.html\?tool=video-compress$/);
 await expect(page.locator('#utilityTitle')).toContainText('Compress video');
 const quality=page.locator('#videoCompressQuality');
 await expect(quality).toBeVisible();
 await expect(quality).toHaveValue('balanced');
 await expect(page.locator('#startLine')).toBeHidden();
 await expect(page.locator('#endLine')).toBeHidden();
 await expect(page.locator('#utilityHelp')).toContainText('not guaranteed');
 await page.evaluate(()=>{window.__ffmpegSpy={outputSize:200};});
 await page.locator('#utilityFiles').setInputFiles({
  name:'personal.mp4',mimeType:'video/mp4',buffer:Buffer.alloc(1000,12)
 });
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityResults')).toContainText('personal-compressed.mp4');
 await expect(page.locator('.utility-size-note')).toContainText('Saved 80%');
 await expect(page.locator('#utilityRun')).toBeEnabled();
 const spy=await page.evaluate(()=>window.__ffmpegSpy);
 expect(spy.input).toEqual({name:'input',size:1000});
 expect(spy.outputName).toBe('compressed.mp4');
 expect(spy.args.slice(0,6)).toEqual(['-i','input','-map','0:v:0','-map','0:a:0?']);
 expect(spy.args[spy.args.indexOf('-crf')+1]).toBe('27');
 expect(spy.terminated).toBe(true);
 expect(posts).toBe(0);
});

test('BASE #28: high-quality mode cannot promise a size reduction if output grows',async({page})=>{
 await page.route('**/ai-media.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:localEngineMock}));
 await page.goto('/mobile-utility.html?tool=video-compress');
 await page.locator('#videoCompressQuality').selectOption('quality');
 await page.evaluate(()=>{window.__ffmpegSpy={outputSize:1500};});
 await page.locator('#utilityFiles').setInputFiles({
  name:'demo.webm',mimeType:'video/webm',buffer:Buffer.alloc(1000,8)
 });
 await page.locator('#utilityRun').click();
 await expect(page.locator('.utility-size-note')).toContainText('not smaller');
 const args=await page.evaluate(()=>window.__ffmpegSpy.args);
 expect(args[args.indexOf('-crf')+1]).toBe('23');
 expect(args[args.indexOf('-b:a')+1]).toBe('160k');
});

test('BASE #28: zero-byte video is rejected without initializing FFmpeg or uploading',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.route('**/ai-media.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:localEngineMock}));
 await page.goto('/mobile-utility.html?tool=video-compress');
 await page.locator('#utilityFiles').setInputFiles({
  name:'empty.mp4',mimeType:'video/mp4',buffer:Buffer.alloc(0)
 });
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityStatus')).toContainText('non-empty video');
 await expect(page.locator('#utilityResults')).toBeEmpty();
 expect(posts).toBe(0);
});

test('BASE #28: empty codec output reports failure and must not offer a bogus 100% saved download',async({page})=>{
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.route('**/ai-media.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:localEngineMock}));
 await page.goto('/mobile-utility.html?tool=video-compress');
 await page.evaluate(()=>{window.__ffmpegSpy={outputSize:0};});
 await page.locator('#utilityFiles').setInputFiles({
  name:'broken.mp4',mimeType:'video/mp4',buffer:Buffer.alloc(1000,1)
 });
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityStatus')).toContainText('video codec produced no output');
 await expect(page.locator('#utilityResults')).toBeEmpty();
 await expect(page.locator('#utilityRun')).toBeEnabled();
 const spy=await page.evaluate(()=>window.__ffmpegSpy);
 expect(spy.terminated).toBe(true);
 expect(posts).toBe(0);
});

test('BASE #28: non-video file is rejected before allocating local FFmpeg memory',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.route('**/ai-media.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:localEngineMock}));
 await page.goto('/mobile-utility.html?tool=video-compress');
 await page.evaluate(()=>{window.__ffmpegSpy={};});
 await page.locator('#utilityFiles').setInputFiles({name:'not-video.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4')});
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityStatus')).toContainText('Choose a video file');
 await expect(page.locator('#utilityResults')).toBeEmpty();
 const spy=await page.evaluate(()=>window.__ffmpegSpy);
 expect(spy.input).toBeUndefined();
 expect(spy.args).toBeUndefined();
 expect(posts).toBe(0);
});
