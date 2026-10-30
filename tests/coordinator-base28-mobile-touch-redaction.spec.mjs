import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

// This suite is run ONLY in Playwright's real mobile Chromium project.
// Chromium's CDP Input.dispatchTouchEvent generates browser-trusted touch
// pointer events; page.mouse (the old desktop fixture) is not used.
async function pngFixture(page){
  const bytes=await page.evaluate(async()=>{
    const canvas=document.createElement('canvas');
    canvas.width=120;canvas.height=80;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='rgb(224,32,32)';
    ctx.fillRect(0,0,120,80);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  return Buffer.from(bytes);
}

async function dragWithRealBrowserTouch(page){
  const canvas=page.locator('#redactCanvas');
  await expect(canvas).toBeVisible();
  const box=await canvas.boundingBox();
  expect(box).toBeTruthy();
  await canvas.evaluate(element=>{
    window.__redactTouch=[];
    for(const type of ['pointerdown','pointermove','pointerup']){
      element.addEventListener(type,event=>{
        if(window.__redactTouch.length<24){
          window.__redactTouch.push({
            type:event.type,pointerType:event.pointerType,trusted:event.isTrusted
          });
        }
      });
    }
  });
  const x1=box.x+box.width*0.20,y1=box.y+box.height*0.20;
  const x2=box.x+box.width*0.75,y2=box.y+box.height*0.78;
  const cdp=await page.context().newCDPSession(page);
  try{
    await cdp.send('Input.dispatchTouchEvent',{
      type:'touchStart',touchPoints:[{x:x1,y:y1,id:17}]
    });
    for(let i=1;i<=8;i++){
      await cdp.send('Input.dispatchTouchEvent',{
        type:'touchMove',
        touchPoints:[{
          x:x1+(x2-x1)*i/8,y:y1+(y2-y1)*i/8,id:17
        }]
      });
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }finally{await cdp.detach();}
  const events=await page.evaluate(()=>window.__redactTouch);
  expect(events.some(x=>x.type==='pointerdown'&&x.pointerType==='touch'&&x.trusted)).toBe(true);
  expect(events.some(x=>x.type==='pointerup'&&x.pointerType==='touch'&&x.trusted)).toBe(true);
  return events;
}

async function upload(page,name='private.png'){
  await page.goto('/mobile-utility.html?tool=photo-redact');
  await page.locator('#utilityFiles').setInputFiles({
    name,mimeType:'image/png',buffer:await pngFixture(page)
  });
  await expect.poll(()=>page.locator('#redactCanvas').evaluate(c=>
    c.width===120&&c.height===80&&c.getContext('2d').getImageData(2,2,1,1).data[0]===224
  )).toBe(true);
  await expect(page.locator('#utilityRun')).toBeEnabled();
}

test('BASE28 mobile: trusted native touch drag permanently obscures downloaded pixels',async({page})=>{
  let posts=0;page.on('request',req=>{if(req.method()==='POST')posts++;});
  await upload(page);
  await dragWithRealBrowserTouch(page);
  await page.locator('#utilityRun').click();
  await expect(page.locator('#utilityResults .utility-result')).toContainText('private-redacted.png');
  const next=page.waitForEvent('download');
  await page.locator('#utilityResults .utility-result button').click();
  const data=await readFile(await (await next).path());
  expect(data.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  const pixels=await page.evaluate(async bytes=>{
    const u=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'image/png'}));
    try{
      const image=new Image();image.src=u;await image.decode();
      const c=document.createElement('canvas');c.width=image.width;c.height=image.height;
      const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
      return {hidden:[...ctx.getImageData(54,40,1,1).data],
        untouched:[...ctx.getImageData(3,3,1,1).data]};
    }finally{URL.revokeObjectURL(u);}
  },Array.from(data));
  expect(pixels.hidden).toEqual([0,0,0,255]);
  expect(pixels.untouched).toEqual([224,32,32,255]);
  expect(posts).toBe(0);
});

test('BASE28 mobile: cancel while PNG encode is pending never publishes private photo',async({page})=>{
  let posts=0;page.on('request',req=>{if(req.method()==='POST')posts++;});
  await upload(page);
  await dragWithRealBrowserTouch(page);
  await page.evaluate(()=>{
    const native=HTMLCanvasElement.prototype.toBlob;
    const pending=[];
    window.__pendingRedactEncodes=()=>pending.length;
    window.__releaseRedactEncodes=()=>pending.splice(0).forEach(fn=>fn());
    HTMLCanvasElement.prototype.toBlob=function(callback,...args){
      return native.call(this,blob=>pending.push(()=>callback(blob)),...args);
    };
  });
  await page.locator('#utilityRun').click();
  await expect.poll(()=>page.evaluate(()=>window.__pendingRedactEncodes())).toBe(1);
  await page.locator('#utilityCancel').click();
  await page.evaluate(()=>window.__releaseRedactEncodes());
  await expect(page.locator('#utilityResults .utility-result')).toHaveCount(0);
  await expect(page.locator('#utilityStatus')).toContainText('Canceled');
  expect(posts).toBe(0);
});

test('BASE28 mobile: changing private source revokes touch-created blob and clears BFCache data',async({page})=>{
  let posts=0;page.on('request',req=>{if(req.method()==='POST')posts++;});
  await upload(page,'first.png');
  await page.evaluate(()=>{
    const native=URL.revokeObjectURL;
    window.__revoked=[];
    URL.revokeObjectURL=function(url){window.__revoked.push(url);return native.call(URL,url);};
  });
  await dragWithRealBrowserTouch(page);
  await page.locator('#utilityRun').click();
  const image=page.locator('#utilityResults .utility-result img');
  await expect(image).toBeVisible();
  const src=await image.getAttribute('src');
  expect(src).toMatch(/^blob:/);
  await page.locator('#utilityFiles').setInputFiles({
    name:'second.png',mimeType:'image/png',buffer:await pngFixture(page)
  });
  await expect.poll(()=>page.evaluate(url=>window.__revoked.includes(url),src)).toBe(true);
  await expect(page.locator('#utilityResults .utility-result')).toHaveCount(0);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator('#utilityFiles')).toHaveValue('');
  await expect(page.locator('#redactCanvas')).toHaveJSProperty('width',1);
  await expect(page.locator('#utilityRun')).toBeDisabled();
  expect(posts).toBe(0);
});
