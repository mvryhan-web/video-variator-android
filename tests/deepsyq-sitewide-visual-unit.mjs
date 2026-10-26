import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../app/src/main/assets/',import.meta.url);
const pages=["deepsyq.html","generate-studio.html","ai-apps.html","pricing.html","audio-studio.html","avatar-studio.html","free-tools.html","deepsyq-admin.html","ai-privacy.html","mobile-utility.html","index.html","deepsyq-vs-deepseek.html","photo-collage.html","simple-background-remover.html","smart-reminders.html","teleprompter.html","telegram-free-mini.html","product-watcher-admin.html"];
test('all site pages load the approved shared visual language',()=>{
 const style=readFileSync(new URL('deepsyq-global-theme.css',root),'utf8');
 for(const token of ['#080d1d','#925bff','#ee80d2','#4c9cf4']) assert.ok(style.includes(token));
 for(const page of pages){
  const html=readFileSync(new URL(page,root),'utf8');
  const theme=page==='generate-studio.html'?'studio-classic-theme.css':'deepsyq-global-theme.css';
  assert.ok(html.includes('href="'+theme+'"'),page);
  assert.equal(html.split('href="'+theme+'"').length,2,page);
 }
});
test('secondary pages have shared sidebar without altering Home, legacy or admin',()=>{
 for(const page of pages){
  const html=readFileSync(new URL(page,root),'utf8');
  const has=html.includes('src="deepsyq-site-shell.js"');
  assert.equal(has,!['deepsyq.html','index.html','deepsyq-admin.html','product-watcher-admin.html','telegram-free-mini.html'].includes(page),page);
 }
});
test('replace d. placeholders with exact official image',()=>{
 for(const page of ['pricing.html','ai-privacy.html','generate-studio.html']){
  const html=readFileSync(new URL(page,root),'utf8');
  assert.ok(html.includes('src="deepsyq-logo.png"'),page);
  assert.ok(!html.includes('>d.</span>'),page);
 }
});
test('shared shell is navigation only, no money or AI operations',()=>{
 const js=readFileSync(new URL('deepsyq-site-shell.js',root),'utf8');
 for(const banned of ['fetch(', 'XMLHttpRequest','checkout','stripe','.play(']) assert.ok(!js.includes(banned),banned);
 assert.ok(js.includes('aria-expanded'));
});


test('every secondary navigation destination exists; pending features are not links',()=>{
 const js=readFileSync(new URL('deepsyq-site-shell.js',root),'utf8');
 for(const group of ["Home","Creation","Tools","Library","Community","More"]) assert.ok(js.includes("section:'"+group+"'"),group);
 for(const label of ['Agent','Affiliate']) assert.ok(js.includes("label:'"+label+"',icon:")&&js.includes("pending:true"),label);
 const home=readFileSync(new URL('deepsyq.html',root),'utf8');
 for(const label of ['Favo'+'rites','Chall'+'enges']){
  assert.ok(!js.includes(label),'Unapproved navigation in shared shell: '+label);
  assert.ok(!home.includes(label),'Unapproved navigation in Home: '+label);
 }
 const urls=[...js.matchAll(/url:'([^']+)'/g)].map(x=>x[1]);
 for(const url of urls){
  const file=url.split(/[?#]/)[0];
  assert.ok(file.endsWith('.html'),url);
  assert.doesNotThrow(()=>readFileSync(new URL(file,root),'utf8'),url);
 }
 for(const required of ['generate-studio.html?studio=image','generate-studio.html?studio=video',
   'generate-studio.html?studio=audio','canvas.html',
   'generate-studio.html?view=history','free-tools.html','ai-apps.html']) assert.ok(urls.includes(required),required);
});

test('Studio restoration uses the exact owner-approved October 20 theme',()=>{
 const css=readFileSync(new URL('studio-classic-theme.css',root));
 assert.equal(createHash('sha256').update(css).digest('hex'),'b29e8cccd0c8a799bf928642558f1082f5272e5a30dd654cee6f8025d5a26ee8');
 const html=readFileSync(new URL('generate-studio.html',root),'utf8');
 assert.ok(!html.includes('approved-page-design.js'));
 assert.ok(!html.includes('approved-page-design.css'));
});

test('retired Pricing has only a safe canonical redirect, not a second styled storefront',()=>{
 const retired=readFileSync(new URL('ai-pricing.html',root),'utf8');
 assert.ok(retired.includes('<script src="pricing-legacy-redirect.js"></script>'));
 assert.ok(!retired.includes('<script>'),'legacy inline JS violates the strict production CSP');
 const js=readFileSync(new URL('pricing-legacy-redirect.js',root),'utf8');
 assert.ok(js.includes('location.replace(destination.href)'));
 assert.match(retired,/meta name="robots" content="noindex,follow"/);
 assert.doesNotMatch(retired,/src="ai-pricing\.js"|id="walletSummary"|id="toolPlans"/);
});
