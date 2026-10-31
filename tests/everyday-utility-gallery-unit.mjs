import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const fsPath='app/src/main/assets/';
const ids=['scan-pdf','pdf-merge','pdf-split','pdf-sign','pdf-compress','photo-convert','photo-resize',
 'video-trim','video-mute','audio-trim','qr','photo-redact','photo-ocr','zip','captions','photo-compress',
 'video-compress','teleprompter','photo-collage','background-remover','tts','stt'];
test('owner provided 22 real raster WebP photos, each with valid RIFF header',async()=>{
 assert.equal(ids.length,22);
 assert.equal(new Set(ids).size,22);
 for(const id of ids){
  const data=await readFile(root+fsPath+'media/everyday-utilities-owner-20261024/'+id+'.webp');
  assert.equal(data.toString('ascii',0,4),'RIFF');
  assert.equal(data.toString('ascii',8,12),'WEBP');
  assert.ok(data.length>9000,id+' must not be an empty placeholder');
 }
});
test('owner layout is 19+1+2; all links remain real and safe',async()=>{
 const html=await readFile(root+fsPath+'free-tools.html','utf8');
 const gallery=await readFile(root+fsPath+'everyday-utility-art.js','utf8');
 const css=await readFile(root+fsPath+'everyday-utility-art.css','utf8');
 const links=await readFile(root+fsPath+'mobile-utility-links.js','utf8');
 assert.match(html,/everyday-utility-art\.css/);
 assert.match(html,/everyday-utility-art\.js/);
 assert.match(links,/const ids=\['scan-pdf'.*'captions'\];/);
 for(const id of ids)assert.ok(gallery.includes("'"+id+"'"),id);
 assert.match(gallery,/a\.prepend\(makePhoto\(id/);
 assert.match(gallery,/audio-launch-card\[href="simple-background-remover\.html"\]/);
 assert.match(gallery,/voices\.querySelectorAll\('a\[data-hub-tool\]'\)/);
 assert.match(gallery,/Everyday Tools/);
 assert.match(css,/repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/\.et-owner-bg-banner/);
 assert.match(css,/\.et-owner-voices/);
 assert.doesNotMatch(gallery,/location\.(?:assign|replace)|fetch\(|XMLHttpRequest|\/api\/|window\.open/);
});