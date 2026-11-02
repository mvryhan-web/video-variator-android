import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function fixture(page){
 const values=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=120;c.height=80;
  const x=c.getContext('2d');x.fillStyle='#e02020';x.fillRect(0,0,c.width,c.height);
  const b=await new Promise(ok=>c.toBlob(ok,'image/png'));
  return Array.from(new Uint8Array(await b.arrayBuffer()));
 });
 return Buffer.from(values);
}

test('BASE #28: real Photo to PDF creates a downloadable PDF entirely within Tools',async({page})=>{
 let rawUploads=0;
 page.on('request',r=>{if(r.method()==='POST')rawUploads++;});
 await page.goto('/free-tools.html');
 await expect(page.locator('[data-utility="scan-pdf"]')).toHaveAttribute('href','mobile-utility.html?tool=scan-pdf');
 await page.locator('[data-utility="scan-pdf"]').click();
 await expect(page).toHaveURL(/mobile-utility\.html\?tool=scan-pdf$/);
 await page.locator('#utilityFiles').setInputFiles({name:'owner-photo.png',mimeType:'image/png',buffer:await fixture(page)});
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityResults .utility-result')).toContainText('scanned-documents.pdf');
 const next=page.waitForEvent('download');
 await page.locator('#utilityResults .utility-result button').click();
 const downloaded=await next,bytes=await readFile(await downloaded.path());
 expect(downloaded.suggestedFilename()).toBe('scanned-documents.pdf');
 expect(bytes.subarray(0,5).toString()).toBe('%PDF-');
 expect(bytes.length).toBeGreaterThan(100);
 expect(rawUploads).toBe(0);
});

test('BASE #28: opaque sensitive-data mask permanently changes downloaded image pixels',async({page},info)=>{
 test.skip(info.project.name.includes('mobile-'),'Precise pointer drag contract is desktop only; device acceptance remains separate');
 let rawUploads=0;page.on('request',r=>{if(r.method()==='POST')rawUploads++;});
 await page.goto('/mobile-utility.html?tool=photo-redact');
 await page.locator('#utilityFiles').setInputFiles({name:'private.png',mimeType:'image/png',buffer:await fixture(page)});
 const canvas=page.locator('#redactCanvas');
 await expect.poll(()=>canvas.evaluate(c=>c.width===120&&c.height===80&&c.getContext('2d').getImageData(2,2,1,1).data[0]===224)).toBe(true);
 const b=await canvas.boundingBox();
 await page.mouse.move(b.x+b.width*.2,b.y+b.height*.2);
 await page.mouse.down();
 await page.mouse.move(b.x+b.width*.7,b.y+b.height*.7,{steps:7});
 await page.mouse.up();
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityResults .utility-result')).toContainText('private-redacted.png');
 const next=page.waitForEvent('download');
 await page.locator('#utilityResults .utility-result button').click();
 const output=await next,bytes=await readFile(await output.path());
 expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 const samples=await page.evaluate(async array=>{
  const img=new Image();const u=URL.createObjectURL(new Blob([new Uint8Array(array)],{type:'image/png'}));
  try{
   img.src=u;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
   const x=c.getContext('2d');x.drawImage(img,0,0);
   return {blocked:[...x.getImageData(50,40,1,1).data],clear:[...x.getImageData(4,4,1,1).data]};
  }finally{URL.revokeObjectURL(u);}
 },Array.from(bytes));
 expect(samples.blocked).toEqual([0,0,0,255]);
 expect(samples.clear).toEqual([224,32,32,255]);
 expect(rawUploads).toBe(0);
});


test('BASE #28: all eleven original utility types remain reachable in secondary Tools',async({page})=>{
 let providerWrites=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|speech|ai-wallet|billing)/.test(new URL(r.url()).pathname))providerWrites++;});
 await page.goto('/free-tools.html');
 const selectors={
  photoToPdf:'#mobileUtilityGrid [data-utility="scan-pdf"]',
  collage:'#mobileUtilityGrid [data-utility="photo-collage"]',
  hideDetails:'#mobileUtilityGrid [data-utility="photo-redact"]',
  videoToAudio:'#etGallery .et-card[href="?tool=audio"]',
  audioTrimmer:'#mobileUtilityGrid [data-utility="audio-trim"]',
  photoCompression:'#etGallery .et-card[href="?tool=photo"]',
  videoCompression:'#etGallery .et-card[href="?tool=video"]',
  backgroundRemover:'.utility-tools-preview a.et-owner-bg-banner[href="simple-background-remover.html"]',
  teleprompter:'#etGallery .et-card[href="?tool=prompter"]',
  ocr:'#mobileUtilityGrid [data-utility="photo-ocr"]',
  textToAudio:'[data-hub-tool="tts"]'
 };
 for(const [key,selector] of Object.entries(selectors)){
  await expect(page.locator(selector),key).toHaveCount(1);
  await expect(page.locator(selector),key).toBeVisible();
 }
 await expect(page.locator(selectors.textToAudio)).toHaveAttribute('href','audio-studio.html?tool=tts');
 await expect(page.locator(selectors.backgroundRemover)).toContainText('Simple Background Remover');
 // Follow the real approved visible card, not the intentionally hidden legacy hub tile.
 await page.locator(selectors.videoToAudio).click();
 await expect(page).toHaveURL(/free-tools\.html\?tool=audio$/);
 await expect(page.locator('#files')).toBeVisible();
 await expect(page.locator('#operation')).toHaveValue('audio');
 await page.locator('#hubBack').click();
 await expect(page.locator('#etShowcase')).toBeVisible();
 expect(providerWrites).toBe(0);
});

test('BASE #28: unavailable owner Google TTS remains clearly gated, never makes provider POST',async({page})=>{
 let writes=0;
 page.on('request',r=>{if(r.method()==='POST'&&/\/api\/speech/.test(new URL(r.url()).pathname))writes++;});
 await page.route('**/api/speech/config',r=>r.fulfill({json:{enabled:false,reason:'OWNER_SETUP_REQUIRED'}}));
 await page.goto('/audio-studio.html?tool=tts');
 await expect(page.locator('#speechAvailability')).toContainText('waiting for owner setup');
 await page.locator('#speechText').fill('One sentence for a speech sample');
 await page.locator('#speechConsent').check();
 await expect(page.locator('#speechGenerate')).toBeDisabled();
 expect(writes).toBe(0);
});


test('BASE #28: OCR cancellation while language worker loads never runs recognize()',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.addInitScript(()=>{
  window.__ocrSpy={created:0,recognized:0,terminated:0};
  // Keep model initialization pending until the test explicitly releases it.
  // A 400ms sleep raced WebKit's Playwright click; Cancel was already disabled.
  let releaseWorker;
  const workerReady=new Promise(resolve=>{releaseWorker=resolve;});
  window.__releaseOcrWorker=()=>releaseWorker();
  window.Tesseract={
   async createWorker(){
    window.__ocrSpy.created++;
    await workerReady;
    return {
     async recognize(){window.__ocrSpy.recognized++;return {data:{text:'SHOULD NOT RUN'}};},
     async terminate(){window.__ocrSpy.terminated++;}
    };
   }
  };
 });
 await page.goto('/mobile-utility.html?tool=photo-ocr');
 await page.locator('#utilityFiles').setInputFiles({name:'image.jpg',mimeType:'image/jpeg',buffer:Buffer.from([255,216,255,217])});
 await page.locator('#utilityRun').click();
 await expect.poll(()=>page.evaluate(()=>window.__ocrSpy.created)).toBe(1);
 await expect(page.locator('#utilityCancel')).toBeEnabled();
 await page.locator('#utilityCancel').click();
 await page.evaluate(()=>window.__releaseOcrWorker());
 await expect.poll(()=>page.evaluate(()=>window.__ocrSpy.terminated)).toBe(1);
 expect(await page.evaluate(()=>window.__ocrSpy)).toEqual({created:1,recognized:0,terminated:1});
 await expect(page.locator('#utilityResults textarea')).toHaveCount(0);
 await expect(page.locator('#utilityStatus')).toContainText('Canceled');
 expect(posts).toBe(0);
});

test('BASE #28: simulated OCR worker output can be downloaded as actual TXT without server upload',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.addInitScript(()=>{
  window.Tesseract={
   async createWorker(){return {
    async recognize(){return {data:{text:'User-visible OCR sample'}};},
    async terminate(){}
   };}
  };
 });
 await page.goto('/mobile-utility.html?tool=photo-ocr');
 await page.locator('#utilityFiles').setInputFiles({name:'note.jpg',mimeType:'image/jpeg',buffer:Buffer.from([255,216,255,217])});
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityResults textarea')).toHaveValue('User-visible OCR sample');
 const next=page.waitForEvent('download');
 await page.locator('#utilityResults').getByRole('button',{name:'Download TXT'}).click();
 const downloaded=await next;
 expect(downloaded.suggestedFilename()).toBe('note-text.txt');
 const bytes=await readFile(await downloaded.path());
 expect(bytes.toString()).toBe('User-visible OCR sample');
 expect(posts).toBe(0);
});


test('BASE #28: older private redaction preview cannot replace a newer selected photo',async({page})=>{
 let posts=0;page.on('request',request=>{if(request.method()==='POST')posts++;});
 await page.addInitScript(()=>{
  const NativeImage=window.Image;
  let created=0;
  window.Image=function(...args){
   const image=new NativeImage(...args),index=++created;
   Object.defineProperty(image,'onload',{
    configurable:true,set(fn){
     image.addEventListener('load',event=>{
      if(index===1)setTimeout(()=>fn.call(image,event),650);
      else fn.call(image,event);
     },{once:true});
    }
   });
   return image;
  };
 });
 await page.goto('/mobile-utility.html?tool=photo-redact');
 const bytes=await page.evaluate(async()=>{
  const encode=async color=>{
   const canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;
   const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,120,80);
   const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
   return Array.from(new Uint8Array(await blob.arrayBuffer()));
  };
  return {older:await encode('rgb(210,20,20)'),current:await encode('rgb(20,20,210)')};
 });
 await page.locator('#utilityFiles').setInputFiles({name:'older-private.png',mimeType:'image/png',buffer:Buffer.from(bytes.older)});
 await expect(page.locator('#utilityRun')).toBeDisabled();
 await page.locator('#utilityFiles').setInputFiles({name:'current-private.png',mimeType:'image/png',buffer:Buffer.from(bytes.current)});
 await expect.poll(()=>page.locator('#redactCanvas').evaluate(canvas=>[...canvas.getContext('2d').getImageData(4,4,1,1).data].join(','))).toBe('20,20,210,255');
 await expect(page.locator('#utilityRun')).toBeEnabled();
 await page.waitForTimeout(800); // The older image load now resolves; it must be ignored.
 const pixels=await page.locator('#redactCanvas').evaluate(canvas=>[...canvas.getContext('2d').getImageData(4,4,1,1).data]);
 expect(pixels).toEqual([20,20,210,255]);
 expect(posts).toBe(0);
});


test('BASE #28: redaction canceled during PNG encoding cannot publish sensitive output',async({page},info)=>{
 test.skip(info.project.name.includes('mobile-'),'Precise desktop pointer path; physical mobile acceptance remains separate');
 let uploads=0;page.on('request',r=>{if(r.method()==='POST')uploads++;});
 await page.goto('/mobile-utility.html?tool=photo-redact');
 const png=await fixture(page);
 await page.locator('#utilityFiles').setInputFiles({name:'private.png',mimeType:'image/png',buffer:png});
 const canvas=page.locator('#redactCanvas');
 await expect(page.locator('#utilityRun')).toBeEnabled();
 const box=await canvas.boundingBox();
 await page.mouse.move(box.x+box.width*.2,box.y+box.height*.2);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*.75,box.y+box.height*.8,{steps:6});
 await page.mouse.up();
 await page.evaluate(()=>{
  // Hold the actual PNG callback until after Cancel. A timed 650ms delay
  // races with slow WebKit pointer actions and can finish before the click.
  const toBlob=HTMLCanvasElement.prototype.toBlob;
  const pending=[];
  window.__redactionPngPending=()=>pending.length;
  window.__releaseRedactionPng=()=>{
   for(const release of pending.splice(0))release();
  };
  HTMLCanvasElement.prototype.toBlob=function(callback,...args){
   return toBlob.call(this,blob=>pending.push(()=>callback(blob)),...args);
  };
 });
 await page.locator('#utilityRun').click();
 // Prove the native encoder finished but its output is still unavailable.
 await expect.poll(()=>page.evaluate(()=>window.__redactionPngPending())).toBe(1);
 await expect(page.locator('#utilityCancel')).toBeEnabled();
 await page.locator('#utilityCancel').click();
 // Only now deliver the late blob; ensure the pending task fully settles.
 await page.evaluate(()=>window.__releaseRedactionPng());
 await expect(page.locator('#utilityCancel')).toBeDisabled();
 await expect(page.locator('#utilityRun')).toBeEnabled();
 await expect(page.locator('#utilityResults .utility-result')).toHaveCount(0);
 await expect(page.locator('#utilityStatus')).toContainText('Canceled');
 expect(uploads).toBe(0);
});


test('BASE #28: sensitive redaction source is purged before browser history restoration',async({page})=>{
 let uploads=0;page.on('request',r=>{if(r.method()==='POST')uploads++;});
 await page.goto('/mobile-utility.html?tool=photo-redact');
 await page.locator('#utilityFiles').setInputFiles({name:'private-person.png',mimeType:'image/png',buffer:await fixture(page)});
 await expect(page.locator('#redactCanvas')).toHaveJSProperty('width',120);
 await expect(page.locator('#utilityRun')).toBeEnabled();
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect(page.locator('#utilityFiles')).toHaveValue('');
 await expect(page.locator('#utilityResults .utility-result')).toHaveCount(0);
 await expect(page.locator('#utilityRun')).toBeDisabled();
 await expect(page.locator('#redactCanvas')).toHaveJSProperty('width',1);
 await expect(page.locator('#redactCanvas')).toHaveJSProperty('height',1);
 await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
 await expect(page.locator('#utilityRun')).toBeDisabled();
 expect(uploads).toBe(0);
});


test('BASE #28: changing photo or leaving revokes private redaction blob preview URLs',async({page},info)=>{
 test.skip(info.project.name.includes('mobile-'),'Desktop pointer flow only; physical mobile acceptance separate');
 await page.goto('/mobile-utility.html?tool=photo-redact');
 await page.evaluate(()=>{
  const revoke=URL.revokeObjectURL;
  window.__privateRevocations=[];
  URL.revokeObjectURL=function(url){window.__privateRevocations.push(url);return revoke.call(URL,url);};
 });
 await page.locator('#utilityFiles').setInputFiles({name:'private-first.png',mimeType:'image/png',buffer:await fixture(page)});
 await expect(page.locator('#utilityRun')).toBeEnabled();
 const box=await page.locator('#redactCanvas').boundingBox();
 await page.mouse.move(box.x+box.width*.2,box.y+box.height*.2);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*.7,box.y+box.height*.7,{steps:5});
 await page.mouse.up();
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityResults .utility-result img')).toBeVisible();
 const preview=await page.locator('#utilityResults .utility-result img').getAttribute('src');
 expect(preview).toMatch(/^blob:/);
 await page.locator('#utilityFiles').setInputFiles({name:'private-second.png',mimeType:'image/png',buffer:await fixture(page)});
 await expect.poll(()=>page.evaluate(url=>window.__privateRevocations.includes(url),preview)).toBe(true);
 await expect(page.locator('#utilityResults .utility-result')).toHaveCount(0);
 await expect(page.locator('#utilityRun')).toBeEnabled();
 const current=await page.locator('#utilityFiles').inputValue();
 expect(current).toContain('private-second.png');
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect(page.locator('#utilityFiles')).toHaveValue('');
 await expect(page.locator('#redactCanvas')).toHaveJSProperty('width',1);
});


test('BASE #28: Cancel during Photo to PDF JPEG encode cannot publish a PDF',async({page})=>{
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.goto('/mobile-utility.html?tool=scan-pdf');
 await page.locator('#utilityFiles').setInputFiles({
  name:'private-photo.png',mimeType:'image/png',buffer:await fixture(page)
 });
 await page.evaluate(()=>{
  const native=HTMLCanvasElement.prototype.toBlob;
  let releaseEncode;
  const afterCancel=new Promise(resolve=>{releaseEncode=resolve;});
  window.__pdfEncodeStarted=0;
  window.__releasePdfEncode=()=>releaseEncode();
  // Hold a REAL browser JPEG encode result until after Cancel is clicked.
  // A 650ms fixed timer allowed WebKit's Cancel to disable first.
  HTMLCanvasElement.prototype.toBlob=function(cb,...args){
   return native.call(this,blob=>{
    window.__pdfEncodeStarted++;
    void afterCancel.then(()=>cb(blob));
   },...args);
  };
 });
 await page.locator('#utilityRun').click();
 await expect.poll(()=>page.evaluate(()=>window.__pdfEncodeStarted)).toBeGreaterThan(0);
 await expect(page.locator('#utilityCancel')).toBeEnabled();
 await page.locator('#utilityCancel').click();
 await page.evaluate(()=>window.__releasePdfEncode());
 await expect(page.locator('#utilityStatus')).toContainText('Canceled');
 await expect(page.locator('#utilityRun')).toBeEnabled();
 await expect(page.locator('#utilityResults .utility-result')).toHaveCount(0);
 expect(posts).toBe(0);
});


test('BASE #28: Cancel while OCR library script loads never creates a language worker',async({page})=>{
 let uploads=0;
 page.on('request',r=>{if(r.method()==='POST')uploads++;});
 await page.addInitScript(()=>{window.__ocrScriptSpy={workerCreations:0};});
 // Keep the library response pending until AFTER a real Cancel click.
 // Unlike a 650ms timer this is deterministic on slow WebKit runners.
 let scriptRequested,releaseScript;
 const requested=new Promise(resolve=>{scriptRequested=resolve;});
 const blocked=new Promise(resolve=>{releaseScript=resolve;});
 await page.route('**/vendor/ocr/tesseract.min.js',async route=>{
  scriptRequested();
  await blocked;
  await route.fulfill({
   status:200,contentType:'application/javascript',
   body:'window.Tesseract={createWorker:async()=>{window.__ocrScriptSpy.workerCreations++;return {recognize:async()=>({data:{text:"wrong"}}),terminate:async()=>{}}}};'
  });
 });
 await page.goto('/mobile-utility.html?tool=photo-ocr');
 await page.locator('#utilityFiles').setInputFiles({
  name:'private.jpg',mimeType:'image/jpeg',buffer:Buffer.from([255,216,255,217])
 });
 await page.locator('#utilityRun').click();
 await requested; // Confirm the external script load genuinely started.
 await expect(page.locator('#utilityCancel')).toBeEnabled();
 await page.locator('#utilityCancel').click();
 await expect(page.locator('#utilityStatus')).toContainText('Canceled');
 releaseScript();
 await expect(page.locator('#utilityRun')).toBeEnabled();
 expect(await page.evaluate(()=>window.__ocrScriptSpy.workerCreations)).toBe(0);
 await expect(page.locator('#utilityResults .utility-result')).toHaveCount(0);
 expect(uploads).toBe(0);
});


test('BASE #28: malformed collage input releases temporary pixel canvas and unlocks picker',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.goto('/photo-collage.html');
 const png=await fixture(page);
 await page.locator('#collageFiles').setInputFiles([
  {name:'good.png',mimeType:'image/png',buffer:png},
  {name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('this is not an image')}
 ]);
 await page.evaluate(()=>{
  window.__collageTempCanvases=[];
  const native=document.createElement.bind(document);
  document.createElement=function(name,...args){
   const element=native(name,...args);
   if(name==='canvas')window.__collageTempCanvases.push(element);
   return element;
  };
 });
 await page.locator('#collageCreate').click();
 await expect(page.locator('#collageStatus')).toContainText('Could not decode');
 await expect(page.locator('#collageFiles')).toBeEnabled();
 await expect(page.locator('#collageDownload')).toBeHidden();
 const leaked=await page.evaluate(()=>window.__collageTempCanvases.some(c=>c.width!==1||c.height!==1));
 expect(leaked).toBe(false);
 expect(posts).toBe(0);
});

test('BASE #28: collage BFCache exit cannot reveal a late prior photo or result',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.goto('/photo-collage.html');
 const png=await fixture(page);
 await page.locator('#collageFiles').setInputFiles([
  {name:'private-one.png',mimeType:'image/png',buffer:png},
  {name:'private-two.png',mimeType:'image/png',buffer:png}
 ]);
 await page.evaluate(()=>{
  const original=window.createImageBitmap.bind(window);
  window.createImageBitmap=async(...args)=>{
   const bitmap=await original(...args);
   await new Promise(ok=>setTimeout(ok,650));
   return bitmap;
  };
 });
 await page.locator('#collageCreate').click();
 await expect(page.locator('#collageFiles')).toBeDisabled();
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect(page.locator('#collageFiles')).toHaveValue('');
 await expect(page.locator('#collageFiles')).toBeEnabled();
 await expect(page.locator('#collageResult')).toBeHidden();
 await expect(page.locator('#collageDownload')).toBeHidden();
 await page.waitForTimeout(850);
 await expect(page.locator('#collageResult')).toBeHidden();
 await expect(page.locator('#collageStatus')).toBeEmpty();
 expect(posts).toBe(0);
});


test('BASE #28: Cancel during PDF merge save never publishes a late result, normal retry still works',async({page})=>{
 let uploads=0;
 page.on('request',r=>{if(r.method()==='POST')uploads++;});
 // The PDF library is mocked only to force a deterministic slow serialization.
 // No provider, upload or actual file content leaves the browser.
 await page.addInitScript(()=>{
  window.__base28PdfLate={saveEntered:0,saveCompleted:0};
  window.PDFLib={
   PDFDocument:{
    async load(){return {getPageIndices:()=>[0]};},
    async create(){return {
     async copyPages(){return [{}];},
     addPage(){},
     async save(){
      window.__base28PdfLate.saveEntered++;
      // A deferred first save ensures Cancel is pressed during serialization.
      if(window.__base28PdfLate.saveEntered===1){
       await new Promise(resolve=>{window.__releaseBase28PdfSave=resolve;});
      }
      window.__base28PdfLate.saveCompleted++;
      return new Uint8Array([37,80,68,70,45,49,46,55]); // mock %PDF-1.7
     }
    };}
   },
   StandardFonts:{},
   rgb:()=>({})
  };
 });
 await page.goto('/mobile-utility.html?tool=pdf-merge');
 await page.locator('#utilityFiles').setInputFiles({
  name:'test-document.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7 mock')
 });
 await page.locator('#utilityRun').click();
 await expect.poll(()=>page.evaluate(()=>window.__base28PdfLate.saveEntered)).toBe(1);
 await expect(page.locator('#utilityCancel')).toBeEnabled();
 await page.locator('#utilityCancel').click();
 await expect(page.locator('#utilityStatus')).toContainText('Canceled');
 await page.evaluate(()=>window.__releaseBase28PdfSave());
 await expect.poll(()=>page.evaluate(()=>window.__base28PdfLate.saveCompleted)).toBe(1);
 // Wait until the original async operation fully settles before asserting no late output.
 await expect(page.locator('#utilityRun')).toBeEnabled();
 await expect(page.locator('#utilityResults .utility-result')).toHaveCount(0);
 // A subsequent explicit user run clears the old cancellation flag.
 await page.locator('#utilityRun').click();
 await expect.poll(()=>page.evaluate(()=>window.__base28PdfLate.saveCompleted)).toBe(2);
 await expect(page.locator('#utilityResults .utility-result')).toContainText('merged.pdf');
 expect(uploads).toBe(0);
});


test('BASE #28: nine-image collage closes bitmaps one-by-one before next decode',async({page})=>{
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.goto('/photo-collage.html');
 const png=await fixture(page);
 await page.locator('#collageFiles').setInputFiles(Array.from({length:9},(_,i)=>({
  name:'photo-'+(i+1)+'.png',mimeType:'image/png',buffer:png
 })));
 await page.evaluate(()=>{
  window.__collageBitmapMemory={live:0,maxLive:0,closed:0};
  const originalCreate=window.createImageBitmap.bind(window);
  const originalClose=ImageBitmap.prototype.close;
  window.createImageBitmap=async(...args)=>{
   const image=await originalCreate(...args);
   const m=window.__collageBitmapMemory;
   m.live++;m.maxLive=Math.max(m.maxLive,m.live);
   return image;
  };
  ImageBitmap.prototype.close=function(...args){
   const m=window.__collageBitmapMemory;
   m.closed++;m.live--;
   return originalClose.apply(this,args);
  };
 });
 await page.locator('#collageCreate').click();
 await expect(page.locator('#collageResult')).toBeVisible();
 await expect(page.locator('#collageDownload')).toHaveAttribute('href',/^blob:/);
 const m=await page.evaluate(()=>window.__collageBitmapMemory);
 expect(m).toEqual({live:0,maxLive:1,closed:9});
 expect(posts).toBe(0);
});


test('BASE #28: failed private photo transforms release all canvases and publish no result',async({page})=>{
 const png=await fixture(page);
 let uploads=0;
 page.on('request',r=>{if(r.method()==='POST')uploads++;});
 for(const tool of ['photo-convert','photo-compress','photo-resize']){
  await page.goto('/mobile-utility.html?tool='+tool);
  await page.evaluate(()=>{
   window.__base28PrivateCanvases=[];
   const make=document.createElement.bind(document);
   document.createElement=function(tag,...args){
    const element=make(tag,...args);
    if(tag==='canvas')window.__base28PrivateCanvases.push(element);
    return element;
   };
   // Browser canvas encoding can fail due to unsupported formats or memory pressure.
   HTMLCanvasElement.prototype.toBlob=function(cb){cb(null);};
  });
  await page.locator('#utilityFiles').setInputFiles({
   name:'private-owner-photo.png',mimeType:'image/png',buffer:png
  });
  if(tool==='photo-resize'){
   await page.locator('#utilityWidth').fill('900');
   await page.locator('#utilityHeight').fill('700');
  }
  await page.locator('#utilityRun').click();
  await expect(page.locator('#utilityStatus')).toContainText('Could not complete:');
  await expect(page.locator('#utilityRun')).toBeEnabled();
  await expect(page.locator('#utilityResults .utility-result')).toHaveCount(0);
  const pixels=await page.evaluate(()=>window.__base28PrivateCanvases.map(c=>[c.width,c.height]));
  expect(pixels.length,tool).toBeGreaterThanOrEqual(1);
  expect(pixels.every(([w,h])=>w===1&&h===1),tool).toBe(true);
 }
 expect(uploads).toBe(0);
});

test('BASE #28: invalid resized-photo dimensions also purge the original private canvas',async({page})=>{
 await page.goto('/mobile-utility.html?tool=photo-resize');
 const png=await fixture(page);
 await page.evaluate(()=>{
  window.__base28PrivateCanvases=[];
  const make=document.createElement.bind(document);
  document.createElement=function(tag,...args){
   const el=make(tag,...args);
   if(tag==='canvas')window.__base28PrivateCanvases.push(el);
   return el;
  };
 });
 await page.locator('#utilityFiles').setInputFiles({name:'private.png',mimeType:'image/png',buffer:png});
 await page.locator('#utilityWidth').fill('8000');
 await page.locator('#utilityHeight').fill('8000');
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityStatus')).toContainText('Dimensions must be within 40 megapixels');
 await expect(page.locator('#utilityRun')).toBeEnabled();
 await expect(page.locator('#utilityResults .utility-result')).toHaveCount(0);
 const sizes=await page.evaluate(()=>window.__base28PrivateCanvases.map(c=>[c.width,c.height]));
 expect(sizes.length).toBeGreaterThanOrEqual(1);
 expect(sizes.every(([w,h])=>w===1&&h===1)).toBe(true);
});


test('BASE #28: OCR text and selected source are cleared on BFCache pagehide',async({page})=>{
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.addInitScript(()=>{
  window.Tesseract={createWorker:async()=>({
   async recognize(){return {data:{text:'PRIVATE ID OCR CONTENT'}};},
   async terminate(){}
  })};
 });
 await page.goto('/mobile-utility.html?tool=photo-ocr');
 await page.locator('#utilityFiles').setInputFiles({
  name:'confidential-ocr.png',mimeType:'image/png',buffer:await fixture(page)
 });
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityResults textarea')).toHaveValue('PRIVATE ID OCR CONTENT');
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect(page.locator('#utilityFiles')).toHaveValue('');
 await expect(page.locator('#utilityResults')).toBeEmpty();
 await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
 await expect(page.locator('#utilityResults textarea')).toHaveCount(0);
 expect(posts).toBe(0);
});

test('BASE #28: mobile photo output blob is revoked when leaving for BFCache',async({page})=>{
 const png=await page.goto('/mobile-utility.html?tool=photo-convert').then(()=>fixture(page));
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.evaluate(()=>{
  window.__base28RevokedPhotoUrls=[];
  const revoke=URL.revokeObjectURL;
  URL.revokeObjectURL=function(url){
   window.__base28RevokedPhotoUrls.push(url);
   return revoke.call(URL,url);
  };
 });
 await page.locator('#utilityFiles').setInputFiles({
  name:'confidential-photo.png',mimeType:'image/png',buffer:png
 });
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityResults .utility-result img')).toBeVisible();
 const url=await page.locator('#utilityResults .utility-result img').getAttribute('src');
 expect(url).toMatch(/^blob:/);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect(page.locator('#utilityFiles')).toHaveValue('');
 await expect(page.locator('#utilityResults')).toBeEmpty();
 expect(await page.evaluate(url=>window.__base28RevokedPhotoUrls.includes(url),url)).toBe(true);
 expect(posts).toBe(0);
});

test('BASE #28: OCR recognition finishing after pagehide never restores private output',async({page})=>{
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.addInitScript(()=>{
  window.__base28OcrLate={started:0,finished:0,terminated:0};
  window.Tesseract={createWorker:async()=>({
   async recognize(){
    window.__base28OcrLate.started++;
    await new Promise(done=>setTimeout(done,650));
    window.__base28OcrLate.finished++;
    return {data:{text:'LATE PRIVATE DOCUMENT'}};
   },
   async terminate(){window.__base28OcrLate.terminated++;}
  })};
 });
 await page.goto('/mobile-utility.html?tool=photo-ocr');
 await page.locator('#utilityFiles').setInputFiles({
  name:'confidential-late.png',mimeType:'image/png',buffer:await fixture(page)
 });
 await page.locator('#utilityRun').click();
 await expect.poll(()=>page.evaluate(()=>window.__base28OcrLate.started)).toBe(1);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect(page.locator('#utilityFiles')).toHaveValue('');
 await expect.poll(()=>page.evaluate(()=>window.__base28OcrLate.terminated)).toBe(1);
 await expect(page.locator('#utilityResults')).toBeEmpty();
 await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
 await expect(page.locator('#utilityResults textarea')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__base28OcrLate.finished)).toBe(1);
 expect(posts).toBe(0);
});

test('BASE #28: audio/text BFCache pagehide clears sensitive inputs, media previews and downloads',async({page})=>{
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.addInitScript(()=>{
  window.__base28AudioURLs={created:[],revoked:[]};
  const create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  URL.createObjectURL=function(blob){
   const url=create.call(URL,blob);
   window.__base28AudioURLs.created.push(url);
   return url;
  };
  URL.revokeObjectURL=function(url){
   window.__base28AudioURLs.revoked.push(url);
   return revoke.call(URL,url);
  };
 });
 await page.goto('/audio-studio.html');
 await page.locator('#speechText').fill('PRIVATE OWNER SCRIPT');
 await page.locator('#speechConsent').check();
 await page.locator('#transcript').fill('PRIVATE RECOGNIZED TRANSCRIPT');
 await page.locator('#transcribeFile').setInputFiles({
  name:'private-voice.wav',mimeType:'audio/wav',buffer:Buffer.from([0,0,0,0])
 });
 await page.locator('#trimFile').setInputFiles({
  name:'private-trim.wav',mimeType:'audio/wav',buffer:Buffer.from([0,0,0,0])
 });
 await page.locator('#vtaFile').setInputFiles({
  name:'private-video.mp4',mimeType:'video/mp4',buffer:Buffer.from([0,0,0,0])
 });
 const before=await page.evaluate(()=>{
  for(const id of ['speechResult','trimResult','vtaResult']){
   const el=document.createElement('button');el.textContent='PRIVATE DOWNLOAD';
   document.getElementById(id).append(el);
  }
  return window.__base28AudioURLs.created.slice();
 });
 expect(before.length).toBeGreaterThanOrEqual(2);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 for(const id of ['speechText','transcript','transcribeFile','trimFile','vtaFile']){
  await expect(page.locator('#'+id)).toHaveValue('');
 }
 await expect(page.locator('#speechConsent')).not.toBeChecked();
 for(const id of ['speechResult','trimResult','vtaResult']){
  await expect(page.locator('#'+id)).toBeEmpty();
 }
 await expect(page.locator('#trimSourcePreview')).toBeHidden();
 await expect(page.locator('#vtaPreview')).toBeHidden();
 await expect(page.locator('#copyText')).toBeDisabled();
 await expect(page.locator('#saveText')).toBeDisabled();
 await expect(page.locator('#saveSrt')).toBeDisabled();
 const urls=await page.evaluate(()=>window.__base28AudioURLs);
 expect(urls.created.length).toBeGreaterThanOrEqual(2);
 expect(urls.created.every(u=>urls.revoked.includes(u))).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
 await expect(page.locator('#transcript')).toHaveValue('');
 expect(posts).toBe(0);
});

test('BASE #28: audio STT pagehide cancels a pending worker and blocks late private transcription',async({page})=>{
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.route('**/ai-media.js',route=>route.fulfill({
  status:200,contentType:'text/javascript',body:`
   export async function createEngine(){return {
    async writeFile(){},async exec(){return 0;},
    async readFile(){return new Uint8Array([0,0,0,0]);},
    terminate(){}
   }}
   export async function saveLocal(){}
   export function subtitleFiles(){return {srt:'PRIVATE SRT'}}
  `
 }));
 await page.goto('/audio-studio.html');
 await page.evaluate(()=>{
  window.__base28Stt={workers:[],cancelled:0,completed:0};
  window.VUToolAccess={
   async begin(){return {
    async complete(){window.__base28Stt.completed++},
    async cancel(){window.__base28Stt.cancelled++}
   }},
   message(){return 'unavailable'}
  };
  window.Worker=class {
   constructor(){this.terminated=false;window.__base28Stt.workers.push(this)}
   postMessage(){}
   terminate(){this.terminated=true}
  };
 });
 await page.locator('#transcribeFile').setInputFiles({
  name:'private-audio.wav',mimeType:'audio/wav',buffer:Buffer.from([0,0,0,0])
 });
 await page.locator('#transcribeStart').click();
 await expect.poll(()=>page.evaluate(()=>window.__base28Stt.workers.length)).toBe(1);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect.poll(()=>page.evaluate(()=>window.__base28Stt.cancelled)).toBe(1);
 await page.evaluate(()=>{
  const worker=window.__base28Stt.workers[0];
  worker.onmessage({data:{type:'result',result:{text:'LATE PRIVATE TEXT',chunks:[]}}});
 });
 expect(await page.evaluate(()=>window.__base28Stt.workers[0].terminated)).toBe(true);
 await expect(page.locator('#transcribeFile')).toHaveValue('');
 await expect(page.locator('#transcript')).toHaveValue('');
 await expect(page.locator('#saveText')).toBeDisabled();
 expect(await page.evaluate(()=>window.__base28Stt.completed)).toBe(0);
 expect(posts).toBe(0);
});
