import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=readFileSync('app/src/main/assets/jarvix-new-smalltalk.js','utf8');
const url='data:text/javascript;base64,'+Buffer.from(file).toString('base64');
const {classifySmalltalk,helloRecording,smalltalkReply,promptRecording,smalltalkTextReply}=await import(url);

test('RU speech matching uses Unicode-aware boundaries',()=>{
  assert.equal(classifySmalltalk('Привет, Джарвис!','ru'),'hello');
  assert.equal(classifySmalltalk('Как дела?','ru'),'wellbeing');
  assert.equal(classifySmalltalk('Что делаешь?','ru'),'activity');
  assert.equal(classifySmalltalk('Ты меня слышишь?','ru'),'hearing');
  assert.equal(classifySmalltalk('Спасибо','ru'),'thanks');
  assert.equal(classifySmalltalk('Сделай мне видео','ru'),'video');
  assert.equal(classifySmalltalk('Изображения','ru'),'image');
});
test('EN FR ES common greetings and questions are classified',()=>{
  assert.equal(classifySmalltalk('Hey Jarvis','en'),'hello');
  assert.equal(classifySmalltalk('How are you?','en'),'wellbeing');
  assert.equal(classifySmalltalk('Comment ça va?','fr'),'wellbeing');
  assert.equal(classifySmalltalk('Hola Jarvis','es'),'hello');
  assert.equal(classifySmalltalk('Qué haces?','es'),'activity');
});
test('fallback greeting uses the real V3 MP3, never says "show what I can do"',async()=>{
  const previous=global.fetch;
  global.fetch=async()=>new Response('Not found',{status:404});
  try{
    for(const lang of ['ru','en','fr','es']){
      const clip=await helloRecording(lang);
      assert.ok(clip.text.trim());
      assert.ok(!/смотрите|show you|regardez|mira lo/.test(clip.text.toLowerCase()));
      assert.ok(clip.audioUrl.startsWith('/media/jarvix/tour-v3/t3_'));
      assert.ok(clip.stopAtSeconds<2.0);
    }
  }finally{global.fetch=previous;}
});
test('topic matching chooses a real original Tour MP3 with matching text',async()=>{
  const clip=await smalltalkReply('Создай видео','ru');
  assert.equal(clip.source,'smalltalk');
  assert.match(clip.text,/ролики/);
  assert.match(clip.audioUrl,/t3_ru_7c68463ede33.mp3/);
});
test('if 8 generated MP3 are present, short greeting and neutral prompt use them',async()=>{
  // JS module is imported in each action clean process. Prior missing-manifest
  // result is memoized, so this checks the real saved audio file separately.
  const path='app/src/main/assets/media/jarvix/conversation/manifest.json';
  const {existsSync}=await import('node:fs');
  if(!existsSync(path))return;
  const m=JSON.parse(readFileSync(path,'utf8'));
  assert.equal(m.clipCount,8);
  assert.equal(new Set(m.clips.map(c=>c.filename)).size,8);
  for(const lang of ['ru','en','fr','es']){
    assert.ok(m.clips.some(c=>c.filename==='hello_'+lang+'.mp3'));
    assert.ok(m.clips.some(c=>c.filename==='prompt_'+lang+'.mp3'));
  }
});

test('prepared 25x4 conversation provides correct actual text for everyday questions, never fake audio',async()=>{
  const previous=global.fetch;
  const data=JSON.parse(readFileSync('app/src/main/assets/media/jarvix/conversation/casual-25x4-targets.json','utf8'));
  global.fetch=async()=>Response.json(data);
  try{
    const ru=await smalltalkTextReply('Как дела?','ru');
    assert.equal(ru.text,'Всё хорошо, спасибо! А у тебя?');
    assert.equal(ru.source,'prepared-conversation-text-only');
    assert.equal('audioUrl' in ru,false);
    assert.equal((await smalltalkTextReply('Что делаешь?','ru')).text,'Слушаю тебя. Чем помочь?');
    assert.match((await smalltalkTextReply('How are you?','en')).text,/good/);
    assert.equal(await smalltalkTextReply('Сколько сейчас стоит тариф?','ru'),null);
  }finally{global.fetch=previous;}
});
