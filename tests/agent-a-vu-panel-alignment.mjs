import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const root=new URL('../app/src/main/assets/',import.meta.url);
const css=readFileSync(new URL('video-uniquifier-reference.css',root),'utf8');
const js=readFileSync(new URL('video-uniquifier-reference.js',root),'utf8');
test('selected transformation mode clearly glows white',()=>{assert.match(css,/\.vu-mode-card\.selected \.vu-radio/);assert.match(css,/background:#fff;border-color:#fff/);assert.match(css,/box-shadow:0 0 0 3px #ffffff36,0 0 12px 3px #fff/);assert.match(js,/setAttribute\('aria-pressed'/)});
test('workspace aligns with right column and quality gains space',()=>{assert.match(css,/\.vu-content-grid\{align-items:stretch\}/);assert.match(css,/\.vu-left>\.workspace\{flex:1;min-height:0\}/);assert.match(css,/minmax\(0,\.76fr\) minmax\(0,1\.55fr\)/);});
test('no side menu changes in scoped artwork patch',()=>{const tail=css.slice(css.indexOf('/* Owner patch:'));assert.ok(!tail.includes('.sidebar'));assert.ok(!tail.includes('.vu-side-nav'));});
