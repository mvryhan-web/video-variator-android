import {test,expect} from '@playwright/test';

const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGMUWXCHgYGBiYGBgYGBAQASIgGUB7TVswAAAABJRU5ErkJggg==','base64');

test('Product Video orders multiple existing image references and preserves valid photos after a bad replacement',async({page})=>{
 const jobs=[];
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))jobs.push(request.url());});
 await page.goto('/product-video.html');
 await page.locator('#photos').setInputFiles([
  {name:'front.png',mimeType:'image/png',buffer:tinyPng},
  {name:'detail.png',mimeType:'image/png',buffer:tinyPng}
 ]);
 await expect(page.locator('.photo-item')).toHaveCount(2);
 const orderedNames=()=>page.locator('.photo-item small').allTextContents();
 expect(await orderedNames()).toEqual(['1. front.png','2. detail.png']);
 await page.getByRole('button',{name:'Move photo 1 later'}).click();
 expect(await orderedNames()).toEqual(['1. detail.png','2. front.png']);
 await expect(page.locator('#status')).toContainText('Photo order updated');
 await page.locator('#photos').setInputFiles({name:'too-large.png',mimeType:'image/png',buffer:Buffer.alloc(1024*1024+1)});
 await expect(page.locator('#status')).toContainText('Your previous photos are preserved.');
 expect(await orderedNames()).toEqual(['1. detail.png','2. front.png']);
 await page.locator('#productName').fill('Handmade Mini Bag');
 await page.locator('#duration').selectOption('about 8 seconds');
 await expect(page.locator('#promptPreview')).toHaveValue(/Handmade Mini Bag.*8 seconds/s);
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,ownerOnly:true,models:[],catalog:[]}}));
 await page.locator('#continue').click();
 await expect(page).toHaveURL(/generate-studio\.html\?studio=video/);
 await expect(page.locator('#prompt')).toHaveValue(/Handmade Mini Bag/);
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(jobs).toHaveLength(0);
});

test('Product Video requires a chosen product reference without triggering generation',async({page})=>{
 let jobs=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))jobs++;});
 await page.goto('/product-video.html');
 await page.locator('#continue').click();
 await expect(page.locator('#status')).toHaveText('Add at least one product photo first.');
 await expect(page).toHaveURL(/product-video\.html/);
 expect(jobs).toBe(0);
});
