import {test,expect} from '@playwright/test';

test('BASE #20: Product Video header reuses the approved Deepsyq icon and guided workflow stays untouched',async({page})=>{
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.goto('/product-video.html');
 const brand=page.getByRole('link',{name:'Deepsyq Home',exact:true});
 await expect(brand).toBeVisible();
 await expect(brand).toHaveAttribute('href','deepsyq.html');
 await expect(brand.locator('.brand-name')).toHaveText('Deepsyq');
 const icon=brand.locator('.brand-mark img');
 await expect(icon).toHaveAttribute('src','deepsyq-logo.png');
 await expect(icon).toBeVisible();
 await expect.poll(()=>icon.evaluate(img=>img.complete&&img.naturalWidth>0&&img.naturalHeight>0)).toBe(true);
 const badge=await brand.evaluate(link=>{
  const span=link.querySelector('.brand-mark'),img=span.querySelector('img');
  const rect=link.getBoundingClientRect();
  return {
   placeholderText:span.textContent.trim(),
   background:getComputedStyle(span).backgroundImage,
   width:Math.round(img.getBoundingClientRect().width),
   height:Math.round(img.getBoundingClientRect().height),
   insideViewport:rect.left>=0&&rect.right<=innerWidth+1
  };
 });
 expect(badge).toEqual({placeholderText:'',background:'none',width:31,height:31,insideViewport:true});
 await expect(page.locator('header a[href="ai-apps.html"]')).toBeVisible();
 await expect(page.locator('header a[href="generate-studio.html?studio=video"]')).toBeVisible();
 const headerLinks=await page.locator('header a').evaluateAll(links=>links.map(link=>({right:link.getBoundingClientRect().right,left:link.getBoundingClientRect().left,viewport:innerWidth})));
 for(const link of headerLinks){expect(link.left).toBeGreaterThanOrEqual(-1);expect(link.right).toBeLessThanOrEqual(link.viewport+1);}
 await expect(page.locator('#workflow')).toBeVisible();
 await expect(page.locator('#photos')).toHaveAttribute('multiple','');
 await expect(page.locator('#continue')).toBeVisible();
 expect(posts).toBe(0);
});
