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
