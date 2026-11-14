/* DEEPSYQ Themes V1: broad READ-ONLY multi-page acceptance on isolated TEST.
 * Never submits a form, signs in, generates media, or modifies production.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.SOFT_AURORA_DEPLOYMENT_URL;
assert.match(base||'',/^https:\/\/[a-z0-9-]+\.deepsyq\.pages\.dev$/);
const root='.soft-aurora-preview-build';
const html=fs.readdirSync(root).filter(x=>x.endsWith('.html')).sort();
assert.ok(html.length>=33,'Expected at least 33 root HTML pages in TEST build');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const logs=[];
const failures=[];
try{
  for(const [device,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
    const context=await browser.newContext({viewport,isMobile:device==='mobile',hasTouch:device==='mobile'});
    try{
      for(const file of html){
        const page=await context.newPage();
        const label=device+'/'+file;
        let status='pass';
        try{
          const response=await page.goto(base+'/'+file,{waitUntil:'domcontentloaded',timeout:25000});
          assert.ok(response?.ok(),label+' HTTP status should be OK');
          const current=new URL(page.url());
          assert.ok(current.hostname.endsWith('.deepsyq.pages.dev'),label+' must remain on preview');
          await page.locator('#dsThemeButton').waitFor({state:'visible',timeout:13000});
          assert.equal(await page.locator('#dsThemeButton').count(),1,label+' one themes button');
          assert.equal(await page.locator('link[href="/soft-aurora-preview.css"]').count(),1,label+' one CSS');
          assert.equal(await page.locator('script[src="/soft-aurora-preview.js"]').count(),1,label+' one JS');
          await page.locator('#dsThemeButton').click({timeout:5000});
          assert.equal(await page.locator('#dsThemeMenu button.ds-theme-option').count(),5,label+' five choices');
          await page.locator('#dsThemeMenu button[data-theme-id="warm-light"]').click({timeout:5000});
          assert.equal(await page.locator('html').getAttribute('data-deepsyq-theme'),'warm-light');
          assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(244, 240, 232)',label+' Warm Light');
          await page.locator('#dsThemeButton').click({timeout:5000});
          await page.locator('#dsThemeMenu button[data-theme-id="soft-dark"]').click({timeout:5000});
          assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(5, 5, 5)',label+' black');
          await page.locator('#dsThemeButton').click({timeout:5000});
          await page.locator('#dsThemeMenu button[data-theme-id="christmas"]').click({timeout:5000});
          assert.equal(await page.locator('#dsChristmasBackdrop').count(),1,label+' winter scene');
          await page.reload({waitUntil:'domcontentloaded',timeout:25000});
          assert.equal(await page.locator('html').getAttribute('data-deepsyq-theme'),'christmas',label+' stored Christmas');
          await page.locator('#dsThemeButton').waitFor({state:'visible',timeout:10000});
          logs.push({device,page:file,status});
        }catch(e){
          status='fail';
          failures.push({device,page:file,error:String(e).slice(0,320)});
          console.error('THEMES_V1_COVERAGE_FAILURE',JSON.stringify({device,page:file,error:String(e).slice(0,320)}));
        }finally{await page.close();}
      }
    }finally{await context.close();}
  }
}finally{await browser.close();}
console.log('THEMES_V1_COVERAGE_SUMMARY',JSON.stringify({
  pages:html.length,devices:2,passed:logs.length,failed:failures.length,failures:failures.slice(0,25)
}));
assert.equal(failures.length,0,'Every test HTML page must support five themes and preserve preference');
