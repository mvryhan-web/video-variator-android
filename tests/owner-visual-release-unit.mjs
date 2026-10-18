import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
const assets=new URL('../app/src/main/assets/',import.meta.url),read=n=>readFileSync(new URL(n,assets),'utf8');
test('all fourteen connected design pages share owner-approved palette',()=>{
 const pages=['ai-apps.html','ai-pricing.html','ai-privacy.html','audio-studio.html','avatar-studio.html','deepsyq-admin.html','deepsyq-vs-deepseek.html','deepsyq.html','free-tools.html','generate-studio.html','index.html','inspiration.html','mobile-utility.html','product-video.html'];
 for(const page of pages)assert.ok(read(page).includes('deepsyq-global-theme.css'),page);
 assert.ok(read('deepsyq.html').includes('hero-stage-cinematic'));
 assert.ok(read('deepsyq.html').includes('<meta name="robots" content="index,follow">'));
 assert.ok(read('deepsyq.html').includes('home-feature-triptych'));
 assert.ok(read('deepsyq.html').includes('home-hero-recommended'));
 assert.ok(existsSync(new URL('deepsyq-logo.png',assets)));
});
test('rights-approved six unmodified real MP4 files and posters are present',()=>{
 const m=JSON.parse(read('media/home/owner-20261018/manifest.json'));
 assert.equal(m.commercialRightsConfirmed,true);assert.equal(m.productionPublicationApproved,true);
 assert.equal(m.carouselOrder.length,6);
 for(const slug of m.carouselOrder){
  const i=m.items.find(x=>x.slug===slug&&x.kind==='video');
  assert.ok(i&&i.previewUrl?.startsWith('/media/home/owner-20261018/'));
  assert.ok(statSync(new URL(i.previewUrl.slice(1),assets)).size>100000,slug+' mp4');
  assert.ok(statSync(new URL(i.previewPosterUrl.slice(1),assets)).size>10000,slug+' poster');
 }
});
test('legacy checkout and webhook remain in original server and Video Uniquifier remains available',()=>{
 const s=readFileSync(new URL('../server/server.js',import.meta.url),'utf8');
 for(const route of ["app.post('/api/webhooks/stripe'","app.post('/api/billing/checkout'","app.post('/api/billing/portal'","app.post('/api/billing/cancel'"])assert.ok(s.includes(route),route);
 assert.ok(s.includes("app.get('/api/inspiration'"));
 assert.ok(s.includes("app.get(['/','/dashboard']"));
 assert.ok(s.includes("app.use(express.static(staticDir"));
 assert.ok(s.includes("path.join(staticDir,'index.html')"));
 assert.ok(read('index.html').includes('Video Uniquifier'));
 assert.ok(!s.includes('submitPurchasedProviderRequest'));
});