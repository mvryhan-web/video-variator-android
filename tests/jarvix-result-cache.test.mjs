import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadResult,mediaExtension} from '../app/src/main/assets/jarvix-result-cache.js';
const origin='https://test.example';
test('completed result survives persistence without its original server',async()=>{
 const resultFile=await downloadResult('/api/studio/jobs/demo-1/media',{origin,kind:'audio',fetcher:async()=>new Response(new Blob(['RIFF-test'],{type:'audio/wav'}))});
 const restored=structuredClone({resultFile});
 assert.equal(await restored.resultFile.text(),'RIFF-test');assert.equal(mediaExtension(restored.resultFile.type),'wav');
});
test('rejects external URLs, expired results and mismatched media',async()=>{
 await assert.rejects(downloadResult('https://other.example/api/studio/jobs/a/media',{origin,kind:'video'}),/Unsafe/);
 await assert.rejects(downloadResult('/api/studio/jobs/a/media',{origin,kind:'video',fetcher:async()=>new Response('',{status:404})}),/no longer/);
 await assert.rejects(downloadResult('/api/studio/jobs/a/media',{origin,kind:'video',fetcher:async()=>new Response(new Blob(['svg'],{type:'image/svg+xml'}))}),/Invalid/);
});
