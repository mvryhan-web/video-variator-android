import {test,expect} from '@playwright/test';

// Real local browser handoff (IndexedDB), no cloud keys or model calls.
const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGMUWXCHgYGBiYGBgYGBAQASIgGUB7TVswAAAABJRU5ErkJggg==','base64');
const photo=name=>({name,mimeType:'image/png',buffer:tinyPng});

async function start(page){
 let paidPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))paidPosts++;});
 // Studio generation is OFF, but a known disabled model still advertises its
 // local reference-file capacity: the draft can retain photos without any AI call.
 const offlineModel={kind:'video',id:'veo-3.1-lite-generate-preview',label:'Veo offline draft',
  provider:'Google',adapter:true,enabled:false,references:3,ratios:['16:9'],quality:'720p',
  capabilities:{maxReferences:3,videoInputModes:['text','first_frame','reference_image'],
   resolutions:['720p'],durations:[8],durationSeconds:8}};
 await page.route('**/api/studio/config',route=>route.fulfill({json:{
  enabled:false,ownerOnly:true,models:[],catalog:[offlineModel]}}));
 await page.goto('/product-video.html');
 return ()=>paidPosts;
}

test('BASE #5: Product Video optional ad logo is NOT injected as garment/product reference',async({page})=>{
 const paid=await start(page);
 await page.locator('#photos').setInputFiles(photo('actual-product.png'));
 await page.locator('#logo').setInputFiles(photo('optional-ad-logo.png'));
 await page.locator('#continue').click();
 await expect(page).toHaveURL(/generate-studio\.html\?studio=video/);
 await expect(page.locator('#status')).toContainText('logo was NOT attached');
 await expect(page.locator('#status')).toContainText('No generation started');
 await expect(page.locator('#refPreview img')).toHaveCount(0);
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(paid()).toBe(0);
});

test('BASE #5: photo-only Product Video still hands off the original image without automatic generation',async({page})=>{
 const paid=await start(page);
 await page.locator('#photos').setInputFiles(photo('actual-product.png'));
 await page.locator('#continue').click();
 await expect(page).toHaveURL(/generate-studio\.html\?studio=video/);
 await expect(page.locator('#prompt')).toHaveValue(/reference image/);
 await expect(page.locator('#refPreview img')).toHaveCount(1);
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(paid()).toBe(0);
});
