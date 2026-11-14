/* TEST ONLY: visual acceptance of photographed Christmas and true-black Soft Dark.
   Does not submit, log in, generate, or alter existing UI/production. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.SOFT_AURORA_DEPLOYMENT_URL;
assert.match(base||'',/^https:\/\/[a-z0-9-]+\.deepsyq\.pages\.dev$/);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let checks=0;
try {
  for (const [device,viewport] of [
    ['desktop',{width:1440,height:900}],
    ['mobile',{width:390,height:844}]
  ]) {
    const context=await browser.newContext({viewport,isMobile:device==='mobile',hasTouch:device==='mobile'});
    try{
      for(const [name,file,field] of [
        ['home','deepsyq.html','#homeQuickForm'],
        ['jarvix','jarvix-chat.html','#jChatForm'],
        ['pricing','pricing.html',null]
      ]) {
        const page=await context.newPage();
        try {
          await page.goto(base+'/'+file,{waitUntil:'domcontentloaded',timeout:30000});
          await page.locator('#dsThemeButton').waitFor({state:'visible',timeout:10000});
          const original=field?await page.locator(field).boundingBox():null;
          await page.evaluate(()=>localStorage.setItem('deepsyq-themes-v1','soft-dark'));
          await page.reload({waitUntil:'domcontentloaded',timeout:30000});
          const dark=await page.evaluate(()=>{
            const bg=(selector)=>{const node=document.querySelector(selector);return node?getComputedStyle(node).backgroundColor:null;};
            return {body:bg('body'),header:bg('.ds-unified-header'),field:bg('#homeQuickForm')||bg('#jChatForm'),
              card:bg('.home-create-card')||bg('.price-plan')||bg('.j-message')};
          });
          assert.equal(dark.body,'rgb(0, 0, 0)',device+' '+name+' black background');
          if(dark.header)assert.equal(dark.header,'rgb(5, 5, 5)',device+' '+name+' black nav');
          if(field)assert.equal(dark.field,'rgb(17, 17, 17)',device+' '+name+' black input');
          if(original){
            const current=await page.locator(field).boundingBox();
            assert.ok(current,'field still exists');
            assert.ok(Math.abs(original.width-current.width)<3,device+' '+name+' input width must not change');
            assert.ok(Math.abs(original.height-current.height)<3,device+' '+name+' input height must not change');
          }
          checks++;
          await page.evaluate(()=>localStorage.setItem('deepsyq-themes-v1','christmas'));
          await page.reload({waitUntil:'domcontentloaded',timeout:30000});
          await page.locator('#dsChristmasBackdrop').waitFor({state:'attached',timeout:10000});
          const variant=device==='desktop'?'desktop':'mobile';
          const photo=await page.evaluate(async(type)=>{
            const name='winter-'+type;
            const result={};
            for(const ext of ['webp','jpg']){
              const response=await fetch('/themes/christmas/'+name+'.'+ext,{cache:'no-store'});
              result[ext]={ok:response.ok,status:response.status,type:response.headers.get('content-type'),
                bytes:Number(response.headers.get('content-length')||0)};
              if(!response.ok)continue;
              const image=new Image();
              const dims=await new Promise((resolve,reject)=>{
                image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});
                image.onerror=()=>reject(Error('Invalid Christmas background image'));
                image.src='/themes/christmas/'+name+'.'+ext;
              });
              result[ext].dims=dims;
            }
            result.background=getComputedStyle(document.getElementById('dsChristmasBackdrop')).backgroundImage;
            return result;
          },variant);
          const expected=variant==='desktop'?{width:2560,height:1440}:{width:1080,height:1920};
          for(const ext of ['webp','jpg']){
            assert.ok(photo[ext].ok,device+' '+name+' '+ext+' photo loaded');
            assert.deepEqual(photo[ext].dims,expected,device+' '+name+' '+ext+' dimensions');
          }
          assert.ok(photo.background.includes('winter-'+variant+'.webp'),
                    device+' '+name+' should display real '+variant+' photo');
          assert.equal(await page.locator('#dsSnowfallCanvas').count()>0,true,
                       device+' '+name+' snow must remain enabled');
          if(field){
            const now=await page.locator(field).boundingBox();
            assert.ok(now);
            assert.ok(Math.abs(now.width-original.width)<3,
                      device+' '+name+' Christmas input width must not change');
            assert.ok(Math.abs(now.height-original.height)<3,
                      device+' '+name+' Christmas input height must not change');
          }
          console.log('CHRISTMAS_SOFTDARK_TEST_PASS',JSON.stringify({
            device,name,darkBody:dark.body,darkField:dark.field,photo:variant,dims:expected,
            snowfall:true,layoutPreserved:true
          }));
          checks++;
        }finally{await page.close();}
      }
    }finally{await context.close();}
  }
}finally{await browser.close();}
console.log('CHRISTMAS_SOFTDARK_VISUAL_ACCEPTANCE_PASS',JSON.stringify({checks,devices:2,pages:3}));
