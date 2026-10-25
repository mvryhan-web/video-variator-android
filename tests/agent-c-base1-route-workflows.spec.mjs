import {test,expect} from '@playwright/test';

// BASE §1 / owner Issue298 / Agent C acceptance. Entirely synthetic API fixtures.
// No actual AI model is called, no credits or customer accounts are touched.
const templates=[
 {id:'i',title:'Fixture Image',category:'Art',generationType:'image',promptTemplate:'An original watercolor city'},
 {id:'v',title:'Fixture Video',category:'Film',generationType:'video',promptTemplate:'Slow orbit around a fictional landscape'},
 {id:'a',title:'Fixture Audio',category:'Music',generationType:'audio',promptTemplate:'A short original ambient melody'},
 {id:'p',title:'Fixture Product',category:'Advertising',generationType:'product_video',
  requiredInputTypes:['image','product_name'],promptTemplate:'Show {{product_name}} with warm studio lighting'}
];
const inspiration=[
 {id:'owned-fixture',title:'Fixture Inspiration',slug:'fixture-inspiration',category:'Editorial',
  kind:'video',description:'Synthetic route test only',previewUrl:'/fixture-not-a-real-image.webp',
  prompt:'A blue botanical poster',aspectRatio:'2:3',actionTarget:'studio',
  requiredInputTypes:[],defaultSettings:{ratio:'2:3'},defaultModel:null}
];

async function mocks(page){
 await page.route('**/api/templates',route=>route.fulfill({json:{items:templates}}));
 await page.route('**/api/inspiration?**',route=>route.fulfill({json:{
  items:inspiration,categories:['Editorial'],ratios:['2:3'],
  pagination:{limit:24,offset:0,nextOffset:null,hasMore:false}
 }}));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{
  enabled:false,ownerOnly:true,publicGenerationEnabled:false,
  models:[],catalog:[],translation:{enabled:false}
 }}));
 await page.route('**/api/config',route=>route.fulfill({json:{
  googleClientId:'',billingConfigured:false,features:{aiApps:true,inspiration:true,productVideo:true},
  plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},
   lifetime:{price:2999,currency:'eur'}}
 }}));
 await page.route('**/api/auth/email/status',route=>route.fulfill({json:{configured:false}}));
}
function writeCounter(page){
 let count=0;
 page.on('request',request=>{
  const url=new URL(request.url());
  if(request.method()==='POST'&&/\/api\/(?:studio\/jobs|billing|payments|ai-wallet|speech\/generate)/.test(url.pathname))count++;
 });
 return ()=>count;
}
function checkViewport(page){
 return page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
}

test('BASE1-C 12 supported screens exist and retired Product Video routes stay 404; Studio routes remain functional',async({page})=>{
 await mocks(page);
 const routes=[
  'deepsyq.html','generate-studio.html?studio=image','generate-studio.html?studio=video',
  'generate-studio.html?studio=audio','ai-apps.html','inspiration.html',
  'free-tools.html','avatar-studio.html','generate-studio.html?view=history',
  'ai-pricing.html','index.html#profile','audio-studio.html'
 ];
 for(const route of routes){
  const response=await page.request.get('/'+route);
  expect(response.status(),route).toBe(200);
  expect(await response.text(),route).toContain('<html');
 }
 // A stale discovery flag must not bring back the cancelled feature.
 for(const retired of ['product-video','product-video.html']){
  expect((await page.request.get('/'+retired)).status(),retired).toBe(404);
 }
 await page.goto('/deepsyq.html');
 const sidebar=page.locator('#sidebar');
 for(const [label,href] of [
  ['Image studio','generate-studio.html?studio=image'],
  ['Video studio','generate-studio.html?studio=video'],
  ['Audio studio','generate-studio.html?studio=audio'],
  ['History','generate-studio.html?view=history'],
  ['Canvas','canvas.html']
 ]){
  // Mobile Home deliberately keeps its rail inert until the user opens it;
  // inspect the actual anchor's destination without falsely requiring visibility.
  await expect(sidebar.locator('a[aria-label="'+label+'"]')).toHaveAttribute('href',href);
 }
 await page.goto('/ai-apps.html');
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 for(const [label,href] of [
  ['AI Apps','ai-apps.html'],['Inspiration','deepsyq.html#inspirationPreview'],
  ['Tools','free-tools.html'],['Pricing','pricing.html'],
  ['History','generate-studio.html?view=history'],
  ['My Creations','generate-studio.html?view=history']
 ]){
  await expect(nav.getByRole('link',{name:label,exact:true})).toHaveAttribute('href',href);
 }
 await expect(nav.getByRole('link',{name:'AI Agents — coming soon'})).toHaveAttribute('href','deepsyq.html#agentFeature');
});

test('BASE1-C three supported AI Apps prepare prompts; the cancelled type stays hidden, no paid POST',async({page})=>{
 await mocks(page);
 const paid=writeCounter(page);
 const expected=[
  ['Fixture Image','image','An original watercolor city'],
  ['Fixture Video','video','Slow orbit around a fictional landscape'],
  ['Fixture Audio','audio','A short original ambient melody']
 ];
 for(const [title,kind,prompt] of expected){
  await page.goto('/ai-apps.html');
  await expect(page.locator('.app-card')).toHaveCount(3);
  await expect(page.locator('.app-card').filter({hasText:'Fixture Product'})).toHaveCount(0);
  const card=page.locator('.app-card').filter({hasText:title});
  await card.getByRole('button',{name:'Use template'}).click();
  await expect(page).toHaveURL(new RegExp('studio='+kind+'&from=template'));
  await expect(page.locator('#prompt')).toHaveValue(prompt);
  await expect(page.locator('#consent')).not.toBeChecked();
  expect(paid()).toBe(0);
 }
});

test('BASE1-C Inspiration kind, query, preview and Create/Prompt/Clone lead to real Studio safely',async({page})=>{
 await mocks(page);
 const paid=writeCounter(page);
 for(const [label,action] of [
  ['Create yours','create'],['Use this prompt','prompt'],['Clone and Try','clone']
 ]){
  await page.goto('/inspiration.html');
  await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(1);
  await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveAccessibleName('View Fixture Inspiration inspiration');
  await page.getByRole('button',{name:'View Fixture Inspiration inspiration'}).click();
  await page.getByRole('dialog').getByRole('button',{name:action==='clone'?'Clone & Try':label}).click();
  await expect(page).toHaveURL(new RegExp('studio=video&from=inspiration&action='+action));
  await expect(page.locator('#prompt')).toHaveValue('A blue botanical poster');
  await expect(page.locator('#consent')).not.toBeChecked();
  expect(paid()).toBe(0);
 }
 await page.goto('/inspiration.html');
 await page.locator('[data-inspiration-kind="video"]').click();
 await expect(page.locator('[data-inspiration-kind="video"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#inspirationPreview [data-inspiration-kind]')).toHaveCount(3);
 await page.locator('[data-inspiration-kind="image"]').click();
 await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(0);
 await page.locator('[data-inspiration-kind="all"]').click();
 await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(1);
});

test('BASE1-C owned AI Apps/Inspiration/Tools remain usable at 320, 375 and 768px',async({page})=>{
 await mocks(page);
 const paid=writeCounter(page);
 for(const width of [320,375,768]){
  await page.setViewportSize({width,height:812});
  await page.goto('/ai-apps.html');
  await expect(page.locator('#search')).toBeVisible();
  await expect(page.locator('#type')).toBeVisible();
  await expect(page.locator('.app-card')).toHaveCount(3);
  await expect(page.locator('.app-card').filter({hasText:'Fixture Product'})).toHaveCount(0);
  const apps=await checkViewport(page);
  expect(apps.scrollWidth,'AI Apps horizontal overflow '+width).toBeLessThanOrEqual(width+1);
  await page.goto('/inspiration.html');
  await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(1);
  await page.getByRole('button',{name:'View Fixture Inspiration inspiration'}).click();
  await expect(page.getByRole('dialog').getByRole('button',{name:'Create yours'})).toBeVisible();
  await page.keyboard.press('Escape');
  const gallery=await checkViewport(page);
  if(gallery.scrollWidth>width+1){
   const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')]
    .filter(el=>{const rect=el.getBoundingClientRect();return rect.right>innerWidth+1&&rect.width>0;})
    .slice(0,8).map(el=>({tag:el.tagName,cls:String(el.className).slice(0,90),
     right:Math.round(el.getBoundingClientRect().right)})));
   console.log('Inspiration overflow diagnostic',width,JSON.stringify(offenders));
  }
  expect(gallery.scrollWidth,'Inspiration horizontal overflow '+width).toBeLessThanOrEqual(width+1);
  await page.goto('/free-tools.html');
  const back=page.locator('main.tools header a.tool-back');
  await expect(back).toBeVisible();
  const canReceiveTap=await back.evaluate(link=>{
   const r=link.getBoundingClientRect();
   const p=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
   return p===link||link.contains(p);
  });
  expect(canReceiveTap,'Tools Back is overlapped at '+width).toBe(true);
  // The current hub removes its obsolete Audio card on purpose; verify the
  // actually rendered TTS/STT destinations instead of forcing duplicate links.
  const audio=page.locator('a.hub-tile[data-hub-tool="tts"]');
  const transcript=page.locator('a.hub-tile[data-hub-tool="stt"]');
  await expect(audio).toBeVisible();
  await expect(audio).toHaveAttribute('href','audio-studio.html?tool=tts');
  await expect(transcript).toHaveAttribute('href','audio-studio.html?tool=stt');
  // The old Avatar card was removed without a replacement in the hub.
  // This one C-owned shortcut restores only the missing real destination.
  const avatar=page.getByRole('navigation',{name:'Avatar studio shortcut'})
   .locator('a[href="avatar-studio.html?from=tools"]');
  await expect(avatar).toBeVisible();
  expect(await avatar.evaluate(el=>el.getBoundingClientRect().height),
   'Avatar shortcut accessible touch height at '+width).toBeGreaterThanOrEqual(44);
  if(width===320){
   await avatar.click();
   await expect(page).toHaveURL(/\/avatar-studio\.html\?from=tools$/);
   await page.goto('/free-tools.html');
  }else if(width===375){
   await audio.click();
   await expect(page).toHaveURL(/\/audio-studio\.html\?tool=tts$/);
   await page.goto('/free-tools.html');
  }
  await page.locator('main.tools header a.tool-back').click();
  await expect(page).toHaveURL(/\/deepsyq\.html$/);
 }
 expect(paid()).toBe(0);
});

test('BASE1-C Studio real Model chooser is reachable at small widths without paid dispatch',async({page})=>{
 await mocks(page);
 const paid=writeCounter(page);
 for(const width of [320,375,768]){
  await page.setViewportSize({width,height:812});
  await page.goto('/generate-studio.html?studio=image');
  const button=page.locator('#modelButton');
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('#modelDialog')).toBeVisible();
  await page.locator('#modelDialog [data-close="modelDialog"]').click();
  await expect(page.locator('#modelDialog')).toBeHidden();
 }
 expect(paid()).toBe(0);
});


test('BASE1-C3 Avatar Back returns to the actual caller, retaining legacy and direct fallback',async({page})=>{
 await mocks(page);
 const paid=writeCounter(page);
 await page.setViewportSize({width:375,height:812});
 await page.goto('/index.html');
 const legacy=page.locator('#avatarStudioLink[href="avatar-studio.html"]');
 await expect(legacy).toHaveCount(1);
 // Existing legacy navigation is intentionally hidden on mobile until opened.
 await page.locator('#menuBtn').click();
 await expect(page.locator('.sidebar')).toHaveClass(/open/);
 await legacy.click();
 await expect(page).toHaveURL(/\/avatar-studio\.html$/);
 const back=page.locator('a.tool-back[data-av="back"]');
 await expect(back).toHaveAttribute('href','index.html');
 await back.click();
 await expect(page).toHaveURL(/\/index\.html$/);

 // Both unmarked direct loads and unrecognized hints must retain the safe
 // original destination; no arbitrary return URL may be accepted.
 for(const href of ['/avatar-studio.html','/avatar-studio.html?from=untrusted']){
  await page.goto(href);
  await expect(page.locator('a.tool-back[data-av="back"]')).toHaveAttribute('href','index.html');
 }
 for(const width of [320,375,768]){
  await page.setViewportSize({width,height:812});
  await page.goto('/free-tools.html');
  const entry=page.getByRole('navigation',{name:'Avatar studio shortcut'})
   .locator('a[href="avatar-studio.html?from=tools"]');
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(page).toHaveURL(/\/avatar-studio\.html\?from=tools$/);
  const toolsBack=page.locator('a.tool-back[data-av="back"]');
  await expect(toolsBack).toHaveAttribute('href','free-tools.html');
  // A browser reload must preserve the explicitly selected safe origin.
  await page.reload();
  await expect(page.locator('a.tool-back[data-av="back"]')).toHaveAttribute('href','free-tools.html');
  await page.locator('a.tool-back[data-av="back"]').click();
  await expect(page).toHaveURL(/\/free-tools\.html$/);
 }
 expect(paid()).toBe(0);
});


test('BASE1-C3 Inspiration real video card uses existing owner neon tokens without touching routes',async({page})=>{
 await mocks(page);
 const paid=writeCounter(page);
 // A synthetic, never-published rights-neutral fixture verifies presentation only.
 const video={...inspiration[0],id:'fixture-neon-video',title:'Synthetic video palette fixture',
  kind:'video',aspectRatio:'16:9',previewUrl:'/synthetic-test-not-a-real-video.mp4'};
 await page.route('**/api/inspiration?**',route=>route.fulfill({json:{
  items:[video],categories:['Editorial'],ratios:['16:9'],
  pagination:{limit:24,offset:0,nextOffset:null,hasMore:false}
 }}));
 for(const width of [320,375,768]){
  await page.setViewportSize({width,height:812});
  await page.goto('/inspiration.html');
  const card=page.locator('#inspirationPreviewGrid .inspiration-preview-card[data-kind="video"]');
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAccessibleName('View Synthetic video palette fixture inspiration');
  await expect(card.locator('video')).toHaveCount(1);
  expect(await card.evaluate(el=>Number(getComputedStyle(el).getPropertyValue('--inspiration-ratio')))).toBeCloseTo(16/9,5);
  await expect(page.locator('#inspirationPreview [data-inspiration-kind]')).toHaveCount(3);
  await page.locator('[data-inspiration-kind="image"]').click();
  await expect(card).toHaveCount(0);
  await page.locator('[data-inspiration-kind="video"]').click();
  await expect(card).toHaveCount(1);
  await card.hover();
  expect(await card.evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(width+1);
  expect(paid()).toBe(0);
 }
});


test('BASE1-C4 owner neon cards and enabled-only local action preserve real routes and state',async({page})=>{
 await mocks(page);
 const paid=writeCounter(page);
 for(const width of [320,375,768,1280]){
  await page.setViewportSize({width,height:820});
  await page.goto('/ai-apps.html');
  const card=page.locator('.app-card').first();
  await expect(card).toBeVisible();
  const baseShadow=await card.evaluate(el=>getComputedStyle(el).boxShadow);
  expect(baseShadow,'Existing template card must have restrained depth').not.toBe('none');
  await card.getByRole('button',{name:'Use template'}).focus();
  await expect.poll(()=>card.evaluate(el=>getComputedStyle(el).borderTopColor))
   .toBe('rgb(146, 91, 255)');
  const focusedShadow=await card.evaluate(el=>getComputedStyle(el).boxShadow);
  expect(focusedShadow,'Keyboard focus must visibly highlight original template card').not.toBe('none');
  expect((await checkViewport(page)).scrollWidth,'Apps must not overflow at '+width).toBeLessThanOrEqual(width+1);

  // This pre-existing local-only tool is protected from paid API calls.
  // Temporarily toggle DOM disabled solely to inspect the enabled CSS contract.
  // The tool algorithm, upload and genuine enabled/disabled behavior are unchanged.
  await page.goto('/simple-background-remover.html');
  const erase=page.locator('#erase');
  await expect(erase).toBeDisabled();
  const disabledImage=await erase.evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(disabledImage,'No inviting enabled-style gradient while unavailable').toBe('none');
  const enabledStyle=await erase.evaluate(el=>{
   el.disabled=false;
   const style=getComputedStyle(el);
   const value={backgroundImage:style.backgroundImage,boxShadow:style.boxShadow};
   el.disabled=true;
   return value;
  });
  expect(enabledStyle.backgroundImage,'Enabled local erase uses owner gradient').toContain('linear-gradient');
  expect(enabledStyle.boxShadow,'Enabled local erase has neon depth').not.toBe('none');
  await expect(erase).toBeDisabled();
  expect((await checkViewport(page)).scrollWidth,'Eraser must not overflow at '+width).toBeLessThanOrEqual(width+1);
 }
 expect(paid(),'No paid AI, Stripe, or customer jobs').toBe(0);
});

test('BASE1-C21 Home image-only thumbnails preserve accessible names, real filters and 16:9 / 9:16 ratio handoffs',async({page})=>{
 await mocks(page);
 const paid=writeCounter(page);
 const video={...inspiration[0],id:'c21-video',title:'C21 synthetic widescreen',kind:'video',
  previewUrl:'/synthetic-c21-16by9.mp4',aspectRatio:'16:9'};
 const image={...inspiration[0],id:'c21-image',title:'C21 synthetic portrait',kind:'image',
  previewUrl:'/synthetic-c21-9by16.png',aspectRatio:'9:16'};
 await page.route('**/api/inspiration?**',route=>route.fulfill({json:{
  items:[video,image],categories:['Editorial'],ratios:['16:9','9:16'],
  pagination:{limit:24,offset:0,nextOffset:null,hasMore:false}
 }}));
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  await page.goto('/deepsyq.html#inspirationPreview');
  const root=page.locator('#inspirationPreviewGrid');
  await expect(root.locator('.inspiration-preview-card')).toHaveCount(2);
  const videoCard=root.getByRole('button',{name:'View C21 synthetic widescreen inspiration'});
  const imageCard=root.getByRole('button',{name:'View C21 synthetic portrait inspiration'});
  await expect(videoCard).toBeVisible();await expect(imageCard).toBeVisible();
  await expect(videoCard.locator('video')).toHaveCount(1);
  await expect(imageCard.locator('img[alt="C21 synthetic portrait"]')).toHaveCount(1);
  expect(await videoCard.evaluate(el=>Number(getComputedStyle(el).getPropertyValue('--inspiration-ratio')))).toBeCloseTo(16/9,5);
  expect(await imageCard.evaluate(el=>Number(getComputedStyle(el).getPropertyValue('--inspiration-ratio')))).toBeCloseTo(9/16,5);
  await page.locator('[data-inspiration-kind="video"]').click();
  await expect(root.locator('.inspiration-preview-card')).toHaveCount(1);
  await expect(root.getByRole('button',{name:'View C21 synthetic widescreen inspiration'})).toBeVisible();
  await page.locator('[data-inspiration-kind="image"]').click();
  await expect(root.locator('.inspiration-preview-card')).toHaveCount(1);
  await root.getByRole('button',{name:'View C21 synthetic portrait inspiration'}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Use this prompt'})).toBeEnabled();
  await dialog.getByRole('button',{name:'Use this prompt'}).click();
  await expect(page).toHaveURL(/studio=image&from=inspiration&action=prompt/);
  await expect(page.locator('#prompt')).toHaveValue('A blue botanical poster');
  await expect(page.locator('#consent')).not.toBeChecked();
  expect(paid()).toBe(0);
 }
});
