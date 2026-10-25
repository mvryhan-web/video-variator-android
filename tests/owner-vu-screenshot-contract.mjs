import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const base=new URL('../app/src/main/assets/',import.meta.url);
const source=file=>readFileSync(new URL(file,base),'utf8');
const html=source('index.html'),art=source('video-uniquifier-reference.js'),css=source('video-uniquifier-reference.css');
test('Owner Video Uniquifier screenshot layout assets and layout script are present',()=>{
 assert.match(html,/video-uniquifier-reference\.css/);
 assert.match(html,/video-uniquifier-reference\.js/);
 assert.ok(existsSync(new URL('media/approved-design-20261023/20_Video_Uniquifier.png',base)));
 assert.match(art,/vu-content-grid/);assert.match(art,/vu-how-steps/);assert.match(art,/vu-mode-card/);
});
test('Fifteen real visual crop positions are defined for reference screenshot',()=>{
 const match=art.match(/const R=\{([\s\S]*?)\};/);
 assert.ok(match,'Crop map');
 const names=[...match[1].matchAll(/\b([a-z][a-z0-9]*)\s*:\s*\[(\d+),(\d+),(\d+),(\d+)\]/g)];
 assert.equal(names.length,15,'Reference has fifteen decorative art placements');
 for(const [,name,x,y,w,h] of names){
  assert.ok(Number(w)>0&&Number(h)>0, name);
  assert.ok(Number(x)+Number(w)<=1447 && Number(y)+Number(h)<=1087,name);
 }
});
test('Existing processing controls keep exact unique IDs and same values',()=>{
 for(const id of ['fileInput','variantCount','mode','quality','aspectRatio','startBtn','cancelBtn','progressCard','resultsCard','historyList','clearHistoryBtn','authModal']){
  assert.equal(html.split('id="'+id+'"').length-1,1,id);
 }
 for(const value of ['gentle','balanced','dynamic'])assert.match(html,new RegExp('<option value="'+value+'"'));
 assert.ok(art.includes("select.dispatchEvent(new Event('change'"));
 assert.ok(art.includes("num.dispatchEvent(new Event('change'"));
 assert.ok(art.includes("qual.dispatchEvent(new Event('change'"));
});
test('Purely decorative preview does not impersonate playable media or results',()=>{
 assert.match(art,/Illustrative preview image/);
 assert.match(art,/disabled>⇩/);
 assert.match(art,/origResults/);
 assert.ok(!art.includes('fetch('));
 assert.ok(!art.includes('localStorage.'));
 assert.match(css,/\.vu-reference/);
});
