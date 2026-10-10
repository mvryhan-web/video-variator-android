import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route(/accounts\.google\.com|appleid\.cdn-apple\.com/,route=>route.abort());});
test('preview preserves geometry, delegates save/share, and releases media on close',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>{
    window.previewCalls=[];window.revoked=[];
    const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=url=>{window.revoked.push(url);revoke(url);};
    window.openPreview=()=>VUWowMontagePreview.open({name:'WOW result.mp4',blob:new Blob(['fixture'],{type:'video/mp4'}),save:async(name,blob)=>previewCalls.push(['save',name,blob.size]),share:async(name,blob)=>previewCalls.push(['share',name,blob.size])});
    document.getElementById('startBtn').focus();openPreview();
  });
  const dialog=page.getByRole('dialog',{name:'WOW Montage result'});
  await expect(dialog).toBeVisible();await expect(dialog.locator('video')).toHaveAttribute('playsinline','');
  expect(await dialog.locator('video').evaluate(el=>el.autoplay)).toBe(false);
  for(const width of [320,390,768]){await page.setViewportSize({width,height:844});const box=await dialog.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);}
  await dialog.getByRole('button',{name:'Download',exact:true}).click();await dialog.getByRole('button',{name:'Share',exact:true}).click();
  expect(await page.evaluate(()=>previewCalls)).toEqual([['save','WOW result.mp4',7],['share','WOW result.mp4',7]]);
  await page.evaluate(()=>openPreview());expect(await page.evaluate(()=>revoked.length)).toBe(1);
  await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();await expect(dialog).toHaveCount(0);expect(await page.evaluate(()=>revoked.length)).toBe(2);
});
test('failed save is visible and can be retried; cancelling share is quiet',async({page})=>{
  await page.goto('/');await page.evaluate(()=>VUWowMontagePreview.open({name:'clip.mp4',blob:new Blob(['clip']),save:async()=>{throw Error('save failed');},share:async()=>{throw new DOMException('cancelled','AbortError');}}));
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Download',exact:true}).click();await expect(dialog.getByRole('status')).toContainText('Please try again');await expect(dialog.getByRole('button',{name:'Download',exact:true})).toBeEnabled();
  await dialog.getByRole('button',{name:'Share',exact:true}).click();await expect(dialog.getByRole('status')).toBeEmpty();
});
test('WOW control stays fixed during a job and becomes available afterwards',async({page})=>{
  await page.goto('/');const toggle=page.getByRole('switch',{name:'WOW Montage'});await toggle.focus();await toggle.press('Space');
  await page.evaluate(()=>VUWowMontageUI.setBusy(true));await expect(toggle).toBeDisabled();await expect(toggle).toBeChecked();
  await page.evaluate(()=>VUWowMontageUI.setBusy(false));await expect(toggle).toBeEnabled();await expect(toggle).toBeChecked();
});
test('completed WOW output keeps preview in history after reload without rerendering',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{
    window.encodeCount=0;
    VideoVariatorCore.estimateCredits=async()=>({sourceCount:1,sourceSeconds:1,creditSeconds:1});
    VideoVariatorCore.process=async options=>{encodeCount++;await options.onResult({id:'wow-preview-fixture',name:'finished.mp4',blob:new Blob(['finished media'],{type:'video/mp4'}),createdAt:new Date().toISOString(),resolution:'720p',aspectRatio:'16:9',wowMontage:{status:'applied',profile:'calm'}});return {outputCount:1,sourceCount:1,creditSeconds:1};};
  });
  await page.locator('#fileInput').setInputFiles({name:'input.mp4',mimeType:'video/mp4',buffer:Buffer.from('UI fixture')});
  const toggle=page.getByRole('switch',{name:'WOW Montage'});await toggle.focus();await toggle.press('Space');
  await expect(page.locator('#startBtn')).toBeEnabled();await page.locator('#startBtn').click();
  await expect(page.locator('#resultsCard')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.vv_history)[0].wowMontage.status)).toBe('applied');
  await page.locator('#historyList').getByRole('button',{name:'Preview',exact:true}).evaluate(button=>button.click());
  await expect(page.getByRole('dialog')).toBeVisible();expect(await page.evaluate(()=>encodeCount)).toBe(1);
  await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();await page.reload();
  const preview=page.locator('#historyList').getByRole('button',{name:'Preview',exact:true});await expect(preview).toHaveCount(1);await preview.evaluate(button=>button.click());await expect(page.getByRole('dialog')).toBeVisible();
});
