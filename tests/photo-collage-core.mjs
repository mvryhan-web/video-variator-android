import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_COLLAGE_FILES,collageGeometry,centerCrop} from '../app/src/main/assets/photo-collage-core.js';

test('2–9 images fit a stable ordered grid',()=>{
 const two=collageGeometry(2,2,12);
 assert.equal(two.columns,2);assert.equal(two.rows,1);assert.equal(two.width,1200);
 const nine=collageGeometry(9,3,24);
 assert.equal(nine.rows,3);assert.equal(nine.columns,3);assert.equal(nine.width,1200);
 assert.ok(nine.height<=1200);
});
test('invalid counts and layouts fail before decoding',()=>{
 for(const n of [0,1,10,NaN])assert.throws(()=>collageGeometry(n,2,12),/COLLAGE_COUNT/);
 for(const columns of [1,4,2.5])assert.throws(()=>collageGeometry(3,columns,12),/COLLAGE_LAYOUT/);
 assert.throws(()=>collageGeometry(3,2,999),/COLLAGE_LAYOUT/);
});
test('cover crop preserves center of landscape and portrait sources',()=>{
 assert.deepEqual(centerCrop(200,100,100,100),{sx:50,sy:0,sw:100,sh:100});
 assert.deepEqual(centerCrop(100,200,100,100),{sx:0,sy:50,sw:100,sh:100});
 assert.throws(()=>centerCrop(0,100,100,100),/COLLAGE_IMAGE/);
});
