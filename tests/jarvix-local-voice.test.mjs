import test from 'node:test';
import assert from 'node:assert/strict';
import {installLocalVoice} from '../server/jarvix-local-voice.js';
import {speakOwnerSpeech,stopOwnerSpeech,unlockOwnerSpeech} from '../app/src/main/assets/jarvix-owner-speech.js';
function routes(options){const handlers={};installLocalVoice({get:(p,f)=>handlers[p]=f,post:(p,f)=>handlers[p]=f},options);return handlers;}
function response(){return {code:200,body:null,status(c){this.code=c;return this;},set(){return this;},type(){return this;},json(b){this.body=b;return this;},send(b){this.body=b;return this;}};}
const env={JARVIX_VOICE_URL:'https://worker.example',JARVIX_VOICE_TOKEN:'test-token-'.repeat(4)};
test('not configured never claims speech model ready',async()=>{
 const h=routes({env:{}}),r=response();await h['/api/jarvix/voice-config']({},r);assert.equal(r.body.configured,false);assert.equal(r.body.speechModelInstalled,false);
 await h['/api/jarvix/tts']({body:{},headers:{}},r);assert.equal(r.code,503);
});
test('four languages proxy authenticated WAV without returning key or accepting caller references',async()=>{
 const wav=Buffer.alloc(46);wav.write('RIFF');wav.write('WAVE',8);
 const h=routes({env,fetchImpl:async(url,opts)=>{
  assert.equal(opts.headers.Authorization,'Bearer '+env.JARVIX_VOICE_TOKEN);
  if(url.endsWith('health'))return Response.json({ready:true,engine:'VoxCPM2'});
  const b=JSON.parse(opts.body);assert.deepEqual(Object.keys(b).sort(),['language','text']);
  return new Response(wav,{headers:{'Content-Type':'audio/wav'}});
 }});
 const status=response();await h['/api/jarvix/voice-config']({},status);assert.equal(status.body.speechModelInstalled,true);assert.ok(!JSON.stringify(status.body).includes(env.JARVIX_VOICE_TOKEN));
 for(const language of ['ru','en','fr','es']){
  const r=response();await h['/api/jarvix/tts']({headers:{},body:{text:'Hello',language,reference:'anything'}},r);assert.equal(r.code,200);assert.deepEqual(r.body,wav);
 }
 const invalid=response();await h['/api/jarvix/tts']({headers:{},body:{text:'x'.repeat(301),language:'ru'}},invalid);assert.equal(invalid.code,400);
});
test('worker failure is unavailable and does not leak credentials',async()=>{
 const h=routes({env,fetchImpl:async()=>{throw Error(env.JARVIX_VOICE_TOKEN);}}),r=response();await h['/api/jarvix/tts']({headers:{},body:{text:'Hello',language:'en'}},r);assert.equal(r.code,503);assert.ok(!JSON.stringify(r.body).includes(env.JARVIX_VOICE_TOKEN));
});
test('Stop during pending config prevents late playback or completion',async()=>{
 const previous=global.fetch;let release,called=0;
 global.fetch=()=>new Promise(r=>release=r);
 try{const task=speakOwnerSpeech('Hello','en',{start:()=>called++,fallback:()=>called++,complete:()=>called++,error:()=>called++});stopOwnerSpeech();release(Response.json({configured:true,speechModelInstalled:true}));await task;assert.equal(called,0);}finally{global.fetch=previous;}
});
test('configured but unavailable worker never silently substitutes a browser voice',async()=>{
 const previous=global.fetch;global.fetch=async()=>Response.json({configured:true,speechModelInstalled:false});let fallback=0,error=0;
 try{await speakOwnerSpeech('Hello','en',{fallback:()=>fallback++,start(){},complete(){},error:()=>error++});assert.equal(fallback,0);assert.equal(error,1);}finally{global.fetch=previous;stopOwnerSpeech();}
});

test('gesture unlock precedes network and Web Audio plays returned speech',async()=>{
 const previousFetch=global.fetch, previousContext=global.AudioContext;
 const events=[];
 global.AudioContext=class {
  state='suspended'; destination={};
  resume(){events.push('resume');this.state='running';return Promise.resolve();}
  decodeAudioData(){events.push('decode');return Promise.resolve({});}
  createBufferSource(){return {connect(){},disconnect(){},stop(){},start(){events.push('play');queueMicrotask(()=>this.onended());}};}
 };
 global.fetch=async url=>{events.push('fetch');return url.endsWith('voice-config')?Response.json({configured:true,speechModelInstalled:true}):new Response('wav',{headers:{'content-type':'audio/wav'}});};
 try {
  unlockOwnerSpeech();
  await speakOwnerSpeech('Hello','en',{start(){},fallback(){assert.fail('fallback');},error(){assert.fail('error');},complete(){events.push('complete');}});
  assert.equal(events[0],'resume');assert.ok(events.includes('play'));assert.equal(events.at(-1),'complete');
 }finally{stopOwnerSpeech();global.fetch=previousFetch;global.AudioContext=previousContext;}
});

test('cached public greeting plays with zero health or TTS worker calls',async()=>{
 const previousFetch=global.fetch, previousAudio=global.Audio;
 const module=await import('../app/src/main/assets/jarvix-owner-speech.js?cache-test');
 const requests=[];let completed=0;
 global.fetch=async url=>{requests.push(url);assert.equal(url,'/media/jarvix/owner-greetings.json');return Response.json({languages:{ru:{text:module.OWNER_GREETING_TEXT.ru,mime:'audio/mpeg',audio:Buffer.from('test audio').toString('base64')}}});};
 global.Audio=class{play(){queueMicrotask(()=>this.onended());return Promise.resolve();}pause(){}};
 try{
  await module.prepareOwnerGreetings();
  await module.speakOwnerSpeech(module.OWNER_GREETING_TEXT.ru,'ru',{start(){},complete(){completed++;},fallback(){assert.fail('fallback');},error(){assert.fail('error');}});
  assert.equal(completed,1);assert.equal(requests.length,1);
 }finally{module.stopOwnerSpeech();global.fetch=previousFetch;global.Audio=previousAudio;}
});
