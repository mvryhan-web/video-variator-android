import {test,expect} from '@playwright/test';
const langs={ru:{monthly:'Ежемесячно',yearly:'Ежегодно',basic:'Базовый'},fr:{monthly:'Mensuel',yearly:'Annuel',basic:'Essentiel'},es:{monthly:'Mensual',yearly:'Anual',basic:'Básico'}};
const pages=['pricing.html','terms.html','refund.html','contact.html','cookie.html','ai-privacy.html','canvas.html','generate-studio.html','free-tools.html','ai-apps.html','jarvix-chat.html','video-uniquifier.html','my-creations.html','deepsyq.html'];
test('pricing translates every card and billing period without changing verified prices or payment actions',async({page})=>{
 await page.goto('/pricing.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.price-plan')).toHaveCount(5,{timeout:20000});
 const enPrices=await page.locator('.price-plan-price strong').allTextContents();
 const enCards=await page.locator('.price-plan-name').allTextContents();
 expect(enCards).toEqual(['Trial','Basic','Pro','Business','Lifetime']);
 for(const [lang,labels] of Object.entries(langs)){
  await page.evaluate(v=>{localStorage.setItem('deepsyq_home_language',v);localStorage.setItem('deepsyq_lang',v);window.dispatchEvent(new Event('deepsyq:lang'));},lang);
  await expect(page.locator('#priceBillingMonthly')).toHaveText(labels.monthly,{timeout:15000});
  await expect(page.locator('#priceBillingYearly')).toHaveText(labels.yearly);
  await expect(page.locator('#plan-basic')).toHaveText(labels.basic);
  await page.locator('#priceBillingYearly').click();
  await expect(page.locator('#plan-basic')).toHaveText(labels.basic);
  await expect(page.locator('.price-plan')).toHaveCount(5);
  await page.locator('#priceBillingMonthly').click();
  expect(await page.locator('.price-plan-price strong').allTextContents()).toEqual(enPrices);
  expect(await page.locator('.price-plan-action').count()).toBe(5);
 }
 await page.evaluate(()=>{localStorage.setItem('deepsyq_home_language','en');localStorage.setItem('deepsyq_lang','en');window.dispatchEvent(new Event('deepsyq:lang'));});
 await expect(page.locator('#plan-basic')).toHaveText('Basic');
});
test('shared four-language catalogs load without changing original page structure on representative pages',async({page})=>{
 test.setTimeout(180000);
 for(const filename of pages){
  await page.goto('/'+filename,{waitUntil:'domcontentloaded',timeout:20000});
  for(const lang of ['ru','fr','es','en']){
   await page.evaluate(v=>{localStorage.setItem('deepsyq_home_language',v);localStorage.setItem('deepsyq_lang',v);window.dispatchEvent(new Event('deepsyq:lang'));},lang);
   await expect.poll(async()=>page.evaluate(()=>document.documentElement.lang.slice(0,2)),{timeout:10000}).toBe(lang);
   await expect.poll(async()=>page.evaluate(()=>window.deepsyqLocale?.catalogSize||0),{timeout:10000}).toBeGreaterThan(10);
  }
  expect(await page.locator('body').count()).toBe(1);
 }
});
test('wallet data and login values are not translated as user text',async({page})=>{
 await page.goto('/pricing.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.price-plan')).toHaveCount(5);
 for(const lang of ['fr','ru','es']){
  await page.evaluate(v=>{localStorage.setItem('deepsyq_home_language',v);localStorage.setItem('deepsyq_lang',v);window.dispatchEvent(new Event('deepsyq:lang'));},lang);
  await expect(page.locator('.price-plan')).toHaveCount(5);
  const html=await page.locator('#planCards').innerHTML();
  expect(html).toContain('price-plan-price');
  expect(html).toContain('price-plan-action');
 }
});
