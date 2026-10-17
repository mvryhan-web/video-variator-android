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
  videoToAudio:'[data-hub-tool="audio"]',
  audioTrimmer:'#mobileUtilityGrid [data-utility="audio-trim"]',
  photoCompression:'[data-hub-tool="photo"]',
  videoCompression:'[data-hub-tool="video"]',
  backgroundRemover:'a[href="simple-background-remover.html"]',
  teleprompter:'[data-hub-tool="prompter"]',
  ocr:'#mobileUtilityGrid [data-utility="photo-ocr"]',
  textToAudio:'[data-hub-tool="tts"]'
 };
 for(const [key,selector] of Object.entries(selectors)){
  await expect(page.locator(selector),key).toHaveCount(1);
  await expect(page.locator(selector),key).toBeVisible();
 }
 await expect(page.locator(selectors.textToAudio)).toHaveAttribute('href','audio-studio.html?tool=tts');
 await expect(page.locator(selectors.backgroundRemover)).toContainText('Simple Background Remover');
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
  window.Tesseract={
   async createWorker(){
    window.__ocrSpy.created++;
    await new Promise(resolve=>setTimeout(resolve,400));
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
 await expect(page.locator('#utilityCancel')).toBeEnabled();
 await page.locator('#utilityCancel').click();
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
  const toBlob=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(callback,...args){
   return toBlob.call(this,blob=>setTimeout(()=>callback(blob),650),...args);
  };
 });
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityCancel')).toBeEnabled();
 await page.locator('#utilityCancel').click();
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
