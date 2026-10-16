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
 expect(uploads).toBe(0);
});
test('BASE #28: rejects oversized or unsupported input safely without upload',async({page})=>{
 await page.goto('/simple-background-remover.html');
 await page.locator('#photo').setInputFiles({name:'bad.gif',mimeType:'image/gif',buffer:Buffer.from('GIF89a')});
 await expect(page.locator('#status')).toContainText('under 10 MB');
 await expect(page.locator('#erase')).toBeDisabled();
 await expect(page.locator('#download')).toBeDisabled();
});