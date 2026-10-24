import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {bundlePath,publicationPlan,publishOwnerMedia} from '../scripts/publish-owner-home-media.mjs';
import {validateInspiration} from '../server/generation-inspiration.js';
const bundle=JSON.parse(await readFile(bundlePath));

test('owner media: seven exact silent 1080p MP4s decode, hashes and six ordered carousel slots',async()=>{
 assert.equal(bundle.items.length,7);assert.equal(bundle.carouselOrder.length,6);
 assert.deepEqual(bundle.items.filter(x=>x.featured).map(x=>x.title),['Close-up woman','Futuristic portal','Underwater woman','Neon motorcycle','Whale among the clouds','Golden forest']);
 for(const item of bundle.items){
  assert.equal(item.active,false);assert.equal(item.rightsNote,'');
  const path=new URL('../app/src/main/assets'+item.previewUrl,import.meta.url);
  const bytes=await readFile(path);assert.equal(bytes.length,item.sizeBytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
  const probe=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.pathname],{encoding:'utf8'});assert.equal(probe.status,0);
  const meta=JSON.parse(probe.stdout);assert.equal(meta.streams.length,1);
  const v=meta.streams[0];assert.equal(v.codec_name,'h264');assert.equal(v.width,1920);assert.equal(v.height,1080);assert.equal(v.pix_fmt,'yuv420p');assert.equal(v.r_frame_rate,'24/1');
  assert.ok(Number(meta.format.duration)>7.9&&Number(meta.format.duration)<=8.1);
  assert.ok(Math.abs(Number(v.duration)-item.durationSeconds)<0.000001,'manifest EOF must match the actual video stream within one microsecond');
  const decode=spawnSync('ffmpeg',['-v','error','-i',path.pathname,'-f','null','-'],{encoding:'utf8'});assert.equal(decode.status,0);assert.equal(decode.stderr,'');
  assert.ok(bytes.indexOf(Buffer.from('moov'))<bytes.indexOf(Buffer.from('mdat')),'faststart');
  const poster=await readFile(new URL('../app/src/main/assets'+item.previewPosterUrl,import.meta.url));assert.ok(poster.length>1000);
 }
});
test('owner media: existing schema accepts payload; red gown stays V02, lake unfeatured not deleted, image preserved',()=>{
 const existing=[{id:'girl',slug:bundle.items[0].slug},{id:'lake',slug:'purple-lake',kind:'video',actionTarget:'studio',featured:true},{id:'butterfly',slug:'butterfly',kind:'image',actionTarget:'studio',featured:true}];
 const ops=publicationPlan(bundle,existing,'Owner attestation pending real approval');
 assert.equal(ops[0].method,'PATCH');assert.equal(ops.length,8);assert.equal(ops.at(-1).slug,'purple-lake');assert.deepEqual(ops.at(-1).payload,{featured:false});
 assert.equal(ops.some(x=>x.slug==='butterfly'),false);
 for(const op of ops.slice(0,7))validateInspiration(op.payload);
 assert.equal(ops[6].payload.featured,false);assert.equal(ops[6].payload.defaultSettings.ownerSceneId,'V02');
});
test('owner media: no network call before both approvals and owner session; corrupt order rejects',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw Error('UNEXPECTED_NETWORK');};
 for(const env of [{},{OWNER_MEDIA_RIGHTS_CONFIRMED:'true'},{OWNER_MEDIA_RIGHTS_CONFIRMED:'true',OWNER_MEDIA_PUBLISH_APPROVED:'true',OWNER_MEDIA_RIGHTS_NOTE:'Owner approved usage'}])await assert.rejects(publishOwnerMedia({bundle,origin:'https://example.com',env,fetchImpl}));
 assert.equal(calls,0);
 const wrong=structuredClone(bundle);wrong.carouselOrder.reverse();assert.throws(()=>publicationPlan(wrong),/ORDER/);
 assert.throws(()=>publicationPlan(bundle,[{slug:bundle.items[0].slug},{slug:bundle.items[0].slug}]),/DUPLICATE/);
});
test('owner media: unavailable source aborts before admin writes',async()=>{
 let writes=0;const env={OWNER_MEDIA_RIGHTS_CONFIRMED:'true',OWNER_MEDIA_PUBLISH_APPROVED:'true',OWNER_MEDIA_RIGHTS_NOTE:'Fixture only; not a real rights attestation',OWNER_MEDIA_ADMIN_TOKEN:'test-only'};
 await assert.rejects(publishOwnerMedia({bundle,origin:'https://example.com',env,fetchImpl:async(_url,options)=>{if(options?.method)writes++;return new Response('',{status:404});}}),/MEDIA_NOT_DEPLOYED/);assert.equal(writes,0);
});
test('owner media: existing API mocked apply is idempotent, verifies order and never forwards owner token to static files',async()=>{
 const records=[{id:'lake',slug:'old-lake',kind:'video',actionTarget:'studio',featured:true,sortOrder:0}];let posts=0;
 const env={OWNER_MEDIA_RIGHTS_CONFIRMED:'true',OWNER_MEDIA_PUBLISH_APPROVED:'true',OWNER_MEDIA_RIGHTS_NOTE:'TEST FIXTURE ONLY. Not real owner commercial-rights approval.',OWNER_MEDIA_ADMIN_TOKEN:'fixture-only-not-a-secret'};
 const fetchImpl=async(url,options={})=>{
  const u=new URL(url);
  if(u.pathname.startsWith('/media/')){
   assert.equal(options.headers,undefined);
   const bytes=await readFile(new URL('../app/src/main/assets'+u.pathname,import.meta.url));
   return new Response(bytes,{headers:{'content-type':u.pathname.endsWith('.mp4')?'video/mp4':'image/jpeg'}});
  }
  if(u.pathname==='/api/inspiration')return Response.json({items:records.filter(x=>x.featured&&x.kind==='video').sort((a,b)=>a.sortOrder-b.sortOrder)});
  assert.equal(options.headers.Authorization,'Bearer fixture-only-not-a-secret');
  if(!options.method)return Response.json({items:records});
  const payload=JSON.parse(options.body);
  if(options.method==='POST'){posts++;const item={id:'id-'+posts,...payload};records.push(item);return Response.json({item});}
  const id=decodeURIComponent(u.pathname.split('/').at(-1));const item=records.find(x=>x.id===id);assert.ok(item);Object.assign(item,payload);return Response.json({item});
 };
 assert.equal((await publishOwnerMedia({bundle,origin:'https://example.com',env,fetchImpl})).published,7);
 assert.equal(posts,7);await publishOwnerMedia({bundle,origin:'https://example.com',env,fetchImpl});assert.equal(posts,7);
 assert.equal(records.find(x=>x.id==='lake').featured,false);
 assert.equal(records.find(x=>x.slug==='owner-v02-red-gown').featured,false);
});
