import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const samplePng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAG0lEQVR4nGNgYPh/4j8Dw384jcJh+H+CgaAKAPRlHinUv26iAAAAAElFTkSuQmCC','base64');

test('BASE #28: existing photo compressor supports two offline JPG results plus an actual ZIP with unique names',async({page})=>{
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.goto('/mobile-utility.html?tool=photo-compress');
 await expect(page.locator('#compressQuality')).toBeVisible();
 await expect(page.locator('#utilityFiles')).toHaveAttribute('multiple','');
 await page.locator('#utilityFiles').setInputFiles([
  {name:'red.png',mimeType:'image/png',buffer:samplePng},
  {name:'blue.png',mimeType:'image/png',buffer:samplePng}
 ]);
 await page.locator('#compressQuality').fill('50');
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityResults .utility-result')).toHaveCount(3);
 const cards=page.locator('#utilityResults .utility-result');
 await expect(cards.nth(0)).toContainText('01-red-compressed.jpg');
 await expect(cards.nth(1)).toContainText('02-blue-compressed.jpg');
 await expect(cards.nth(0)).toContainText('Original:');
 await expect(cards.nth(1)).toContainText('Result:');
 await expect(cards.last()).toContainText('compressed-photos.zip');
 const pending=page.waitForEvent('download');
 await cards.last().locator('button').click();
 const download=await pending;
 expect(download.suggestedFilename()).toBe('compressed-photos.zip');
 const bytes=await readFile(await download.path());
 expect(bytes.subarray(0,2).toString()).toBe('PK');
 const contents=await page.evaluate(async entries=>{
  const archive=await window.JSZip.loadAsync(new Uint8Array(entries));
  return Object.keys(archive.files).sort();
 },Array.from(bytes));
 expect(contents).toEqual(['01-red-compressed.jpg','02-blue-compressed.jpg']);
 await expect(page.locator('#utilityStatus')).toContainText('Ready');
 expect(posts).toBe(0);
});

test('BASE #28: batch refuses nine photos and does not silently discard any input',async({page})=>{
 let posts=0;
 page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.goto('/mobile-utility.html?tool=photo-compress');
 await page.locator('#utilityFiles').setInputFiles(
  Array.from({length:9},(_,i)=>({name:'photo-'+(i+1)+'.png',mimeType:'image/png',buffer:samplePng}))
 );
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityStatus')).toContainText('Choose at most 8 photos');
 await expect(page.locator('#utilityResults .utility-result')).toHaveCount(0);
 expect(posts).toBe(0);
});


test('BASE #28: cancellation during the batch does not publish an incomplete output',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.goto('/mobile-utility.html?tool=photo-compress');
 await page.evaluate(()=>{
  const encode=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(callback,...args){
   return encode.call(this,blob=>setTimeout(()=>callback(blob),550),...args);
  };
 });
 await page.locator('#utilityFiles').setInputFiles([
  {name:'first.png',mimeType:'image/png',buffer:samplePng},
  {name:'second.png',mimeType:'image/png',buffer:samplePng}
 ]);
 await page.locator('#utilityRun').click();
 await expect(page.locator('#utilityStatus')).toContainText('Compressing photo 1/2');
 await page.locator('#utilityCancel').click();
 await expect(page.locator('#utilityStatus')).toContainText('Canceled');
 await expect(page.locator('#utilityRun')).toBeEnabled();
 await expect(page.locator('#utilityResults .utility-result')).toHaveCount(0);
 expect(posts).toBe(0);
});
