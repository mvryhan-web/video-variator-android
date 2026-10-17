import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectProductVideoHandoff} from '../app/src/main/assets/studio-product-video-role-guard.mjs';

const photo=()=>({name:'original-product.png',type:'image/png'});
const handoff=(files,hasLogo=false)=>({
 source:'product-video',kind:'video',meta:{hasLogo},files
});

test('BASE #5: C Product Video with original product photo only is accepted',()=>{
 const one=handoff([photo()]);
 assert.deepEqual(inspectProductVideoHandoff(one),{allowed:true});
 assert.equal(one.files.length,1);
 assert.deepEqual(inspectProductVideoHandoff(handoff([photo(),photo(),photo()])),{allowed:true});
});

test('BASE #5: optional logo never gets interpreted as first/last frame or scene photo',()=>{
 for(let n=1;n<=3;n++){
  const photos=Array.from({length:n},photo),logo={name:'brand-logo.png',type:'image/png'};
  const input=handoff([...photos,logo],true);
  assert.deepEqual(inspectProductVideoHandoff(input),{
   allowed:false,reason:'PRODUCT_VIDEO_LOGO_OVERLAY_UNSUPPORTED'
  });
  assert.equal(input.files[n],logo); // No mutation or silent truncation.
 }
});

test('BASE #5: malformed Product Video logo metadata fails closed',()=>{
 for(const meta of [undefined,null,{}, {hasLogo:'false'}, {hasLogo:0}, {hasLogo:null},[]]){
  const input=handoff([photo()]);input.meta=meta;
  assert.deepEqual(inspectProductVideoHandoff(input),{
   allowed:false,reason:'PRODUCT_VIDEO_REFERENCE_ROLES_INVALID'
  });
 }
});

test('BASE #5: mislabeled four-reference Product Video fails closed without dropping unknown fourth asset',()=>{
 const input=handoff([photo(),photo(),photo(),photo()],false);
 assert.deepEqual(inspectProductVideoHandoff(input),{
  allowed:false,reason:'PRODUCT_VIDEO_REFERENCE_ROLES_INVALID'
 });
 assert.equal(input.files.length,4);
});

test('BASE #5: impossible Product Video kinds or reference shapes are rejected',()=>{
 const bad=[{...handoff([photo()]),kind:'image'},handoff([]),
  {...handoff([photo()]),files:null},
  {...handoff([photo()]),files:{length:1}},
  {...handoff([photo()]),files:Array.from({length:5},photo)}];
 for(const input of bad)assert.equal(inspectProductVideoHandoff(input).allowed,false);
});

test('BASE #5: other workflows retain their original reference behavior',()=>{
 for(const source of ['workflow','ai-app','homepage',undefined]){
  const input={source,kind:'video',files:[photo(),photo(),photo(),photo()],meta:{hasLogo:true}};
  assert.deepEqual(inspectProductVideoHandoff(input),{allowed:true});
 }
 assert.deepEqual(inspectProductVideoHandoff(null),{allowed:true});
});

test('BASE #5: logo check is a pure pre-dispatch preflight (no provider/job operations)',()=>{
 const input=handoff([photo(),{name:'ad-logo.jpg'}],true);
 const before=JSON.stringify(input);
 const blocked=inspectProductVideoHandoff(input);
 assert.equal(blocked.allowed,false);
 assert.equal(JSON.stringify(input),before);
 assert.deepEqual(Object.keys(blocked).sort(),['allowed','reason']);
});
