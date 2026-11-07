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


test('Owner: Deepsyq wordmark follows AI Apps vertical reference on Home and other pages',async({page},info)=>{
 test.setTimeout(85000);
 const mobile=info.project.name.startsWith('mobile');
 await page.setViewportSize({width:mobile?390:1448,height:900});
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
 const writes=[];
 page.on('request',request=>{if(request.method()==='POST'&&/\/api\/(?:billing|studio\/jobs|generation|wallet)/.test(request.url()))writes.push(request.url());});
 const getCenter=async selector=>{
  const el=page.locator(selector);
  await expect(el).toBeVisible({timeout:13000});
  return el.evaluate(x=>{const b=x.getBoundingClientRect();return b.top+b.height/2;});
 };
 await page.goto('/ai-apps.html',{waitUntil:'domcontentloaded'});
 const reference=await getCenter(mobile?'header .ds-mobile-brand':'#dsSiteSidebar .ds-site-brand');
 const pages=['/deepsyq.html','/canvas.html','/pricing.html','/generate-studio.html?studio=image','/free-tools.html','/my-creations.html'];
 for(const url of pages){
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const selector=mobile?'header .ds-mobile-brand':url==='/deepsyq.html'?'#sidebar .sidebar-head > .brand':'#dsSiteSidebar .ds-site-brand';
  const center=await getCenter(selector);
  expect(Math.abs(center-reference),url+' must align the Deepsyq wordmark center with AI Apps').toBeLessThanOrEqual(2.5);
  await expect(page.locator(selector)).toContainText('Deepsyq');
 }
 expect(writes).toEqual([]);
});
