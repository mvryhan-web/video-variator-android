import {test,expect} from '@playwright/test';

const image={id:'saved-image-a',kind:'image',model:'gemini-3.1-flash-image',
 status:'ready',prompt:'Historic product photograph with soft light',
 settings:{ratio:'1:1',resolution:'1K',outputFormat:'auto'},
 createdAt:'2026-10-16T10:00:00.000Z'};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');

async function setup(page){
 await page.addInitScript(()=>localStorage.setItem('vv_token','fixture-owner'));
 await page.route('**/api/studio/config',r=>r.fulfill({json:{
  enabled:true,ownerOnly:false,pricingConfigured:false,
  models:[{kind:'image',id:'gemini-3.1-flash-image',enabled:true}],
  catalog:[{id:'gemini-3.1-flash-image',kind:'image',label:'Fixture Image',
   adapter:true,enabled:true,provider:'Google',references:2,ratios:['1:1'],
   quality:'1K',capabilities:{resolutions:['1K'],outputFormats:['auto'],ratios:['1:1']}}]
 }}));
 await page.route('**/api/studio/jobs?filter=*',r=>r.fulfill({json:{items:[image]}}));
 await page.route('**/api/studio/access',r=>r.fulfill({json:{allowed:true,scope:'owner'}}));
}

test('BASE 26: History Regenerate cannot silently carry a different Image Canvas draft reference',async({page})=>{
 await setup(page);
 const posts=[];page.on('request',request=>{
  if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))posts.push(request.url());
 });
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#prompt').fill('My current unrelated garden illustration');
 await page.locator('#references').setInputFiles({name:'unrelated-current.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('#refPreview img')).toHaveCount(1);
 await page.locator('#showHistory').click();
 await expect(page.locator('.history-card')).toHaveCount(1);
 const regenerate=page.locator('.history-card .history-actions button').filter({hasText:'Regenerate'});
 page.once('dialog',dialog=>dialog.dismiss());
 await regenerate.click();
 await expect(page.locator('#showHistory')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#refPreview img')).toHaveCount(1);
 await expect(page.locator('#prompt')).toHaveValue('My current unrelated garden illustration');

 page.once('dialog',dialog=>dialog.accept());
 await regenerate.click();
 await expect(page.locator('#showCreate')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#prompt')).toHaveValue('Historic product photograph with soft light');
 await expect(page.locator('#refPreview img')).toHaveCount(0);
 await expect(page.locator('#consent')).not.toBeChecked();
 await expect(page.locator('#status')).toContainText('Old reference photos are not restored');
 expect(posts).toEqual([]);
});

test('BASE 26: History Reuse prompt only is still prepare-only and leaves current images intact',async({page})=>{
 await setup(page);
 let paidPosts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))paidPosts++;});
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#references').setInputFiles({name:'still-current.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('#refPreview img')).toHaveCount(1);
 await page.locator('#showHistory').click();
 await page.locator('.history-card .history-actions button').filter({hasText:'Reuse prompt'}).click();
 await expect(page.locator('#refPreview img')).toHaveCount(1);
 await expect(page.locator('#prompt')).toHaveValue('Historic product photograph with soft light');
 await expect(page.locator('#consent')).not.toBeChecked();
 expect(paidPosts).toBe(0);
});
