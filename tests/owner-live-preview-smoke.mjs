import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from '@playwright/test';
import {setTimeout as delay} from 'node:timers/promises';

const root='https://deepsyq-visual-preview-20261016.onrender.com';
async function call(path,options={}) {
 const response=await fetch(root+path,{...options,signal:AbortSignal.timeout(40000)});
 return response;
}
for(let n=0;n<12;n++){
 try{const x=await call('/api/health');if(x.ok)break;}catch(_){}
 await delay(1500);
}
const health=await(await call('/api/health')).json();
assert.equal(health.ok,true);
assert.equal(health.service,'deepsyq-design-preview');
assert.equal(health.paymentsEnabled,false);
assert.equal(health.aiGenerationEnabled,false);
const config=await(await call('/api/studio/config')).json();
assert.equal(config.enabled,true,'F4 Studio TEST must be available');
assert.ok(config.models?.length>0,'TEST Studio has enabled image/video model options');
const jarvis=await call('/api/jarvix/status');assert.equal(jarvis.status,200,'preserve live Jarvix endpoint');
const pricing=await call('/pricing.html');assert.equal(pricing.status,200);
const tools=await call('/free-tools.html');assert.equal(tools.status,200);
const access=await call('/api/studio/access');assert.equal(access.status,200);
const cookie=(access.headers.get('set-cookie')||'').split(';')[0];
assert.match(cookie,/^ds_preview_session=[0-9a-f-]{36}$/,'public owner-private preview cookie');
const req=await call('/api/studio/jobs',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({kind:'image',prompt:'TEST isolated safe F4 synthetic SVG only; no paid provider'})});
assert.equal(req.status,200,'test image POST');
const {jobId}=await req.json();assert.match(jobId,/^job_[a-f0-9]{16}$/);
let job;
for(let i=0;i<30;i++){
 const resp=await call('/api/studio/jobs/'+jobId,{headers:{cookie}});
 assert.equal(resp.status,200);
 job=await resp.json();
 if(job.status==='ready'||job.status==='failed')break;
 await delay(250);
}
assert.equal(job.status,'ready');assert.match(job.provider,/Deepsyq/,'use synthetic local preview, not paid AI');
const svg=await call(job.mediaUrl,{headers:{cookie}});
assert.equal(svg.status,200);assert.match(svg.headers.get('content-type'),/image\/svg\+xml/);
assert.match(await svg.text(),/<svg /);
const stranger=await call('/api/studio/jobs/'+jobId);
assert.equal(stranger.status,404,'anonymous cross-visitor isolation');
const bill=await call('/api/billing/checkout',{method:'POST'});
assert.equal(bill.status,503,'live billing must remain disabled');
console.log('LIVE_HTTP_ACCEPTED',JSON.stringify({health:health.ok,studio:true,models:config.models.length,jarvis:jarvis.status,pricing:pricing.status,tools:tools.status,svg:svg.status,isolated:stranger.status,paidBilling:bill.status}));
await mkdir('test-results/live-preview',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const desktop=await browser.newPage({viewport:{width:1440,height:900}});
 const resp=await desktop.goto(root+'/deepsyq.html',{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(resp.status(),200);
 assert.equal(await desktop.locator('#homeHeroCarousel').count(),1);
 assert.equal(await desktop.locator('.home-feature-spotlight').count(),3);
 await desktop.screenshot({path:'test-results/live-preview/desktop-home.png'});
 const mobile=await browser.newPage({...devices['iPhone 13'],viewport:{width:390,height:844}});
 const m=await mobile.goto(root+'/deepsyq.html',{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(m.status(),200);
 assert.equal(await mobile.locator('.home-feature-spotlight').count(),3);
 await mobile.screenshot({path:'test-results/live-preview/mobile-home.png'});
 console.log('LIVE_BROWSER_ACCEPTED',JSON.stringify({desktop:1440,mobile:390,spotlights:3}));
}finally{await browser.close();}
