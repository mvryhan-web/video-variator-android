import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../app/src/main/assets/',import.meta.url);
const read=(name)=>readFileSync(new URL(name,root),'utf8');
test('Owner-cancelled standalone Product Video code and page are deleted',()=>{
 for(const name of ['product-video.html','product-video.css','product-video.js','product-video-prompt.mjs','product-video-file-safety.mjs']){
  assert.equal(existsSync(new URL(name,root)),false,name);
 }
 for(const name of ['deepsyq.html','deepsyq-site-shell.js','ai-apps.js','onboarding-options.js','home-experience.js']){
  assert.doesNotMatch(read(name),/product-video\.html|Product Video|Product video ad|showGuidedProductVideo|productVideoEnabled/,name);
 }
});
test('Retired URL is explicitly unavailable in both services and service worker',()=>{
 const root=new URL('../server/',import.meta.url);
 for(const file of ['server.js','deepsyq-preview.js']){
  const text=readFileSync(new URL(file,root),'utf8');
  assert.ok(text.includes("app.get(['/product-video','/product-video.html']"),file);
  assert.match(text,/res\.status\(404\)/);
 }
 const sw=read('sw.js');
 assert.ok(sw.includes('product-video'));
 assert.ok(sw.includes('status:404'));
});
test('Retired type cannot enter active AI Apps templates or Studio handoff',()=>{
 const api=readFileSync(new URL('../server/generation-templates.js',import.meta.url),'utf8');
 assert.ok(api.includes("generation_type!='product_video'"));
 assert.ok(!api.includes("new Set(['image','video','product_video'"));
 assert.ok(read('ai-apps.js').includes("item.generationType!=='product_video'"));
 assert.ok(!read('generate-studio.js').includes("['video','product_video']"));
});
