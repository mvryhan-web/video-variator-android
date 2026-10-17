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
 let body;const r=await generateBytePlus({...req('video','byteplus-seedance-2'),references:[{mimeType:'image/png',data:png.toString('base64')}]},{key:'fixture',fetcher:async(_,opts)=>{body=JSON.parse(opts.body);return json({id:'cgt-fixture'});}});
 assert.equal(r.operation,'byteplus:cgt-fixture');assert.equal(body.model,'dreamina-seedance-2-0-260128');assert.equal(body.duration,5);assert.equal(body.resolution,'720p');assert.equal(body.content[1].role,'first_frame');assert.equal(body.generate_audio,true);
 assert.deepEqual(await dispatchPoll(r.operation,{env:{BYTEPLUS_API_KEY:'fixture'},fetcher:async()=>json({status:'running'})}),{pending:true});
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
