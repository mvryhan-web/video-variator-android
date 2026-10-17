import {test,expect} from '@playwright/test';

const mediaItems=[
 {id:'video-preview-fixture',kind:'video',status:'ready',provider:'Google',model:'sample-video',prompt:'Saved city video',createdAt:'2026-10-15T08:00:00Z'},
 {id:'audio-preview-fixture',kind:'music',status:'ready',provider:'Google',model:'sample-audio',prompt:'Saved ambient audio',createdAt:'2026-10-15T08:01:00Z'}
];
async function mockHistory(page,items=mediaItems){
 await page.addInitScript(()=>localStorage.setItem('vv_token','test-history-user'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{enabled:true,pricingConfigured:false,models:[{kind:'image',id:'image-fixture',label:'Fixture',ratios:['1:1'],references:0,enabled:true}],catalog:[{kind:'image',id:'image-fixture',label:'Fixture',ratios:['1:1'],references:0,enabled:true,provider:'Google'}]}}));
 await page.route('**/api/studio/jobs?filter=all',r=>r.fulfill({json:{items}}));
 await page.route('**/api/studio/jobs?filter=video',r=>r.fulfill({json:{items:items.filter(i=>i.kind==='video')}}));
}
test('History video and audio previews never fetch or regenerate until requested',async({page})=>{
 await mockHistory(page);
 let videoGet=0,audioGet=0,post=0;
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))post++;});
 await page.route('**/api/studio/jobs/video-preview-fixture/media',r=>{videoGet++;return r.fulfill({contentType:'video/mp4',body:'test video bytes'});});
 await page.route('**/api/studio/jobs/audio-preview-fixture/media',r=>{audioGet++;return r.fulfill({contentType:'audio/mpeg',body:'test audio bytes'});});
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#showHistory').click();
 const video=page.locator('.history-card').filter({hasText:'Saved city video'});
 const audio=page.locator('.history-card').filter({hasText:'Saved ambient audio'});
 await expect(video.getByRole('button',{name:'Preview media'})).toBeVisible();
 await expect(audio.getByRole('button',{name:'Preview media'})).toBeVisible();
 expect(videoGet).toBe(0);expect(audioGet).toBe(0);expect(post).toBe(0);
 await video.getByRole('button',{name:'Preview media'}).click();
 await expect(video.locator('.history-inline-media video[controls]')).toHaveCount(1);
 await expect(video.getByRole('button',{name:'Close preview'})).toBeVisible();
 expect(videoGet).toBe(1);expect(audioGet).toBe(0);
 await audio.getByRole('button',{name:'Preview media'}).click();
 await expect(audio.locator('.history-inline-media audio[controls]')).toHaveCount(1);
 await expect(video.locator('.history-inline-media video')).toHaveCount(0);
 expect(audioGet).toBe(1);expect(post).toBe(0);
 await audio.getByRole('button',{name:'Close preview'}).click();
 await expect(audio.locator('.history-inline-media audio')).toHaveCount(0);
 expect(post).toBe(0);
});
test('History preview refuses mismatched saved MIME and leaves download available',async({page})=>{
 await mockHistory(page,[mediaItems[0]]);
 let post=0;
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))post++;});
 await page.route('**/api/studio/jobs/video-preview-fixture/media',r=>r.fulfill({contentType:'text/html',body:'<video onload=alert(1)>'}));
 await page.goto('/generate-studio.html?studio=image');await page.locator('#showHistory').click();
 const card=page.locator('.history-card');
 await card.getByRole('button',{name:'Preview media'}).click();
 await expect(card.locator('.history-inline-media')).toContainText('not a supported video/audio preview');
 await expect(card.locator('.history-inline-media video')).toHaveCount(0);
 await expect(card.getByRole('button',{name:'Download'})).toBeEnabled();
 expect(post).toBe(0);
});
test('History media preview is cleaned up when filter or view changes',async({page})=>{
 await mockHistory(page);
 await page.route('**/api/studio/jobs/video-preview-fixture/media',r=>r.fulfill({contentType:'video/mp4',body:'video bytes'}));
 await page.goto('/generate-studio.html?studio=image');await page.locator('#showHistory').click();
 const video=page.locator('.history-card').filter({hasText:'Saved city video'});
 await video.getByRole('button',{name:'Preview media'}).click();
 await expect(video.locator('video[controls]')).toHaveCount(1);
 await page.locator('[data-history-filter=video]').click();
 await expect(page.locator('.history-inline-media video')).toHaveCount(0);
 await page.locator('#showCreate').click();
 await expect(page.locator('#showHistory')).toHaveAttribute('aria-pressed','false');
});
