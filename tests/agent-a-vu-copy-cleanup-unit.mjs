import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../app/src/main/assets/',import.meta.url);
const js=readFileSync(new URL('video-uniquifier-reference.js',root),'utf8');
const css=readFileSync(new URL('video-uniquifier-reference.css',root),'utf8');
test('hero has only its title; late translated showcase paragraphs are removed without changing title',()=>{
 assert.match(js,/title\.parentElement\?\.querySelectorAll\(':scope > p'\)\.forEach\(copy=>copy\.remove\(\)\)/);
 assert.match(js,/if\(p\)p\.remove\(\)/);
 assert.match(js,/title\.textContent='Video Uniquifier'/);
 assert.match(css,/#dashboardView \.hero #heroTitle ~ p/);
});
test('only owner-requested decorative micro-copy is removed',()=>{
 assert.match(js,/querySelectorAll\('\.sectionHead \.workspaceEyebrow'\)/);
 assert.match(js,/txt\.innerHTML='<strong>/);
 assert.doesNotMatch(js,/txt\.innerHTML='<strong>[^\n]*<small>/);
 assert.match(js, /preview\.innerHTML='<div class="vu-panel-head"><h3>Example preview<\/h3><\/div>'/);
 assert.doesNotMatch(js,/See an example of how video variants can look/);
 assert.doesNotMatch(js,/Unlock more power and create without limits/);
 assert.match(js,/Upgrade to<br>Deepsyq Pro/);
 assert.match(js,/Upgrade Now →/);
 assert.doesNotMatch(js,/upgrade\.querySelector\('\.vu-upgrade-art'\)\.append/);
});
test('format icons are CSS-drawn portrait/landscape and preserve real original controls',()=>{
 assert.match(js,/vu-ratio-glyph/);
 assert.match(js,/vu-ratio-portrait/);
 assert.match(js,/vu-ratio-landscape/);
 assert.match(js,/ratio\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
 assert.match(css,/\.vu-ratio-portrait\{width:15px;height:25px/);
 assert.match(css,/\.vu-ratio-landscape\{width:25px;height:15px/);
 assert.match(css,/\.vu-format-button\[aria-pressed="true"\] \.vu-ratio-glyph/);
 assert.match(js,/const btn=\$\('startBtn'\)/);
});
test('promo card retains its dark purple blue style and functional click',()=>{
 assert.match(css,/body\.vu-reference \.vu-upgrade \{/);
 assert.match(css,/radial-gradient\(ellipse at 85% 94%/);
 assert.match(js,/upgrade\.addEventListener\('click'/);
 assert.ok(js.includes("window.location.assign('pricing.html')"));
});
