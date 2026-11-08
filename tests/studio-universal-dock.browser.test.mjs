import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=32991,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server/deepsyq-preview.js'],{
 cwd:process.cwd(),env:{...process.env,PORT:String(port),NODE_ENV:'test',OPENAI_API_KEY:'',
 GEMINI_API_KEY:'',GROQ_API_KEY:'',DATABASE_URL:'',JARVIX_QUOTA_DATABASE_URL:'',
 JARVIX_FREE_LLM_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',x=>output+=String(x));server.stderr.on('data',x=>output+=String(x));
let browser;
const file='artifacts/studio-universal-dock';
try{
 let ready=false;
 for(let i=0;i<135;i++){
  if(server.exitCode!==null)break;
  try{const r=await fetch(base+'/generate-studio.html?studio=image');if(r.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,170));
 }
 assert.ok(ready,'Preview unavailable: '+output.slice(-900));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 await mkdir(file,{recursive:true});
 for(const layout of [{name:'desktop',w:1365,h:900,mobile:false},{name:'mobile-portrait',w:390,h:844,mobile:true}]){
  for(const kind of ['image','video','audio']){
   await test('Single Universal Hub Studio '+layout.name+' '+kind,async()=>{
    const context=await browser.newContext({viewport:{width:layout.w,height:layout.h},
     isMobile:layout.mobile,hasTouch:layout.mobile,deviceScaleFactor:1});
    await context.addInitScript(()=>{localStorage.setItem('deepsyq_lumina_terms_accepted','true');});
    const page=await context.newPage();
    const paid=[],errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|stripe|payments)\b/.test(r.url()))paid.push(r.url());});
    try{
     await page.goto(base+'/generate-studio.html?studio='+kind,{waitUntil:'domcontentloaded',timeout:30000});
     await page.waitForSelector('#studioUniversalDock #jPlus',{timeout:25000});
     const geometry=await page.evaluate(()=>{
      const rect=id=>{const el=document.querySelector(id),r=el?.getBoundingClientRect();return r?{l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height}:null;};
      return {vw:innerWidth,vh:innerHeight,dock:rect('#studioUniversalDock'),plus:rect('#studioUniversalDock #jPlus'),
       send:rect('#studioUniversalDock #generate'),prompt:rect('#studioUniversalDock #prompt'),
       composerDisplay:getComputedStyle(document.querySelector('#creator>.prompt-row')).display,
       // Original live form may stay mounted for its handlers, but its obsolete
       // amber gradient frame must NOT appear behind #studioUniversalDock.
       nativeFrame:(()=>{
        const style=getComputedStyle(document.getElementById('creator'));
        return{borderTop:style.borderTopWidth,borderBottom:style.borderBottomWidth,
         backgroundImage:style.backgroundImage,backgroundColor:style.backgroundColor,
         boxShadow:style.boxShadow,outlineStyle:style.outlineStyle};
       })(),
       inForm:document.getElementById('generate').form?.id,
       inputForm:document.getElementById('prompt').form?.id};
     });
     assert.ok(geometry.dock?.l>=-1&&geometry.dock?.r<=layout.w+1,'dock fits screen '+JSON.stringify(geometry));
     assert.ok(geometry.dock.b<=layout.h+1&&geometry.dock.b>layout.h-100,'dock pinned near bottom '+JSON.stringify(geometry));
     assert.equal(geometry.composerDisplay,'none','old Studio composer input row must be hidden');
     assert.deepEqual(geometry.nativeFrame,{
      borderTop:'0px',borderBottom:'0px',backgroundImage:'none',
      backgroundColor:'rgba(0, 0, 0, 0)',boxShadow:'none',outlineStyle:'none'
     },'No phantom gold line/glow from old native form behind real dock on '+layout.name+' '+kind);
     assert.equal(geometry.inForm,'creator','real generate remains tied to original form');
     assert.equal(geometry.inputForm,'creator','real prompt remains tied to original form');
     assert.ok(Math.abs(geometry.plus.w-geometry.plus.h)<2,'round +');
     assert.ok(Math.abs(geometry.send.w-geometry.send.h)<2,'round Send');
     assert.equal(await page.locator('#studioUniversalDock .j-mode-rail a').count(),1,'Video Uniquifier must not appear in Studio chat rail');
     assert.equal(await page.locator('#studioUniversalDock #jPlusMenu').isVisible(),false);
     await page.locator('#studioUniversalDock #jPlus').click();
     assert.equal(await page.locator('#studioUniversalDock #jPlusMenu .j-hub-tile').count(),8);
     await page.screenshot({path:file+'/'+layout.name+'-'+kind+'-hub.png',fullPage:false});
     const before=new URL(page.url()).pathname;
     const choice=kind==='image'?'video':'image';
     await page.locator('#studioUniversalDock #jPlusMenu [data-j-mode="'+choice+'"]').click();
     assert.equal(new URL(page.url()).pathname,before,'mode must switch in same existing Studio page');
     assert.equal(new URL(page.url()).searchParams.get('studio'),choice);
     assert.ok((await page.locator('#studioUniversalDock .j-active-mode').innerText()).toLowerCase().includes(choice));
     assert.equal(await page.locator('#studioUniversalDock #jPlus').innerText(),'+');
     assert.equal(await page.locator('#studioUniversalDock #jSettingsMenu').count(),0,'no secondary mode chooser');
     await page.locator('#studioUniversalDock #studioSettingsToggle').click();
     await page.locator('#studioSettingsHub[open]').waitFor({timeout:12000});
     assert.equal(new URL(page.url()).pathname,before,'native settings must not redirect');
     assert.equal(new URL(page.url()).searchParams.get('studio'),choice,'gear must preserve selected mode');
     for(const id of ['studioTypePicker','modelButton','settingsButton'])
      assert.equal(await page.locator('#studioSettingsHub #'+id).count(),1,id+' native settings control');
     await page.locator('link[data-deepsyq-studio-premium]').waitFor({state:'attached',timeout:12000});
     assert.equal(await page.locator('body.studio-premium-panels').count(),1,'approved premium skin is scoped to Studio');
     const hubTheme=await page.locator('#studioSettingsHub').evaluate(el=>({
       borderRadius:getComputedStyle(el).borderRadius,background:getComputedStyle(el).backgroundImage
     }));
     assert.match(hubTheme.background,/gradient/,'parent uses real turquoise/gold panel background');
     await page.screenshot({path:file+'/'+layout.name+'-'+kind+'-settings.png',fullPage:false});
     await page.locator('#studioSettingsHub #modelButton').click();
     await page.locator('#modelDialog[open]').waitFor({timeout:12000});
     assert.ok(await page.locator('#modelDialog .model-card').count()>0,'native real model cards remain present');
     await page.locator('#modelDialog .model-provider-mark').first().waitFor({timeout:12000});
     const providerBadge=await page.locator('#modelDialog .model-provider-mark').first().textContent();
     assert.notEqual(providerBadge?.trim(),'П','old generic connection-letter placeholder removed');
     // A family-specific text identifier is not an official model illustration.
     for(const [needle,prefix] of [['Nano Banana','NB'],['Seedream','SR'],['Seedance','SE'],['Veo','V'],['GPT Image','GPT']]){
      const sample=page.locator('#modelDialog .model-card').filter({has:page.locator('strong', {hasText:needle})}).first();
      if(await sample.count()){
       const mark=sample.locator('.model-provider-mark');
       assert.ok((await mark.innerText()).startsWith(prefix),needle+' model family code');
       assert.match(await mark.getAttribute('title'),/not an official image/,needle+' no fake official mark');
      }
     }
     await page.screenshot({path:file+'/'+layout.name+'-'+kind+'-premium-models.png',fullPage:false});
     await page.locator('#modelDialog [data-close="modelDialog"]').click();
     await page.locator('#studioSettingsHub[open]').waitFor({timeout:12000});
     await page.locator('#studioSettingsHub #settingsButton').click();
     await page.locator('#settingsDialog[open]').waitFor({timeout:12000});
     assert.ok(await page.locator('#settingsDialog .ratio-choices button:not(:disabled)').count()>=1,'native supported ratio choice persists');
     const nativeOptions=await page.locator('#ratio option').allTextContents();
     const validButtons=await page.locator('#settingsDialog .ratio-choices button:not(:disabled)').count();
     assert.equal(validButtons,nativeOptions.length,'never add unsupported selectable video ratios');
     if(choice==='video'){
      assert.equal(await page.locator('#settingsDialog .ratio-choices button').count(),5,'visual ratio grid matches Image Settings');
      assert.equal(await page.locator('#settingsDialog .ratio-choices button:disabled').count(),5-nativeOptions.length,'unsupported ratios visibly disabled');
      const order=await page.locator('#settingsDialog .ratio-choices button').evaluateAll(nodes=>nodes.map(el=>el.querySelector('span:last-child')?.textContent?.trim()));
      assert.deepEqual(order,['1:1','2:3','3:2','9:16','16:9'],'same visual ratio order as Image Settings');
      const supportedSet=new Set(await page.locator('#ratio option').evaluateAll(xs=>xs.map(o=>o.value)));
      for(const button of await page.locator('#settingsDialog .ratio-choices button').all()){
       const label=(await button.locator('span:last-child').innerText()).trim();
       assert.equal(await button.isEnabled(),supportedSet.has(label),'ratio support stays native: '+label);
      }
     }
     await page.screenshot({path:file+'/'+layout.name+'-'+kind+'-premium-parameters.png',fullPage:false});
     await page.locator('#settingsDialog [data-t="done"]').click();
     await page.locator('#studioSettingsHub[open]').waitFor({timeout:12000});
     await page.locator('#studioSettingsHub > button:nth-child(2)').click();
     await page.locator('#studioSettingsHub[open]').waitFor({state:'hidden',timeout:12000});
     await page.locator('#studioUniversalDock #prompt').fill('Owner interface-only smoke test prompt');
     assert.equal(await page.locator('#prompt').inputValue(),'Owner interface-only smoke test prompt');
     // Explicitly DO NOT submit or click Generate: no paid calls, no free generation.
     assert.equal(paid.length,0,'Never auto launch generation');
     assert.equal(errors.length,0,'No uncaught errors: '+errors.join('; '));
    }finally{await context.close();}
   });
  }
 }
 await test('Audio premium panel keeps actual audio modes, language, voice and Done controls',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();const paid=[],errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|stripe|payments)\b/.test(r.url()))paid.push(r.url());});
  try{
   await page.goto(base+'/generate-studio.html?studio=audio',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#studioUniversalDock #studioSettingsToggle',{timeout:20000});
   await page.locator('#studioUniversalDock #studioSettingsToggle').click();
   await page.locator('#studioSettingsHub[open]').waitFor({timeout:12000});
   await page.locator('#studioSettingsHub #settingsButton').click();
   await page.locator('#settingsDialog[open]').waitFor({timeout:12000});
   await page.waitForFunction(()=>document.getElementById('settingsDialog')?.dataset.studioKind==='music',{timeout:12000});
   assert.equal(await page.locator('#settingsDialog').getAttribute('data-studio-kind'),'music');
   assert.equal(await page.locator('#settingsDialog #musicOptions').isVisible(),true);
   const modes=await page.locator('#musicMode option').evaluateAll(items=>items.map(x=>x.value));
   assert.ok(modes.includes('song')&&modes.includes('instrumental'));
   await page.locator('#musicMode').selectOption('instrumental');
   assert.equal(await page.locator('#musicMode').inputValue(),'instrumental');
   await page.screenshot({path:file+'/mobile-premium-audio-settings.png',fullPage:false});
   await page.locator('#settingsDialog [data-t="done"]').click();
   assert.equal(await page.locator('#studioSettingsHub[open]').count(),1);
   assert.deepEqual(paid,[]);
   assert.deepEqual(errors,[]);
  }finally{await context.close();}
 });
 await test('Home gear opens previous existing Studio settings; Universal Hub rail remains unchanged',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
   const page=await context.newPage();await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#homeQuickForm .j-settings-shortcut',{timeout:16000});
   assert.equal(await page.locator('#homeQuickBar .j-mode-rail a').count(),1,'Video Uniquifier must not appear in Home chat rail');
   assert.equal(await page.locator('#homeQuickForm #jSettingsMenu').count(),0);
   await page.locator('#homeQuickForm .j-settings-shortcut').click();
   const native=page.frameLocator('#homeStudioSettingsFrame');
   await native.locator('#studioSettingsHub[open]').waitFor({timeout:22000});
   await page.locator('#homeStudioSettingsHost[data-ready="true"]').waitFor({timeout:22000});
   assert.equal(new URL(page.url()).pathname,'/deepsyq.html','real settings appear over existing Home');
   assert.match(await page.locator('#homeStudioSettingsFrame').getAttribute('src'),/studio=image&settings=1/);
   assert.equal(await native.locator('#studioSettingsHub #studioTypePicker').count(),1);
   assert.equal(await native.locator('#studioSettingsHub #modelButton').count(),1);
   assert.equal(await native.locator('#studioSettingsHub #settingsButton').count(),1);
   assert.equal(await native.locator('body>.topbar').evaluate(el=>getComputedStyle(el).display),'none','no duplicate embedded Studio header');
   await native.locator('#studioSettingsHub > button:nth-child(2)').click();
   await page.locator('#homeStudioSettingsHost').waitFor({state:'hidden',timeout:12000});
  }finally{await context.close();}
 });

 // Owner #619: test the actual shared CSS after late styles are loaded; never send a paid request.
 await test('Issue 619: golden dock and arrow-only Send on Home, JARVIX and all Studios',async()=>{
  for(const layout of [{name:'desktop',w:1365,h:900},{name:'mobile',w:390,h:844},{name:'small-mobile',w:320,h:700}]){
   for(const route of ['deepsyq.html','jarvix-chat.html','generate-studio.html?studio=image',
    'generate-studio.html?studio=video','generate-studio.html?studio=audio']){
    const context=await browser.newContext({viewport:{width:layout.w,height:layout.h},
     isMobile:layout.w<761,hasTouch:layout.w<761});
    await context.addInitScript(()=>{localStorage.setItem('deepsyq_lumina_terms_accepted','true');});
    const page=await context.newPage(),paid=[];
    page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|stripe|payments)\b/.test(r.url()))paid.push(r.url());});
    try{
     await page.goto(base+'/'+route,{waitUntil:'domcontentloaded',timeout:30000});
     const studio=route.startsWith('generate-studio');
     const dockSelector=studio?'#studioUniversalDock.j-neon-dock':
      route==='jarvix-chat.html'?'.j-chat-bottom.j-neon-dock':'#homeQuickBar.j-neon-dock';
     const sendSelector=studio?'#generate':route==='jarvix-chat.html'?'#jSend':'#homeQuickSubmit';
     await page.waitForSelector(dockSelector+' #jPlus',{timeout:25000});
     await page.waitForFunction(()=>getComputedStyle(document.getElementById('jPlus')).borderTopColor==='rgb(255, 191, 82)',null,{timeout:15000});
     const styles=await page.evaluate(({dockSelector,sendSelector})=>{
      const dock=document.querySelector(dockSelector),plus=dock.querySelector('#jPlus'),
       send=dock.querySelector(sendSelector),icon=send?.querySelector('.j-send-plane');
      const d=getComputedStyle(dock),p=getComputedStyle(plus),s=getComputedStyle(send);
      const r=dock.getBoundingClientRect();
      return {dockBackground:d.backgroundImage,plusBorder:p.borderTopColor,
       plusBackground:p.backgroundImage,sendColor:s.color,
       sendBackground:s.backgroundImage,sendBackgroundColor:s.backgroundColor,
       sendBorder:s.borderTopWidth,sendShadow:s.boxShadow,
       glyph:!!icon,iconStroke:icon&&getComputedStyle(icon).stroke,
       left:r.left,right:r.right,viewport:innerWidth};
     },{dockSelector,sendSelector});
     assert.ok(styles.dockBackground.includes('rgb(255, 191, 82)')||
      styles.dockBackground.includes('rgb(255, 202, 107)'),route+' gold frame '+JSON.stringify(styles));
     assert.equal(styles.plusBorder,'rgb(255, 191, 82)',route+' + must be amber');
     assert.equal(styles.sendColor,'rgb(255, 191, 82)',route+' arrow must be amber');
     assert.equal(styles.sendBackground,'none',route+' no colored Send disc');
     assert.equal(styles.sendBackgroundColor,'rgba(0, 0, 0, 0)',route+' no Send fill');
     assert.equal(styles.sendBorder,'0px',route+' no circular Send border');
     assert.equal(styles.sendShadow,'none',route+' no circular Send glow');
     assert.equal(styles.glyph,true,route+' existing real paper-plane SVG retained');
     assert.ok(styles.left>=-2&&styles.right<=layout.w+2,route+' dock not clipped '+JSON.stringify(styles));
     await page.screenshot({path:file+'/issue619-'+layout.name+'-'+route.split('/').pop().replace(/[^a-z0-9-]/gi,'_')+'.png',fullPage:false});
     await page.locator(dockSelector+' #jPlus').click();
     assert.equal(await page.locator(dockSelector+' #jPlusMenu .j-hub-tile').count(),8,route+' native hub remains');
     assert.equal(paid.length,0,route+' no paid requests');
    }finally{await context.close();}
   }
  }
 });
 // Owner 2026-11-07: middle mobile spotlight uses original JARVIX orb/link.
 await test('Mobile Home center JARVIX card opens clean chat',async()=>{
  for(const width of [390,320]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
   await context.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
   const page=await context.newPage(),paid=[];
   page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|stripe|payments)\b/.test(r.url()))paid.push(r.url());});
   try{
    await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded',timeout:30000});
    const cards=page.locator('#createWithDeepsyq .home-feature-triptych .home-feature-spotlight');
    assert.deepEqual((await cards.allTextContents()).map(s=>s.trim()),['Canvas','JARVIX','AI Apps']);
    const agent=page.locator('#createWithDeepsyq .home-spotlight-agent');
    assert.equal(await agent.getAttribute('href'),'jarvix-chat.html');
    assert.equal(await agent.getAttribute('aria-label'),'JARVIX chat');
    const orb=agent.locator('.home-spotlight-jarvix-orb.jarvis-mini-orb');
    await orb.waitFor({state:'visible',timeout:16000});
    await page.waitForFunction(()=>document.querySelector('.home-spotlight-jarvix-orb')?.classList.contains('jv-approved-orb'),null,{timeout:15000});
    const actual=await agent.evaluate(el=>{
     const orb=el.querySelector('.home-spotlight-jarvix-orb'),title=el.querySelector('.home-spotlight-jarvix-title'),r=el.getBoundingClientRect();
     return {title:title.textContent.trim(),titleDisplay:getComputedStyle(title).display,
      titleVisibility:getComputedStyle(title).visibility,orbDisplay:getComputedStyle(orb).display,
      approved:orb.classList.contains('jv-approved-orb'),left:r.left,right:r.right};
    });
    assert.equal(actual.title,'JARVIX');
    assert.notEqual(actual.titleDisplay,'none');
    assert.equal(actual.titleVisibility,'visible');
    assert.notEqual(actual.orbDisplay,'none');
    assert.equal(actual.approved,true);
    assert.ok(actual.left>=-1&&actual.right<=width+1,'mobile spotlight fits viewport');
    await page.screenshot({path:file+'/owner-mobile-jarvix-'+width+'.png',fullPage:false});
    await agent.click();
    await page.waitForURL('**/jarvix-chat.html',{timeout:20000});
    assert.ok(!(await page.locator('body').innerText()).includes('Text, images, video and audio — one conversation.'));
    for(const kind of ['image','video','audio']){
     await page.goto(base+'/generate-studio.html?studio='+kind,{waitUntil:'domcontentloaded'});
     await page.waitForSelector('#studioUniversalDock #jPlus',{timeout:20000});
     assert.ok(!(await page.locator('body').innerText()).includes('Text, images, video and audio — one conversation.'),kind+' page must remain clean');
    }
    assert.equal(paid.length,0);
   }finally{await context.close();}
  }
  const chatSource=await (await import('node:fs/promises')).readFile(
   new URL('../app/src/main/assets/jarvix-chat.js',import.meta.url),'utf8');
  assert.ok(!chatSource.includes('Text, images, video and audio — one conversation.'));
 });

 // Owner 2026-11-07: JARVIX Chat composer matches the pre-existing Studio dock width.
 await test('JARVIX Chat bottom dock matches Studio width without touching chat functions',async()=>{
  for(const device of [{width:1365,height:900,mobile:false},{width:390,height:844,mobile:true},
   {width:320,height:700,mobile:true}]){
   const context=await browser.newContext({viewport:{width:device.width,height:device.height},
    isMobile:device.mobile,hasTouch:device.mobile,deviceScaleFactor:1});
   const page=await context.newPage(),paid=[];
   page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(?:studio\/jobs|stripe|payments)\b/.test(r.url()))paid.push(r.url());});
   await context.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
   try{
    await page.goto(base+'/generate-studio.html?studio=image',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('#studioUniversalDock.j-neon-dock',{timeout:25000});
    const reference=await page.locator('#studioUniversalDock.j-neon-dock').boundingBox();
    assert.ok(reference&&reference.width>0,'native Studio reference dock');
    await page.goto(base+'/jarvix-chat.html',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('.jarvix-chat>.j-chat-bottom.j-neon-dock',{timeout:25000});
    const dock=page.locator('.jarvix-chat>.j-chat-bottom.j-neon-dock');
    const bounds=await dock.boundingBox();
    assert.ok(bounds&&bounds.width>0,'chat dock must be present');
    assert.ok(Math.abs(bounds.width-reference.width)<=2,
     'JARVIX width must equal Studio '+JSON.stringify({device,chat:bounds.width,studio:reference.width}));
    assert.ok(bounds.x>=-1&&bounds.x+bounds.width<=device.width+1,'dock within viewport');
    assert.equal(await dock.locator('#jPlus').count(),1,'one original Plus handler');
    assert.equal(await dock.locator('#jInput').count(),1,'one original chat input');
    assert.equal(await dock.locator('#jSend').count(),1,'one original Send handler');
    await dock.locator('#jPlus').click();
    assert.equal(await dock.locator('#jPlusMenu .j-hub-tile').count(),8,'original Plus menu preserved');
    await page.screenshot({path:file+'/owner-jarvix-dock-width-'+device.width+'.png',fullPage:false});
    assert.equal(paid.length,0,'No paid request during width check');
   }finally{await context.close();}
  }
 });

 // Owner 2026-11-07: desktop top chrome does not blink on Home -> Image/Video/Audio/JARVIX.
 // A native pagereveal viewTransition would briefly hide the old shared header.
 await test('Desktop page changes retain the old visible header snapshot while lower modes switch',async()=>{
  const context=await browser.newContext({viewport:{width:1365,height:900}});
  await context.addInitScript(()=>{
   // Existing no-spend Studio tests preaccept onboarding in the isolated test context.
   // Otherwise the first Image entry opens a modal over the sidebar navigation.
   try{localStorage.setItem('deepsyq_lumina_terms_accepted','true');}catch{}
   // Capture browser's actual cross-document transition, not just the CSS rule.
   document.addEventListener('pagereveal',event=>{
    const wasActive=!!event.viewTransition;
    let oldHeaderSnapshot='unknown';
    try{oldHeaderSnapshot=getComputedStyle(document.documentElement,'::view-transition-old(ds-header)').display;}catch{}
    window.__deepsyqNavProbe={wasActive,oldHeaderSnapshot};
   },{once:true});
  });
  const page=await context.newPage(),paid=[];
  page.on('request',request=>{
   if(request.method()==='POST'&&/\/api\/(?:studio\/jobs|stripe|payments)\b/.test(request.url()))
    paid.push(request.url());
  });
  try{
   await page.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded',timeout:30000});
   const clicks=[
    ['generate-studio.html?studio=image','Image'],
    ['generate-studio.html?studio=video','Video'],
    ['generate-studio.html?studio=audio','Audio'],
    ['jarvix-chat.html','JARVIX']
   ];
   for(const [target,label] of clicks){
    // Click the actual left sidebar navigation: the lower Studio rail's
    // Image/Video/Audio anchors intentionally switch modes without navigating.
    const sidebarRoute=page.locator('#sidebar a[href="'+target+'"], #dsSiteSidebar a[href="'+target+'"]').first();
    await sidebarRoute.waitFor({state:'visible',timeout:20000});
    // pageswap fires from the still-loaded source page before unloading, unlike
    // pagereveal which can precede a destination script's first event handler.
    await page.evaluate(()=>{
     sessionStorage.removeItem('__ownerHeaderOutgoingTransition');
     window.addEventListener('pageswap',event=>{
      const header=document.querySelector('header.ds-stable-header');
      sessionStorage.setItem('__ownerHeaderOutgoingTransition',JSON.stringify({
       active:!!event.viewTransition,
       name:header?getComputedStyle(header).viewTransitionName:null,
       headerPresent:!!header
      }));
     },{once:true});
    });
    await Promise.all([
     page.waitForURL('**/'+target,{timeout:30000}),
     sidebarRoute.click()
    ]);
    await page.waitForSelector('header.ds-stable-header .ds-header-cockpit',{timeout:20000});
    await page.waitForFunction(()=>{
     const sheet=[...document.styleSheets].find(s=>s.href?.endsWith('/deepsyq-mobile-shell.css'));
     if(!sheet)return false;
     try{return [...sheet.cssRules].some(rule=>rule.cssText.startsWith('@view-transition')
      &&rule.cssText.includes('navigation: auto'));}
     catch{return false;}
    },null,{timeout:15000});
    const state=await page.evaluate(()=>{
     const header=document.querySelector('header.ds-stable-header');
     const rect=header?.getBoundingClientRect(),css=header&&getComputedStyle(header);
     const sheet=[...document.styleSheets].find(s=>s.href?.endsWith('/deepsyq-mobile-shell.css'));
     const enabled=[...sheet.cssRules].some(rule=>rule.cssText.startsWith('@view-transition')
      &&rule.cssText.includes('navigation: auto'));
     const injected=[...document.querySelectorAll('link[rel="stylesheet"]')]
      .filter(link=>/\/(?:deepsyq-unified-platform-header|jarvix-action-design)\.css$/.test(new URL(link.href).pathname));
     // deepsyq-mobile-shell.css is already render-blocking from the static HTML head.
     const blocker=injected.length===2&&injected.every(link=>link.blocking?.contains('render'));
     let outgoing=null;
     try{outgoing=JSON.parse(sessionStorage.getItem('__ownerHeaderOutgoingTransition')||'null');}catch{}
     return {probe:window.__deepsyqNavProbe||null,enabled,blocker,outgoing,
      pageRevealSupported:('onpagereveal' in window)||('PageRevealEvent' in window),
      position:css?.position,top:rect?.top,width:rect?.width,
      hasLeft:!!header?.querySelector('.ds-header-pod-left'),
      hasRight:!!header?.querySelector('.ds-header-pod-right'),
      hasOrb:!!header?.querySelector('#topJarvisBtn')};
    });
    assert.equal(state.enabled,true,label+' desktop cross-document transition must be enabled');
    assert.equal(state.blocker,true,label+' critical header CSS must be render-blocking');
    console.log('owner-header-transition-probe',label,JSON.stringify({outgoing:state.outgoing,probe:state.probe}));
    assert.equal(state.outgoing?.headerPresent,true,label+' outgoing header exists for transition');
    assert.equal(state.outgoing?.name,'ds-header',label+' outgoing header snapshot named ds-header');
    assert.equal(state.outgoing?.active,true,label+' browser must retain outgoing header during cross-document navigation');
    assert.equal(state.position,'fixed',label+' top header must stay fixed');
    assert.ok(Math.abs(state.top)<=3,label+' header top must remain stable');
    assert.equal(state.hasLeft,true,label+' left header actions preserved');
    assert.equal(state.hasRight,true,label+' right header actions preserved');
    assert.equal(state.hasOrb,true,label+' approved JARVIX header sphere preserved');
    const composer=label==='JARVIX'?'.jarvix-chat>.j-chat-bottom.j-neon-dock':
      '#studioUniversalDock.j-neon-dock';
    await page.locator(composer+' #jPlus').waitFor({state:'visible',timeout:20000});
    await page.screenshot({path:file+'/owner-no-desktop-header-blink-'+label.toLowerCase()+'.png',fullPage:false});
   }
   assert.equal(paid.length,0,'header navigation must not trigger paid requests');
  }finally{await context.close();}
 });
}finally{
 await browser?.close();server.kill('SIGTERM');
 if(server.exitCode===null&&server.signalCode===null)await once(server,'exit');
}
