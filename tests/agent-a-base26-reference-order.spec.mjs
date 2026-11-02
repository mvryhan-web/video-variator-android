import {test,expect} from '@playwright/test';

// REAL local PNGs, native File inputs, Canvas button events, IndexedDB handoff
// and destination Studio reference thumbnails. Only disabled public catalog is
// fixture metadata: no external provider or paid generation is invoked.
const model={
 id:'gemini-3.1-flash-image',label:'Local test image model',kind:'image',
 provider:'Google',adapter:true,enabled:false,references:2,ratios:['1:1','3:2'],quality:'1K',
 capabilities:{resolutions:['1K'],outputFormats:['auto','png'],ratios:['1:1','3:2']}
};
for(const width of [320,390,768,1448]){
 test('A39 Canvas move reference up/down, keyboard and genuine ordered Studio handoff '+width+'px',async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width,height:850});
  await page.addInitScript(()=>localStorage.setItem('vv_token','a39-reference-owner'));
  await page.route('**/api/studio/config',route=>route.fulfill({json:{
   enabled:false,ownerOnly:true,models:[],catalog:[model]
  }}));
  const paid=[];
  page.on('request',r=>{
   const pathname=new URL(r.url()).pathname;
   if(r.method()==='POST'&&/^\/api\/(?:studio\/jobs|billing|ai-billing|stripe|generation)/.test(pathname))
    paid.push(pathname);
  });
  await page.goto('/canvas.html');
  await expect(page.locator('#quickCreatePrompt')).toBeVisible();
  await page.locator('#quickCreatePrompt').fill('Create a realistic editorial composition from the reference materials');
  const pngs=await page.evaluate(()=>{
   return [[231,38,45],[29,175,87],[37,110,222]].map(rgb=>{
    const c=document.createElement('canvas');c.width=c.height=16;
    const ctx=c.getContext('2d');ctx.fillStyle='rgb('+rgb.join(',')+')';ctx.fillRect(0,0,16,16);
    return c.toDataURL('image/png').split(',')[1];
   });
  });
  const names=['red.png','green.png','blue.png'];
  await page.locator('#quickCreateFiles').setInputFiles(pngs.map((str,i)=>({
   name:names[i],mimeType:'image/png',buffer:Buffer.from(str,'base64')
  })));
  const refs=page.locator('#quickCreatePreviews .quick-reference');
  const namesNow=()=>page.locator('#quickCreatePreviews .quick-reference-name').allTextContents();
  await expect(refs).toHaveCount(3);
  expect(await namesNow()).toEqual(names);
  await expect(refs.first().getByRole('button',{name:'Move reference 1 earlier'})).toBeDisabled();
  await expect(refs.last().getByRole('button',{name:'Move reference 3 later'})).toBeDisabled();
  // Keyboard-triggered real DOM button, not direct call into private Canvas code.
  const lastUp=refs.last().getByRole('button',{name:'Move reference 3 earlier'});
  await lastUp.focus();await lastUp.press('Enter');
  expect(await namesNow()).toEqual(['red.png','blue.png','green.png']);
  await refs.nth(1).getByRole('button',{name:'Move reference 2 earlier'}).click();
  expect(await namesNow()).toEqual(['blue.png','red.png','green.png']);
  await expect(page.locator('#quickCreateStatus')).toContainText('blue.png moved to position 1');
  // Remove the third image so the destination fixture model can accept both.
  await refs.last().getByRole('button',{name:'Remove reference 3'}).click();
  expect(await namesNow()).toEqual(['blue.png','red.png']);
  await page.locator('#quickCreateSubmit').click();
  await expect(page).toHaveURL(/\/generate-studio\.html\?studio=image&from=canvas$/);
  await expect(page.locator('#refPreview img')).toHaveCount(2);
  const pixels=await page.locator('#refPreview img').evaluateAll(async imgs=>{
   await Promise.all(imgs.map(img=>img.decode()));
   return imgs.map(img=>{
    const c=document.createElement('canvas');c.width=c.height=1;
    const ctx=c.getContext('2d');ctx.drawImage(img,0,0,1,1);
    return Array.from(ctx.getImageData(0,0,1,1).data);
   });
  });
  // Reordering changed the actual transferred PNG media, not just caption DOM.
  expect(pixels[0][2]).toBeGreaterThan(170); // blue reference first
  expect(pixels[0][0]).toBeLessThan(80);
  expect(pixels[1][0]).toBeGreaterThan(170); // red reference second
  expect(pixels[1][2]).toBeLessThan(100);
  await expect(page.locator('#consent')).not.toBeChecked();
  await expect(page.locator('#generate')).toBeDisabled();
  expect(paid).toEqual([]);
 });
}
