import test from 'node:test';import assert from 'node:assert/strict';
import {generateBytePlus,pollBytePlus,safeBytePlusMediaUrl} from '../server/generation-byteplus.js';
import {dispatchGeneration,dispatchPoll,studioConfig} from '../server/generation-studio.js';
import {validateGeneration} from '../server/generation-provider.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
const req=(kind='image',model='byteplus-seedream-5-lite')=>validateGeneration({kind,model,prompt:'Ocean',ratio:'16:9',consent:true,references:[]});
const json=d=>new Response(JSON.stringify(d),{headers:{'Content-Type':'application/json'}});
test('BytePlus needs its own key, explicit model permission, and video download hosts',()=>{
 const env={AI_STUDIO_ENABLED:'true',DATABASE_URL:'fixture',ADMIN_EMAIL:'owner',AI_STUDIO_MAX_CALLS:'2',AI_STUDIO_ALLOWED_KINDS:'image,video'};
 assert.equal(studioConfig(env).enabled,false);
 assert.equal(studioConfig({...env,BYTEPLUS_API_KEY:'secret'}).catalog.find(m=>m.id==='byteplus-seedream-5-lite').enabled,false);
 const allowed={...env,BYTEPLUS_API_KEY:'secret',AI_STUDIO_ALLOWED_MODELS:'byteplus-seedream-5-lite,byteplus-seedance-2'};
 const c=studioConfig(allowed);assert.equal(c.catalog.find(m=>m.id==='byteplus-seedream-5-lite').enabled,true);
 assert.equal(c.catalog.find(m=>m.id==='byteplus-seedance-2').enabled,false);assert.equal(c.models.find(m=>m.kind==='image').enabled,false);
 assert.ok(!JSON.stringify(c).includes('secret'));
 assert.equal(studioConfig({...allowed,BYTEPLUS_MEDIA_HOSTS:'fixture.tos-ap-southeast-1.bytepluses.com'}).catalog.find(m=>m.id==='byteplus-seedance-2').enabled,true);
 assert.equal(studioConfig({...allowed,BYTEPLUS_MEDIA_HOSTS:'localhost'}).catalog.find(m=>m.id==='byteplus-seedance-2').enabled,false);
});
test('Seedream dispatch preserves ratio and references; one image, no paid retries',async()=>{
 let seen,calls=0;const r=await dispatchGeneration({...req(),references:[{mimeType:'image/png',data:png.toString('base64')}]},{env:{BYTEPLUS_API_KEY:'fixture'},fetcher:async(url,opts)=>{calls++;seen={url,opts};return json({data:[{b64_json:png.toString('base64')}]});}});
 const b=JSON.parse(seen.opts.body);assert.equal(calls,1);assert.equal(b.model,'seedream-5-0-lite-260128');assert.equal(b.size,'2848x1600');assert.equal(b.output_format,'png');assert.equal(b.sequential_image_generation,'disabled');assert.equal(b.response_format,'b64_json');assert.ok(b.image[0].startsWith('data:image/png;base64,'));assert.equal(seen.opts.redirect,'error');assert.equal(r.mime,'image/png');assert.ok(seen.url.endsWith('/images/generations'));
 await assert.rejects(()=>generateBytePlus(req(),{key:'fixture',fetcher:async()=>new Response('',{status:429})}),/PROVIDER_BUSY/);
});
test('Seedream 4.5 does not request unsupported PNG output',async()=>{
 let body;const jpeg=Buffer.from([255,216,255,0]);const r=await generateBytePlus(req('image','byteplus-seedream-4-5'),{key:'fixture',fetcher:async(_,opts)=>{body=JSON.parse(opts.body);return json({data:[{b64_json:jpeg.toString('base64')}]});}});assert.equal(body.output_format,undefined);assert.equal(r.mime,'image/jpeg');
 await assert.rejects(()=>generateBytePlus(req(),{key:'fixture',fetcher:async()=>json({data:[{b64_json:Buffer.from('not media').toString('base64')}]})}),/INVALID_PROVIDER_MEDIA/);
});
test('Seedance task persists provider prefix, fixed approved limits and first frame',async()=>{
 let body;const r=await generateBytePlus({...req('video','byteplus-seedance-2'),videoInputMode:'first_frame',references:[{mimeType:'image/png',data:png.toString('base64')}]},{key:'fixture',fetcher:async(_,opts)=>{body=JSON.parse(opts.body);return json({id:'cgt-fixture'});}});
 assert.equal(r.operation,'byteplus:cgt-fixture');assert.equal(body.model,'dreamina-seedance-2-0-260128');assert.equal(body.duration,5);assert.equal(body.resolution,'720p');assert.equal(body.content[1].role,'first_frame');assert.equal(body.generate_audio,true);
 assert.deepEqual(await dispatchPoll(r.operation,{env:{BYTEPLUS_API_KEY:'fixture'},fetcher:async()=>json({status:'running'})}),{pending:true});
});
test('Seedance accepts supported 1080p and 15-second settings and blocks unsupported combinations',async()=>{
 const advanced=validateGeneration({kind:'video',model:'byteplus-seedance-2',ratio:'16:9',prompt:'Studio reveal',consent:true,references:[],videoResolution:'1080p',videoDuration:15});
 let calls=0,payload;
 const r=await generateBytePlus(advanced,{key:'fixture',fetcher:async(_url,opts)=>{calls++;payload=JSON.parse(opts.body);return json({id:'cgt-resolution-fixture'});}});
 assert.equal(r.operation,'byteplus:cgt-resolution-fixture');
 assert.equal(calls,1);assert.equal(payload.resolution,'1080p');assert.equal(payload.duration,15);
 assert.throws(()=>validateGeneration({...advanced,consent:true,videoResolution:'4k'}),/UNSUPPORTED_VIDEO_RESOLUTION/);
 assert.throws(()=>validateGeneration({...advanced,consent:true,videoDuration:16}),/UNSUPPORTED_VIDEO_DURATION/);
});
test('Seedance first+last and reference-image modes emit exclusive native roles',async()=>{
 const source={mimeType:'image/png',data:png.toString('base64')};
 const prepare=(mode,count)=>validateGeneration({
  kind:'video',model:'byteplus-seedance-2',ratio:'16:9',prompt:'Film this scene',
  consent:true,references:Array.from({length:count},()=>({...source})),videoInputMode:mode
 });
 const submitted=[];
 for(const [mode,count,expected] of [
  ['first_frame',1,['first_frame']],
  ['first_last',2,['first_frame','last_frame']],
  ['reference_image',1,['reference_image']],
  ['reference_image',3,['reference_image','reference_image','reference_image']]
 ]){
  let body;
  await generateBytePlus(prepare(mode,count),{key:'fixture',fetcher:async(_url,options)=>{
   body=JSON.parse(options.body);submitted.push(body);return json({id:'cgt-reference-test'});
  }});
  assert.deepEqual(body.content.filter(c=>c.type==='image_url').map(c=>c.role),expected);
  assert.equal(body.content[0].type,'text');
  assert.equal(body.content.length,count+1);
 }
 assert.equal(submitted.length,4);
 for(const [mode,count] of [['first_last',1],['first_frame',2],['text',1],['reference_image',0]]){
  assert.throws(()=>prepare(mode,count),/INVALID_VIDEO_REFERENCES/);
 }
 assert.throws(()=>validateGeneration({kind:'video',model:'veo-3.1-lite-generate-preview',ratio:'16:9',
  prompt:'Scene',consent:true,references:[source],videoInputMode:'reference_image'}),/UNSUPPORTED_VIDEO_INPUT_MODE/);
});
test('result download requires exact approved HTTPS CDN host; API key never travels to CDN',async()=>{
 const host='fixture.tos-ap-southeast-1.bytepluses.com';let calls=0;
 for(const url of ['http://'+host+'/file','https://evil.test/file','https://127.0.0.1/file','https://'+host+':8443/file','https://secret@'+host+'/file','https://another.bytepluses.com/file'])assert.throws(()=>safeBytePlusMediaUrl(url,host));
 const bytes=Buffer.concat([Buffer.from([0,0,0,16]),Buffer.from('ftypisom'),Buffer.alloc(4)]);
 const r=await pollBytePlus('byteplus:cgt-test',{key:'secret',downloadHosts:host,fetcher:async(url,opts)=>{calls++;if(calls===1){assert.equal(opts.headers.Authorization,'Bearer secret');return json({status:'succeeded',content:{video_url:'https://'+host+'/result.mp4'}});}assert.equal(opts.headers,undefined);assert.equal(opts.redirect,'error');return new Response(bytes);}});
 assert.equal(r.mime,'video/mp4');assert.equal(calls,2);
 await assert.rejects(()=>pollBytePlus('byteplus:cgt-test',{key:'fixture',downloadHosts:host,fetcher:async()=>json({status:'succeeded',content:{video_url:'https://evil.test/file'}})}),/UNSAFE_PROVIDER_URL/);
});
test('failed tasks are terminal, malformed IDs rejected, absent credentials make zero calls',async()=>{
 await assert.rejects(()=>pollBytePlus('byteplus:cgt-test',{key:'fixture',fetcher:async()=>json({status:'expired'})}),e=>e.terminal===true);
 await assert.rejects(()=>pollBytePlus('byteplus:../../evil',{key:'fixture'}),/INVALID_OPERATION/);
 let calls=0;await assert.rejects(()=>generateBytePlus(req(),{fetcher:async()=>{calls++;}}),/PROVIDER_KEY_REQUIRED/);assert.equal(calls,0);
});

test('Seedance accepts supported MP4 major brands without another provider submission',async()=>{
 const host='fixture.tos-ap-southeast-1.bytepluses.com';
 for(const brand of ['isom','mp42','iso6','avc1','M4V ']){
  const bytes=Buffer.concat([Buffer.from([0,0,0,16]),Buffer.from('ftypisom'),Buffer.alloc(4)]);
  bytes.write(brand,8,'ascii');let calls=0;
  const result=await pollBytePlus('byteplus:cgt-test',{key:'fixture',downloadHosts:host,fetcher:async()=>{
   calls++;if(calls===1)return json({status:'succeeded',content:{video_url:'https://'+host+'/result.mp4'}});
   return new Response(bytes);
  }});
  assert.equal(calls,2);assert.equal(result.mime,'video/mp4');assert.deepEqual(result.bytes,bytes);
 }
});

test('Seedance rejects counterfeit ftyp and truncated MP4 results before storage',async()=>{
 const host='fixture.tos-ap-southeast-1.bytepluses.com';
 const good=Buffer.concat([Buffer.from([0,0,0,16]),Buffer.from('ftypisom'),Buffer.alloc(4)]);
 const incorrect=Buffer.from(good);incorrect.writeUInt32BE(128,0);
 const short=Buffer.from([0,0,0,12,102,116,121,112,105,115,111,109]);
 for(const bytes of [incorrect,short,Buffer.from('<html>provider error</html>'),
  ...['avif','mif1','heic','junk'].map(brand=>{const bad=Buffer.from(good);bad.write(brand,8,'ascii');return bad;})]){
  let calls=0;
  await assert.rejects(()=>pollBytePlus('byteplus:known-task',{key:'fixture',downloadHosts:host,fetcher:async()=>{
   calls++;
   if(calls===1)return json({status:'succeeded',content:{video_url:'https://'+host+'/result.mp4'}});
   return new Response(bytes);
  }}),/INVALID_PROVIDER_MEDIA/);
  assert.equal(calls,2);
 }
});
