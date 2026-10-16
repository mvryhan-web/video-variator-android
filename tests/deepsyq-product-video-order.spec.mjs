import {test,expect} from '@playwright/test';

const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLytQAAAABJRU5ErkJggg==','base64');
const tinyJpg=Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP///////////////////////////////////////////////2wBDAf///////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGgP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z','base64');

test('Product Video orders multiple existing image references and preserves valid photos after a bad replacement',async({page})=>{
 const jobs=[];
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))jobs.push(request.url());});
 await page.goto('/product-video.html');
 await page.locator('#photos').setInputFiles([
  {name:'front.png',mimeType:'image/png',buffer:tinyPng},
  {name:'detail.jpg',mimeType:'image/jpeg',buffer:tinyJpg}
 ]);
 await expect(page.locator('.photo-item')).toHaveCount(2);
 const imageTypes=()=>page.locator('.photo-item img').evaluateAll(imgs=>Promise.all(imgs.map(async img=>(await fetch(img.src)).headers.get('content-type'))));
 expect(await imageTypes()).toEqual(['image/png','image/jpeg']);
 await page.getByRole('button',{name:'Move photo 1 later'}).click();
 expect(await imageTypes()).toEqual(['image/jpeg','image/png']);
 await expect(page.locator('#status')).toContainText('Photo order updated');
 await page.locator('#photos').setInputFiles({name:'too-large.png',mimeType:'image/png',buffer:Buffer.alloc(1024*1024+1)});
 await expect(page.locator('#status')).toContainText('previous valid selection is preserved');
 expect(await imageTypes()).toEqual(['image/jpeg','image/png']);
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
