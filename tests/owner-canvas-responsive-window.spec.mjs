import {test,expect} from '@playwright/test';

test('Canvas responds to a desktop browser window being resized without overlap',async({page})=>{
  await page.setViewportSize({width:1600,height:900});
  await page.goto('/canvas.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#cwGallery [data-cw-photo]')).toHaveCount(13,{timeout:20000});
  for(const width of [1600,1390,1280,1150,1024,940,900,820,780,761,760,600,390]){
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const x=await page.evaluate(()=>{
      function rect(sel){const el=document.querySelector(sel),r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};}
      const body=rect('#canvasWorkspace'),editor=rect('.cw-editor'),library=rect('.cw-library'),inspector=rect('.cw-inspector'),rail=rect('.cw-rail');
      return {viewport:innerWidth,body,editor,library,inspector,rail,grid:getComputedStyle(document.querySelector('.cw-workspace-grid')).display,mode:getComputedStyle(document.querySelector('.cw-workspace-grid')).gridTemplateColumns};
    });
    expect(x.body.width,'Canvas disappeared at '+width).toBeGreaterThan(280);
    expect(x.editor.width,'Editor collapsed at '+width).toBeGreaterThan(width>=1000?380:width>=760?280:260);
    expect(x.editor.left,'Editor disappeared left at '+width).toBeGreaterThanOrEqual(-1);
    expect(x.editor.right,'Editor extends out of browser at '+width).toBeLessThanOrEqual(width+2);
    expect(x.library.right,'Gallery extends out of browser at '+width).toBeLessThanOrEqual(width+2);
    expect(x.inspector.right,'Inspector extends out of browser at '+width).toBeLessThanOrEqual(width+2);
    const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>8&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>8;
    expect(overlap(x.library,x.editor),'Gallery overlaps editor at '+width).toBe(false);
    expect(overlap(x.inspector,x.editor),'Inspector overlaps editor at '+width).toBe(false);
    if(width>760)expect(overlap(x.rail,x.editor),'Toolbar overlaps editor at '+width).toBe(false);
  }
  await page.locator('[data-cw-tool="text"]').click();
  await expect(page.locator('#cwInlineText')).toBeVisible();
  await page.locator('#cwInlineText').fill('Responsive Canvas');
  await expect(page.locator('#cwTextContent')).toHaveValue('Responsive Canvas');
  await page.locator('#cwGallery [data-cw-photo="demo-4"]').click();
  await expect(page.locator('#cwGallery [data-cw-photo="demo-4"]')).toHaveAttribute('aria-pressed','true');
});
