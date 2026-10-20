import {test,expect} from '@playwright/test';

// Coordinator #5 BASE §1: verify visitor handoffs on the actual browser UI.
// Every API fixture is local; these tests must never dispatch a provider job
// or enter checkout. The complete purchased-credit flow remains a separate
// Agent B + D / owner-authorized live acceptance gate.
async function mockPublicPreview(page){
  await page.route('**/api/config',r=>r.fulfill({json:{
    plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},
      lifetime:{price:2999,currency:'eur'}},
    googleClientId:'',billingConfigured:false
  }}));
  await page.route('**/api/studio/config',r=>r.fulfill({json:{
    enabled:false,ownerOnly:true,models:[],catalog:[]
  }}));
  await page.route('**/api/auth/email/status',r=>r.fulfill({json:{configured:true}}));
}

function forbidPaidRequest(page){
  const attempts=[];
  page.on('request',request=>{
    if(request.method()!=='POST')return;
    const u=new URL(request.url());
    if(u.pathname.startsWith('/api/studio/jobs') ||
       u.pathname.startsWith('/api/ai-billing/checkout') ||
       u.pathname.startsWith('/api/stripe/checkout')){
      attempts.push(u.pathname);
    }
  });
  return attempts;
}

for(const entry of [
  {mode:'image',studio:'image',prompt:'Private image idea for an original product'},
  {mode:'video',studio:'video',prompt:'Private video idea with a sunrise scene'},
  {mode:'music',studio:'audio',prompt:'Private audio idea with a soft piano melody'}
]){
  test('BASE §1 Home '+entry.mode+' opens the correct existing creator with an editable, unpaid draft',async({page})=>{
    await mockPublicPreview(page);
    const paid=forbidPaidRequest(page);
    await page.goto('/deepsyq.html');
    await page.locator('#homeQuickPrompt').fill(entry.prompt);
    await page.locator('[data-home-kind="'+entry.mode+'"]').click();
    await expect(page).toHaveURL(new RegExp('generate-studio\\.html\\?studio='+entry.studio+'&from=home'));
    await expect(page.locator('#prompt')).toHaveValue(entry.prompt);
    await expect(page.locator('#consent')).not.toBeChecked();
    expect(paid,'opening Studio must not charge or queue generation').toEqual([]);
  });
}

test('BASE §1 unavailable Agent CTA stays a truthful no-spend preview, not a fake generator',async({page})=>{
  await mockPublicPreview(page);
  const paid=forbidPaidRequest(page);
  await page.goto('/deepsyq.html');
  await page.locator('[data-home-kind="agent"]').click();
  await expect(page.locator('#homeQuickSubmit')).toContainText('Agent preview');
  await page.locator('#homeQuickSubmit').click();
  await expect(page).toHaveURL(/\/deepsyq\.html#agentFeature$/);
  await expect(page.locator('#homeQuickStatus')).toContainText('not available yet');
  expect(paid).toEqual([]);
});

test('BASE §1 History navigation opens the actual Studio results view on desktop and mobile',async({page})=>{
  await mockPublicPreview(page);
  const paid=forbidPaidRequest(page);
  await page.goto('/deepsyq.html');
  if(await page.evaluate(()=>matchMedia('(max-width:760px)').matches)){
    await page.locator('#menu').click();
  }
  await page.locator('#sidebar a[aria-label="History"]').click();
  await expect(page).toHaveURL(/generate-studio\.html\?view=history/);
  await expect(page.locator('#showHistory')).toHaveAttribute('aria-pressed','true');
  expect(paid).toEqual([]);
});
