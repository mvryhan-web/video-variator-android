import {test,expect} from '@playwright/test';

test('shared video is imported once and never starts processing automatically',async({page})=>{
  await page.addInitScript(()=>{
    window.shareReadCount=0;window.shareFinishCount=0;
    window.AndroidBridge={
      getSharedVideos(){return shareFinishCount?'[]':JSON.stringify([{id:'fixture',name:'gallery.mp4',type:'video/mp4',size:4}]);},
      readSharedVideo(){shareReadCount++;return 'AQIDBA==';},
      finishSharedVideoImport(){shareFinishCount++;}
    };
  });
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>window.VideoVariatorCore?.getFiles().length)).toBe(1);
  expect(await page.evaluate(async()=>({name:VideoVariatorCore.getFiles()[0].name,bytes:Array.from(new Uint8Array(await VideoVariatorCore.getFiles()[0].arrayBuffer())),running:VideoVariatorCore.state.running}))).toEqual({name:'gallery.mp4',bytes:[1,2,3,4],running:false});
  await page.evaluate(()=>window.dispatchEvent(new Event('vu-shared-videos')));
  expect(await page.evaluate(()=>[shareReadCount,shareFinishCount])).toEqual([1,1]);
});

test('failed share keeps the previous selection',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>{
    VideoVariatorUI.setFiles([new File(['old'],'previous.mp4',{type:'video/mp4'})]);
    window.AndroidBridge={getSharedVideos:()=>JSON.stringify([{id:'bad',name:'bad.mp4',type:'video/mp4',size:4}]),readSharedVideo:()=>'',finishSharedVideoImport:()=>{}};
    window.dispatchEvent(new Event('vu-shared-videos'));
  });
  expect(await page.evaluate(()=>VideoVariatorCore.getFiles()[0].name)).toBe('previous.mp4');
});

test('tool back buttons have a visible touch target and return to dashboard',async({page})=>{
  for(const path of ['/free-tools.html','/avatar-studio.html']){
    await page.goto(path);
    const back=page.locator('header .tool-back');
    await expect(back).toBeVisible();
    const box=await back.boundingBox();
    // Current main intentionally matches the compact dashboard Back button (40px on narrow phones).
    expect(box.height).toBeGreaterThanOrEqual(40);
    expect(box.y).toBeGreaterThanOrEqual(20);
    await back.click();
    await expect(page).toHaveURL(/index.html$/);
  }
});

test('a job started during share import keeps its source selection',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>{
    VideoVariatorUI.setFiles([new File(['old'],'current-job.mp4',{type:'video/mp4'})]);
    window.shareFinished=false;
    window.AndroidBridge={getSharedVideos:()=>JSON.stringify([{id:'new',name:'new.mp4',type:'video/mp4',size:4}]),readSharedVideo(){VideoVariatorCore.state.running=true;return 'AQIDBA==';},finishSharedVideoImport(){shareFinished=true;}};
    window.dispatchEvent(new Event('vu-shared-videos'));
  });
  await expect.poll(()=>page.evaluate(()=>shareFinished)).toBe(true);
  expect(await page.evaluate(()=>VideoVariatorCore.getFiles()[0].name)).toBe('current-job.mp4');
});
