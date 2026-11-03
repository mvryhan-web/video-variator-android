import {test,expect} from '@playwright/test';

test('Jarvix Studio initializes and chats under the real server CSP',async({page})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>localStorage.setItem('deepsyq_home_language','fr'));
 let sentLanguage;
 await page.route('**/api/jarvix/chat',async route=>{
  sentLanguage=route.request().postDataJSON().language;
  await route.fulfill({json:{ok:true,reply:'Bonjour. Comment puis-je vous aider ?',language:'fr',provider:'test-mock'}});
 });
 const response=await page.goto('/jarvix-studio.html');
 expect(response.headers()['content-security-policy']).not.toContain("script-src 'self' 'unsafe-inline'");
 await expect(page.locator('#samplesList .play-btn')).toHaveCount(4);
 await page.locator('#chatInput').fill('Bonjour');
 await page.locator('#sendBtn').click();
 await expect(page.locator('#terminalLogs')).toContainText('Comment puis-je vous aider');
 expect(sentLanguage).toBe('fr');
 expect(errors).toEqual([]);
});
