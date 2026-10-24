import {test,expect} from '@playwright/test';

// Agent C BASE1-C8/C9/C10: synthetic fixture data only, no AI provider,
// Stripe, user tokens, media upload, job creation or production access.
const supported={
 id:'c8-image',title:'Owner-neutral image fixture',category:'Art',
 generationType:'image',requiredInputTypes:[],promptTemplate:'A fictional garden at sunrise'
};
const pending={
 id:'c10-future',title:'Future agent-only fixture',category:'Automation',
 generationType:'agent',requiredInputTypes:['external_agent'],promptTemplate:'Not a real generator'
};
const inspiration={
 id:'c10-illustration',slug:'fictional-garden',title:'Fictional prompt',
 category:'Art',kind:'video',aspectRatio:'1:1',description:'Synthetic only',
 previewUrl:'/test-fixture-absent.png',prompt:'A fictional garden at sunrise',
 actionTarget:'studio',defaultSettings:{ratio:'1:1'},requiredInputTypes:[]
};
async function prepare(page){
 await page.route('**/api/templates',route=>route.fulfill({json:{items:[supported,pending]}}));
 await page.route('**/api/inspiration?**',route=>route.fulfill({json:{
  items:[inspiration],categories:['Art'],ratios:['1:1'],
  pagination:{limit:24,offset:0,nextOffset:null,hasMore:false}
 }}));
 await page.route('**/api/studio/config',route=>route.fulfill({json:{
  enabled:false,ownerOnly:true,publicGenerationEnabled:false,models:[],catalog:[]
 }}));
 await page.route('**/api/config',route=>route.fulfill({json:{
  billingConfigured:false,googleClientId:'',features:{aiApps:true,inspiration:true,productVideo:true}
 }}));
 await page.route('**/api/speech/config',route=>route.fulfill({json:{enabled:false}}));
 await page.route('**/api/auth/email/status',route=>route.fulfill({json:{configured:false}}));
}
function protectedPosts(page){
 const attempts=[];
 page.on('request',req=>{
  if(req.method()==='POST'&&/\/api\/(?:studio\/jobs|ai-billing|billing|payments|ai-wallet|speech\/generate)/.test(new URL(req.url()).pathname))
   attempts.push(req.url());
 });
 return attempts;
}
async function fit(page,width,label){
 const measured=await page.evaluate(()=>document.documentElement.scrollWidth);
 expect(measured,label+' '+width).toBeLessThanOrEqual(width+1);
}

test('C8 current DEV real direct links, Tools/Avatar Back, mobile Escape and History at all owner widths',async({page})=>{
 await prepare(page);
 const paid=protectedPosts(page);
 for(const path of [
  '/deepsyq.html','/ai-apps.html','/inspiration.html','/free-tools.html',
  '/avatar-studio.html','/audio-studio.html','/generate-studio.html?view=history',
  '/generate-studio.html?studio=image','/index.html'
 ]){
  const response=await page.request.get(path);
  expect(response.status(),path).toBe(200);
 }
 for(const width of [320,375,768,1448]){
  await page.setViewportSize({width,height:850});
  await page.goto('/ai-apps.html');
  await expect(page.locator('.app-card')).toHaveCount(2);
  await fit(page,width,'AI Apps');
  await page.goto('/deepsyq.html?c8Width='+width+'#inspirationPreview',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#inspirationPreviewGrid .inspiration-preview-card')).toHaveCount(1);
  await fit(page,width,'Inspiration');
  await page.goto('/free-tools.html');
  await expect(page.locator('[data-hub-tool="tts"]')).toHaveAttribute('href','audio-studio.html?tool=tts');
  await expect(page.locator('[data-hub-tool="stt"]')).toHaveAttribute('href','audio-studio.html?tool=stt');
  await fit(page,width,'Tools');
  const avatarLink=page.locator('nav.tools-direct-launches a[href="avatar-studio.html?from=tools"]');
  await avatarLink.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await avatarLink.click();
  await expect(page).toHaveURL(/avatar-studio\.html\?from=tools$/);
  await expect(page.locator('[data-av="back"]')).toHaveAttribute('href','free-tools.html');
  await page.locator('[data-av="back"]').click();
  await expect(page).toHaveURL(/free-tools\.html$/);
  await page.goto('/avatar-studio.html');
  await expect(page.locator('[data-av="back"]')).toHaveAttribute('href','index.html');
  await page.goto('/audio-studio.html?tool=stt');
  await expect(page.locator('#transcribeFile')).toBeVisible();
  await expect(page.locator('#speechText')).toBeHidden();
  await fit(page,width,'Audio');
  const drawer=page.locator('.ds-site-mobile-toggle');
  if(width<=900){
   await expect(drawer).toBeVisible();
   await drawer.click();
   await expect(drawer).toHaveAttribute('aria-expanded','true');
   await page.keyboard.press('Escape');
   await expect(drawer).toHaveAttribute('aria-expanded','false');
  }else await expect(drawer).toBeHidden();
  await page.goto('/generate-studio.html?view=history');
  await expect(page.locator('#showHistory')).toHaveAttribute('aria-pressed','true');
 }
 expect(paid).toEqual([]);
});

test('C9 local Audio Trimmer gives an actionable error for invalid uploads/range and clears only that error on recovery',async({page})=>{
 await prepare(page);
 const paid=protectedPosts(page);
 for(const width of [320,375,768,1448]){
  await page.setViewportSize({width,height:850});
  await page.goto('/audio-studio.html');
  const status=page.locator('#trimStatus');
  const action=page.locator('#trimGenerate');
  await expect(action).toBeDisabled();
  await page.locator('#trimFile').setInputFiles({
   name:'not-a-recording.png',mimeType:'image/png',buffer:Buffer.from('invalid local image')
  });
  await expect(action).toBeDisabled();
  await expect(status,'Invalid local audio must explain why it cannot be trimmed at '+width)
   .toContainText('Choose a supported audio file and a valid time range');
  await page.locator('#trimFile').setInputFiles({
   name:'fixture.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('synthetic test data')
  });
  await expect(action).toBeEnabled();
  await expect(status).toHaveText('');
  await page.locator('#trimEnd').fill('0');
  await expect(action).toBeDisabled();
  await expect(status).toContainText('valid time range');
  await page.locator('#trimEnd').fill('5');
  await expect(action).toBeEnabled();
  await expect(status).toHaveText('');
  await fit(page,width,'Audio Trimmer');
 }
 expect(paid).toEqual([]);
});

test('C10 AI Agents are honest pending, usable Apps/Inspiration preserve prompt and never generate',async({page})=>{
 await prepare(page);
 const paid=protectedPosts(page);
 for(const width of [320,375,768,1448]){
  await page.setViewportSize({width,height:850});
  await page.goto('/ai-apps.html');
  const pendingButton=page.locator('.app-card').filter({hasText:'Future agent-only fixture'})
   .getByRole('button',{name:'Workflow pending'});
  await expect(pendingButton).toBeDisabled();
  const pendingNav=page.locator('#dsSiteSidebar [aria-label="Agent coming soon"]');
  await expect(pendingNav).toHaveCount(1);
  expect(await pendingNav.evaluate(e=>e.tagName)).toBe('SPAN');
  const c=page.locator('.app-card').filter({hasText:'Owner-neutral image fixture'});
  await c.getByRole('button',{name:'Use template'}).click();
  await expect(page).toHaveURL(/generate-studio\.html\?studio=image&from=template$/);
  await expect(page.locator('#prompt')).toHaveValue(supported.promptTemplate);
  await expect(page.locator('#consent')).not.toBeChecked();
  await page.goto('/deepsyq.html?c8Width='+width+'#inspirationPreview',{waitUntil:'domcontentloaded'});
  // Owner-approved Inspiration now opens a media/prompt detail before Studio.
  const inspirationCard=page.getByRole('button',{name:'View '+inspiration.title+' inspiration'});await inspirationCard.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await inspirationCard.click();
  const detail=page.getByRole('dialog');
  await expect(detail).toBeVisible();
  await detail.getByRole('button',{name:'Use this prompt'}).click();
  await expect(page).toHaveURL(/generate-studio\.html\?studio=video&from=inspiration&action=prompt$/);
  await expect(page.locator('#prompt')).toHaveValue(inspiration.prompt);
  await expect(page.locator('#consent')).not.toBeChecked();
  await page.goto('/audio-studio.html?tool=tts');
  await expect(page.locator('#speechText')).toBeVisible();
  await expect(page.locator('#transcribeFile')).toBeHidden();
  await expect(page.locator('#speechGenerate')).toBeDisabled();
 }
 expect(paid).toEqual([]);
});
