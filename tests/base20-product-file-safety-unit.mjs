import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validProductPhoto} from '../app/src/main/assets/product-video-file-safety.mjs';
const png=Uint8Array.from([137,80,78,71,13,10,26,10,1,2,3]);
const jpeg=Uint8Array.from([255,216,255,224,1,2,3,4,5]);
const blob=(data,type)=>new Blob([data],{type});
test('BASE20 image references accept actual PNG/JPEG signatures only',async()=>{
 assert.equal(await validProductPhoto(blob(png,'image/png')),true);
 assert.equal(await validProductPhoto(blob(jpeg,'image/jpeg')),true);
 assert.equal(await validProductPhoto(blob(jpeg,'image/png')),false);
 assert.equal(await validProductPhoto(blob(png,'image/jpeg')),false);
 assert.equal(await validProductPhoto(blob(new TextEncoder().encode('hello world'),'image/png')),false);
});
test('BASE20 image references reject zero, oversize, missing or denied files',async()=>{
 assert.equal(await validProductPhoto(blob([],'image/png')),false);
 assert.equal(await validProductPhoto(blob(png,'application/pdf')),false);
 assert.equal(await validProductPhoto(blob(new Uint8Array(1024*1024+1),'image/png')),false);
 assert.equal(await validProductPhoto(null),false);
 assert.equal(await validProductPhoto({type:'image/png',size:100,slice:()=>({arrayBuffer:()=>Promise.reject(Error('denied'))})}),false);
});
