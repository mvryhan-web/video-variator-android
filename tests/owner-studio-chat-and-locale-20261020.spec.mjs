import {test,expect} from '@playwright/test';

test('Approved creation slogan stays central but existing composer remains below work stage',async({page})=>{
 await page.setViewportSize({width:1360,height:900});
 await page.goto('/generate-studio.html?studio=image');
 await expect(page.locator('#taskTitle')).toContainText('Light up your creation with Deepsyq');
 const stage=await page.locator('.stage').boundingBox();
 const composer=await page.locator('#creator').boundingBox();
 expect(stage).not.toBeNull();expect(composer).not.toBeNull();
 expect(stage.height).toBeGreaterThanOrEqual(330);
 expect(composer.y).toBeGreaterThan(stage.y+stage.height-2);
 await expect(page.locator('.hero-art')).toBeHidden();
 await expect(page.locator('#modelButton')).toBeVisible();
 await expect(page.locator('#settingsButton')).toBeVisible();
});

test('Language selected from Home persists to Studio navigation and translated controls',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('deepsyq_home_language','fr');});
 await page.goto('/generate-studio.html?studio=video');
 await expect(page.locator('html')).toHaveAttribute('lang','fr');
 await expect(page.locator('#showCreate')).toHaveText('Créer');
 await expect(page.locator('body')).toContainText('Donnez vie à vos créations avec Deepsyq');
 await expect(page.locator('#taskTitle')).toHaveText('Donnez vie à vos créations avec Deepsyq');
 await page.goto('/generate-studio.html?studio=image');
 await expect(page.locator('html')).toHaveAttribute('lang','fr');
 await expect(page.locator('#showHistory')).toHaveText('Mes résultats');
});


test('French device language is selected by default and static Studio copy is translated',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.removeItem('deepsyq_home_language');
  Object.defineProperty(navigator,'language',{configurable:true,value:'fr-FR'});
 });
 await page.goto('/generate-studio.html?studio=audio');
 await expect(page.locator('html')).toHaveAttribute('lang','fr');
 await expect(page.locator('#taskTitle')).toHaveText('Donnez vie à vos créations avec Deepsyq');
 await expect(page.locator('[data-t="historyHint"]')).toHaveText('Vos résultats enregistrés apparaissent ici. Aucune génération ne démarre automatiquement.');
 await expect(page.locator('[data-t="pilotNote"]')).toHaveText('Aperçu du studio. Les paiements ne sont pas activés.');
 await expect(page.locator('#prompt')).toHaveAttribute('placeholder','Décrivez le son, l’ambiance et la langue. Ajoutez les paroles ou le texte de la voix off…');
 await expect(page.locator('#examples button').first()).toHaveText('Une chanson pop joyeuse en anglais sur un nouveau départ');
});

test('Existing Studio jobs become a private chat-like stream without submitting AI or Stripe requests',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('vv_token','playwright-synthetic-session');});
 await page.route('**/api/studio/jobs?filter=all',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[
  {id:'synthetic-job-one',kind:'image',prompt:'A paper crane in evening light',status:'ready',createdAt:'2026-10-20T12:00:00Z'},
  {id:'synthetic-job-two',kind:'video',prompt:'Different video prompt',status:'ready'}
 ]})}));
 await page.goto('/generate-studio.html?studio=image');
 await expect(page.locator('#conversationThread .conversation-item')).toHaveCount(1);
 await expect(page.locator('#conversationThread .conversation-user')).toHaveText('A paper crane in evening light');
 await expect(page.locator('#conversationThread .conversation-response button')).toHaveText(/View result|Посмотреть результат|Voir le résultat/);
 await expect(page.locator('#creator')).toBeVisible();
});

test('No account and no saved provider consent never enable an AI job',async({page})=>{
 await page.goto('/generate-studio.html?studio=image');
 await page.locator('#prompt').fill('Photograph of a red apple');
 await expect(page.locator('#generate')).toBeDisabled();
 await expect(page.locator('#consent')).toHaveCount(1);
});
