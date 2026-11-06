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

test('both installed PWA identities serve the approved Deepsyq icon set',async({page,request})=>{
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
 const oldManifest=await legacy.json();
 expect(oldManifest.short_name).toBe('Deepsyq');
 expect(oldManifest.id).toBe('/');
 expect(oldManifest.icons.some(icon=>icon.src==='deepsyq-icon-192.png')).toBeTruthy();
});

test('Video History and other creator pages show the official Deepsyq logo, including installed web icons',async({page,request})=>{
 const postPaid=[];
 page.on('request',req=>{
  const path=new URL(req.url()).pathname; if(req.method()==='POST'&&['/api/ai-billing/','/api/ai-wallet/','/api/studio/','/api/checkout/'].some(prefix=>path.startsWith(prefix)))postPaid.push(req.url());
 });
 await page.goto('/index.html?view=history',{waitUntil:'domcontentloaded'});
 await expect(page.locator('body')).toHaveClass(/vu-reference/);
 await expect(page.locator('#historyView')).toHaveClass(/active/);
 const logo=page.locator('.vu-appbar .vu-logo-image[src="deepsyq-logo.png"]');
 await expect(logo).toBeVisible();
 await expect.poll(()=>logo.evaluate(img=>img.complete?img.naturalWidth:0)).toBe(1254);
 await expect(page.locator('link[rel="icon"][href="favicon.ico"]')).toHaveCount(1);
 await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','manifest.webmanifest');
 const webManifest=await (await request.get('/manifest.webmanifest')).json();
 expect(webManifest.short_name).toBe('Deepsyq');
 expect(webManifest.icons.map(i=>i.src)).toContain('deepsyq-icon-192.png');
 await page.goto('/pricing.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.price-brand img[src="deepsyq-logo.png"]')).toBeVisible();
 await page.goto('/my-creations.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.ws-header-brand img[src="deepsyq-logo.png"]')).toBeVisible();
 expect(postPaid).toEqual([]);
});
