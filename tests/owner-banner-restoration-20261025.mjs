import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('Everyday Tools hero fills width with approved Oct 24-25 artwork',()=>{
 const css=read('app/src/main/assets/everyday-tools-visual.css');
 const html=read('app/src/main/assets/free-tools.html');
 assert.match(css,/\.et-hero-art\{\s*left:0;width:100%;height:100%/);
 assert.match(html,/everyday-tools-visual\.css\?v=owner-20261103-banner-full-width/);
});
test('Video Uniquifier hero restores October panorama not isolated car',()=>{
 const js=read('app/src/main/assets/video-uniquifier-reference.js');
 const html=read('app/src/main/assets/index.html');
 assert.ok(js.includes("viewBox','208 56 1230 252'"));
 assert.ok(js.includes("art.setAttribute('href',file)"));
 assert.match(html,/video-uniquifier-reference\.js\?v=owner-20261103-banner-24-25/);
});
