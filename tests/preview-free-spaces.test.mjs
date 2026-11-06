import test from 'node:test';
import assert from 'node:assert/strict';
import {FREE_SPACE_MODELS,generateTestSpaceMedia} from '../server/preview-free-spaces.js';

const eventId='01234567-89ab-4cde-8fab-0123456789ab';
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(64)]);
const mp4=Buffer.concat([Buffer.from('0000ftypisommoov0000mdat','ascii'),Buffer.alloc(80)]);
const wav=Buffer.alloc(200);wav.write('RIFF');wav.write('WAVE',8);
const samples={image:{mime:'image/png',bytes:png,name:'output.png'},video:{mime:'video/mp4',bytes:mp4,name:'output.mp4'},music:{mime:'audio/wav',bytes:wav,name:'output.wav'}};
function fakeFetcher(kind,{malicious=false,quota=false}={}){
  const host=FREE_SPACE_MODELS[kind].host;
  let requestCount=0;
  const calls=[];
  async function fetcher(url,options){
    calls.push({url,method:options.method||'GET'});
    if(options.method==='POST'){
      requestCount++;
      if(quota)return new Response('no',{status:429});
      return Response.json({event_id:eventId});
    }
    if(url.endsWith('/'+eventId)){
      const output=malicious?'https://attacker.example/private':('https://'+host+'/gradio_api/file='+samples[kind].name);
      return new Response('event: generating\ndata: []\n\nevent: complete\ndata: '+JSON.stringify([{url:output}])+'\n\n',{headers:{'content-type':'text/event-stream'}});
    }
    return new Response(samples[kind].bytes,{headers:{'content-type':samples[kind].mime}});
  }
  return {fetcher,calls,get requestCount(){return requestCount}};
}
for(const kind of ['image','video','music']){
  test('real TEST '+kind+' returns a validated binary and no mocked SVG or tone',async()=>{
    const f=fakeFetcher(kind);
    const result=await generateTestSpaceMedia({kind,model:FREE_SPACE_MODELS[kind].id,prompt:'A calm night sky',consent:true,fetcher:f.fetcher,timeoutMs:5000});
    assert.equal(result.mime,samples[kind].mime);
    assert.deepEqual(result.buffer,samples[kind].bytes);
    assert.equal(f.requestCount,1);
    assert.equal(f.calls.length,3);
    assert.ok(!result.provider.includes('Zero-Spend Safe'));
  });
}
test('bad model rejects without even starting provider request',async()=>{
  const f=fakeFetcher('image');
  await assert.rejects(()=>generateTestSpaceMedia({kind:'image',model:'veo-3.1',prompt:'A quiet beach',consent:true,fetcher:f.fetcher}),/FREE_MODEL_UNAVAILABLE/);
  assert.equal(f.calls.length,0);
});
test('unconsented public sharing rejects before network',async()=>{
  const f=fakeFetcher('image');
  await assert.rejects(()=>generateTestSpaceMedia({kind:'image',model:FREE_SPACE_MODELS.image.id,prompt:'A quiet beach',consent:false,fetcher:f.fetcher}),/FREE_EXTERNAL_CONSENT_REQUIRED/);
  assert.equal(f.calls.length,0);
});
test('private references reject before network',async()=>{
  const f=fakeFetcher('image');
  await assert.rejects(()=>generateTestSpaceMedia({kind:'image',model:FREE_SPACE_MODELS.image.id,prompt:'A quiet beach',consent:true,referenceCount:1,fetcher:f.fetcher}),/FREE_TEXT_ONLY/);
  assert.equal(f.calls.length,0);
});
test('external URL returned by a public Space is blocked to prevent SSRF',async()=>{
  const f=fakeFetcher('image',{malicious:true});
  await assert.rejects(()=>generateTestSpaceMedia({kind:'image',model:FREE_SPACE_MODELS.image.id,prompt:'A quiet beach',consent:true,fetcher:f.fetcher,timeoutMs:5000}),/FREE_INVALID_MEDIA_URL/);
  assert.equal(f.calls.length,2);
});
test('public quota error does not produce fake media',async()=>{
  const f=fakeFetcher('video',{quota:true});
  await assert.rejects(()=>generateTestSpaceMedia({kind:'video',model:FREE_SPACE_MODELS.video.id,prompt:'A quiet beach',consent:true,fetcher:f.fetcher,timeoutMs:5000}),/FREE_PROVIDER_QUOTA_REACHED/);
  assert.equal(f.calls.length,1);
});
test('invalid/short prompt does not start provider work',async()=>{
  const f=fakeFetcher('music');
  await assert.rejects(()=>generateTestSpaceMedia({kind:'music',model:FREE_SPACE_MODELS.music.id,prompt:'x',consent:true,fetcher:f.fetcher}),/FREE_INVALID_PROMPT/);
  assert.equal(f.calls.length,0);
});
