import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGoogle,pollGoogle,safeGoogleUrl} from '../server/generation-provider.js';

const GOOGLE='https://generativelanguage.googleapis.com/v1beta/files/fixture?alt=media';
const operation='operations/fixture';
const providerResult={done:true,response:{generateVideoResponse:{generatedSamples:[{video:{uri:GOOGLE}}]}}};
const box=Buffer.alloc(16);box.writeUInt32BE(16,0);box.write('ftypisom',4,'ascii');
async function runPoll(download,key='fixture-key'){
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  if(calls.length===1)return new Response(JSON.stringify(providerResult),{headers:{'Content-Type':'application/json'}});
  return download;
 };
 try{return {value:await pollGoogle(operation,{key,fetcher}),calls};}
 catch(error){error.calls=calls;throw error;}
}

test('BASE #5 Veo only permits exact official Google HTTPS download origin',()=>{
 assert.equal(safeGoogleUrl(GOOGLE),GOOGLE);
 for(const bad of [
  'http://generativelanguage.googleapis.com/v1beta/files/demo',
  'https://generativelanguage.googleapis.com:8443/v1beta/files/demo',
  'https://user@generativelanguage.googleapis.com/file',
  'https://generativelanguage.googleapis.com.evil.test/file',
  'https://127.0.0.1/file',
  GOOGLE+'#secret','garbage'
 ])assert.throws(()=>safeGoogleUrl(bad),/UNSAFE_PROVIDER_URL/);
});

test('BASE #5 successful Veo video returns original verified bytes and never exposes key to a third party',async()=>{
 const result=await runPoll(new Response(box),'not-public');
 assert.equal(result.value.mime,'video/mp4');
 assert.deepEqual(result.value.bytes,box);
 assert.equal(result.calls.length,2);
 assert.equal(result.calls[0].options.headers['x-goog-api-key'],'not-public');
 assert.equal(result.calls[1].options.headers['x-goog-api-key'],'not-public');
 assert.equal(result.calls[1].options.redirect,'error');
 assert.equal(result.calls[1].url,GOOGLE);
 assert.equal(result.calls[0].options.method,'GET');
});

test('BASE #5 invalid response bytes never become a purported finished MP4',async()=>{
 for(const body of [Buffer.from('<html>denied by gateway</html>'),Buffer.alloc(0),Buffer.from('not-mp4')]){
  await assert.rejects(()=>runPoll(new Response(body)),/INVALID_PROVIDER_MEDIA|EMPTY_GENERATION/);
 }
 const invalidSize=Buffer.from(box);invalidSize.writeUInt32BE(4096,0);
 await assert.rejects(()=>runPoll(new Response(invalidSize)),/INVALID_PROVIDER_MEDIA/);
});

test('Veo refuses AVIF/HEIC and arbitrary ftyp brands mislabeled as video/mp4',async()=>{
 for(const brand of ['avif','mif1','heic','junk']){
  const image=Buffer.from(box);image.write(brand,8,'ascii');
  await assert.rejects(()=>runPoll(new Response(image)),/INVALID_PROVIDER_MEDIA/,brand);
 }
});

test('BASE #5 claimed oversized Veo response fails before streaming media',async()=>{
 await assert.rejects(()=>runPoll(new Response(Buffer.from('small'),{
  headers:{'Content-Length':String(30*1024*1024+1)}
 })),/RESULT_TOO_LARGE/);
});

test('BASE #5 failed Veo task stays terminal; no media fetch and no new provider submission',async()=>{
 let calls=0;
 const fetcher=async()=>{calls++;return new Response(JSON.stringify({done:true,error:{message:'not for logs'}}));};
 await assert.rejects(()=>pollGoogle(operation,{key:'fixture-key',fetcher}),e=>e.message==='PROVIDER_TASK_FAILED'&&e.terminal===true);
 assert.equal(calls,1);
});

test('BASE #5 rejected malformed Google operation IDs never become unpollable stored jobs',async()=>{
 const request={kind:'video',model:'veo-3.1-lite-generate-preview',ratio:'16:9',prompt:'Source grounded product',references:[],videoResolution:'720p',videoDuration:8};
 for(const name of [
  'https://example.test/operations/secret',
  'operations/../../escape',
  'operations/test?key=secret',
  'models/model/operations/',
  '',
  'operations/'+('a'.repeat(600))
 ]){
  let calls=0;
  await assert.rejects(()=>generateGoogle(request,{key:'fixture',fetcher:async()=>{
   calls++;return new Response(JSON.stringify({name}));
  }}),/EMPTY_OPERATION/);
  assert.equal(calls,1);
 }
 let calls=0;
 const valid=await generateGoogle(request,{key:'fixture',fetcher:async()=>{
  calls++;return new Response(JSON.stringify({name:'models/veo-3.1-lite-generate-preview/operations/task_id'}));
 }});
 assert.equal(valid.operation,'models/veo-3.1-lite-generate-preview/operations/task_id');
 assert.equal(calls,1);
});
