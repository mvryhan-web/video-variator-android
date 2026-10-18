import {test,expect} from '@playwright/test';
test('BASE #28 local photo compression produces JPEG with quality control and no paid/uploads',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++});
 await page.goto('/free-tools.html');
 await expect(page.locator('[data-utility=photo-compress]')).toBeVisible();
 await page.locator('[data-utility=photo-compress]').click();
 await expect(page).toHaveURL(/mobile-utility\.html\?tool=photo-compress/);
 await expect(page.locator('#compressQuality')).toBeVisible();
 const bytes=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=120;c.height=120;
  const ctx=c.getContext('2d');for(let i=0;i<120;i++){ctx.fillStyle=i%2?'#f00':'#00f';ctx.fillRect(i,0,1,120)}
  const b=await new Promise(ok=>c.toBlob(ok,'image/png'));return [...new Uint8Array(await b.arrayBuffer())];
 });
 await page.locator('#utilityFiles').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(bytes)});
 await page.locator('#compressQuality').fill('50');
 await page.locator('#utilityRun').click();
 await expect(page.locator('.utility-result')).toContainText('test-compressed.jpg');
 await expect(page.locator('.utility-result')).toContainText('Original:');
 expect(posts).toBe(0);
});
