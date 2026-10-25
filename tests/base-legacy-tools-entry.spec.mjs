import {test,expect} from '@playwright/test';

test('BASE #27 Tools has a real link to the existing Video Uniquifier without replacing its modes',async({page})=>{
 let paidPosts=0;
 page.on('request',r=>{if(r.method()==='POST'&&(/\/api\/studio\/jobs|\/api\/ai-billing|\/api\/stripe/.test(r.url())))paidPosts++;});
 await page.goto('/free-tools.html');
 const link=page.locator('.et-showcase .et-uniquifier');
 await expect(link).toHaveCount(1);
 await expect(link).toBeVisible();
 await expect(link).toHaveAttribute('href','index.html');
 await expect(link).toContainText('Video Uniquifier');
 await expect(page.locator('[data-hub-tool]')).toHaveCount(8);
 await link.click();
 await expect(page).toHaveURL(/\/index\.html$/);
 await expect(page).toHaveTitle(/Video Uniquifier/);
 await expect(page.locator('#fileInput')).toHaveAttribute('accept','video/*');
 await expect(page.locator('#mode option')).toHaveCount(3);
 const modes=await page.locator('#mode option').evaluateAll(els=>els.map(e=>e.value));
 expect(modes).toEqual(['gentle','balanced','dynamic']);
 expect(paidPosts).toBe(0);
 await page.goBack();
 await expect(page.locator('.et-showcase .et-uniquifier')).toBeVisible();
});

test('BASE #27 Video Uniquifier entry stays visible and reachable on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/free-tools.html');
 const link=page.locator('.et-showcase .et-uniquifier');
 await expect(link).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await link.click();
 await expect(page).toHaveURL(/\/index\.html$/);
 await expect(page.locator('#mode')).toBeAttached();
});

test('BASE #27 Tools label is localized without altering legacy editor',async({browser})=>{
 const context=await browser.newContext({locale:'ru-RU'});
 try{
  const page=await context.newPage();
  await page.goto('/free-tools.html');
  const link=page.locator('.et-showcase .et-uniquifier');
  await expect(link).toContainText('Уникализация видео');
  await link.click();
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator('#mode option')).toHaveCount(3);
 }finally{await context.close();}
});


test('BASE #27 keeps existing local history and media across Video Uniquifier → Tools → Video Uniquifier',async({page})=>{
 // Synthetic, local-only legacy file and metadata. Do not call a provider,
 // alter server-side history, spend tool credits, or require live credentials.
 const writes=[];
 page.on('request',request=>{
  if(/\/api\/(?:history|studio\/jobs|ai-billing|billing|stripe)/.test(new URL(request.url()).pathname)
      && request.method()!=='GET')writes.push(request.method()+' '+new URL(request.url()).pathname);
 });

 await page.goto('/index.html');
 await expect.poll(()=>page.evaluate(()=>Boolean(window.VUPersistentMedia?.put))).toBe(true);
 const seed=await page.evaluate(async()=>{
  const item={
   id:'base27-original-history-2026',
   name:'my-existing-video.mp4',
   createdAt:'2026-10-15T10:30:00.000Z',
   type:'video',
   resolution:'1080p',
   aspectRatio:'16:9',
   credits:1,
   saved:true,
   mediaCacheKey:'base27-original-local-media'
  };
  const bytes=new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109]);
  localStorage.setItem('vv_history',JSON.stringify([item]));
  localStorage.setItem('vv_trial_used','7');
  await window.VUPersistentMedia.put(item.mediaCacheKey,new Blob([bytes],{type:'video/mp4'}));
  return {item,bytes:[...bytes]};
 });
 await page.reload();
 // The legacy page deliberately keeps its shell behind a short startup veil.
 await expect(page.locator('html')).not.toHaveClass(/vu-starting/);
 await expect(page.locator('#mode option')).toHaveCount(3);

 // Use the existing editor's actual Tools navigation, then the actual hub
 // entry. Both pages share one origin but must not reset storage.
 const toolsLink=page.locator('.vu-side-link[href="free-tools.html"]');
 // The screenshot-approved mobile shell replaces the original sidebar and
 // hides its legacy #freeToolsLink and #menuBtn. Exercise its real navigation.
 if(await page.evaluate(()=>innerWidth<=900)){
  const menu=page.locator('.vu-nav-toggle');
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.locator('body')).toHaveClass(/\bvu-nav-open\b/);
 }
 await expect(toolsLink).toBeVisible();
 await expect(toolsLink).toBeInViewport();
 await toolsLink.click();
 await expect(page).toHaveURL(/\/free-tools\.html$/);
 const legacy=page.locator('.et-showcase .et-uniquifier');
 await expect(legacy).toBeVisible();
 await legacy.click();
 await expect(page).toHaveURL(/\/index\.html$/);
 await expect(page).toHaveTitle(/Video Uniquifier/);
 expect(await page.locator('#mode option').evaluateAll(nodes=>nodes.map(x=>x.value)))
  .toEqual(['gentle','balanced','dynamic']);

 // The legacy History view is a local UI view; never fake a generated file.
 // Trigger its existing click handler even when the sidebar is collapsed on
 // mobile, then inspect the actual rendered record and persisted media.
 await page.locator('[data-view=history]').evaluate(button=>button.click());
 await expect(page.locator('#historyList .historyItem h4'))
  .toHaveText(seed.item.name);
 const retained=await page.evaluate(async key=>{
  const blob=await window.VUPersistentMedia.get(key);
  return {
   history:JSON.parse(localStorage.getItem('vv_history')||'null'),
   trial:localStorage.getItem('vv_trial_used'),
   mediaBytes:blob?[...new Uint8Array(await blob.arrayBuffer())]:null
  };
 },seed.item.mediaCacheKey);
 expect(retained.history).toEqual([seed.item]);
 expect(retained.trial).toBe('7');
 expect(retained.mediaBytes).toEqual(seed.bytes);
 expect(writes).toEqual([]);
});
