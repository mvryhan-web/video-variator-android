import test from 'node:test';
import assert from 'node:assert/strict';
import {objectStorageConfig,createObjectStorage} from '../server/generation-storage.js';

const env={
 AI_OBJECT_STORAGE_ENABLED:'true',
 AI_OBJECT_STORAGE_ENDPOINT:'https://objects.example.test',
 AI_OBJECT_STORAGE_BUCKET:'deepsyq-media',
 AI_OBJECT_STORAGE_REGION:'auto',
 AI_OBJECT_STORAGE_ACCESS_KEY_ID:'ACCESSKEY123',
 AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:'very-secret-storage-key-12345',
 AI_OBJECT_STORAGE_PREFIX:'deepsyq'
};

test('object storage stays disabled unless complete HTTPS config is present',()=>{
 assert.equal(objectStorageConfig({}).configured,false);
 assert.equal(objectStorageConfig({...env,AI_OBJECT_STORAGE_ENDPOINT:'http://objects.example.test'}).configured,false);
 assert.equal(objectStorageConfig({...env,AI_OBJECT_STORAGE_BUCKET:'BAD_BUCKET'}).configured,false);
 assert.equal(objectStorageConfig(env).configured,true);
});

test('storage signs server-side PUT and never exposes secret in URL',async()=>{
 let seen;
 const storage=createObjectStorage({env,now:()=>new Date('2026-10-15T09:00:00.000Z'),fetcher:async(url,opts)=>{seen={url,opts};return {ok:true};}});
 const asset=await storage.putGeneration({userId:'user@example.test',jobId:'123e4567-e89b-12d3-a456-426614174000',mime:'image/png',bytes:Buffer.from('png-bytes')});
 assert.equal(asset.storage,'s3');assert.equal(asset.mime,'image/png');assert.equal(asset.size,9);
 assert.match(asset.key,/^deepsyq\/users\/[a-f0-9]{24}\/123e4567-e89b-12d3-a456-426614174000\.png$/);
 assert.equal(seen.opts.method,'PUT');assert.equal(seen.opts.redirect,'error');assert.match(seen.opts.headers.Authorization,/AWS4-HMAC-SHA256 Credential=ACCESSKEY123\//);
 assert.ok(!seen.url.includes(env.AI_OBJECT_STORAGE_SECRET_ACCESS_KEY));assert.ok(!JSON.stringify(seen.opts.headers).includes(env.AI_OBJECT_STORAGE_SECRET_ACCESS_KEY));
});

test('storage GET enforces maximum response size and DELETE is signed',async()=>{
 const calls=[];
 const stream=bytes=>new ReadableStream({start(c){c.enqueue(bytes);c.close();}});
 const storage=createObjectStorage({env,fetcher:async(url,opts)=>{calls.push({url,opts});if(opts.method==='GET')return {ok:true,body:stream(new Uint8Array([1,2,3]))};return {ok:true};}});
 const bytes=await storage.get('deepsyq/users/abc/file.png',{maxBytes:4});assert.deepEqual([...bytes],[1,2,3]);
 await storage.delete('deepsyq/users/abc/file.png');assert.deepEqual(calls.map(x=>x.opts.method),['GET','DELETE']);
});
