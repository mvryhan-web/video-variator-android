import {test,expect} from '@playwright/test';

// No-spend consumer contract: all HTTP replies/media are stubs. This does NOT
// prove a real Stripe payment, live authentication or real provider output.
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
function modelFor(kind){
 const data={
  image:{id:'fixture-image',label:'Fixture Image',quality:'2K',ratios:['1:1'],references:0,capabilities:{resolutions:['2K'],outputFormats:['png']}},
  video:{id:'fixture-video',label:'Fixture Video',quality:'720p',duration:'8 seconds',ratios:['16:9'],references:0,capabilities:{resolutions:['720p'],durationSeconds:8,durations:[8],videoInputModes:['text']}},
  music:{id:'fixture-music',label:'Fixture Music',quality:'standard',duration:'30 seconds',ratios:['1:1'],references:0,capabilities:{}}
 };
 return {...data[kind],kind,provider:'Google',adapter:true,enabled:true};
}
async function mockedConsumer(page,kind,{quoteReply}={}){
 const model=modelFor(kind),jobs=[],estimates=[],mediaCalls=[];
 const mime=kind==='image'?'image/png':kind==='video'?'video/mp4':'audio/mpeg';
 await page.route('**/api/studio/config',route=>route.fulfill({json:{enabled:true,pricingConfigured:false,models:[model],catalog:[model]}}));
 await page.route('**/api/studio/estimate',route=>{
  const input=route.request().postDataJSON();estimates.push(input);
  return route.fulfill({json:quoteReply?quoteReply(input):{kind,model:model.id,quantity:1,credits:7,perImageCredits:7}});
 });
 await page.route(url=>new URL(url).pathname==='/api/studio/jobs',route=>{
  if(route.request().method()==='POST'){
   jobs.push(route.request().postDataJSON());
   return route.fulfill({status:202,json:{id:'fixture-job',status:'processing',creditsReserved:7}});
  }
  return route.fulfill({json:{items:jobs.map(j=>({id:'fixture-job',status:'ready',kind,model:model.id,provider:'Google',prompt:j.prompt,createdAt:'2026-10-20T09:00:00Z'}))}});
 });
 await page.route('**/api/studio/jobs/fixture-job',route=>route.fulfill({json:{id:'fixture-job',kind,status:'ready',mime,creditsCharged:7}}));
 await page.route('**/api/studio/jobs/fixture-job/media',route=>{
  mediaCalls.push(route.request().url());
  return route.fulfill({contentType:mime,body:kind==='image'?image:Buffer.from('not-a-real-provider-file')});
 });
 return {model,jobs,estimates,mediaCalls};
}
for(const [mode,kind,tag] of [['image','image','img'],['video','video','video'],['audio','music','audio']]){
 test('B8 '+mode+' user explicitly accepts 7 credits and receives exactly one private mock result',async({page})=>{
  const fixture=await mockedConsumer(page,kind);
  await page.goto('/generate-studio.html?studio='+mode);
  await expect(page.locator('#modelButton')).toContainText(fixture.model.label);
  await page.locator('#prompt').fill('One '+mode+' creation for owner review');
  await page.locator('#consent').check();
  page.once('dialog',dialog=>{expect(dialog.message()).toContain('7 AI credits');return dialog.dismiss();});
  await page.locator('#generate').click();
  await expect(page.locator('#status')).toContainText('cancelled');
  expect(fixture.jobs).toHaveLength(0);
  page.once('dialog',dialog=>{expect(dialog.message()).toContain('7 AI credits');return dialog.accept();});
  await page.locator('#generate').click();
  await expect(page.locator('#media '+tag)).toHaveCount(1);
  expect(fixture.estimates).toHaveLength(2);
  expect(fixture.jobs).toHaveLength(1);
  expect(fixture.jobs[0]).toMatchObject({kind,model:fixture.model.id,expectedCredits:7,consent:true});
  expect(fixture.jobs[0].requestId).toMatch(/^[a-f0-9-]{36}$/i);
  expect(fixture.estimates[1].prompt).toBeUndefined();
  expect(fixture.estimates[1].references).toBeUndefined();
  await page.locator('#showHistory').click();
  await expect(page.locator('.history-card')).toHaveCount(1);
  expect(fixture.jobs).toHaveLength(1); // History GET never resends a paid job.
 });
}
test('B8 quote from a different model is rejected before confirmation, reservation or job',async({page})=>{
 const fixture=await mockedConsumer(page,'image',{quoteReply:()=>({kind:'image',model:'other-model',credits:7,quantity:1})});
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#prompt').fill('Keep selected model and quoted model identical');
 await page.locator('#consent').check();
 let dialogs=0;page.on('dialog',dialog=>{dialogs++;return dialog.dismiss();});
 await page.locator('#generate').click();
 await expect(page.locator('#status')).toContainText('No job was submitted');
 expect(fixture.estimates).toHaveLength(1);
 expect(fixture.jobs).toHaveLength(0);
 expect(dialogs).toBe(0);
});
test('B8 old-account quote cannot dispatch after account switch while request is pending',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('vv_token','mock-A'));
 const fixture=await mockedConsumer(page,'image');
 let signal,release;
 const started=new Promise(resolve=>signal=resolve);
 const held=new Promise(resolve=>release=resolve);
 await page.route('**/api/studio/estimate',async route=>{
  signal();await held;
  await route.fulfill({json:{kind:'image',model:'fixture-image',quantity:1,credits:7,perImageCredits:7}});
 });
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#prompt').fill('Never send old-account paid request in new account');
 await page.locator('#consent').check();
 await page.locator('#generate').click();
 await started;
 await page.evaluate(()=>localStorage.setItem('vv_token','mock-B'));
 release();
 await expect(page.locator('#status')).toContainText('No job was submitted');
 expect(fixture.jobs).toHaveLength(0);
});
