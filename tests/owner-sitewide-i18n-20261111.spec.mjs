import {test,expect} from '@playwright/test';
import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
const folder='app/src/main/assets';
const pages=readdirSync(folder).filter(name=>name.endsWith('.html')).sort();
const locales=['ru','fr','es','en'];
const words={ru:{basic:'Базовый',monthly:'Ежемесячно'},fr:{basic:'Essentiel',monthly:'Mensuel'},es:{basic:'Básico',monthly:'Mensual'},en:{basic:'Basic',monthly:'Monthly'}};

test.describe('DEEPSYQ four-language site-wide coverage',()=>{
  for(const filename of pages){
    test('RU page '+filename,async({page})=>{
      await page.addInitScript(()=>{localStorage.setItem('deepsyq_home_language','ru');localStorage.setItem('deepsyq_lang','ru');});
      await page.goto('/'+filename,{waitUntil:'domcontentloaded'});
      if(filename==='ai-pricing.html')await page.waitForURL(/pricing\.html/);
      await page.waitForFunction(()=>document.documentElement.lang==='ru'&&window.__deepsyqPageI18n?.language==='ru',{timeout:25000});
      await expect(page.locator('body')).toBeVisible();
    });
  }
  test('Tariff card names, full details and period switch translate live without price changes',async({page})=>{
    await page.addInitScript(()=>{localStorage.setItem('deepsyq_home_language','en');localStorage.setItem('deepsyq_lang','en');});
    await page.goto('/pricing.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#plan-basic')).toHaveText('Basic');
    const initialPrices=await page.locator('.price-plan-price strong').allTextContents();
    expect(initialPrices.length).toBe(5);
    for(const lang of locales){
      await page.evaluate(language=>{
        localStorage.setItem('deepsyq_home_language',language);
        localStorage.setItem('deepsyq_lang',language);
        window.dispatchEvent(new Event('deepsyq:lang'));
      },lang);
      await expect(page.locator('#plan-basic')).toHaveText(words[lang].basic,{timeout:12000});
      await expect(page.locator('#priceBillingMonthly')).toHaveText(words[lang].monthly);
      const prices=await page.locator('.price-plan-price strong').allTextContents();
      expect(prices).toEqual(initialPrices);
      await page.locator('#priceBillingYearly').click();
      await expect(page.locator('#plan-basic')).toHaveText(words[lang].basic);
      await page.locator('#priceBillingMonthly').click();
      await expect(page.locator('#plan-basic')).toHaveText(words[lang].basic);
    }
  });
  test('Late dynamic content gets translated after insertion and reverses to English',async({page})=>{
    await page.goto('/pricing.html',{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{localStorage.setItem('deepsyq_home_language','fr');window.dispatchEvent(new Event('deepsyq:lang'));});
    await page.waitForFunction(()=>window.__deepsyqPageI18n?.language==='fr');
    await page.evaluate(()=>{
      const node=document.createElement('p');node.id='lateI18nText';node.textContent='Choose Basic';
      document.body.append(node);
    });
    await expect(page.locator('#lateI18nText')).toHaveText('Choisir Essentiel');
    await page.evaluate(()=>{localStorage.setItem('deepsyq_home_language','en');window.dispatchEvent(new Event('deepsyq:lang'));});
    await expect(page.locator('#lateI18nText')).toHaveText('Choose Basic');
  });
  test('Static source coverage and no inline design changes',()=>{
    expect(pages.length).toBe(34);
    for(const page of pages){
      const source=readFileSync(path.join(folder,page),'utf8');
      expect(source.match(/sitewide-i18n\.js\?v=20261111/g)?.length).toBe(1);
    }
    for(const lang of locales.filter(x=>x!=='en')){
      const data=JSON.parse(readFileSync(path.join(folder,'i18n','catalog-'+lang+'.json'),'utf8'));
      expect(data.language).toBe(lang);
      expect(data.entryCount).toBeGreaterThanOrEqual(500);
      expect(data.entries['Choose Basic']).toBe(words[lang].basic==='Базовый'?'Выбрать Базовый':lang==='fr'?'Choisir Essentiel':'Elegir Básico');
    }
  });
});
