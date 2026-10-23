import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const fsPath='app/src/main/assets/';
const ids=['scan-pdf','pdf-merge','pdf-split','pdf-sign','pdf-compress',
 'photo-convert','photo-resize','video-trim','video-mute','audio-trim','qr',
 'photo-redact','photo-ocr','zip','captions','photo-compress','video-compress',
 'teleprompter','photo-collage','background-remover','tts','stt'];
test('22 independent 16:9 semantic SVG illustrations, no scripts or external assets',async()=>{
 assert.equal(new Set(ids).size,22);
 for(const id of ids){
  const file=await readFile(root+fsPath+'media/everyday-utilities-20261023/'+id+'.svg','utf8');
  assert.match(file,/<svg[^>]*width="960" height="540" viewBox="0 0 960 540"/);
  assert.match(file,/<\/svg>\s*$/);
  assert.doesNotMatch(file,/<script|foreignObject|https?:\/\//i);
  assert.ok(file.length>1000,id+' should be a real illustrated SVG, not an empty placeholder');
 }
});
test('gallery preserves all original working links and title without hidden alternative routes',async()=>{
 const html=await readFile(root+fsPath+'free-tools.html','utf8');
 const catalog=await readFile(root+fsPath+'mobile-utility-links.js','utf8');
 const gallery=await readFile(root+fsPath+'everyday-utility-art.js','utf8');
 assert.match(html,/everyday-utility-art\.css/);
 assert.match(html,/everyday-utility-art\.js/);
 assert.match(catalog,/const ids=\['scan-pdf'.*'captions'\];/);
 for(const id of ids)assert.ok(gallery.includes("'"+id+"'"),id+' must retain art/route map');
 assert.match(gallery,/grid\.append\(a\)/);
 assert.match(gallery,/a\.prepend\(img\)/);
 assert.match(gallery,/Everyday Tools/);
 assert.doesNotMatch(gallery,/location\.(?:assign|replace)|fetch\(|XMLHttpRequest|\/api\/|window\.open/);
});
