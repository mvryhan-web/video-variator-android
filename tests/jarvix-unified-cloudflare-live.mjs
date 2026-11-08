// Browser acceptance on isolated Cloudflare TEST. Never sends AI jobs or payment requests.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.JARVIX_UNIFIED_TEST_URL;
if (!base || !/^https:\/\/[a-z0-9-]+\.deepsyq\.pages\.dev$/i.test(base))
  throw Error('Isolated Cloudflare branch TEST URL required.');
const target = new URL(base);
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
await mkdir('artifacts/jarvix-unified', {recursive:true});
const unique = 'ONE_JARVIX_SESSION_'+Date.now();
try {
 for (const size of [{name:'desktop',width:1365,height:860},{name:'mobile',width:390,height:844}]) {
  const context = await browser.newContext({viewport:{width:size.width,height:size.height},isMobile:size.name==='mobile',hasTouch:size.name==='mobile'});
  await context.addInitScript(()=>{
    localStorage.setItem('deepsyq_home_language','ru');
    localStorage.setItem('deepsyq_lumina_terms_accepted','true');
  });
  const page = await context.newPage();
  const paid=[];
  page.on('request',request=>{
    if(request.method()==='POST'&&/\/api\/(?:studio\/jobs|studio\/estimate|stripe|checkout|wallet)/.test(request.url()))
      paid.push(request.url());
  });
  const start = await page.goto(base+'/jarvix-chat.html',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(start?.status(),200,'JARVIX HTTP 200');
  await page.locator('.j-chat-toolbar h1').waitFor({timeout:15000});
  assert.equal((await page.locator('.j-chat-toolbar h1').innerText()).trim(),'JARVIX Chat');
  const id = await page.evaluate(async title => {
    const {conversationStore} = await import('/jarvix-conversations.js');
    const store=await conversationStore();
    const record=store.create('acceptance-shared-'+Date.now());
    record.title=title;
    record.messages=[
      {id:'qa-user',role:'user',text:title,createdAt:Date.now(),status:'sent'},
      {id:'qa-ai',role:'assistant',text:'Shared JARVIX reply',createdAt:Date.now(),status:'sent'}
    ];
    await store.save(record);
    sessionStorage.setItem('jarvix_active_conversation',record.id);
    sessionStorage.setItem('jarvix_session_id',record.sessionId);
    return record.id;
  },unique);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#jMessages').getByText(unique).waitFor({timeout:12000});
  const kinds=['image','video','audio'];
  for (const kind of kinds) {
    const res=await page.goto(base+'/generate-studio.html?studio='+kind,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(res?.status(),200,'Studio '+kind+' HTTP 200');
    await page.locator('#jarvixSharedChatFrame').waitFor({timeout:16000});
    await page.frameLocator('#jarvixSharedChatFrame').locator('.j-chat-toolbar h1').waitFor({timeout:16000});
    assert.equal((await page.frameLocator('#jarvixSharedChatFrame').locator('h1').first().innerText()).trim(),'JARVIX Chat');
    await page.frameLocator('#jarvixSharedChatFrame').locator('#jMessages').getByText(unique).waitFor({timeout:16000});
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('jarvix_active_conversation')),id,'Same conversation id in '+kind);
    assert.equal(await page.locator('#jarvixSharedChatFrame').getAttribute('src'),'jarvix-chat.html?embedded=1');
    assert.ok(await page.locator('#creator').count(),'Preserved native Studio composer '+kind);
    assert.ok(await page.locator('#settingsButton').count(),'Preserved Studio settings '+kind);
    assert.ok(await page.locator('#modelButton').count(),'Preserved model picker '+kind);
    const studioTools=page.locator('#jarvixStudioToolsToggle');
    await studioTools.waitFor({state:'visible',timeout:10000});
    assert.equal(await studioTools.getAttribute('aria-expanded'),'false','Native Studio must start collapsed');
    assert.equal(await page.locator('#creator').isVisible(),false,'Only ONE composer is visible by default');
    assert.equal(await page.frameLocator('#jarvixSharedChatFrame').locator('#jNew').isVisible(),false,'Only outer New Chat control in Studio');
    await studioTools.click();
    assert.equal(await page.locator('#creator').isVisible(),true,'Existing Studio generator must remain accessible');
    await studioTools.click();
    assert.equal(await page.locator('#creator').isVisible(),false,'Second composer must collapse again');
    await page.locator('#jarvixActivityToggle').waitFor({timeout:10000});
    const toggle=page.locator('#jarvixActivityToggle');
    if(await toggle.getAttribute('aria-expanded')!=='true') await toggle.click();
    await page.locator('#jarvixActivityPanel .jarvix-activity-title').waitFor({state:'visible'});
    assert.equal((await page.locator('#jarvixActivityPanel .jarvix-activity-title').innerText()).trim(),'JARVIX Chat');
    await page.screenshot({path:'artifacts/jarvix-unified/'+size.name+'-'+kind+'-history.png'});
    if(await toggle.getAttribute('aria-expanded')==='true') await toggle.click();
    await page.screenshot({path:'artifacts/jarvix-unified/'+size.name+'-'+kind+'.png'});
    console.log('UNIFIED_JARVIX_LIVE_OK',size.name,kind,id);
  }
  const end=await page.goto(base+'/jarvix-chat.html',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(end?.status(),200);
  await page.locator('#jMessages').getByText(unique).waitFor({timeout:16000});
  await page.screenshot({path:'artifacts/jarvix-unified/'+size.name+'-chat.png'});
  assert.deepEqual(paid,[],'No paid AI or Stripe requests');
  await context.close();
 }
} finally { await browser.close(); }
