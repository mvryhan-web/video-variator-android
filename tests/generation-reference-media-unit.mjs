import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectStudioReferenceMedia} from '../server/generation-reference-media.js';
import {createObjectStorage} from '../server/generation-storage.js';

function box(type,bytes=Buffer.alloc(0)){
 const header=Buffer.alloc(8);header.writeUInt32BE(bytes.length+8,0);header.write(type,4,'ascii');
 return Buffer.concat([header,bytes]);
}
function video({durationSeconds=5,hasVideo=true}={}){
 const brand=Buffer.alloc(8);brand.write('isom',0);brand.writeUInt32BE(0,4);
 const mvhd=Buffer.alloc(20);mvhd.writeUInt32BE(1000,12);mvhd.writeUInt32BE(durationSeconds*1000,16);
 const hdlr=Buffer.alloc(12);hdlr.write(hasVideo?'vide':'soun',8);
 const track=box('trak',box('mdia',box('hdlr',hdlr)));
 return Buffer.concat([box('ftyp',brand),box('moov',Buffer.concat([box('mvhd',mvhd),track])),box('mdat',Buffer.from([0,1,2,3]))]);
}
function audio({sampleRate=8000,seconds=1}={}){
 const bytes=Buffer.alloc(sampleRate*2*seconds),fmt=Buffer.alloc(16);
 fmt.writeUInt16LE(1,0);fmt.writeUInt16LE(1,2);fmt.writeUInt32LE(sampleRate,4);
 fmt.writeUInt32LE(sampleRate*2,8);fmt.writeUInt16LE(2,12);fmt.writeUInt16LE(16,14);
 const riff=Buffer.concat([Buffer.from('WAVE'),Buffer.from('fmt '),Buffer.from([16,0,0,0]),fmt,
  Buffer.from('data'),Buffer.from([bytes.length&255,(bytes.length>>8)&255,(bytes.length>>16)&255,(bytes.length>>24)&255]),bytes]);
 const header=Buffer.alloc(8);header.write('RIFF',0);header.writeUInt32LE(riff.length,4);
 return Buffer.concat([header,riff]);
}

test('reference media preflight recognizes bounded real MP4 structure and PCM WAV only',()=>{
 const v=inspectStudioReferenceMedia({bytes:video(),mime:'video/mp4'});
 assert.equal(v.kind,'video');assert.equal(v.durationSeconds,5);assert.equal(v.extension,'mp4');
 const a=inspectStudioReferenceMedia({bytes:audio(),mime:'audio/wav'});
 assert.equal(a.kind,'audio');assert.equal(a.durationSeconds,1);assert.equal(a.extension,'wav');
});
test('reference preflight rejects mime spoof, broken boxes, absent video track and excessive duration',()=>{
 assert.throws(()=>inspectStudioReferenceMedia({bytes:video(),mime:'audio/wav'}),/REFERENCE_MEDIA_INVALID/);
 assert.throws(()=>inspectStudioReferenceMedia({bytes:audio(),mime:'video/mp4'}),/REFERENCE_MEDIA_INVALID/);
 assert.throws(()=>inspectStudioReferenceMedia({bytes:video({hasVideo:false}),mime:'video/mp4'}),/REFERENCE_MEDIA_INVALID/);
 assert.throws(()=>inspectStudioReferenceMedia({bytes:video({durationSeconds:31}),mime:'video/mp4'}),/REFERENCE_MEDIA_INVALID/);
 const damaged=video();damaged.writeUInt32BE(0x7fffffff,0);
 assert.throws(()=>inspectStudioReferenceMedia({bytes:damaged,mime:'video/mp4'}),/REFERENCE_MEDIA_INVALID/);
 assert.throws(()=>inspectStudioReferenceMedia({bytes:Buffer.from('fake-mp3'),mime:'audio/mpeg'}),/REFERENCE_MEDIA_INVALID/);
 assert.throws(()=>inspectStudioReferenceMedia({bytes:Buffer.alloc(20*1024*1024+1),mime:'video/mp4'}),/REFERENCE_MEDIA_INVALID/);
 assert.throws(()=>inspectStudioReferenceMedia({bytes:audio({seconds:61}),mime:'audio/wav'}),/REFERENCE_MEDIA_INVALID/);
});

const env={
 AI_OBJECT_STORAGE_ENABLED:'true',
 AI_OBJECT_STORAGE_ENDPOINT:'https://objects.example.test',
 AI_OBJECT_STORAGE_BUCKET:'deepsyq-media',
 AI_OBJECT_STORAGE_REGION:'auto',
 AI_OBJECT_STORAGE_ACCESS_KEY_ID:'ACCESSKEY123',
 AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:'very-secret-storage-key-12345',
 AI_OBJECT_STORAGE_PREFIX:'deepsyq'
};
test('private staging remains OFF even when output-object storage is available',async()=>{
 const storage=createObjectStorage({env,fetcher:async()=>{throw Error('Should not access storage');}});
 await assert.rejects(()=>storage.putStagedReference({userId:'a',mime:'video/mp4',bytes:video()}),/REFERENCE_STAGING_DISABLED/);
 await assert.rejects(()=>storage.getStagedReference({userId:'a',key:'bad',mime:'video/mp4'}),/REFERENCE_STAGING_DISABLED/);
});
test('opt-in private staging signs user-scoped PUT/GET/DELETE, never provides provider URL',async()=>{
 const objects=new Map(),calls=[];
 const storage=createObjectStorage({env:{...env,AI_STUDIO_REFERENCE_STAGING_ENABLED:'true',AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true'},fetcher:async(url,opts)=>{
  calls.push({url,method:opts.method,headers:opts.headers});
  if(opts.method==='PUT'){objects.set(url,Buffer.from(opts.body));return {ok:true};}
  if(opts.method==='DELETE'){objects.delete(url);return {ok:true};}
  const bytes=objects.get(url);
  if(!bytes)return {ok:false};
  return {ok:true,body:new ReadableStream({start(c){c.enqueue(new Uint8Array(bytes));c.close();}})};
 }});
 const bytes=video();
 const stored=await storage.putStagedReference({userId:'user-one',mime:'video/mp4',bytes});
 assert.match(stored.key,/^deepsyq\/references\/users\/[a-f0-9]{24}\/[0-9a-f-]{36}\.mp4$/);
 assert.equal(stored.durationSeconds,5);
 assert.equal(stored.url,undefined);assert.equal(stored.providerUrl,undefined);
 assert.deepEqual(await storage.getStagedReference({userId:'user-one',key:stored.key,mime:'video/mp4'}),bytes);
 await assert.rejects(()=>storage.getStagedReference({userId:'user-two',key:stored.key,mime:'video/mp4'}),/REFERENCE_MEDIA_ACCESS_DENIED/);
 await assert.rejects(()=>storage.deleteStagedReference({userId:'user-two',key:stored.key}),/REFERENCE_MEDIA_ACCESS_DENIED/);
 assert.equal(await storage.deleteStagedReference({userId:'user-one',key:stored.key}),true);
 assert.deepEqual(calls.map(c=>c.method),['PUT','GET','DELETE']);
 assert.ok(calls.every(c=>!c.url.includes('very-secret-storage-key')));
 assert.ok(calls.every(c=>!!c.headers.Authorization));
});

test('cleanup-only storage deletes old references after intake is switched off',async()=>{
 const objects=new Map(),calls=[];
 const activeEnv={...env,AI_STUDIO_REFERENCE_STAGING_ENABLED:'true',AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true'};
 const fetcher=async(url,opts)=>{
  calls.push(opts.method);
  if(opts.method==='PUT'){objects.set(url,Buffer.from(opts.body));return {ok:true};}
  if(opts.method==='DELETE'){objects.delete(url);return {ok:true};}
  throw Error('Unexpected media download');
 };
 const staged=createObjectStorage({env:activeEnv,fetcher});
 const asset=await staged.putStagedReference({userId:'alice',mime:'video/mp4',bytes:video()});
 const cleanup=createObjectStorage({env:{...env,AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true'},fetcher});
 await assert.rejects(()=>cleanup.putStagedReference({userId:'alice',mime:'video/mp4',bytes:video()}),/REFERENCE_STAGING_DISABLED/);
 await assert.rejects(()=>cleanup.getStagedReference({userId:'alice',key:asset.key,mime:'video/mp4'}),/REFERENCE_STAGING_DISABLED/);
 assert.equal(await cleanup.deleteStagedReference({userId:'alice',key:asset.key}),true);
 assert.equal(objects.size,0);
 assert.deepEqual(calls,['PUT','DELETE']);
});
