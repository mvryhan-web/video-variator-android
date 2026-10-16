import {test,expect} from '@playwright/test';

test('BASE #28: local simple-background erase yields transparent PNG without upload or credits',async({page})=>{
 let uploads=0;
 page.on('request',r=>{if(r.method()==='POST')uploads++;});
 await page.goto('/free-tools.html');
 const link=page.getByRole('link',{name:/Simple Background Remover/});
 await expect(link).toBeVisible();
 await link.click();
 await expect(page).toHaveURL(/simple-background-remover\.html$/);
 await expect(page.getByText('not AI subject detection')).toBeVisible();
 const bytes=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=c.height=30;
  const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,30,30);
  ctx.fillStyle='#e01010';ctx.fillRect(10,10,10,10);
  const png=await new Promise(done=>c.toBlob(done,'image/png'));
  return Array.from(new Uint8Array(await png.arrayBuffer()));
 });
 await page.locator('#photo').setInputFiles({name:'item.png',mimeType:'image/png',buffer:Buffer.from(bytes)});
 await expect(page.locator('#erase')).toBeEnabled();
 await expect(page.locator('#sampleStatus')).toContainText('RGB 255, 255, 255');
 // The interactive canvas must be fully usable without a mouse.
 await page.locator('#original').focus();
 await page.keyboard.press('End');
 await expect(page.locator('#sampleStatus')).toContainText('Background sample at 30, 30');
 await page.keyboard.press('Home');
 await expect(page.locator('#sampleStatus')).toContainText('Background sample at 1, 1');
 await page.keyboard.press('Shift+ArrowRight');
 await expect(page.locator('#sampleStatus')).toContainText('Background sample at 11, 1');
 await page.keyboard.press('Enter');
 await expect(page.locator('#status')).toContainText('pixel selected');
 await page.locator('#erase').click();
 await expect(page.locator('#download')).toBeEnabled();
 const pixels=await page.locator('#result').evaluate(canvas=>{
  const ctx=canvas.getContext('2d');
  return {width:canvas.width,height:canvas.height,background:ctx.getImageData(0,0,1,1).data[3],subject:ctx.getImageData(15,15,1,1).data[3]};
 });
 expect(pixels).toEqual({width:30,height:30,background:0,subject:255});
 // Verify that the advertised finished artifact is an actual downloadable PNG,
 // not merely a canvas that appears transparent on screen.
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#download').click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('item-transparent.png');
 await page.locator('#clearPhoto').click();
 await expect(page.locator('#photo')).toHaveValue('');
 await expect(page.locator('#clearPhoto')).toBeDisabled();
 await expect(page.locator('#erase')).toBeDisabled();
 await expect(page.locator('#download')).toBeDisabled();
 await expect(page.locator('#status')).toContainText('Photo and preview cleared');
 const cleared=await page.locator('#original').evaluate(canvas=>({
  width:canvas.width,height:canvas.height,alpha:canvas.getContext('2d').getImageData(0,0,1,1).data[3]
 }));
 expect(cleared).toEqual({width:1,height:1,alpha:0});
 expect(uploads).toBe(0);
});
test('BASE #28: rejects oversized or unsupported input safely without upload',async({page})=>{
 await page.goto('/simple-background-remover.html');
 await page.locator('#photo').setInputFiles({name:'bad.gif',mimeType:'image/gif',buffer:Buffer.from('GIF89a')});
 await expect(page.locator('#status')).toContainText('under 10 MB');
 await expect(page.locator('#erase')).toBeDisabled();
 await expect(page.locator('#download')).toBeDisabled();
});
test('BASE #28: replacing photo with invalid format does not leave earlier image visible',async({page})=>{
 await page.goto('/simple-background-remover.html');
 const bytes=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=c.height=3;
  const ctx=c.getContext('2d');ctx.fillStyle='#f00';ctx.fillRect(0,0,3,3);
  const b=await new Promise(done=>c.toBlob(done,'image/png'));
  return Array.from(new Uint8Array(await b.arrayBuffer()));
 });
 await page.locator('#photo').setInputFiles({name:'valid.png',mimeType:'image/png',buffer:Buffer.from(bytes)});
 await expect(page.locator('#erase')).toBeEnabled();
 await expect(page.locator('#original')).toHaveJSProperty('width',3);
 await page.locator('#photo').setInputFiles({name:'bad.gif',mimeType:'image/gif',buffer:Buffer.from('GIF89a')});
 await expect(page.locator('#erase')).toBeDisabled();
 await expect(page.locator('#original')).toHaveJSProperty('width',1);
 await expect(page.locator('#result')).toHaveJSProperty('width',1);
 await expect(page.locator('#status')).toContainText('under 10 MB');
 await page.locator('#clearPhoto').click();
 await expect(page.locator('#photo')).toHaveValue('');
});

test('BASE #28: stale asynchronous PNG cannot resurrect an image after Clear',async({page})=>{
 await page.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(callback,...args){
   if(this.id!=='result')return original.call(this,callback,...args);
   return original.call(this,blob=>{
    setTimeout(()=>{
     callback(blob);
     document.body.dataset.encodedAfterClear='yes';
    },120);
   },...args);
  };
 });
 await page.goto('/simple-background-remover.html');
 const bytes=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=3;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,3,3);
  const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
  return [...new Uint8Array(await blob.arrayBuffer())];
 });
 await page.locator('#photo').setInputFiles({name:'local.png',mimeType:'image/png',buffer:Buffer.from(bytes)});
 await expect(page.locator('#erase')).toBeEnabled();
 await page.locator('#erase').click();
 await page.locator('#clearPhoto').click();
 await expect(page.locator('body')).toHaveAttribute('data-encoded-after-clear','yes');
 await expect(page.locator('#download')).toBeDisabled();
 await expect(page.locator('#erase')).toBeDisabled();
 await expect(page.locator('#original')).toHaveJSProperty('width',1);
 await expect(page.locator('#status')).toContainText('Photo and preview cleared');
});

test('BASE #28: old encode cannot unlock a newer in-progress encode',async({page})=>{
 await page.addInitScript(()=>{
  const actual=HTMLCanvasElement.prototype.toBlob;
  let ordinal=0;
  HTMLCanvasElement.prototype.toBlob=function(done,...options){
   if(this.id!=='result')return actual.call(this,done,...options);
   const order=++ordinal;
   return actual.call(this,blob=>setTimeout(()=>{
    done(blob);
    document.body.dataset['encoded'+order]='yes';
   },order===1?180:1000),...options);
  };
 });
 await page.goto('/simple-background-remover.html');
 const bytes=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=3;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,3,3);
  const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
  return [...new Uint8Array(await blob.arrayBuffer())];
 });
 const file={name:'product.png',mimeType:'image/png',buffer:Buffer.from(bytes)};
 await page.locator('#photo').setInputFiles(file);
 await expect(page.locator('#erase')).toBeEnabled();
 await page.locator('#erase').click();
 await page.locator('#photo').setInputFiles({name:'new-product.png',mimeType:'image/png',buffer:Buffer.from(bytes)});
 await expect(page.locator('#erase')).toBeEnabled();
 await page.locator('#erase').click();
 await expect(page.locator('body')).toHaveAttribute('data-encoded1','yes');
 await expect(page.locator('#erase')).toBeDisabled();
 await expect(page.locator('#download')).toBeDisabled();
 await expect(page.locator('body')).toHaveAttribute('data-encoded2','yes');
 await expect(page.locator('#erase')).toBeEnabled();
 await expect(page.locator('#download')).toBeEnabled();
});

test('BASE #28: pagehide purges canvases and photo input for BFCache privacy',async({page})=>{
 await page.goto('/simple-background-remover.html');
 const bytes=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=3;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,3,3);
  const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
  return [...new Uint8Array(await blob.arrayBuffer())];
 });
 await page.locator('#photo').setInputFiles({name:'private.png',mimeType:'image/png',buffer:Buffer.from(bytes)});
 await expect(page.locator('#original')).toHaveJSProperty('width',3);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await expect(page.locator('#original')).toHaveJSProperty('width',1);
 await expect(page.locator('#result')).toHaveJSProperty('width',1);
 await expect(page.locator('#photo')).toHaveValue('');
 await expect(page.locator('#erase')).toBeDisabled();
 await expect(page.locator('#download')).toBeDisabled();
});
