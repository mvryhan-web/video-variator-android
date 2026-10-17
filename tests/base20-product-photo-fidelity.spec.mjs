import {test,expect} from '@playwright/test';

test('BASE #20: prepared Etsy brief uses exact product photos without provider submissions',async({page})=>{
 let jobPosts=0;
 page.on('request',req=>{if(req.method()==='POST'&&/\/api\/studio\/jobs/.test(req.url()))jobPosts++;});
 await page.goto('/product-video.html');
 await expect(page.locator('#continue')).toBeVisible();
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAG0lEQVR4nGNgYPh/4j8Dw384jcJh+H+CgaAKAPRlHinUv26iAAAAAElFTkSuQmCC','base64');
 await page.locator('#photos').setInputFiles([{name:'actual-product.png',mimeType:'image/png',buffer:png}]);
 await page.locator('#productName').fill('Holiday sweater printed graphic');
 await page.locator('#ratio').selectOption('1:1');
 await page.locator('#style').selectOption('lifestyle');
 await page.locator('#duration').selectOption('about 8 seconds');
 const prompt=await page.locator('#promptPreview').inputValue();
 expect(prompt).toContain('EXACT product');
 expect(prompt).toContain('ONLY source of truth');
 expect(prompt).toContain('PRINT ON FABRIC');
 expect(prompt).toContain('OMIT any unseen back');
 expect(prompt).toContain('No stock substitute');
 expect(prompt).toContain('Frame: 1:1');
 expect(prompt).toContain('Duration preference: about 8 seconds');
 expect(prompt).toContain('Holiday sweater printed graphic');
 expect(prompt.length).toBeLessThanOrEqual(2000);
 await expect(page.locator('#photoPreview img')).toHaveCount(1);
 expect(jobPosts).toBe(0);
});

test('BASE #20: local prompt preview does not fake a generation when no reference exists',async({page})=>{
 await page.goto('/product-video.html');
 await page.locator('#continue').click();
 await expect(page.locator('#status')).toContainText('Add at least one product photo first');
 await expect(page).toHaveURL(/product-video\.html$/);
});


test('BASE #20: spoofed/malformed image replacement never displaces the actual uploaded SKU',async({page})=>{
 let uploads=0;
 page.on('request',r=>{if(r.method()==='POST')uploads++;});
 await page.goto('/product-video.html');
 const valid=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAG0lEQVR4nGNgYPh/4j8Dw384jcJh+H+CgaAKAPRlHinUv26iAAAAAElFTkSuQmCC','base64');
 await page.locator('#photos').setInputFiles({name:'approved-sku.png',mimeType:'image/png',buffer:valid});
 await expect(page.locator('#photoPreview')).toContainText('approved-sku.png');
 const before=await page.locator('#promptPreview').inputValue();
 // Exact PNG magic bytes followed by corrupted payload: signature-only checks
 // would wrongly accept this, but browser decode must reject it.
 await page.locator('#photos').setInputFiles({name:'spoofed-source.png',mimeType:'image/png',buffer:Buffer.from('89504e470d0a1a0a0000000d494844520000','hex')});
 await expect(page.locator('#status')).toContainText('Your previous photos are preserved');
 await expect(page.locator('#photoPreview')).toContainText('approved-sku.png');
 await expect(page.locator('#photoPreview')).not.toContainText('spoofed-source');
 await expect(page.locator('#promptPreview')).toHaveValue(before);
 expect(uploads).toBe(0);
});


test('BASE #20: keyboard form submit cannot skip pending file signature validation',async({page})=>{
 let jobs=0;
 page.on('request',req=>{if(req.method()==='POST'&&/\/api\/studio\/jobs/.test(req.url()))jobs++;});
 await page.goto('/product-video.html');
 await page.evaluate(()=>{
  const nativeSlice=File.prototype.slice;
  File.prototype.slice=function(...args){
   const sample=nativeSlice.apply(this,args);
   return {arrayBuffer:()=>new Promise((resolve,reject)=>{
    setTimeout(()=>sample.arrayBuffer().then(resolve,reject),800);
   })};
  };
 });
 const original=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAG0lEQVR4nGNgYPh/4j8Dw384jcJh+H+CgaAKAPRlHinUv26iAAAAAElFTkSuQmCC','base64');
 await page.locator('#photos').setInputFiles({name:'reviewed-product.png',mimeType:'image/png',buffer:original});
 await expect(page.locator('#continue')).toBeDisabled();
 // Native requestSubmit can run despite the disabled button. This must fail
 // closed until both product image and optional logo have finished validation.
 await page.locator('#workflow').evaluate(form=>form.requestSubmit());
 await expect(page.locator('#status')).toContainText('Finish checking your images');
 await expect(page).toHaveURL(/product-video\.html$/);
 await expect(page.locator('#continue')).toBeEnabled();
 await expect(page.locator('#photoPreview')).toContainText('reviewed-product.png');
 expect(jobs).toBe(0);
});


test('BASE #20: rapid file picker change cannot reintroduce an earlier product reference',async({page})=>{
 let uploads=0;
 page.on('request',r=>{if(r.method()==='POST')uploads++;});
 await page.goto('/product-video.html');
 await page.evaluate(()=>{
  const nativeSlice=File.prototype.slice;
  File.prototype.slice=function(...args){
   const sample=nativeSlice.apply(this,args),name=this.name;
   return {arrayBuffer:async()=>{
    if(name==='outdated-product.png')await new Promise(resolve=>setTimeout(resolve,700));
    return sample.arrayBuffer();
   }};
  };
 });
 const valid=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAG0lEQVR4nGNgYPh/4j8Dw384jcJh+H+CgaAKAPRlHinUv26iAAAAAElFTkSuQmCC','base64');
 await page.locator('#photos').setInputFiles({name:'outdated-product.png',mimeType:'image/png',buffer:valid});
 await page.locator('#photos').setInputFiles({name:'final-product.png',mimeType:'image/png',buffer:valid});
 await expect(page.locator('#photoPreview')).toContainText('final-product.png');
 await page.waitForTimeout(900);
 await expect(page.locator('#photoPreview')).not.toContainText('outdated-product');
 await expect(page.locator('#continue')).toBeEnabled();
 expect(uploads).toBe(0);
});
