import {test,expect} from '@playwright/test';

// Independent Agent 5 brand smoke: the exact original logo is byte-pinned by
// tests/deepsyq-brand-identity.spec.mjs. These checks prove real HTTP + DOM
// image rendering, not release readiness or visual sign-off of the full Home.
test('approved Deepsyq logo is loaded and legible in desktop sidebar and mobile header',async({page})=>{
 const writes=[];
 page.on('request',request=>{if(request.method()==='POST')writes.push(request.url())});
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 const sidebar=page.locator('#sidebar .brand img[src="deepsyq-logo.png"]');
 await expect(sidebar).toBeVisible();
 await expect.poll(()=>sidebar.evaluate(img=>img.complete?img.naturalWidth:0)).toBe(1254);
 const big=await sidebar.boundingBox();
 expect(big).not.toBeNull();
 expect(big.width).toBeGreaterThanOrEqual(24);
 expect(big.height).toBeGreaterThanOrEqual(24);
 await expect(page.locator('#sidebar .brand-name')).toHaveText('Deepsyq');
 await page.setViewportSize({width:390,height:844});
 const top=page.locator('.top-brand img[src="deepsyq-logo.png"]');
 await expect(top).toBeVisible();
 await expect.poll(()=>top.evaluate(img=>img.complete?img.naturalWidth:0)).toBe(1254);
 const small=await top.boundingBox();
 expect(small).not.toBeNull();
 expect(small.width).toBeGreaterThanOrEqual(20);
 expect(small.height).toBeGreaterThanOrEqual(20);
 await expect(page.locator('.top-brand')).toContainText('Deepsyq');
 expect(writes).toEqual([]); // logo rendering must not start billing, upload or AI generation
});

test('Deepsyq install identity serves its own PWA icons while old app keeps its manifest',async({page,request})=>{
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','deepsyq.webmanifest');
 await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href','deepsyq-install-192.png');
 const branded=await request.get('/deepsyq.webmanifest');
 expect(branded.ok()).toBeTruthy();
 const manifest=await branded.json();
 expect(manifest.short_name).toBe('Deepsyq');
 expect(manifest.start_url).toBe('/deepsyq.html');
 for(const icon of manifest.icons){
  const response=await request.get('/'+icon.src);
  expect(response.status(),icon.src).toBe(200);
  expect(response.headers()['content-type'],icon.src).toContain('image/png');
 }
 const favicon=await request.get('/favicon.ico');
 expect(favicon.status()).toBe(200);
 const legacy=await request.get('/manifest.webmanifest');
 expect(legacy.status()).toBe(200);
 expect((await legacy.json()).short_name).toBe('Uniquifier');
});
