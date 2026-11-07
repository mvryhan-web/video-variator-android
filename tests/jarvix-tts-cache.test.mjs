import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createJarvixTtsCache} from '../server/jarvix-tts-cache.js';
import {installLocalVoice} from '../server/jarvix-local-voice.js';

const wav=Buffer.alloc(64);wav.write('RIFF');wav.write('WAVE',8);
const subject='f'.repeat(64),other='a'.repeat(64);
function routes(env,fetchImpl){const handlers={};installLocalVoice({get:(p,f)=>handlers[p]=f,post:(p,f)=>handlers[p]=f},{env,fetchImpl});return handlers;}
function response(){return {code:200,body:null,headers:{},status(c){this.code=c;return this;},set(a,b){if(typeof a==='string')this.headers[a]=b;return this;},type(a){this.headers.type=a;return this;},append(a,b){this.headers[a]=b;return this;},json(v){this.body=v;return this;},send(v){this.body=v;return this;}};}
const base={JARVIX_VOICE_URL:'https://worker.example',JARVIX_VOICE_TOKEN:'test-token-'.repeat(4)};
async function inTemp(fn){const d=await mkdtemp(join(tmpdir(),'jarvix-cache-'));try{return await fn(d);}finally{await rm(d,{recursive:true,force:true});}}

test('private cache uses deterministic text/language/voice/visitor hash and verified WAV',async()=>inTemp(async d=>{
 const config={JARVIX_TTS_CACHE_ENABLED:'true',JARVIX_TTS_CACHE_DIR:d,JARVIX_TTS_VOICE_PROFILE:'owner-v1'};
 const cache=createJarvixTtsCache(config);
 assert.equal(cache.filename('ЁЖ','ru',subject),cache.filename('ёж','ru',subject));
 assert.notEqual(cache.filename('ёж','ru',subject),cache.filename('ёж','ru',other));
 assert.notEqual(cache.filename('ёж','ru',subject),cache.filename('ёж','en',subject));
 assert.notEqual(cache.filename('ёж','ru',subject),createJarvixTtsCache({...config,JARVIX_TTS_VOICE_PROFILE:'owner-v2'}).filename('ёж','ru',subject));
 assert.match(cache.filename('ёж','ru',subject),/^dyn_ru_[a-f0-9]{16}\.wav$/);
 assert.equal(await cache.read('ЁЖ','ru',subject),null);
 await cache.write('ЁЖ','ru',subject,wav);
 assert.deepEqual(await cache.read('ёж','ru',subject),wav);
 assert.deepEqual(await createJarvixTtsCache(config).read('ёж','ru',subject),wav);
 assert.equal(await cache.read('ёж','ru',other),null);
 await assert.rejects(cache.write('bad','en',subject,Buffer.from('not wav')),/INVALID_TTS_CACHE_WAV/);
}));

test('cache is opt-in and forbids directly public paths under static assets',()=>{
 assert.equal(createJarvixTtsCache({}).enabled,false);
 assert.throws(()=>createJarvixTtsCache({JARVIX_TTS_CACHE_ENABLED:'true',JARVIX_TTS_CACHE_DIR:resolve('app/src/main/assets/media/jarvix/clips/cache'),JARVIX_TTS_VOICE_PROFILE:'v1'}),/PUBLIC_DIRECTORY_FORBIDDEN/);
});

test('POST TTS writes once and survives server restart without contacting owner worker',async()=>inTemp(async d=>{
 const env={...base,JARVIX_TTS_CACHE_ENABLED:'true',JARVIX_TTS_CACHE_DIR:d,JARVIX_TTS_VOICE_PROFILE:'v1'};
 let calls=0;
 const h=routes(env,async()=>{calls++;return new Response(wav,{headers:{'content-type':'audio/wav'}});});
 const first=response();await h['/api/jarvix/tts']({headers:{},body:{text:'Привет',language:'ru'}},first);
 assert.equal(calls,1);assert.equal(first.code,200);assert.deepEqual(first.body,wav);
 const cookie=first.headers['Set-Cookie'].split(';')[0];
 const restarted=routes(env,async()=>{throw Error('Worker must not be called');});
 const hit=response();await restarted['/api/jarvix/tts']({headers:{cookie},body:{text:'Привет',language:'ru'}},hit);
 assert.equal(hit.code,200);assert.equal(hit.headers['X-Jarvix-Audio-Source'],'persistent-cache');assert.deepEqual(hit.body,wav);
 const anotherVisitor=response();await restarted['/api/jarvix/tts']({headers:{},body:{text:'Привет',language:'ru'}},anotherVisitor);
 assert.equal(anotherVisitor.code,503);
}));

test('20 simultaneous identical private requests share one synth; different text is rate-limited',async()=>inTemp(async d=>{
 const env={...base,JARVIX_TTS_CACHE_ENABLED:'true',JARVIX_TTS_CACHE_DIR:d,JARVIX_TTS_VOICE_PROFILE:'v1'};
 let calls=0,release;
 const h=routes(env,async()=>{calls++;await new Promise(r=>release=r);return new Response(wav,{headers:{'content-type':'audio/wav'}});});
 const cookie='ds_jarvix_visitor=00000000-0000-4000-8000-000000000001';
 const requests=Array.from({length:20},()=>{
  const r=response();return h['/api/jarvix/tts']({headers:{cookie},body:{text:'Hello',language:'en'}},r).then(()=>r);
 });
 for(let i=0;i<20&&!release;i++)await new Promise(r=>setImmediate(r));
 const different=response();await h['/api/jarvix/tts']({headers:{cookie},body:{text:'Different',language:'en'}},different);
 assert.equal(different.code,429);release();
 const result=await Promise.all(requests);
 assert.equal(calls,1);assert.ok(result.every(r=>r.code===200));
}));

test('bounded cache evicts dynamic files but never bundled static clips',async()=>inTemp(async d=>{
 const env={JARVIX_TTS_CACHE_ENABLED:'true',JARVIX_TTS_CACHE_DIR:d,JARVIX_TTS_VOICE_PROFILE:'v1',JARVIX_TTS_CACHE_MAX_BYTES:'100'};
 const cache=createJarvixTtsCache(env);
 await cache.write('first','en',subject,wav);
 await cache.write('second','en',subject,wav);
 assert.equal(await cache.read('first','en',subject),null);
 assert.deepEqual(await cache.read('second','en',subject),wav);
}));
