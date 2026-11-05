import test from 'node:test';
import assert from 'node:assert/strict';

test('new text uses a known male browser voice without health or GPU requests; recording still wins',async()=>{
 const previousFetch=global.fetch,previousAudio=global.Audio;
 const requests=[],events=[];
 global.fetch=async url=>{
  requests.push(url);
  if(url.endsWith('manifest.json'))return Response.json({clips:[{id:'jarvix_ru_37',language:'ru',text:'Слушаю вас.',url:'/media/jarvix/clips/jarvix_ru_37.mp3'}]});
  assert.equal(url,'/media/jarvix/clips/jarvix_ru_37.mp3');
  return new Response('audio',{headers:{'content-type':'audio/mpeg'}});
 };
 global.Audio=class{play(){queueMicrotask(()=>this.onended());return Promise.resolve();}pause(){}};
 const {speakOwnerSpeech,stopOwnerSpeech}=await import('../app/src/main/assets/jarvix-owner-speech.js');
 const hooks={browserAvailable:()=>true,fallback:()=>events.push('browser'),source:s=>events.push(s),start(){},complete:()=>events.push('complete'),error:()=>assert.fail('speech error')};
 try{
  await speakOwnerSpeech('Новый ответ, которого нет в каталоге.','ru',hooks);
  assert.deepEqual(events,['browser-male','browser']);
  assert.equal(requests.length,1);
  events.length=0;
  await speakOwnerSpeech('Слушаю вас.','ru',hooks);
  assert.deepEqual(events,['static-clip','complete']);
  assert.ok(!requests.some(url=>url.startsWith('/api/')));
 }finally{stopOwnerSpeech();global.fetch=previousFetch;global.Audio=previousAudio;}
});
