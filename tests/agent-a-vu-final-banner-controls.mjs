import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../app/src/main/assets/',import.meta.url);
const js=readFileSync(new URL('video-uniquifier-reference.js',root),'utf8');
const css=readFileSync(new URL('video-uniquifier-reference.css',root),'utf8');
test('Owner-provided wide photo replaces only the Hero, keeps three separate films',()=>{
 assert.match(js,/key==='hero'\?'https:\/\/d2ol7oe51mr4n9.cloudfront.net\/[^']+\.png'/);
 assert.match(js,/img\.addEventListener\('error'/);
 assert.match(js,/media\/vu-clean-hero-20261025\.svg/);
 assert.match(js,/\['film1','film2','film3'\]/);
});
test('Create Variations sits lower and stays in the original action row',()=>{
 assert.match(css,/\.vu-left>\.workspace\{flex:1;min-height:0;display:flex!important;flex-direction:column\}/);
 assert.match(css,/\.workspace>\.actionRow\{margin-top:auto!important;padding-top:32px/);
 assert.match(js,/const btn=\$\('startBtn'\)/);
});
test('Variants narrower, quality buttons larger without touching site navigation',()=>{
 const add=css.split('/* Owner follow-up:')[1];assert.ok(add,'Scoped owner patch missing');
 assert.match(add,/\.vu-parameters\{grid-template-columns:minmax\(0,\.62fr\) minmax\(0,1\.58fr\)/);
 assert.match(add,/\.vu-quality-button\{min-height:58px/);
 assert.match(add,/\.vu-quality-button\[aria-pressed="true"\]/);
 assert.doesNotMatch(add, /\.sidebar|\.vu-side-nav|\.vu-appbar/);
});
