/* Live Cloudflare TEST preview acceptance. Read-only UI clicks, no payments or AI calls. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.SOFT_AURORA_DEPLOYMENT_URL;
assert.match(base||'',/^https:\/\/[a-z0-9-]+\.deepsyq\.pages\.dev$/);
const modes=['original','warm-light','focus','soft-dark','christmas'];
const color={
  'warm-light':'rgb(244, 240, 232)',
  'focus':'rgb(21, 29, 39)',
  'soft-dark':'rgb(0, 0, 0)',
  'christmas':'rgb(16, 29, 42)'
};
const pages=[
  ['home','deepsyq.html','#homeQuickForm','#homeQuickPrompt'],
  ['jarvix','jarvix-chat.html','#jChatForm','#jInput'],
  ['pricing','pricing.html',null,null]
];
const devices=[
  ['desktop',{width:1440,height:900},false],
  ['mobile',{width:390,height:844},true]
];
fs.mkdirSync('artifacts/themes-v1',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let checks=0;
try{
  for(const [device,viewport,isMobile] of devices){
    const context=await browser.newContext({viewport,isMobile,hasTouch:isMobile});
    try{
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>{
        const message=String(e);
        if(message.includes('soft-aurora-preview'))errors.push(message);
      });
      for(const [name,route,form,input] of pages){
        await page.goto(base+'/'+route,{waitUntil:'domcontentloaded',timeout:40000});
        await page.locator('#dsThemeButton').waitFor({state:'visible',timeout:20000});
        assert.equal(await page.locator('#dsThemeButton').count(),1,'Exactly one selector per page');
        const first=await page.locator('html').getAttribute('data-deepsyq-theme');
        assert.ok(modes.includes(first),device+' '+name+' active theme');
        assert.equal(await page.locator('link[href="/soft-aurora-preview.css"]').count(),1);
        if(name==='home'){
          const near=await page.locator('.ds-theme-anchor').evaluate(el=>({
            recommended:!!el.querySelector('.home-hero-recommended'),
            parent:el.parentElement?.className||'',
            buttonVisible:el.querySelector('button')?.offsetWidth>0
          }));
          assert.equal(near.recommended,true,'Theme selector must be beside Recommended');
          assert.equal(near.buttonVisible,true);
          assert.ok(!String(near.parent).includes('ds-theme-floating'),'Home selector not floating');
        }else{
          assert.equal(await page.locator('.ds-theme-anchor').count(),1);
        }
        if(form){
          await page.locator(input).waitFor({state:'visible',timeout:15000});
          const metric=await page.locator(form).evaluate(el=>{
            const r=el.getBoundingClientRect();
            return {width:r.width,height:r.height,display:getComputedStyle(el).display};
          });
          assert.ok(metric.width>185&&metric.height>65,device+' '+name+' existing composer');
          console.log('THEMES_V1_COMPOSER_VERIFIED',JSON.stringify({device,name,...metric}));
        }
        await page.locator('#dsThemeButton').click();
        assert.equal(await page.locator('#dsThemeMenu .ds-theme-option').count(),5);
        assert.equal(await page.locator('#dsThemeMenu').isVisible(),true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#dsThemeMenu').isVisible(),false);
        for(const mode of modes){
          await page.locator('#dsThemeButton').click();
          await page.locator('#dsThemeMenu button[data-theme-id="'+mode+'"]').click();
          assert.equal(await page.locator('html').getAttribute('data-deepsyq-theme'),mode);
          assert.equal(await page.evaluate(()=>localStorage.getItem('deepsyq-themes-v1')),mode);
          assert.equal(await page.locator('#dsThemeMenu button[aria-checked="true"]').count(),1);
          const bg=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
          if(color[mode])assert.equal(bg,color[mode],device+' '+name+' '+mode+' body bg');
          if(mode==='original'){
            const raw=await page.evaluate(()=>{
              const root=document.documentElement;
              const selected=getComputedStyle(document.body).background;
              delete root.dataset.deepsyqTheme;
              const without=getComputedStyle(document.body).background;
              root.dataset.deepsyqTheme='original';
              return {selected,without};
            });
            assert.equal(raw.selected,raw.without,'Original must not change source background');
          }
          if(mode==='christmas'){
            await page.locator('#dsChristmasBackdrop').waitFor({state:'visible',timeout:5000});
            const winter=await page.locator('#dsChristmasBackdrop').evaluate(el=>getComputedStyle(el).backgroundImage);
            assert.ok(winter.includes(isMobile?'winter-mobile.svg':'winter-desktop.svg'));
            if(name==='home'||name==='jarvix'){
              const target=name==='home'?'#homeHeroCarousel':'#jChatForm';
              await page.locator(target+' > .ds-snow-ridge').waitFor({state:'visible',timeout:5000});
              const snowEdge=await page.locator(target+' > .ds-snow-ridge')
                .evaluate(el=>getComputedStyle(el).backgroundImage);
              assert.match(snowEdge,/snow-edge\.svg/);
              if(name==='home'){
                await page.locator('.hero-stage.hero-stage-cinematic > .ds-snow-ridge').waitFor({state:'visible',timeout:5000});
                const cap=await page.locator('.hero-stage.hero-stage-cinematic > .ds-snow-ridge')
                  .evaluate(el=>({h:el.getBoundingClientRect().height,bg:getComputedStyle(el).backgroundImage}));
                assert.ok(cap.h>=12&&cap.bg.includes('snow-edge.svg'),'Visible snow cap must decorate carousel outer frame');
                const scene=await page.locator('#homeHeroCarousel').evaluate(el=>({
                  empty:el.classList.contains('is-empty'),
                  image:getComputedStyle(el).backgroundImage
                }));
                if(scene.empty)assert.match(scene.image,/winter-(desktop|mobile)\.svg/);
              }
            }
            await page.locator('#dsSnowfallCanvas').waitFor({state:'visible',timeout:5000});
            if(name==='home'){
              const frame=await page.locator('#homeHeroCarousel').boundingBox();
              assert.ok(frame);
              await page.locator('#homeHeroCarousel').dispatchEvent('pointerdown',{
                bubbles:true,button:0,clientX:frame.x+frame.width*.45,clientY:frame.y+8
              });
              assert.ok(await page.locator('#homeHeroCarousel .ds-snow-burst').count()>0,'Snow reacts to upper edge touch');
            }
          }else{
            assert.equal(await page.locator('#dsChristmasBackdrop').count(),0);
            assert.equal(await page.locator('#dsSnowfallCanvas').count(),0);
          }
          await page.screenshot({
            path:'artifacts/themes-v1/'+device+'-'+name+'-'+mode+'.png',
            animations:'disabled',fullPage:false
          });
          console.log('THEMES_V1_MODE_PASS',JSON.stringify({device,name,mode,bg}));
          checks++;
        }
      }
    }finally{await context.close();}
  }
  // Reduced motion preference retains holiday scenery while disabling animation.
  const reduced=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  try{
    const page=await reduced.newPage();
    await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
    await page.locator('#dsThemeButton').click();
    await page.locator('button[data-theme-id="christmas"]').click();
    assert.equal(await page.locator('#dsChristmasBackdrop').count(),1);
    assert.equal(await page.locator('#dsSnowfallCanvas').count(),0);
    console.log('THEMES_V1_REDUCED_MOTION_PASS');
  }finally{await reduced.close();}
  // Broad responsive smoke: mobile and desktop widths per owner checklist.
  for(const width of [320,375,430,768,1280,1920]){
    const context=await browser.newContext({viewport:{width,height:850}});
    try{
      const page=await context.newPage();
      await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
      await page.locator('#dsThemeButton').waitFor({state:'visible',timeout:15000});
      await page.locator('#dsThemeButton').click();
      assert.equal(await page.locator('#dsThemeMenu .ds-theme-option').count(),5);
      await page.locator('#dsThemeMenu button[data-theme-id="christmas"]').click();
      assert.equal(await page.locator('#dsChristmasBackdrop').isVisible(),true);
      const button=await page.locator('#dsThemeButton').boundingBox();
      assert.ok(button&&button.x>=0&&button.x+button.width<=width+1,'Theme control fits '+width);
      console.log('THEMES_V1_RESPONSIVE_PASS',width);
      checks++;
    }finally{await context.close();}
  }
  const auth=await fetch(base+'/api/auth/email/status');
  assert.equal(auth.status,503,'Preview auth API deliberately blocked');
  console.log('THEMES_V1_ISOLATED_API_PASS',auth.status);
  console.log('THEMES_V1_LIVE_BROWSER_PASS',JSON.stringify({modes:5,primaryPages:3,devices:2,widths:8,checks}));
}catch(e){
  console.error('THEMES_V1_BROWSER_FAIL',e?.stack||String(e));
  throw e;
}finally{await browser.close();}
