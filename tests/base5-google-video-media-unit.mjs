import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGoogle,pollGoogle,safeGoogleUrl,googleJson,validateGeneration,rejectUnsupportedVideoControls} from '../server/generation-provider.js';

const GOOGLE='https://generativelanguage.googleapis.com/v1beta/files/fixture?alt=media';
const operation='operations/fixture';
const providerResult={done:true,response:{generateVideoResponse:{generatedSamples:[{video:{uri:GOOGLE}}]}}};
const ftyp=Buffer.alloc(16);ftyp.writeUInt32BE(16,0);ftyp.write('ftypisom',4,'ascii');
const atom=(kind,data=Buffer.alloc(0))=>{
 const header=Buffer.alloc(8);header.writeUInt32BE(8+data.length,0);header.write(kind,4,'ascii');
 return Buffer.concat([header,data]);
};
const movie=atom('moov',Buffer.concat([atom('mvhd',Buffer.alloc(4)),atom('trak',Buffer.alloc(4))]));
const payload=atom('mdat',Buffer.from([1,2,3,4]));
const box=Buffer.concat([ftyp,movie,payload]);
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

test('Google JSON rejects advertised and streamed oversized provider responses before parsing',async()=>{
 const key='fixture-only',max=42*1024*1024;
 const header=await assert.rejects(()=>googleJson('operations/fixture',{key,
  fetcher:async()=>new Response('{}',{headers:{'Content-Length':String(max+1)}})}),/RESULT_TOO_LARGE/);
 let reads=0,cancelled=0;
 const limit={ok:true,headers:{get:()=>null},body:{getReader:()=>({
  read:async()=>({value:new Uint8Array(1024*1024),done:false}),
  cancel:async()=>{cancelled++;}})}};
 await assert.rejects(()=>googleJson('operations/fixture',{key,fetcher:async()=>{reads++;return limit;}}),/RESULT_TOO_LARGE/);
 assert.equal(reads,1);assert.equal(cancelled,1);
});

test('Google JSON accepts small valid streaming results and refuses invalid provider JSON',async()=>{
 const key='fixture-only';
 const good=await googleJson('operations/fixture',{key,fetcher:async()=>new Response('{"done":false}')});
 assert.equal(good.done,false);
 await assert.rejects(()=>googleJson('operations/fixture',{key,
  fetcher:async()=>new Response('<html>bad provider gateway</html>')}),/INVALID_PROVIDER_MEDIA/);
});

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

test('Veo rejects absent Google credentials before any provider POST or polling GET',async()=>{
 let calls=0;
 const fetcher=async()=>{calls++;throw Error('MUST_NOT_DISPATCH');};
 const request={kind:'video',model:'veo-3.1-lite-generate-preview',ratio:'16:9',
  prompt:'Original product video',references:[],videoResolution:'720p',videoDuration:8};
 for(const key of [undefined,null,'','   ']){
  await assert.rejects(()=>generateGoogle(request,{key,fetcher}),/PROVIDER_KEY_REQUIRED/);
  await assert.rejects(()=>pollGoogle(operation,{key,fetcher}),/PROVIDER_KEY_REQUIRED/);
 }
 assert.equal(calls,0);
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

test('Veo accepts ordinary video brands before returning completed MP4',async()=>{
 for(const brand of ['isom','mp42','iso6','avc1','M4V ']){
  const video=Buffer.from(box);video.write(brand,8,'ascii');
  const r=await runPoll(new Response(video));
  assert.equal(r.value.mime,'video/mp4');
  assert.deepEqual(r.value.bytes,video);
 }
});

test('Veo refuses AVIF/HEIC and arbitrary ftyp brands mislabeled as video/mp4',async()=>{
 for(const brand of ['avif','mif1','heic','junk']){
  const image=Buffer.from(box);image.write(brand,8,'ascii');
  await assert.rejects(()=>runPoll(new Response(image)),/INVALID_PROVIDER_MEDIA/,brand);
 }
});

test('BASE #5 ftyp-only or incomplete MP4 container is never charged as a finished movie',async()=>{
 const omitted=[
  ftyp,
  Buffer.concat([ftyp,movie]),
  Buffer.concat([ftyp,payload]),
  Buffer.concat([ftyp,atom('moov',atom('mvhd')),payload]),
  Buffer.concat([ftyp,atom('moov',atom('trak')),payload])
 ];
 for(const incomplete of omitted)
  await assert.rejects(()=>runPoll(new Response(incomplete)),/INVALID_PROVIDER_MEDIA/);
 const truncated=Buffer.from(box);truncated.writeUInt32BE(999999,ftyp.length);
 await assert.rejects(()=>runPoll(new Response(truncated)),/INVALID_PROVIDER_MEDIA/);
 const extraTrailing=Buffer.concat([box,Buffer.from([99,99])]);
 await assert.rejects(()=>runPoll(new Response(extraTrailing)),/INVALID_PROVIDER_MEDIA/);
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


test('BASE #5: unimplemented video/audio references never disappear silently into a paid Video request',()=>{
 const ordinary={kind:'video',model:'veo-3.1-lite-generate-preview',prompt:'Reference-guided scene',ratio:'16:9',consent:true,
  references:[],videoDuration:8,videoResolution:'720p',videoInputMode:'text'};
 for(const extra of [
  {referenceVideo:'https://invalid.example/movie.mp4'},
  {referenceAudio:'https://invalid.example/song.mp3'},
  {videoReferences:[{url:'https://invalid.example/movie.mp4'}]},
  {audioReferences:[{url:'https://invalid.example/song.mp3'}]},
  {videoUrl:'https://invalid.example/video.mp4'},
  {reference_video:'https://invalid.example/video.mp4'},
  {audioUrl:null},
  {reference_audio:null}
 ]){
  assert.throws(()=>validateGeneration({...ordinary,...extra}),/UNSUPPORTED_VIDEO_CONTROL/);
 }
});

test('BASE #5: undocumented camera/motion/audio/watermark controls reject before provider or credits',()=>{
 const clean={kind:'video',model:'veo-3.1-lite-generate-preview',prompt:'Clean Video',ratio:'16:9',
  consent:true,references:[],videoDuration:8,videoResolution:'720p',videoInputMode:'text'};
 for(const extra of [{camera:'pan'},{cameraMotion:'orbit'},{motion:{strength:10}},
  {motionControls:{foo:'bar'}},{generateAudio:true},{watermark:false},
  {camera_motion:null},{generate_audio:false}]){
  assert.throws(()=>validateGeneration({...clean,...extra}),/UNSUPPORTED_VIDEO_CONTROL/);
  assert.throws(()=>rejectUnsupportedVideoControls({...clean,...extra}),/UNSUPPORTED_VIDEO_CONTROL/);
 }
});

test('BASE #5: existing supported text-only Video and ordinary Image generation do not gain false rejections',()=>{
 const good={kind:'video',model:'veo-3.1-lite-generate-preview',prompt:'Safe text scene',ratio:'16:9',
  consent:true,references:[],videoDuration:8,videoResolution:'720p',videoInputMode:'text'};
 assert.equal(validateGeneration(good).videoInputMode,'text');
 assert.doesNotThrow(()=>rejectUnsupportedVideoControls({kind:'image',camera:'unused-by-image-guard'}));
});

test('BASE #5: both price quote and Video generation POST reject unsupported controls before billed dispatch',async()=>{
 const source=await (await import('node:fs/promises')).readFile(
  new URL('../server/generation-studio.js',import.meta.url),'utf8');
 const estStart=source.indexOf('async function resolveEstimateRequest(body){');
 const postStart=source.indexOf("app.post('/api/studio/jobs',auth,generationUser");
 assert.ok(estStart>=0&&postStart>estStart);
 const beforeEstimate=source.slice(estStart,source.indexOf('async function resolveRequest(body)',estStart));
 assert.match(beforeEstimate,/rejectUnsupportedVideoControls\(body\)/);
 const post=source.slice(postStart,source.indexOf('// Read-only recovery of a Video POST',postStart));
 assert.match(post,/resolveRequest\(req.body\)/);
 assert.match(post,/UNSUPPORTED_VIDEO_CONTROL/);
 assert.match(beforeEstimate,/videoInputMode/);
});


test('BASE #5: arbitrary future paid Video fields must not be silently discarded',()=>{
 const standard={kind:'video',model:'veo-3.1-lite-generate-preview',prompt:'Original item video',
  ratio:'16:9',videoInputMode:'text',videoDuration:8,videoResolution:'720p',
  references:[],consent:true,requestId:'11111111-1111-4111-8111-111111111111'};
 for(const future of [
  {videoControls:{advancedCamera:'zoom'}},
  {cameraPath:'orbit'},
  {audioPrompt:'sing an original melody'},
  {reference3d:{url:'private://object'}},
  {productVideoLogo:'separate-brand'},
  {providerOptions:{watermark:false}},
  {videoStrength:0.9}
 ]){
  assert.throws(()=>validateGeneration({...standard,...future}),/UNSUPPORTED_VIDEO_CONTROL/);
 }
 assert.doesNotThrow(()=>validateGeneration(standard));
 // A quote does not have prompt or photo bytes: it still accepts its own
 // narrow shared fields but does not silently swallow unconnected options.
 assert.doesNotThrow(()=>rejectUnsupportedVideoControls({
  kind:'video',model:standard.model,ratio:'16:9',referenceCount:0,
  quantity:1,videoInputMode:'text',videoResolution:'720p',videoDuration:8
 }));
 // Keep existing special error semantics for historical unsupported Image
 // controls instead of changing prior Video caller expectations.
 assert.doesNotThrow(()=>rejectUnsupportedVideoControls({...standard,seed:7}));
});

test('BASE #5 legacy client credits cannot influence validated Video or trusted server rates',()=>{
 const clean={kind:'video',model:'veo-3.1-lite-generate-preview',prompt:'Unchanged quote request',
  ratio:'16:9',consent:true,references:[],videoResolution:'720p',videoDuration:8,videoInputMode:'text'};
 const canonical=validateGeneration(clean);
 for(const credits of [1,10,1000000,'free',-50,null]){
  const normalized=validateGeneration({...clean,credits});
  assert.deepEqual(normalized,canonical,'legacy credits are entirely stripped from normalized input');
  assert.equal(Object.hasOwn(normalized,'credits'),false);
 }
 for(const field of ['price','creditAmount','providerCost','walletBalance']){
  assert.throws(()=>validateGeneration({...clean,[field]:1}),/UNSUPPORTED_VIDEO_CONTROL/);
 }
});
