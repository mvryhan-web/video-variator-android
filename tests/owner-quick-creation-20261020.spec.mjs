import {test,expect} from '@playwright/test';

// Owner-approved concise creative UX, all tests GET-only; never issue paid
// API requests, Stripe checkout, media uploads or generation POST.
const modes=[
  ['image','Light up your creation with Deepsyq'],['video','Light up your creation with Deepsyq'],['audio','Light up your creation with Deepsyq']
];

test('Image Video Audio open directly to one concise heading and actual creator',async({page})=>{
 for(const [kind,title] of modes){
  await page.goto('/generate-studio.html?studio='+kind);
  await expect(page.locator('#taskTitle')).toHaveText(title);
  await expect(page.locator('#taskTitle')).toHaveJSProperty('tagName','H1');
  await expect(page.locator('#taskTitle')).toBeVisible();
  await expect(page.locator('#empty img,.ds-studio-examples')).toHaveCount(0);
  expect(await page.locator('.stage').evaluate(el=>getComputedStyle(el).backgroundImage)).not.toContain('url(');
  await expect(page.locator('[data-t="headline"]')).toBeHidden();
  await expect(page.locator('#taskDescription')).toBeHidden();
  await expect(page.locator('#creator')).toBeVisible();
  await expect(page.locator('#prompt')).toBeVisible();
  await expect(page.locator('#modelButton')).toBeVisible();
  await expect(page.locator('#settingsButton')).toBeVisible();
  await expect(page.locator('#generate')).toBeDisabled();
  await expect(page.locator('#consent')).toHaveCount(1);
  await expect(page.locator('#creditEstimate')).toHaveCount(1);
  await expect(page.locator('#availability')).toHaveCount(1);
  await expect(page.locator('#showHistory')).toHaveCount(1);
 }
});

test('Mobile first viewport shows real prompt without a lengthy marketing panel',async({page})=>{
 for(const width of [320,375,390,768,1448]){
  await page.setViewportSize({width,height:850});
  for(const kind of ['image','video','audio']){
   await page.goto('/generate-studio.html?studio='+kind);
   const pos=await page.locator('#prompt').boundingBox();
   expect(pos,kind+' '+width).not.toBeNull();
   expect(pos.y,kind+' '+width).toBeLessThan(850);
  }
 }
});

test('Image Video Audio keep existing model/settings/consent/dialog navigation',async({page})=>{
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#modelButton').click();
 await expect(page.locator('#modelDialog')).toBeVisible();
 await page.locator('[data-close="modelDialog"]').click();
 await page.locator('#settingsButton').click();
 await expect(page.locator('#settingsDialog')).toBeVisible();
 await page.locator('[data-close="settingsDialog"]').first().click();
 await expect(page.locator('#settingsDialog')).toBeHidden();
 await page.locator('#showHistory').click();
 await expect(page.locator('#showHistory')).toHaveAttribute('aria-pressed','true');
});

test('AI Apps and Inspiration prioritize browse/search over long explanations',async({page})=>{
 await page.goto('/ai-apps.html');
 await expect(page.locator('.hero h1')).toHaveText('AI Apps');
 await expect(page.locator('.hero .ds-approved-copy p')).toHaveText('Choose a template and make it yours.');
 await expect(page.locator('#search')).toBeVisible();
 await expect(page.locator('#type')).toBeVisible();
 await expect(page.locator('#apps')).toHaveCount(1);
 await page.goto('/inspiration.html');
 await expect(page).toHaveURL(/deepsyq\.html#inspirationPreview$/);
 await expect(page.locator('#inspirationPreview h2')).toHaveText('Inspiration');
 await expect(page.locator('[data-inspiration-kind]')).toHaveText(['All','Video','Image']);
});

test('Everyday Audio retains functional controls and honest privacy',async({page})=>{
await page.goto('/audio-studio.html');
 await expect(page.locator('#speechText')).toHaveCount(1);
 await expect(page.locator('#speechConsent')).toHaveCount(1);
 await expect(page.locator('#trimFile')).toHaveCount(1);
 await expect(page.locator('#transcribeFile')).toHaveCount(1);
 await expect(page.locator('#vtaFile')).toHaveCount(1);
 await expect(page.locator('body')).toContainText('Your text goes to Google for speech.');
});

test('approved Home and Agent-coming-soon route stay unchanged',async({page})=>{
 await page.goto('/deepsyq.html');
 await expect(page.locator('body')).toHaveClass(/home-neon/);
 await expect(page.locator('link[href="studio-quickstart.css"]')).toHaveCount(0);
 await expect(page.locator('#homeHeroCarousel')).toHaveCount(1);
 await page.goto('/ai-apps.html');
 await expect(page.getByRole('link',{name:/AI Agents.*soon/i})).toHaveAttribute('href','deepsyq.html#agentFeature');
});


test('Owner layout: creation title is centered and actual Image Video Audio composer stays below the stage',async({page})=>{
 for(const viewport of [{width:1360,height:900},{width:390,height:844},{width:320,height:740}]){
  await page.setViewportSize(viewport);
  for(const kind of ['image','video','audio']){
   await page.goto('/generate-studio.html?studio='+kind);
   const stage=await page.locator('.stage').boundingBox();
   const title=await page.locator('#taskTitle').boundingBox();
   const composer=await page.locator('#creator').boundingBox();
   expect(stage,kind+' '+viewport.width+' stage').not.toBeNull();
   expect(title,kind+' '+viewport.width+' title').not.toBeNull();
   expect(composer,kind+' '+viewport.width+' composer').not.toBeNull();
   expect(stage.height,kind+' '+viewport.width+' real creation workspace').toBeGreaterThanOrEqual(viewport.width>700?329:274);
   expect(Math.abs(title.x+title.width/2-(stage.x+stage.width/2)),kind+' center').toBeLessThanOrEqual(18);
   // Image uses its pre-existing bottom-sticky dock, which overlaps the stage edge by 10 px.
   // A small 16 px allowance tests the approved bottom position without demanding layout separation.
   expect(composer.y,kind+' '+viewport.width+' bottom dock below main workspace').toBeGreaterThanOrEqual(stage.y+stage.height-16);
   await expect(page.locator('#modelButton')).toBeVisible();
   await expect(page.locator('#settingsButton')).toBeVisible();
   await expect(page.locator('#generate')).toBeDisabled();
  }
 }
});
