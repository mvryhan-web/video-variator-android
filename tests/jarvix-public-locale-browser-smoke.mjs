// Read-only four-language JARVIX public-guide smoke test.
// Uses only GET, localStorage and the existing deepsyq:lang event. No production mutations or paid calls.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const base=(process.argv[2]||'http://127.0.0.1:8761').replace(/\/$/,'');
const samples={
  en:['en-US','Meet JARVIX, the DeepSyQ voice assistant'],
  ru:['ru','Знакомьтесь: JARVIX — голосовой помощник DeepSyQ'],
  fr:['fr','Découvrez JARVIX, l’assistant vocal de DeepSyQ'],
  es:['es','Conoce a JARVIX, el asistente de voz de DeepSyQ']
};
const browser=await chromium.launch({headless:true});
try{
  for(const width of [390,1440]){
    const context=await browser.newContext({locale:'en-US',viewport:{width,height:844}});
    const page=await context.newPage();
    const writes=[];
    page.on('request',req=>{if(req.method()!=='GET'&&req.method()!=='HEAD')writes.push(req.method()+' '+req.url());});
    try{
      const response=await page.goto(base+'/jarvix.html',{waitUntil:'domcontentloaded',timeout:30000});
      assert.equal(response?.status(),200,'JARVIX public guide HTTP 200');
      await page.waitForFunction(()=>Boolean(window.DeepsyqI18n?.t),null,{timeout:15000});
      const check=async(code)=>{
        const [expectedLang,expectedTitle]=samples[code];
        await page.waitForFunction(({code,title})=>
          window.DeepsyqI18n?.language===code &&
          document.querySelector('h1')?.textContent===title,
          {code,title:expectedTitle},{timeout:15000});
        const info=await page.evaluate(()=>({
          lang:document.documentElement.lang,
          savedHome:localStorage.getItem('deepsyq_home_language'),
          savedLang:localStorage.getItem('deepsyq_lang'),
          h1:document.querySelector('h1')?.textContent,
          link:document.querySelector('a[href="jarvix-chat.html"]')?.getAttribute('href')
        }));
        assert.equal(info.lang,expectedLang,`initial and switched <html lang> must match ${code} at viewport ${width}`);
        assert.equal(info.savedHome,code);
        assert.equal(info.savedLang,code);
        assert.equal(info.link,'jarvix-chat.html');
        assert.equal(info.h1,expectedTitle);
      };
      await page.evaluate(()=>{
        localStorage.setItem('deepsyq_home_language','ru');
        localStorage.setItem('deepsyq_lang','ru');
      });
      await page.reload({waitUntil:'domcontentloaded',timeout:30000});
      await check('ru');
      for(const code of ['fr','es','en']){
        await page.evaluate(code=>window.dispatchEvent(new CustomEvent('deepsyq:lang',{detail:{lang:code}})),code);
        await check(code);
      }
      await page.reload({waitUntil:'domcontentloaded',timeout:30000});
      await check('en');
      assert.deepEqual(writes,[],'language switching must not make POST requests');
      console.log(`JARVIX_BROWSER_LOCALE_PASS width=${width} languages=ru,fr,es,en reload=yes API_POST=0 origin=${base}`);
    }finally{await context.close();}
  }
}finally{await browser.close();}
