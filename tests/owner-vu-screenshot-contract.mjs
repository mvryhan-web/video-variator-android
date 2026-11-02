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
test('Each visible processing mode resolves to a configured image key',()=>{
 const modeNames=['gentle','balanced','dynamic'];
 const cropMap=art.split('const R={')[1]?.split('};')[0]||'';
 for(const name of modeNames){
  const key=name==='balanced'?'balance':name;
  assert.ok(cropMap.includes(key+':['),key+' must have valid artwork');
 }
 assert.ok(art.includes("v==='balanced'?'balance':v"));
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
 assert.match(art,/Illustrative preview controls/);
 assert.ok(!art.includes('vu-film-play">▶'));
 assert.ok(!art.includes('vu-preview-play" aria-label='));
 assert.match(art,/disabled>⇩/);
 assert.match(art,/origResults/);
 assert.ok(!art.includes('fetch('));
 assert.ok(!art.includes('localStorage.'));
 assert.match(css,/\.vu-reference/);
});

test('Owner adjustments have standalone crisp media and zero duplicate play overlays',()=>{
 assert.ok(existsSync(new URL('media/vu-clean-hero-20261025.svg',base)));
 assert.ok(existsSync(new URL('media/vu-clean-upload-20261025.svg',base)));
 assert.match(art,/vu-clean-hero-20261025\.svg/);
 assert.match(art,/vu-clean-upload-20261025\.svg/);
 assert.match(art,/if\(p\)p\.remove\(\)/);
 assert.doesNotMatch(art,/More settings · aspect ratio/);
 assert.doesNotMatch(art,/Create unique video variants in three simple steps/);
 assert.match(art,/vu-variant-choice/);
 const chooser=art.split('const planCaps=')[1]?.split(';')[0]||'';
 assert.match(chooser,/trial:5,basic:5,pro:10,business:15,lifetime:15/);
 assert.match(art,/currentPlanLabel=\$\('currentPlan'\)/);
 assert.match(css,/label\.exportSpeed\{display:none!important\}/);
});
test('Owner navigation content and original processing remain present',()=>{
 assert.match(art,/function makeNav\(shell\)/);
 assert.match(art,/function build\(\)/);
 const js4=source('app-v4.js'),js5=source('app-v5.js');
 assert.match(js4,/maxVariants:15/);
 assert.match(js4,/function enforcePlanControls/);
 assert.match(js5,/variants:Math\.min\(maxVariants\(\)/);
 for(const name of ['fileInput','variantCount','mode','quality','startBtn','cancelBtn'])assert.match(html,new RegExp('id="'+name+'"'));
});
