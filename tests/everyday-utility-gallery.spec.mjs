import {test,expect} from '@playwright/test';
const ids=['scan-pdf','pdf-merge','pdf-split','pdf-sign','pdf-compress','photo-convert','photo-resize',
 'video-trim','video-mute','audio-trim','qr','photo-redact','photo-ocr','zip','captions','photo-compress',
 'video-compress','teleprompter','photo-collage'];
test('owner 22 genuine generated photos: 19 real cards, one wide banner, two wide speech links',async({page})=>{
 const writes=[];page.on('request',r=>{if(r.url().includes('/api/')&&!['GET','HEAD','OPTIONS'].includes(r.method()))writes.push(r.url());});
 const r=await page.goto('/free-tools.html',{waitUntil:'domcontentloaded'});
 expect(r.status()).toBe(200);
 const grid=page.locator('#mobileUtilityGrid');
 await expect(grid).toHaveAttribute('data-owner-photo-version','20261024');
 await expect(grid.locator('a.et-photo-card')).toHaveCount(19);
 await expect(page.locator('a.et-owner-bg-banner')).toHaveCount(1);
 await expect(page.locator('.et-owner-voices a.et-owner-voice-card')).toHaveCount(2);
 await expect(page.locator('.utility-tools-preview')).toHaveAttribute('data-utility-gallery-count','22');
 await expect(page.locator('#dsSiteSidebar a[href="free-tools.html"]')).toContainText('Everyday Tools');
 await expect(page.locator('.et-picker option[value="all"]')).toContainText('Everyday Tools');
 for(const id of ids){
  const card=grid.locator('a[data-utility="'+id+'"]');
  await expect(card).toHaveCount(1);
  await expect(card.locator('img.et-owner-photo')).toHaveAttribute('src','media/everyday-utilities-owner-20261024/'+id+'.webp');
  const imgResponse=await page.request.get('/media/everyday-utilities-owner-20261024/'+id+'.webp');
  expect(imgResponse.status(),id).toBe(200);
  const b=await imgResponse.body();
  expect(b.toString('ascii',0,4),id).toBe('RIFF');expect(b.toString('ascii',8,12),id).toBe('WEBP');
  expect(b.length,id).toBeGreaterThan(9000);
  const href=await card.getAttribute('href');
  if(id==='photo-collage')expect(href).toBe('photo-collage.html');
  else if(id==='teleprompter')expect(href).toBe('teleprompter.html');
  else expect(href).toBe('mobile-utility.html?tool='+id);
 }
 const banner=page.locator('a.et-owner-bg-banner');
 await expect(banner).toHaveAttribute('href','simple-background-remover.html');
 await expect(banner.locator('.et-owner-wide-art')).toHaveAttribute('src','media/everyday-utilities-owner-20261024/background-remover.webp');
 for(const id of ['background-remover','tts','stt']){
  const res=await page.request.get('/media/everyday-utilities-owner-20261024/'+id+'.webp');
  expect(res.status(),id).toBe(200);
 }
 for(const id of ['tts','stt']){
  const a=page.locator('.et-owner-voices a[data-hub-tool="'+id+'"]');
  await expect(a).toHaveAttribute('href','audio-studio.html?tool='+id);
  await expect(a.locator('img.et-owner-voice-art')).toHaveAttribute('src','media/everyday-utilities-owner-20261024/'+id+'.webp');
 }
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow,'no horizontal overflow').toBeLessThanOrEqual(1);
 expect(writes).toEqual([]);
});
test('4 columns desktop, two wide speech tiles, one full width background banner',async({page})=>{
 await page.goto('/free-tools.html');
 const grid=page.locator('#mobileUtilityGrid');
 const template=await grid.evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').filter(Boolean).length);
 if(await page.evaluate(()=>window.innerWidth>1400))expect(template).toBe(4);
 if(await page.evaluate(()=>window.innerWidth<640))expect(template).toBe(1);
 await expect(page.locator('.et-owner-bg-banner')).toBeVisible();
 await expect(page.locator('.et-owner-voices a.et-owner-voice-card')).toHaveCount(2);
});
for(const id of ['qr','audio-trim']){
 test('genuine '+id+' utility still opens, without paid AI POST',async({page})=>{
  const posts=[];page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/'))posts.push(r.url());});
  await page.goto('/free-tools.html');
  const link=page.locator('#mobileUtilityGrid a[data-utility="'+id+'"]');
  await expect(link).toBeVisible();await link.click();
  await expect(page).toHaveURL(new RegExp('mobile-utility\\.html\\?tool='+id));
  await expect(page.locator('#utilityTitle')).toBeVisible();
  expect(posts).toEqual([]);
 });
}