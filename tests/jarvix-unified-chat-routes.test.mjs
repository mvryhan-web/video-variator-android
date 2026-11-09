import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../app/src/main/assets/',import.meta.url);
const src=p=>readFile(new URL(p,root),'utf8');
const [home,shell,chat,studio,composer,actions,homeComposer,styles]=await Promise.all([
 'deepsyq.html','deepsyq-site-shell.js','jarvix-chat.js','generate-studio.html',
 'jarvix-composer-design.js','jarvix-action-plan.js','jarvix-home-chat.js','jarvix-chat.css'
].map(src));
test('exactly one canonical JARVIX chat route in all owner Creation sidebar links',()=>{
 for(const mode of ['image','video','audio']){
  const target='jarvix-chat.html?mode='+mode;
  assert.ok(home.includes('href="'+target+'"'),'Home route '+mode);
  assert.ok(shell.includes("url:'"+target+"'"));
  assert.ok(composer.includes("'"+target+"'"));
  assert.ok(actions.includes(mode+":'"+target+"'"));
  assert.doesNotMatch(home,new RegExp('href="generate-studio\\.html\\?studio='+mode+'"'));
  assert.doesNotMatch(shell,new RegExp("url:'generate-studio\\.html\\?studio="+mode+"'"));
 }
 assert.match(home,/href="jarvix-chat\.html" aria-label="JARVIX"/);
 assert.doesNotMatch(composer,/\['Video Uniquifier','index\.html'/);
 assert.match(home,/href="index\.html" aria-label="Video Uniquifier"/);
});
test('JARVIX switches embedded image/video/audio without another conversation ID or paid calls',()=>{
 assert.match(chat,/function switchJarvixMode\(/);
 assert.match(chat,/history\.replaceState\(/);
 assert.match(chat,/jarvix-creation-mode/);
 assert.match(chat,/generate-studio\.html\?studio='\+encodeURIComponent\(mode\)\+'&jarvix_embedded=1'/);
 assert.match(chat,/if\(\['image','video','audio'\]\.includes\(command\.target\)\)switchJarvixMode/);
 assert.match(chat,/switchJarvixMode\(action\.target\)/);
 assert.match(chat,/switchJarvixMode\(kind==='music'\?'audio':kind\)/);
 assert.match(homeComposer,/location\.assign\('jarvix-chat\.html'\+/);
 assert.match(chat,/sessionStorage\.setItem\('jarvix_active_conversation',conversation\.id\)/);
 assert.match(studio,/jarvix-embedded-studio/);
 assert.match(studio,/id="creator"/);
 assert.match(studio,/id="modelButton"/);
 assert.match(studio,/id="generate"/);
 assert.doesNotMatch(chat,/window\.location\.href\s*=\s*['"]generate-studio/);
 assert.ok(!chat.includes('fetch(\'/api/studio/jobs\',{method:\'POST\''),'no new payment or generation controller');
 assert.match(styles,/body\.jarvix-creation-mode/);
});
test('legacy standalone Studio remains for bookmarks/embedded native model controls',()=>{
 assert.match(studio,/<script type="module" src="generate-studio\.js\?v=2\.4"/);
 assert.doesNotMatch(studio,/location\.replace\('jarvix-chat\.html\?mode='/);
 assert.match(studio,/window\.parent!==window && params\.get\('jarvix_embedded'\)==='1'/);
 assert.match(actions,/pricing:'pricing\.html'/);
});
