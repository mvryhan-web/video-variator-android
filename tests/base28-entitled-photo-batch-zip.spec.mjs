import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {mockToolAccess} from './helpers/tool-access-fixture.mjs';

async function randomPng(page){
 const values=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
  const ctx=canvas.getContext('2d'),data=ctx.createImageData(320,240);
  let seed=17;
  for(let i=0;i<data.data.length;i+=4){
   seed=(Math.imul(seed,1664525)+1013904223)|0;data.data[i]=seed>>>24;
   seed=(Math.imul(seed,1664525)+1013904223)|0;data.data[i+1]=seed>>>24;
   seed=(Math.imul(seed,1664525)+1013904223)|0;data.data[i+2]=seed>>>24;
   data.data[i+3]=255;
  }
  ctx.putImageData(data,0,0);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
 });
 return Buffer.from(values);
}
test('BASE #28: existing Basic/trial photo batch offers an additional real local ZIP, one authorized run',async({page})=>{
 const access=await mockToolAccess(page,{plan:'basic'});
 let disallowed=0;
 page.on('request',r=>{if(r.method()==='POST'&&!new URL(r.url()).pathname.startsWith('/api/tools/'))disallowed++;});
 await page.goto('/free-tools.html?tool=photo');
 const png=await randomPng(page);
 await page.locator('#files').setInputFiles([
  {name:'same.png',mimeType:'image/png',buffer:png},
  {name:'same.png',mimeType:'image/png',buffer:png}
 ]);
 await page.locator('#run').click();
 await expect(page.locator('#status')).toHaveText('Done');
 const archive=page.locator('#outputs .photo-batch-zip');
 await expect(archive).toBeVisible();
 await expect(page.locator('#outputs article')).toHaveCount(2);
 const pending=page.waitForEvent('download');
 await archive.getByRole('button',{name:'Download ZIP'}).click();
 const download=await pending;
 expect(download.suggestedFilename()).toBe('deepsyq-photo-batch.zip');
 const data=await readFile(await download.path());
 expect(data.subarray(0,2).toString()).toBe('PK');
 const names=await page.evaluate(async bytes=>{
  const zip=await window.JSZip.loadAsync(new Uint8Array(bytes));
  const entries=Object.keys(zip.files).sort();
  const kinds=[];
  for(const name of entries){const payload=new Uint8Array(await zip.file(name).async('uint8array'));kinds.push(payload[0]===255&&payload[1]===216?'jpeg':'other');}
  return {entries,kinds};
 },Array.from(data));
 expect(names).toEqual({entries:['01-same-compressed.jpg','02-same-compressed.jpg'],kinds:['jpeg','jpeg']});
 const started=access.calls.filter(c=>c.path==='/api/tools/runs'&&c.method==='POST');
 const settled=access.calls.filter(c=>c.path.startsWith('/api/tools/runs/')&&c.method==='POST');
 expect(started).toHaveLength(1);
 expect(started[0].body.tool).toBe('photo_batch');
 expect(settled).toHaveLength(1);
 expect(settled[0].body.outcome).toBe('completed');
 expect(disallowed).toBe(0);
});
test('BASE #28: unauthenticated photo batch cannot create ZIP or bypass the existing paid/trial gate',async({page})=>{
 const access=await mockToolAccess(page,{authenticated:false});
 await page.goto('/free-tools.html?tool=photo');
 const png=await randomPng(page);
 await page.locator('#files').setInputFiles([
  {name:'one.png',mimeType:'image/png',buffer:png},
  {name:'two.png',mimeType:'image/png',buffer:png}
 ]);
 await page.locator('#run').click();
 await expect(page.locator('#run')).toBeEnabled();
 await expect(page.locator('#outputs article')).toHaveCount(0);
 await expect(page.locator('.photo-batch-zip')).toHaveCount(0);
 expect(access.calls.filter(c=>c.path==='/api/tools/runs')).toHaveLength(0);
});
test('BASE #28: one photo remains free, with no ZIP or new tool entitlement',async({page})=>{
 const access=await mockToolAccess(page,{authenticated:false});
 await page.goto('/free-tools.html?tool=photo');
 const png=await randomPng(page);
 await page.locator('#files').setInputFiles({name:'one.png',mimeType:'image/png',buffer:png});
 await page.locator('#run').click();
 await expect(page.locator('#status')).toHaveText('Done');
 await expect(page.locator('#outputs article')).toHaveCount(1);
 await expect(page.locator('.photo-batch-zip')).toHaveCount(0);
 expect(access.calls.filter(c=>c.path==='/api/tools/runs')).toHaveLength(0);
});


test('BASE #28: single-photo compositor failed draw purges its private canvas',async({page})=>{
 const access=await mockToolAccess(page,{authenticated:false});
 await page.goto('/free-tools.html?tool=photo');
 const png=await randomPng(page);
 await page.evaluate(()=>{
  window.__base28PhotoCanvases=[];
  const create=document.createElement.bind(document);
  document.createElement=function(tag,...args){
   const el=create(tag,...args);
   if(tag==='canvas')window.__base28PhotoCanvases.push(el);
   return el;
  };
  CanvasRenderingContext2D.prototype.drawImage=function(){throw Error('TEST_DRAW_ERROR');};
 });
 await page.locator('#files').setInputFiles({name:'private-photo.png',mimeType:'image/png',buffer:png});
 await page.locator('#run').click();
 await expect(page.locator('#run')).toBeEnabled();
 await expect(page.locator('#status')).toContainText('Could not process');
 await expect(page.locator('#outputs article')).toHaveCount(0);
 const dimensions=await page.evaluate(()=>window.__base28PhotoCanvases.map(c=>[c.width,c.height]));
 expect(dimensions.length).toBeGreaterThanOrEqual(1);
 expect(dimensions.every(([w,h])=>w===1&&h===1)).toBe(true);
 expect(access.calls.filter(c=>c.path==='/api/tools/runs')).toHaveLength(0);
});


test('BASE #28: leaving Tools purges private photo picker, previews, and object URLs before BFCache restore',async({page})=>{
 const access=await mockToolAccess(page,{authenticated:false});
 await page.goto('/free-tools.html?tool=photo');
 const png=await randomPng(page);
 await page.evaluate(()=>{
  window.__base28Revoked=[];
  const original=URL.revokeObjectURL;
  URL.revokeObjectURL=function(url){window.__base28Revoked.push(url);return original.call(URL,url);};
 });
 await page.locator('#files').setInputFiles({name:'owner-private-photo.png',mimeType:'image/png',buffer:png});
 await page.locator('#run').click();
 await expect(page.locator('#status')).toHaveText('Done');
 await expect(page.locator('#outputs article')).toHaveCount(1);
 const photoUrl=await page.locator('#outputs article img').getAttribute('src');
 expect(photoUrl).toMatch(/^blob:/);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect(page.locator('#files')).toHaveValue('');
 await expect(page.locator('#selection')).toBeEmpty();
 await expect(page.locator('#outputs')).toBeEmpty();
 await expect(page.locator('#cameraResults')).toBeEmpty();
 expect(await page.evaluate(url=>window.__base28Revoked.includes(url),photoUrl)).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
 await expect(page.locator('#outputs article')).toHaveCount(0);
 expect(access.calls.filter(c=>c.path==='/api/tools/runs')).toHaveLength(0);
});

test('BASE #28: leaving Tools during delayed private JPEG encoding never publishes a stale photo',async({page})=>{
 const access=await mockToolAccess(page,{authenticated:false});
 await page.goto('/free-tools.html?tool=photo');
 const png=await randomPng(page);
 await page.evaluate(()=>{
  window.__base28PendingPhotoEncoding={started:0,completed:0};
  const original=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(callback,...args){
   window.__base28PendingPhotoEncoding.started++;
   return original.call(this,blob=>setTimeout(()=>{
    window.__base28PendingPhotoEncoding.completed++;
    callback(blob);
   },650),...args);
  };
 });
 await page.locator('#files').setInputFiles({name:'owner-private-photo.png',mimeType:'image/png',buffer:png});
 await page.locator('#run').click();
 await expect.poll(()=>page.evaluate(()=>window.__base28PendingPhotoEncoding.started)).toBe(1);
 await expect(page.locator('#cancel')).toBeEnabled();
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect(page.locator('#files')).toHaveValue('');
 await expect(page.locator('#selection')).toBeEmpty();
 await expect.poll(()=>page.evaluate(()=>window.__base28PendingPhotoEncoding.completed)).toBe(1);
 await expect(page.locator('#run')).toBeEnabled();
 await expect(page.locator('#outputs article')).toHaveCount(0);
 await expect(page.locator('.photo-batch-zip')).toHaveCount(0);
 await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
 await expect(page.locator('#outputs')).toBeEmpty();
 expect(access.calls.filter(c=>c.path==='/api/tools/runs')).toHaveLength(0);
});


test('BASE #28: leaving Tools during native Android file transfer cancels the partial save',async({page})=>{
 const access=await mockToolAccess(page,{authenticated:false});
 await page.addInitScript(()=>{
  window.__base28NativeSave={started:0,appended:0,finished:0,canceled:0,bufferReads:0};
  window.AndroidBridge={
   startToolFile(){window.__base28NativeSave.started++;return true;},
   appendToolChunk(){window.__base28NativeSave.appended++;return true;},
   finishToolFile(){window.__base28NativeSave.finished++;return true;},
   cancelToolFile(){window.__base28NativeSave.canceled++;return true;}
  };
 });
 await page.goto('/free-tools.html?tool=photo');
 const png=await randomPng(page);
 await page.evaluate(()=>{
  const read=Blob.prototype.arrayBuffer;
  Blob.prototype.arrayBuffer=async function(...args){
   if(window.__base28NativeSave.started){
    window.__base28NativeSave.bufferReads++;
    await new Promise(resolve=>setTimeout(resolve,650));
   }
   return read.apply(this,args);
  };
 });
 await page.locator('#files').setInputFiles({name:'private-android.png',mimeType:'image/png',buffer:png});
 await page.locator('#run').click();
 await expect.poll(()=>page.evaluate(()=>window.__base28NativeSave.bufferReads)).toBe(1);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect.poll(()=>page.evaluate(()=>window.__base28NativeSave.canceled)).toBe(1);
 await expect(page.locator('#run')).toBeEnabled();
 expect(await page.evaluate(()=>window.__base28NativeSave)).toEqual({
  started:1,appended:0,finished:0,canceled:1,bufferReads:1
 });
 await expect(page.locator('#files')).toHaveValue('');
 await expect(page.locator('#outputs')).toBeEmpty();
 expect(access.calls.filter(c=>c.path==='/api/tools/runs')).toHaveLength(0);
});


test('BASE #28: Android native save cancels partial multi-chunk file before finish on pagehide',async({page})=>{
 let serverPosts=0;page.on('request',r=>{if(r.method()==='POST')serverPosts++;});
 await page.addInitScript(()=>{
  window.__base28BridgeChunks={started:0,appended:0,finished:0,canceled:0,reads:0};
  window.AndroidBridge={
   startToolFile(){window.__base28BridgeChunks.started++;return true;},
   appendToolChunk(){window.__base28BridgeChunks.appended++;return true;},
   finishToolFile(){window.__base28BridgeChunks.finished++;return true;},
   cancelToolFile(){window.__base28BridgeChunks.canceled++;return true;}
  };
 });
 await page.goto('/free-tools.html?tool=photo');
 await page.evaluate(()=>{
  const read=Blob.prototype.arrayBuffer;
  Blob.prototype.arrayBuffer=async function(...args){
   window.__base28BridgeChunks.reads++;
   if(window.__base28BridgeChunks.reads===2)
    await new Promise(resolve=>setTimeout(resolve,650));
   return read.apply(this,args);
  };
  const privateFile=new File([new Uint8Array(600_000)],'private-owner-file.bin',{
   type:'application/octet-stream'
  });
  window.__base28BridgePromise=window.VUFreeTools.save(privateFile).catch(e=>{
   window.__base28BridgeError=e.message;
  });
 });
 await expect.poll(()=>page.evaluate(()=>window.__base28BridgeChunks.reads)).toBe(2);
 await expect.poll(()=>page.evaluate(()=>window.__base28BridgeChunks.appended)).toBe(1);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect.poll(()=>page.evaluate(()=>window.__base28BridgeChunks.canceled)).toBe(1);
 await page.evaluate(()=>window.__base28BridgePromise);
 expect(await page.evaluate(()=>window.__base28BridgeChunks)).toEqual({
  started:1,appended:1,finished:0,canceled:1,reads:2
 });
 expect(await page.evaluate(()=>window.__base28BridgeError)).toBe('Canceled');
 expect(serverPosts).toBe(0);
});


test('BASE #28: browser download fallback also stops if pagehide wins its async turn',async({page})=>{
 await page.goto('/free-tools.html?tool=photo');
 const result=await page.evaluate(async()=>{
  // Intercept anchors to inspect whether a local file would be downloaded.
  const original=HTMLAnchorElement.prototype.click;
  const downloadUrls=[];
  HTMLAnchorElement.prototype.click=function(){
   downloadUrls.push(this.href);
  };
  const source=new File([new Uint8Array([1,2,3,4])],'private-file.jpg',{
   type:'image/jpeg'
  });
  const pending=window.VUFreeTools.save(source);
  window.dispatchEvent(new Event('pagehide'));
  await pending;
  const canceled={clicks:downloadUrls.length};
  // A deliberate later user save is allowed after a fresh page navigation.
  HTMLAnchorElement.prototype.click=original;
  return canceled;
 });
 expect(result).toEqual({clicks:0});
 await page.goto('/free-tools.html?tool=photo');
 const normal=await page.evaluate(async()=>{
  const original=HTMLAnchorElement.prototype.click;
  let clicks=0;
  HTMLAnchorElement.prototype.click=function(){clicks++;};
  try{
   await window.VUFreeTools.save(new File([new Uint8Array([1,2,3])],'photo.jpg',{
    type:'image/jpeg'
   }));
  }finally{
   HTMLAnchorElement.prototype.click=original;
  }
  return clicks;
 });
 expect(normal).toBe(1);
});
