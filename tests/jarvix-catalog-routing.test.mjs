import assert from 'node:assert/strict';
import {selectCatalogReply, createClipLibrary} from '../app/src/main/assets/jarvix-clip-library.js';
const entries = ['ru','en','fr','es'].flatMap(language => [51,52,53,54,55,56,57,58,59,61,64,67].map(id => ({id:`jarvix_${language}_${id}`,language,text:`reply ${language} ${id}`,url:`/media/jarvix/clips/jarvix_${language}_${id}.mp3`})));
for (const [lang,query,id] of [
  ['ru','Можно использовать результат коммерчески?',51],
  ['en','Can I use this commercially?',51],
  ['fr','Quels sont les droits commerciaux ?',51],
  ['es','¿Puedo usarlo comercialmente?',51],
  ['ru','Помоги написать промпт',52],
  ['en','How do I animate a photo?',53],
  ['fr','Le paiement Stripe est sécurisé ?',54],
  ['es','¿Cómo puedo comprar créditos?',55],
  ['ru','Где посмотреть мой баланс?',56],
  ['ru','Есть разрешение 4К?',57],
  ['en','How long does rendering take?',58],
  ['en','Which download formats are available?',59],
  ['es','¿Qué formato para YouTube?',61],
  ['ru','Что такое видеоуникализатор?',64],
  ['en','What is Inspiration?',67]
]) assert.equal(selectCatalogReply(entries,query,lang)?.id,`jarvix_${lang}_${id}`, query);
for (const query of ['Open my balance','Не покупай кредиты','What is the weather?','How long does rendering take and what is my balance?','Does Stripe support refunds?']) assert.equal(selectCatalogReply(entries,query,'en'),null,query);
assert.equal(selectCatalogReply([], 'Where is my balance?', 'en'),null);
let audioFetches=0;
const library=createClipLibrary(async url => url.endsWith('manifest.json') ? Response.json({clips:entries}) : (audioFetches++,new Response(new Blob(['audio'],{type:'audio/mpeg'}))));
assert.equal((await library.findReply('Where is my balance?','en')).id,'jarvix_en_56');
await library.get('reply en 56','en'); await library.get('reply en 56','en');
assert.equal(audioFetches,1,'repeat playback reuses an in-memory audio blob');
assert.equal(await library.get('reply en 56','en',AbortSignal.abort()),null);
console.log('PASS: multilingual routing, ambiguity, absent recordings, blob reuse, cancellation');
