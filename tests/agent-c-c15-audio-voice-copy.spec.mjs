import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

// C15: no-fee browser copy/route acceptance; synthetic config, no paid generation.
const expected={
 'en-US':{
  available:'Cloud voice requires purchased AI credits and owner activation.',
  quota:'Cloud voice is unavailable. Check purchased credits and access.'
 },
 'ru-RU':{
  available:'Облачная озвучка требует купленных AI-кредитов и активации владельцем.',
  quota:'Облачная озвучка недоступна. Проверьте купленные кредиты и доступ.'
 },
 'fr-FR':{
  available:'La voix cloud exige des crédits IA achetés et l’activation du propriétaire.',
  quota:'Voix cloud indisponible. Vérifiez vos crédits achetés et l’accès.'
 },
 'uk-UA':{
  available:'Хмарний голос потребує придбаних AI-кредитів і активації власником.',
  quota:'Хмарний голос недоступний. Перевірте придбані кредити та доступ.'
 }
};
const source=readFileSync(new URL('../app/src/main/assets/audio-studio.js',import.meta.url),'utf8');
const calls=page=>{
 const writes=[];
 page.on('request',r=>{
  if(r.method()==='POST'&&/\/api\/(?:speech|studio|billing|payments|stripe|ai-wallet|ai-provider)/.test(new URL(r.url()).pathname))
   writes.push(r.method()+' '+new URL(r.url()).pathname);
 });
 return writes;
};
async function config(page,enabled){
 await page.route('**/api/speech/config',r=>r.fulfill({json:{enabled}}));
 await page.route('**/api/config',r=>r.fulfill({json:{billingConfigured:false,googleClientId:''}}));
}
test('C15 four locales do not promise free cloud voices; disabled path preserves safe local STT',async({browser})=>{
 for(const [locale,copy] of Object.entries(expected)){
  const context=await browser.newContext({locale,viewport:{width:390,height:844}});
  try{
   const page=await context.newPage(),writes=calls(page);
   await config(page,false);
   await page.goto('/audio-studio.html?tool=tts');
   await expect(page.locator('[data-s="free"]')).toContainText('Pro');
   await expect(page.locator('#speechGenerate')).toBeDisabled();
   await expect(page.locator('#speechText')).toBeVisible();
   await expect(page.locator('#transcribeFile')).toBeHidden();
   await expect(page.locator('main.tools header a[data-s="back"]')).toHaveAttribute('href','free-tools.html');
   await page.locator('main.tools header a[data-s="back"]').click();
   await expect(page).toHaveURL(/\/free-tools\.html$/);
   await page.locator('[data-hub-tool="stt"]').click();
   await expect(page.locator('#transcribeFile')).toBeVisible();
   await expect(page.locator('#speechText')).toBeHidden();
   expect(writes,locale).toEqual([]);
  }finally{await context.close();}
  expect(source,locale+' correct cloud quota copy')
   .toContain("quota:'"+copy.quota+"'");
 }
});
test('C15 config-enabled UI must still describe purchased credits, never an old free daily allowance',async({browser})=>{
 for(const [locale,copy] of Object.entries(expected)){
  const context=await browser.newContext({locale,viewport:{width:375,height:812}});
  try{
   const page=await context.newPage(),writes=calls(page);
   await config(page,true);
   await page.goto('/audio-studio.html?tool=tts');
   await expect(page.locator('#speechAvailability')).toHaveText(copy.available);
   await expect(page.locator('[data-s="free"]')).toContainText('Pro');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth),
    locale+' mobile overflow').toBeLessThanOrEqual(376);
   expect(writes,locale).toEqual([]);
  }finally{await context.close();}
 }
});
