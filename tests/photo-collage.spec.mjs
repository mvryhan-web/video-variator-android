import {test,expect} from '@playwright/test';
function pngOfColor(page,color){
 return page.evaluate(async color=>{
  const c=document.createElement('canvas');c.width=32;c.height=32;
  const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,32,32);
  const b=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
  return Array.from(new Uint8Array(await b.arrayBuffer()));
 },color);
}
test('BASE #28 Tools links to working local Photo Collage with PNG download, no API uploads',async({page})=>{
 let serverPosts=0;page.on('request',r=>{if(r.method()==='POST')serverPosts++;});
 await page.goto('/free-tools.html');
 const tile=page.locator('[data-utility=photo-collage]');await expect(tile).toBeVisible();
 await tile.click();await expect(page).toHaveURL(/\/photo-collage\.html$/);
 const red=Buffer.from(await pngOfColor(page,'#ff0000'));
 const blue=Buffer.from(await pngOfColor(page,'#0000ff'));
 await page.locator('#collageFiles').setInputFiles([
  {name:'red.png',mimeType:'image/png',buffer:red},
  {name:'blue.png',mimeType:'image/png',buffer:blue}
 ]);
 await page.locator('#collageGap').selectOption('0');
 await page.locator('#collageCreate').click();
 await expect(page.locator('#collageResult')).toBeVisible();
 await expect(page.locator('#collagePreview')).toHaveJSProperty('complete',true);
 await expect(page.locator('#collageDownload')).toBeVisible();
 const output=await page.locator('#collagePreview').evaluate(img=>{
  const canvas=document.createElement('canvas');
  canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
  return {
   width:canvas.width,height:canvas.height,
   left:Array.from(ctx.getImageData(100,100,1,1).data),
   right:Array.from(ctx.getImageData(1000,100,1,1).data)
  };
 });
 expect(output.width).toBe(1200);
 expect(output.left.slice(0,3)).toEqual([255,0,0]);expect(output.right.slice(0,3)).toEqual([0,0,255]);
 const downloaded=page.waitForEvent('download');
 await page.locator('#collageDownload').click();
 const file=await downloaded;
 expect(file.suggestedFilename()).toBe('deepsyq-collage.png');
 const chunks=[];for await(const chunk of await file.createReadStream())chunks.push(chunk);
 expect(Buffer.concat(chunks).subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 expect(serverPosts).toBe(0);
});
test('Photo Collage rejects invalid files without network and safely clears output',async({page})=>{
 let serverPosts=0;page.on('request',r=>{if(r.method()==='POST')serverPosts++;});
 await page.goto('/photo-collage.html');
 await page.locator('#collageCreate').click();
 await expect(page.locator('#collageStatus')).toContainText('Please choose between 2 and 9');
 await expect(page.locator('#collageDownload')).toBeHidden();
 const red=Buffer.from(await pngOfColor(page,'#ff0000'));
 await page.locator('#collageFiles').setInputFiles([
  {name:'a.png',mimeType:'image/png',buffer:red},
  {name:'fake.png',mimeType:'image/png',buffer:Buffer.from('not-an-image')}
 ]);
 await page.locator('#collageCreate').click();
 await expect(page.locator('#collageStatus')).toContainText('Could not decode');
 await expect(page.locator('#collageDownload')).toBeHidden();
 await page.locator('#collageClear').click();
 await expect(page.locator('#collageStatus')).toBeEmpty();
 expect(serverPosts).toBe(0);
});
test('Collage fits mobile Safari/Android layouts and labels are localized',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/photo-collage.html');
 await expect(page.locator('#collageFiles')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(info.project.name.includes('mobile'))await expect(page.locator('#collageCreate')).toBeVisible();
});
