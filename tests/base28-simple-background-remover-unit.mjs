import test from 'node:test';
import assert from 'node:assert/strict';
import {eraseConnectedColor} from '../app/src/main/assets/simple-background-remover-core.mjs';

function sample(width,height,rgb=[255,255,255]){
 const data=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<width*height;i++){data.set([...rgb,255],i*4);}
 return data;
}
test('erases only connected matching flat background, preserving product and source',()=>{
 const source=sample(5,5);
 source.set([210,20,20,255],(2*5+2)*4);
 const before=source.slice();
 const result=eraseConnectedColor(source,5,5,0,0,12);
 assert.equal(result.removedPixels,24);
 assert.equal(result.rgba[(2*5+2)*4+3],255);
 assert.equal(result.rgba[3],0);
 assert.deepEqual(source,before,'user original must remain untouched');
});
test('protects isolated color islands and rejects an already-transparent seed',()=>{
 const s=sample(5,5,[20,20,20]);
 s.set([255,255,255,255],0);
 s.set([255,255,255,255],(2*5+2)*4);
 const out=eraseConnectedColor(s,5,5,0,0,0);
 assert.equal(out.removedPixels,1);
 assert.equal(out.rgba[(2*5+2)*4+3],255);
 const transparent=sample(1,1);transparent[3]=0;
 assert.throws(()=>eraseConnectedColor(transparent,1,1,0,0),/SAMPLE_IS_TRANSPARENT/);
});
test('rejects abusive dimensions, invalid sample and tolerance',()=>{
 const rgba=sample(2,2);
 assert.throws(()=>eraseConnectedColor(rgba,9000,9000,0,0),/UNSUPPORTED_IMAGE_SIZE/);
 assert.throws(()=>eraseConnectedColor(rgba,2,2,4,0),/INVALID_SAMPLE/);
 assert.throws(()=>eraseConnectedColor(rgba,2,2,0,0,300),/INVALID_TOLERANCE/);
 assert.throws(()=>eraseConnectedColor(new Uint8ClampedArray(3),2,2,0,0),/INVALID_RGBA/);
});