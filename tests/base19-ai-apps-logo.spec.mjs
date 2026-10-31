import {test,expect} from '@playwright/test';

test('BASE #19: AI Apps uses the actual approved Deepsyq image asset, not a placeholder badge',async({page})=>{
 let writes=0;
 page.on('request',r=>{if(r.method()==='POST')writes++;});
 await page.goto('/ai-apps.html');
 const brand=page.getByRole('link',{name:'Deepsyq Home',exact:true});
 await expect(brand).toBeVisible();
 await expect(brand).toHaveAttribute('href','deepsyq.html');
 await expect(brand.locator('.brand-name')).toHaveText('Deepsyq');
 const actual=brand.locator('.brand-mark img');
 await expect(actual).toHaveAttribute('src','deepsyq-logo.png');
 await expect(actual).toBeVisible();
 await expect.poll(()=>actual.evaluate(img=>img.complete&&img.naturalWidth>0&&img.naturalHeight>0)).toBe(true);
 const appearance=await brand.evaluate(anchor=>{
  const mark=anchor.querySelector('.brand-mark');
  const img=mark.querySelector('img');
  return {
   badgeText:mark.textContent.trim(),
   backgroundImage:getComputedStyle(mark).backgroundImage,
   imageWidth:Math.round(img.getBoundingClientRect().width),
   imageHeight:Math.round(img.getBoundingClientRect().height),
   anchorVisible:anchor.getBoundingClientRect().width>0,
   withinViewport:anchor.getBoundingClientRect().right<=innerWidth+1
  };
 });
 expect(appearance).toEqual({
  badgeText:'',backgroundImage:'none',imageWidth:32,imageHeight:32,
  anchorVisible:true,withinViewport:true
 });
 await expect(page.locator('nav[aria-label="Main navigation"] a[aria-current="page"]')).toHaveText('AI Apps');
 await expect(page.locator('#appsTitle')).toBeVisible();
 await expect(page.locator('a.skip-link')).toHaveAttribute('href','#appsTitle');
 expect(writes).toBe(0);
});
