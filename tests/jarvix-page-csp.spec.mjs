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

test('Jarvix shows the real LLM status instead of presenting local rules as a model',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('deepsyq_home_language','ru'));
 await page.goto('/jarvix-studio.html');
 await expect(page.locator('#jarvixConnectionStatus')).toContainText('LLM не подключена');
});

test('a discussion about video stays in chat; explicit navigation never sends a paid job',async({page})=>{
 let message='';const writes=[];
 page.on('request',request=>{if(request.method()==='POST'&&/\/api\/studio\/(jobs|generate)/.test(request.url()))writes.push(request.url());});
 await page.route('**/api/jarvix/chat',async route=>{
  message=route.request().postDataJSON().message;
  await route.fulfill({json:{ok:true,reply:'This is a local test response.',language:'en',provider:'test-mock'}});
 });
 await page.goto('/jarvix-studio.html');
 await page.evaluate(async()=>{const core=await import('/jarvis-core.js');core.handleJarvisVoiceCommand('How should I plan my video?');});
 await expect.poll(()=>message).toBe('How should I plan my video?');
 expect(page.url()).toContain('/jarvix-studio.html');
 await page.evaluate(async()=>{const core=await import('/jarvis-core.js');core.handleJarvisVoiceCommand('Open video');});
 await expect(page).toHaveURL(/generate-studio\.html\?studio=video&from=jarvix$/);
 expect(new URL(page.url()).searchParams.has('auto')).toBe(false);
 expect(writes).toEqual([]);
});

test('Stop discards a delayed assistant response and its navigation action',async({page})=>{
 let release;let arrivedResolve;let finishedResolve;
 const arrived=new Promise(resolve=>arrivedResolve=resolve);
 const finished=new Promise(resolve=>finishedResolve=resolve);
 await page.route('**/api/jarvix/chat',async route=>{
  arrivedResolve();await new Promise(resolve=>release=resolve);
  await route.fulfill({json:{ok:true,reply:'Late answer',language:'en',action:{type:'open_studio',url:'generate-studio.html?studio=image'}}}).catch(()=>{});
  finishedResolve();
 });
 await page.goto('/jarvix-studio.html');
 await page.evaluate(async()=>{(await import('/jarvis-core.js')).handleJarvisVoiceCommand('Tell me about widgets');});
 await arrived;
 await page.evaluate(async()=>{(await import('/jarvis-core.js')).deactivateJarvisVoice();});
 release();await finished;
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
 expect(page.url()).toContain('/jarvix-studio.html');
});
