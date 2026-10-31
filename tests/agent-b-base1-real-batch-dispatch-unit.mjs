import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import vm from 'node:vm';

// Mock-only BASE1 B8: execute the REAL user form handler + REAL 2–4 Image
// batch function, without network, real payment, provider or database writes.
const source=await readFile(resolve('app/src/main/assets/generate-studio.js'),'utf8');
const start=source.indexOf('async function createImageBatch(){');
const middle=source.indexOf("$('creator').onsubmit=async e=>{",start);
const end=source.indexOf('// Continue from an existing image',middle);
assert.ok(start>=0&&middle>start&&end>middle,'Find exact real Batch + Studio submit handler');
const extracted=source.slice(start,end);

async function scenario({confirmPrice=true,breakAfter=null}={}){
 let next=0,estimates=[],posts=[],watches=[];
 const ui=new Map();
 const field=id=>{
  if(!ui.has(id)){
   const defaults={generate:{disabled:false},imageResolution:{value:'2K'},
    imageOutputFormat:{value:'png'},ratio:{value:'1:1'},musicMode:{value:'song'},
    prompt:{value:'Two safe, synthetic product photos'},status:{textContent:''},
    consent:{checked:true}};
   ui.set(id,defaults[id]||{value:''});
  }
  return ui.get(id);
 };
 const context={
  $:field,kind:'image',modelId:'mock-image',refs:[],config:{imageBatchEnabled:true},
  generation:0,job:null,busy:false,imageBatchQuantity:()=>2,
  crypto:{randomUUID:()=> 'fa8b56e4-3ab7-4df1-a672-'+String(++next).padStart(12,'0')},
  sessionStorage:{setItem(){}},
  say:en=>en,errorText:e=>e.message,
  availability(){},setHistory(){},clearResult(){},updateJobProgress(){},
  confirm:()=>confirmPrice,
  watch:async id=>{watches.push(id);context.busy=false;},
  api:async(path,opts={})=>{
   if(path==='/api/studio/estimate'){
    estimates.push(JSON.parse(opts.body));
    return {json:async()=>({kind:'image',model:'mock-image',quantity:2,
      credits:14,perImageCredits:7})};
   }
   if(path==='/api/studio/jobs'){
    const body=JSON.parse(opts.body);posts.push(body);
    if(breakAfter===posts.length)throw Error('AMBIGUOUS_NETWORK_RESPONSE');
    return {json:async()=>({id:'job-'+posts.length,kind:'image',status:'ready',creditsReserved:7})};
   }
   throw Error('Unexpected network endpoint '+path);
  }
 };
 vm.runInNewContext(extracted,context,{timeout:1500,filename:'actual-B-Studio-user-submit.js'});
 const handler=field('creator').onsubmit;
 assert.equal(typeof handler,'function');
 await handler({preventDefault(){}});
 return {estimates,posts,watches,status:field('status').textContent};
}

test('B8 actual Generate click dispatches 2 distinct image jobs with one fresh, confirmed 14-credit quote',async()=>{
 const a=await scenario();
 assert.equal(a.estimates.length,1);
 assert.equal(a.estimates[0].quantity,2);
 assert.equal(a.estimates[0].prompt,undefined);
 assert.equal(a.estimates[0].references,undefined);
 assert.equal(a.posts.length,2,'must not silently do one Image job');
 assert.equal(a.watches.length,2);
 assert.equal(a.posts[0].expectedCredits,7);
 assert.equal(a.posts[1].expectedCredits,7);
 assert.notEqual(a.posts[0].requestId,a.posts[1].requestId);
 assert.equal(a.status.startsWith('Batch complete'),true);
});
test('B8 user declines batch cost: one read-only quote, zero job POST or wallet charge',async()=>{
 const a=await scenario({confirmPrice:false});
 assert.equal(a.estimates.length,1);
 assert.equal(a.posts.length,0);
 assert.equal(a.watches.length,0);
 assert.match(a.status,/Batch cancelled/);
});
test('B8 ambiguous second batch POST never creates a third request or hides the first completed job',async()=>{
 const a=await scenario({breakAfter:2});
 assert.equal(a.posts.length,2);
 assert.equal(a.watches.length,1);
 assert.equal(new Set(a.posts.map(x=>x.requestId)).size,2);
 assert.match(a.status,/Batch stopped after 1 submitted and 1 completed/);
 assert.match(a.status,/No automatic retries/);
});
