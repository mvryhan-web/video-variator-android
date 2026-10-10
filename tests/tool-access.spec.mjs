import {test,expect} from '@playwright/test';
import {mockToolAccess} from './helpers/tool-access-fixture.mjs';
async function image(page){return Buffer.from(await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const c=canvas.getContext('2d');c.fillStyle='orange';c.fillRect(0,0,32,32);return Array.from(new Uint8Array(await(await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))).arrayBuffer()));}));}
const photos=bytes=>['one.png','two.png'].map(name=>({name,mimeType:'image/png',buffer:bytes}));
test('single photo works signed out without quota calls; subscribed tools are labeled',async({page})=>{
 const fixture=await mockToolAccess(page,{authenticated:false});await page.goto('/free-tools.html?tool=photo');const bytes=await image(page);
 await page.locator('#files').setInputFiles(photos(bytes).slice(0,1));await page.locator('#run').click();await expect(page.locator('#status')).toHaveText('Done');await expect(page.locator('#outputs article')).toHaveCount(1);
 expect(fixture.calls.filter(x=>x.method==='POST')).toEqual([]);
 await page.locator('#hubBack').click();await expect(page.locator('[data-hub-tool=audio] .toolAccessBadge')).toHaveText('Free');await expect(page.locator('[data-hub-tool=prompter] .toolAccessBadge')).toHaveText('Free');await expect(page.locator('[data-hub-tool=video] .toolAccessBadge')).toContainText('Basic');
});
test('five successful batches share one trial; sixth is blocked before image encoding',async({page})=>{
 const fixture=await mockToolAccess(page,{plan:'trial'});await page.goto('/free-tools.html?tool=photo');const bytes=await image(page);await page.locator('#files').setInputFiles(photos(bytes));
 for(let i=0;i<5;i++){await page.locator('#run').click();await expect(page.locator('#status')).toHaveText('Done');await expect(page.locator('[data-access-summary]')).toContainText(`${4-i} of 5`);}
 expect(fixture.snapshot().trial.used).toBe(5);
 await page.evaluate(()=>{window.photoEncodes=0;const original=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(...args){photoEncodes++;return original.apply(this,args);};});
 await page.locator('#run').click();await expect(page.locator('#status')).toContainText('five trial tasks are used');expect(await page.evaluate(()=>photoEncodes)).toBe(0);await expect(page.locator('#outputs article')).toHaveCount(2);
 await page.reload();await expect(page.locator('[data-access-summary]')).toContainText('0 of 5');
});
test('failed batch refunds its reservation and Basic includes compression but not Pro tools',async({page})=>{
 const fixture=await mockToolAccess(page,{plan:'trial'});await page.goto('/free-tools.html?tool=photo');
 await page.locator('#files').setInputFiles([{name:'bad1.jpg',mimeType:'image/jpeg',buffer:Buffer.from('broken')},{name:'bad2.jpg',mimeType:'image/jpeg',buffer:Buffer.from('broken')}]);await page.locator('#run').click();await expect(page.locator('#status')).toContainText('Could not process');
 expect(fixture.snapshot().trial.used).toBe(0);expect(fixture.calls.filter(x=>x.body?.outcome==='canceled')).toHaveLength(1);
 fixture.setPlan('basic');await page.evaluate(()=>VUToolAccess.refresh());await expect(page.locator('[data-access-summary]')).toContainText('Basic subscription');
 await page.locator('#hubBack').click();await expect(page.locator('[data-hub-tool=video] .toolAccessBadge')).toHaveText('Included');await expect(page.locator('[data-hub-tool=clips] .toolAccessBadge')).toContainText('Pro');
});
test('Pro and Lifetime include all eight tool cards and mobile banner fits',async({page},info)=>{
 const fixture=await mockToolAccess(page,{plan:'pro',used:5});await page.goto('/free-tools.html');await expect(page.locator('[data-access-summary]')).toContainText('Pro subscription');await expect(page.locator('[data-hub-tool]')).toHaveCount(8);
 for(const tool of ['video','clips','motion','tts','stt'])await expect(page.locator(`[data-hub-tool=${tool}] .toolAccessBadge`)).toHaveText('Included');
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 if(info.project.name==='mobile-chromium')await page.screenshot({path:info.outputPath('subscription-tools-mobile.png'),fullPage:true});
 expect(fixture.snapshot().tools.photo_batch.included).toBe(true);fixture.setPlan('lifetime');await page.evaluate(()=>VUToolAccess.refresh());await expect(page.locator('[data-access-summary]')).toHaveText('All tools included');
});
test('cancel during entitlement request releases reservation without processing',async({page})=>{
 const fixture=await mockToolAccess(page,{plan:'trial'});await page.goto('/free-tools.html?tool=photo');await page.locator('#files').setInputFiles(photos(await image(page)));
 await page.evaluate(()=>{const begin=VUToolAccess.begin;window.grantReceived=false;window.VUToolAccess={...VUToolAccess,begin:async tool=>{const permit=await begin(tool);grantReceived=true;await new Promise(resolve=>window.resumeGrant=resolve);return permit;}};});
 await page.locator('#run').click();await expect.poll(()=>page.evaluate(()=>grantReceived)).toBe(true);await page.locator('#cancel').click();await page.evaluate(()=>resumeGrant());await expect(page.locator('#status')).toHaveText('Canceled');
 expect(fixture.snapshot().trial.used).toBe(0);expect(fixture.snapshot().trial.pending).toBe(0);await expect(page.locator('#outputs article')).toHaveCount(0);
});
test('audio tools show Pro and sign-in link returns to the selected task',async({page})=>{
 await mockToolAccess(page,{authenticated:false});await page.goto('/audio-studio.html?tool=stt');await expect(page.locator('[data-access-detail]')).toContainText('Pro');
 const sign=page.locator('[data-access-signin]');await expect(sign).toHaveAttribute('href',/toolReturn=audio-studio/);await page.route(/accounts\.google\.com|appleid\.cdn-apple\.com/,r=>r.abort());await sign.click();await expect(page.locator('#authModal')).toBeVisible();
});
