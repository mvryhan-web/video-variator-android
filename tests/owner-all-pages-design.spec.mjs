import {test,expect} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const pages=JSON.parse(await readFile(new URL('./fixtures/owner-design-pages.json',import.meta.url),'utf8'));
// Real frontend, signed out, read-only existing preview. Never mock owner data,
// billing success, generated results or enabled provider capabilities.
for(const entry of pages){
 test(entry.id+' '+entry.name,async({page},info)=>{
  await page.addInitScript(()=>localStorage.setItem('vu_theme','dark'));
  const writes=[];
  await page.route('**/api/**',async route=>{
   if(!['GET','HEAD','OPTIONS'].includes(route.request().method())){
    writes.push(route.request().url());
    return route.fulfill({status:503,contentType:'application/json',body:'{"error":"READ_ONLY_VISUAL_QA"}'});
   }
   return route.continue();
  });
  const response=await page.goto(entry.url,{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  await expect(page.locator('body')).toBeVisible();
  const studio=entry.url.startsWith('/generate-studio.html');
  await expect(page.locator(studio?'link[href="studio-classic-theme.css"]':'link[href="deepsyq-global-theme.css"]')).toHaveCount(1);
  if(studio){await expect(page.locator('.ds-studio-examples')).toHaveCount(0);await expect(page.locator('script[src="approved-page-design.js"]')).toHaveCount(0);}
  if(entry.id==='08-audio-tools'){
   await expect(page.locator('#toolAccessBanner')).toBeVisible();
   const hero=await page.locator('.ds-approved-hero').boundingBox();
   const tool=await page.locator('.tool-card').filter({has:page.locator('#speechText')}).boundingBox();
   if(info.project.name.startsWith('desktop'))expect(hero.width).toBeGreaterThan(tool.width*1.7);
  }
  if(entry.id==='31-qr')await expect(page.locator('.ds-approved-art')).toHaveCount(0);
  if(entry.id==='06-apps')await expect(page.locator('#apps .app-card').first()).toBeVisible();
  if(entry.url.startsWith('/index.html#')){
   await expect(page.locator('#'+entry.url.split('#')[1]+'View')).toHaveClass(/active/);
  }
  if(entry.id==='01-home'){
   await expect(page.locator('body')).toHaveClass(/home-neon/);
   await expect(page.locator('#homeHeroCarousel')).toHaveCount(1);
  }else{
   expect(await page.locator('body').evaluate(n=>n.matches('.home-neon'))).toBe(false);
  }
  if(info.project.name.startsWith('mobile')){
   const overlap=await page.evaluate(()=>{
    const a=document.querySelector('main>header a'),b=document.querySelector('.ds-site-mobile-toggle');
    if(!a||!b)return false;const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
    return x.width>0&&y.width>0&&x.left<y.right&&x.right>y.left&&x.top<y.bottom&&x.bottom>y.top;
   });expect(overlap,'Mobile navigation toggle must not cover the Back link').toBe(false);
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow,entry.url+' horizontal overflow').toBeLessThanOrEqual(1);
  expect(writes,'Screens must not initiate account, payment or generation writes').toEqual([]);
  await page.evaluate(async()=>{await document.fonts.ready;});
  const dir=path.resolve('test-results/design-pages',info.project.name);
  await mkdir(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,entry.id+'.png'),fullPage:false,animations:'disabled'});
 });
}
