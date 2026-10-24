import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import vm from 'node:vm';
const assets=new URL('../app/src/main/assets/',import.meta.url),read=n=>readFileSync(new URL(n,assets),'utf8');
test('all nineteen remaining site pages share owner-approved palette; standalone/owner shells stay safe',()=>{
 const pages=['ai-apps.html','ai-pricing.html','ai-privacy.html','audio-studio.html','avatar-studio.html','deepsyq-admin.html','deepsyq-vs-deepseek.html','deepsyq.html','free-tools.html','generate-studio.html','index.html','inspiration.html','mobile-utility.html','photo-collage.html','simple-background-remover.html','smart-reminders.html','teleprompter.html','telegram-free-mini.html','product-watcher-admin.html'];
 for(const page of pages)assert.ok(read(page).includes('deepsyq-global-theme.css'),page);
 for(const page of pages){const useShell=read(page).includes('deepsyq-site-shell.js');assert.equal(useShell,!['deepsyq.html','index.html','deepsyq-admin.html','telegram-free-mini.html','product-watcher-admin.html'].includes(page),page+' shell mismatch');}
 assert.ok(read('deepsyq.html').includes('hero-stage-cinematic'));
 assert.ok(read('deepsyq.html').includes('<meta name="robots" content="noindex,follow">'));
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
 assert.ok(s.includes("app.get('/dashboard'"));
 assert.ok(s.includes("app.use(express.static(staticDir"));
 assert.ok(s.includes("path.join(staticDir,'index.html')"));
 assert.ok(read('index.html').includes('Video Uniquifier'));
 assert.ok(!s.includes('submitPurchasedProviderRequest'));
});

test('owner Home groups and every shared-sidebar button points to an existing route',()=>{
 const js=read('deepsyq-site-shell.js');
 for(const section of ['Home','Creation','Tools','Library','Community','More']) assert.ok(js.includes("section:'"+section+"'"),section);
 const links=[...js.matchAll(/url:'([^']+)'/g)].map(v=>v[1]);
 for(const dest of links){
  const file=dest.split(/[?#]/)[0];
  assert.ok(existsSync(new URL(file,assets)),dest+' missing');
 }
 for(const label of ['Agent','Favorites','Challenges','Affiliate']) {
  assert.ok(js.includes("label:'"+label+"'"),label);
  assert.ok(js.includes('pending:true'));
 }
 assert.ok(!js.includes('fetch('),'Shared sidebar cannot submit network requests');
});

// Execute the real presentation routes without starting the app or any service.
function inspectHomeRoute(route,{enabled,query={}}={}){
 const source=readFileSync(new URL('../server/server.js',import.meta.url),'utf8');
 const start=source.search(/app\.get\((?:\['\/','\/dashboard'\]|'\/')/);
 const end=source.indexOf('app.use(express.static',start);
 assert.ok(start>=0&&end>start,'Explicit Home routes must precede static serving');
 const routes=new Map();
 vm.runInNewContext(source.slice(start,end),{
  app:{get:(paths,handler)=>{for(const p of [paths].flat())routes.set(p,handler);}},
  process:{env:enabled===undefined?{}:{DEEPSYQ_HOME_ENABLED:enabled}},
  path:{join:(...parts)=>parts.join('/')},staticDir:'/assets'
 },{timeout:1000});
 const handler=routes.get(route);
 assert.equal(typeof handler,'function',route);
 let sent=null,cache=null,nextCalled=0;
 handler({query},{sendFile:file=>{sent=file;},setHeader:(key,value)=>{if(key==='Cache-Control')cache=value;}},()=>{nextCalled++;sent='/assets/index.html';});
 return {sent,cache,nextCalled};
}

test('production root keeps legacy app unless Deepsyq is explicitly enabled',()=>{
 for(const enabled of [undefined,'','false','1','TRUE','on']){
  assert.deepEqual(inspectHomeRoute('/',{enabled}),{sent:'/assets/index.html',cache:null,nextCalled:1},String(enabled));
 }
 assert.deepEqual(inspectHomeRoute('/',{enabled:'true'}),{sent:'/assets/deepsyq.html',cache:'no-cache',nextCalled:0});
});

test('Stripe and Android auth returns keep the legacy handler with Home enabled',()=>{
 for(const query of [{checkout:'success'},{checkout:'cancel'},{checkout:'success',plan:'lifetime'},{mobileAuth:'token'},{mobileAuth:'token',checkout:'success'},{checkout:''},{mobileAuth:''}]){
  assert.deepEqual(inspectHomeRoute('/',{enabled:'true',query}),{sent:'/assets/index.html',cache:null,nextCalled:1},JSON.stringify(query));
 }
});

test('explicit dashboard remains available without changing the default root',()=>{
 assert.equal(inspectHomeRoute('/dashboard').sent,'/assets/deepsyq.html');
});


test('introductory offer stays disabled without unapproved credit or duration promises',()=>{
 const pricing=read('ai-pricing.html');
 const trial=pricing.slice(pricing.indexOf('<section id="trialOffer"'),pricing.indexOf('</section>',pricing.indexOf('<section id="trialOffer"')));
 assert.ok(trial.includes('$0.99'));
 assert.match(trial,/<button[^>]*disabled/);
 assert.ok(!/three days|3-day|no auto-renewal|being calculated|being finalized/i.test(trial));
 const m=JSON.parse(read('media/home/owner-20261018/manifest.json'));
 const locked=read('owner-home-hero-headings.js');
 const approved=['AI Canvas','Seedance 2.0','Seedance 2.5','Video Studio','AI Agent','Image Studio'];
 for(const [index,slug] of m.carouselOrder.entries()){
  const title=m.items.find(item=>item.slug===slug).defaultSettings.homeShowcase.title;
  assert.equal(title,approved[index],slug+' must retain owner-approved heading');
  assert.ok(locked.includes("title: '"+title+"'"),slug+' owner heading lock must match the approved title');
 }
 assert.ok(read('home-experience.js').includes("import {ownerHomeShowcase} from './owner-home-hero-headings.js'"));
 assert.ok(read('home-experience.js').includes('ownerHomeShowcase(item)'));
});

test('retired Product Video stays absent from visual release, main, preview and admin controls',()=>{
 assert.ok(!read('deepsyq-admin.html').includes('value="product_video"'),'Admin cannot offer retired template creation');
 assert.ok(!read('deepsyq-admin.js').includes("'product_video'"),'Admin JS cannot offer retired type');
 for(const path of ['product-video-file-safety.mjs','product-video-prompt.mjs','product-video.css','product-video.html','product-video.js'])assert.equal(existsSync(new URL(path,assets)),false,path+' must not be published');
 for(const path of ['deepsyq.html','deepsyq-site-shell.js','ai-apps.js','onboarding-options.js','ai-privacy.html','generate-studio.js']){
  const body=read(path);
  assert.ok(!body.includes('product-video.html')&&!body.includes('product_video')&&!body.includes('productVideo'),path+' must not reactivate retired product');
 }
 const server=readFileSync(new URL('../server/server.js',import.meta.url),'utf8');
 const preview=readFileSync(new URL('../server/deepsyq-preview.js',import.meta.url),'utf8');
 for(const source of [server,preview]){
  assert.ok(source.includes("app.get(['/product-video','/product-video.html']"),'both retired routes must get explicit 404');
  assert.ok(source.indexOf("app.get(['/product-video','/product-video.html']")<source.indexOf('app.use(express.static'),'404 before static');
 }
});
