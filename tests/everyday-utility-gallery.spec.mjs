import {test,expect} from '@playwright/test';
const ids=['scan-pdf','pdf-merge','pdf-split','pdf-sign','pdf-compress','photo-convert','photo-resize',
 'video-trim','video-mute','audio-trim','qr','photo-redact','photo-ocr','zip','captions','photo-compress',
 'video-compress','teleprompter','photo-collage','background-remover','tts','stt'];
test('22 unique 16:9 images, consistent names and real registered hrefs, desktop/mobile',async({page})=>{
 const writes=[];
 page.on('request',r=>{if(r.url().includes('/api/')&&!['GET','HEAD','OPTIONS'].includes(r.method()))writes.push(r.url());});
 const response=await page.goto('/free-tools.html',{waitUntil:'domcontentloaded'});
 expect(response.status()).toBe(200);
 const grid=page.locator('#mobileUtilityGrid');
 await expect(grid).toHaveAttribute('data-illustrated','true');
 await expect(grid.locator('a.et-utility-card')).toHaveCount(22);
 await expect(page.locator('#dsSiteSidebar a[href="free-tools.html"]')).toContainText('Everyday Tools');
 await expect(page.locator('.et-picker option[value="all"]')).toContainText('Everyday Tools');
 for(const id of ids){
  const card=grid.locator('a[data-utility="'+id+'"]');
  await expect(card).toHaveCount(1);
  await expect(card.locator('img.et-utility-art')).toHaveAttribute('src','media/everyday-utilities-20261023/'+id+'.svg');
  const response=await page.request.get('/media/everyday-utilities-20261023/'+id+'.svg');
  expect(response.status(),id).toBe(200);
  expect(await response.text(),id).toMatch(/width="960" height="540" viewBox="0 0 960 540"/);
  const href=await card.getAttribute('href');
  expect(href,id).toBeTruthy();
  if(id==='background-remover')expect(href).toBe('simple-background-remover.html');
  else if(id==='photo-collage')expect(href).toBe('photo-collage.html');
  else if(id==='teleprompter')expect(href).toBe('teleprompter.html');
  else if(['tts','stt'].includes(id))expect(href).toContain('audio-studio.html?tool='+id);
  else expect(href).toBe('mobile-utility.html?tool='+id);
 }
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow,'no horizontal overflow').toBeLessThanOrEqual(1);
 expect(writes).toEqual([]);
});
for(const id of ['qr','audio-trim']){
 test('real utility '+id+' route opens via lower image card without paid API calls',async({page})=>{
  const posts=[];page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/'))posts.push(r.url());});
  await page.goto('/free-tools.html',{waitUntil:'domcontentloaded'});
  const link=page.locator('#mobileUtilityGrid a[data-utility="'+id+'"]');
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(new RegExp('mobile-utility\\.html\\?tool='+id));
  await expect(page.locator('#utilityTitle')).toBeVisible();
  expect(posts).toEqual([]);
 });
}