import {test,expect} from '@playwright/test';

// Owner-approved concise creative UX, all tests GET-only; never issue paid
// API requests, Stripe checkout, media uploads or generation POST.
const modes=[
  ['image','Create an image'],['video','Create a video'],['audio','Create audio']
];

test('Image Video Audio open directly to one concise heading and actual creator',async({page})=>{
 for(const [kind,title] of modes){
  await page.goto('/generate-studio.html?studio='+kind);
  await expect(page.locator('#taskTitle')).toHaveText(title);
  await expect(page.locator('#taskTitle')).toHaveJSProperty('tagName','H1');
  await expect(page.locator('#taskTitle')).toBeVisible();
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
 await expect(page.locator('.hero>p:last-child')).toHaveText('Choose a template and make it yours.');
 await expect(page.locator('#search')).toBeVisible();
 await expect(page.locator('#type')).toBeVisible();
 await expect(page.locator('#apps')).toHaveCount(1);
 await page.goto('/inspiration.html');
 await expect(page.locator('.hero h1')).toHaveText('Inspiration');
 await expect(page.locator('.hero>p:last-child')).toHaveText('Find an idea. Create your version.');
 await expect(page.locator('#gallery')).toHaveCount(1);
 await expect(page.locator('.kind-tabs button')).toHaveCount(3);
});

test('Product Video and Everyday Audio retain functional controls and honest privacy',async({page})=>{
 await page.goto('/product-video.html');
 await expect(page.locator('.intro>p:last-child')).toHaveText('Add product photos and choose a style.');
 await expect(page.locator('#photos')).toHaveCount(1);
 await expect(page.locator('#logo')).toHaveCount(1);
 await expect(page.locator('#ratio')).toHaveCount(1);
 await expect(page.locator('#continue')).toHaveCount(1);
 await expect(page.locator('footer')).toContainText('No provider call happens on this page.');
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
