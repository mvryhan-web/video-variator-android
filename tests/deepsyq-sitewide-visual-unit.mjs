import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../app/src/main/assets/',import.meta.url);
const pages=["deepsyq.html","generate-studio.html","inspiration.html","ai-apps.html","ai-pricing.html","audio-studio.html","avatar-studio.html","product-video.html","free-tools.html","deepsyq-admin.html","ai-privacy.html","mobile-utility.html","index.html","deepsyq-vs-deepseek.html"];
test('all site pages load the approved shared visual language',()=>{
 const style=readFileSync(new URL('deepsyq-global-theme.css',root),'utf8');
 for(const token of ['#080d1d','#925bff','#ee80d2','#4c9cf4']) assert.ok(style.includes(token));
 for(const page of pages){
  const html=readFileSync(new URL(page,root),'utf8');
  assert.ok(html.includes('href="deepsyq-global-theme.css"'),page);
  assert.equal(html.split('href="deepsyq-global-theme.css"').length,2,page);
 }
});
test('secondary pages have shared sidebar without altering Home, legacy or admin',()=>{
 for(const page of pages){
  const html=readFileSync(new URL(page,root),'utf8');
  const has=html.includes('src="deepsyq-site-shell.js"');
  assert.equal(has,!['deepsyq.html','index.html','deepsyq-admin.html'].includes(page),page);
 }
});
test('replace d. placeholders with exact official image',()=>{
 for(const page of ['inspiration.html','ai-pricing.html','ai-privacy.html','generate-studio.html']){
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
