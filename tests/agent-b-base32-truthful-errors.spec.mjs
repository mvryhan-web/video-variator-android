import {test,expect} from '@playwright/test';
// Offline mock API only; no provider calls or financial changes.
const time='2026-10-15T12:00:00Z';
test('BASE32 History shows confirmed charge versus held credits, including unknown Audio',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','offline-fixture'));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,models:[],catalog:[]}}));
 const items=[
 {id:'img',kind:'image',status:'ready',model:'image-fixture',prompt:'Example image',creditsCharged:9,creditsReserved:9,createdAt:time},
 {id:'vid',kind:'video',status:'processing',model:'video-fixture',prompt:'Example video',creditsCharged:0,creditsReserved:7,createdAt:time},
 {id:'audio',kind:'music',status:'unknown',model:'audio-fixture',prompt:'Example audio',creditsCharged:0,creditsReserved:4,createdAt:time}];
 await page.route('**/api/studio/jobs?filter=all',route=>route.fulfill({json:{items}}));
 let posts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))posts++;});
 await page.goto('/generate-studio.html?studio=image');await page.locator('#showHistory').click();
 await expect(page.locator('.history-card')).toHaveCount(3);
 await expect(page.locator('.history-card').nth(0)).toContainText('9 AI credits charged (confirmed)');
 await expect(page.locator('.history-card').nth(1)).toContainText('7 AI credits held (not a confirmed charge)');
 await expect(page.locator('.history-card').nth(2)).toContainText('4 AI credits held (not a confirmed charge)');
 await expect(page.locator('.history-card').nth(2).locator('.history-status')).toHaveText('Status uncertain');
 expect(posts).toBe(0);
});
test('BASE32 revoked consent keeps existing Video and explains credit hold in English/Russian',async({browser})=>{
 for(const [locale,expected] of [['en-US','Sharing with the AI provider is disabled'],['ru-RU','Передача данных AI-провайдеру отключена']]){
  const context=await browser.newContext({locale});const page=await context.newPage();
  await page.addInitScript(()=>localStorage.setItem('vv_token','offline-fixture'));
  await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,models:[],catalog:[]}}));
  await page.route('**/api/studio/jobs?filter=all',route=>route.fulfill({json:{items:[{id:'held-video',kind:'video',status:'processing',model:'video-fixture',prompt:'Example video',creditsReserved:7,creditsCharged:0,createdAt:time}]}}));
  let checks=0,posts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))posts++;});
  await page.route('**/api/studio/jobs/held-video',route=>{checks++;return route.fulfill({json:{id:'held-video',kind:'video',status:'unknown',error:'PROVIDER_CONSENT_REQUIRED',creditsReserved:7,creditsCharged:0,retryAfterSeconds:0}});});
  await page.goto('/generate-studio.html?studio=video');await page.locator('#showHistory').click();
  await page.locator('.history-card').getByRole('button',{name:locale==='ru-RU'?'Проверить статус':'Check status'}).click();
  await expect(page.locator('#status')).toContainText(expected);
  await expect(page.locator('#status')).not.toContainText('PROVIDER_CONSENT_REQUIRED');
  expect(checks).toBe(1);expect(posts).toBe(0);
  await context.close();
 }
});

test('BASE32 uncertain paid Video History offers visible EN/FR/RU recovery without redispatch',async({browser})=>{
 for(const [locale,statusLabel,warning,checkLabel,notice] of [
  ['en-US','Status uncertain','This video request may have reached','Check status','This check did not submit a new generation'],
  ['fr-FR','Statut incertain','Cette demande vidéo a peut-être','Vérifier le statut','Cette vérification n’a lancé aucune nouvelle génération'],
  ['ru-RU','Статус неизвестен','Эта видеозадача могла дойти','Проверить статус','Эта проверка не отправляла новую генерацию']
 ]){
  const context=await browser.newContext({locale});const page=await context.newPage();
  await page.addInitScript(()=>localStorage.setItem('vv_token','offline-fixture'));
  await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:false,models:[],catalog:[]}}));
  const item={id:'uncertain-video',kind:'video',status:'processing',error:'STATUS_UNKNOWN_NO_AUTOMATIC_RETRY',
   model:'video-fixture',prompt:'Saved paid video',creditsReserved:7,creditsCharged:0,createdAt:time};
  await page.route('**/api/studio/jobs?filter=all',route=>route.fulfill({json:{items:[item]}}));
  let checks=0,posts=0;page.on('request',request=>{
   if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))posts++;
  });
  await page.route('**/api/studio/jobs/uncertain-video',route=>{
   checks++;return route.fulfill({json:{id:item.id,kind:'video',status:'unknown',error:item.error,
    creditsReserved:7,creditsCharged:0,retryAfterSeconds:0}});
  });
  await page.goto('/generate-studio.html?studio=video');
  await page.locator('#showHistory').click();
  const card=page.locator('.history-card');
  await expect(card.locator('.history-status')).toHaveText(statusLabel);
  await expect(card.locator('.history-recovery')).toContainText(warning);
  await expect(card).toContainText(locale.startsWith('ru')?'В резерве 7 AI-кредитов':'7 AI credits held (not a confirmed charge)');
  await expect(card.getByRole('button',{name:locale.startsWith('ru')?'Создать снова':'Regenerate'})).toBeDisabled();
  await card.getByRole('button',{name:checkLabel}).click();
  await expect(page.locator('#status')).toContainText(notice);
  expect(checks).toBe(1);expect(posts).toBe(0);
  await context.close();
 }
});


test('BASE8 user explicitly selects priced alternative; never submits, no consent bypass',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','offline-fixture'));
 const base={enabled:true,pricingConfigured:true,fallbackChoicesEnabled:true,imageBatchEnabled:false,
  models:[],catalog:[
   {id:'gemini-3.1-flash-image',kind:'image',label:'Nano Banana 2',adapter:true,enabled:true,provider:'Google',quality:'1K',ratios:['1:1'],references:0,capabilities:{resolutions:['1K'],outputFormats:['auto']}},
   {id:'gpt-image-2.5-flare',kind:'image',label:'ChatGPT Image Flare',adapter:true,enabled:true,provider:'OpenAI',quality:'1K',ratios:['1:1'],references:0,capabilities:{resolutions:['1K'],outputFormats:['auto']}}
  ]};
 await page.route('**/api/studio/config',r=>r.fulfill({json:base}));
 await page.route('**/api/studio/alternatives',r=>r.fulfill({json:{
  model:'gemini-3.1-flash-image',reason:'AVAILABLE',alternatives:[{model:'gpt-image-2.5-flare',credits:7,currency:'usd'}]}}));
 let jobPosts=0,alternativePosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/studio/jobs'))jobPosts++;
  if(r.method()==='POST'&&r.url().includes('/api/studio/alternatives'))alternativePosts++;});
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#modelButton').click();
 await page.locator('#fallbackButton').click();
 const choice=page.locator('.fallback-option');await expect(choice).toContainText('7 AI credits');
 await choice.click();
 await expect(page.locator('#modelButton')).toContainText('ChatGPT Image Flare');
 await expect(page.locator('#consent')).not.toBeChecked();
 await expect(page.locator('#status')).toContainText('Nothing was submitted');
 expect(alternativePosts).toBe(1);expect(jobPosts).toBe(0);
});
