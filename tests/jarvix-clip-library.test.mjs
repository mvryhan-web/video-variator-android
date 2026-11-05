import test from 'node:test';
import assert from 'node:assert/strict';
import {createClipLibrary} from '../app/src/main/assets/jarvix-clip-library.js';
const clip={id:'jarvix_ru_12',language:'ru',text:'Переходим в раздел тарифов и подписок.',url:'/media/jarvix/clips/jarvix_ru_12.mp3?v=abcdef123456'};
test('only actual manifest entries play; whitespace normalization does not invent claims',async()=>{
 const calls=[];const lib=createClipLibrary(async url=>{calls.push(url);return url.endsWith('manifest.json')?Response.json({clips:[clip]}):new Response('audio',{headers:{'content-type':'audio/mpeg'}});});
 assert.ok(await lib.get('  Переходим   в раздел тарифов и подписок. ','ru'));
 assert.equal(await lib.get(clip.text,'en'),null);
 assert.equal(await lib.get('Ваш проект успешно сохранен.','ru'),null);
 assert.equal(calls.filter(url=>url.includes('.mp3')).length,1);
});
test('empty/missing clips, cross-language IDs and external URLs never play',async()=>{
 for(const item of [{...clip,url:'https://evil.example/voice.mp3'},{...clip,id:'jarvix_en_12'}, {...clip,url:'/media/jarvix/clips/../../voice-token.txt'}]){
  let calls=0;const lib=createClipLibrary(async()=>{calls++;return Response.json({clips:[item]});});assert.equal(await lib.get(clip.text,'ru'),null);assert.equal(calls,1);
 }
 const missing=createClipLibrary(async url=>url.endsWith('manifest.json')?Response.json({clips:[clip]}):new Response('',{status:404}));assert.equal(await missing.get(clip.text,'ru'),null);
});
test('stopped speech does not fetch an audio clip after delayed manifest arrives',async()=>{
 let finish;let calls=0;const lib=createClipLibrary(()=>{calls++;return new Promise(resolve=>finish=resolve);});const controller=new AbortController();const result=lib.get(clip.text,'ru',controller.signal);controller.abort();finish(Response.json({clips:[clip]}));assert.equal(await result,null);assert.equal(calls,1);
});

test('preloading warms only common replies in the requested locale and reuses audio',async()=>{
 const calls=[];
 const common={...clip,id:'jarvix_ru_37',text:'Слушаю.',url:'/media/jarvix/clips/jarvix_ru_37.mp3'};
 const lib=createClipLibrary(async url=>{calls.push(url);return url.endsWith('manifest.json')?Response.json({clips:[clip,common,{...common,id:'jarvix_en_37',language:'en',url:'/media/jarvix/clips/jarvix_en_37.mp3'}]}):new Response('audio',{headers:{'content-type':'audio/mpeg'}});});
 await lib.preload('ru');
 assert.deepEqual(calls,['/media/jarvix/clips/manifest.json',common.url]);
 assert.ok(await lib.get(common.text,'ru'));
 assert.equal(calls.length,2);
});

test('navigation replies match target page and language without claiming a finished generation',async()=>{
 const {navigationReply}=await import('../app/src/main/assets/jarvix-navigation-reply.js');
 assert.equal(navigationReply('/pricing.html','en'),'Navigating to plans and subscriptions.');
 assert.equal(navigationReply('/pricing.html','ru'),'Переходим в раздел тарифов и подписок.');
 assert.equal(navigationReply('/generate-studio.html?studio=image','es'),'Abriendo el Estudio de generación.');
 assert.equal(navigationReply('/unknown.html','fr'),'C’est fait.');
});
