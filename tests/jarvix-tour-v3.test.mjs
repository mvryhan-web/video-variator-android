import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tourV3Plan,tourV3AllPhrases,TOUR_V3_DATA} from '../app/src/main/assets/jarvix-tour-v3-script.js';
const read=path=>readFileSync(new URL('../app/src/main/assets/'+path,import.meta.url),'utf8');

test('owner-approved V3 has exactly 19 real existing destinations, one phrase per safe UI cue',()=>{
 const routes=['Home','Image','Video','Audio','AI Apps','Canvas','Tools','Compress photos','Trim video','Trim audio','Video Uniquifier','Inspiration','Pricing','trial','basic','pro','business','lifetime','Home'];
 for(const language of ['ru','en','fr','es']){
  const plan=tourV3Plan(language);
  assert.deepEqual(plan.map(x=>x.title),routes);
  assert.deepEqual(plan.map(x=>x.narration),Array(19).fill('v3'));
  for(const stage of plan){
   assert.ok(stage.beats.length>0);
   for(const beat of stage.beats){
    assert.ok(beat.text.trim().length>3,stage.title);
    assert.ok(beat.target.trim().length>1,stage.title);
    assert.ok(['focus','openModel','openSettings','closeSettings'].includes(beat.action));
    assert.doesNotMatch(beat.action,/submit|checkout|generate|upload|pay|consent/i);
   }
   assert.ok(stage.url&&!/^http/i.test(stage.url));
  }
  assert.equal(plan[0].navText,null);
  assert.match(plan[1].navText,/\S/);
 }
 assert.equal(TOUR_V3_DATA.length,19);
});

test('Russian V3 is brief, exact to approved 19-stage owner script, without repetitive old tour voice',()=>{
 const p=tourV3Plan('ru');
 assert.equal(p[0].beats[0].text,'Привет! Я JARVIX, ваш AI-помощник. Добро пожаловать в DEEPSYQ. Покажу основные возможности платформы.');
 assert.equal(p[1].navText,'Изображения.');
 assert.equal(p[2].navText,'Видео.');
 assert.equal(p[3].navText,'Аудио.');
 assert.equal(p[3].beats[2].text,'Песня с вокалом или инструментальная музыка.');
 assert.equal(p[6].navText,'Everyday Tools.');
 assert.equal(p[18].beats[0].text,'Готово! Теперь вы знакомы с DEEPSYQ. Я JARVIX — ваш помощник в творчестве. Просто скажите, что хотите создать.');
 for(const stage of p)for(const sentence of [stage.navText,...stage.beats.map(x=>x.text)].filter(Boolean)){
  assert.ok(sentence.length<=300);
  assert.doesNotMatch(sentence,/Открываю Студию генерации|Сейчас всё подготовлю/);
 }
});

test('No static recording is silently substituted and the same owner voice is required',()=>{
 const loader=read('jarvix-tour-v3-audio.js');
 const player=read('jarvix-guided-tour.js');
 const cli=readFileSync(new URL('../scripts/generate_jarvix_tour_v3.mjs',import.meta.url),'utf8');
 assert.ok(loader.includes("m?.engine!=='VoxCPM2'"));
 assert.ok(loader.includes('m?.reviewed!==true'));
 assert.ok(player.includes("speakOwnerSpeech(text,state.language"));
 assert.ok(!player.includes('speechSynthesis.speak'));
 assert.ok(cli.includes('JARVIX_OWNER_VOICE_PROFILE'));
 assert.ok(cli.includes("info.engine!=='VoxCPM2'"));
 assert.ok(cli.includes('reviewed:false'));
 assert.ok(!read('jarvix-guided-tour.js').includes('<span class="ds-tour-caption"'));
 assert.ok(!read('jarvix-guided-tour.js').includes('<span class="ds-tour-label"'));
 assert.ok(tourV3AllPhrases().length>150);
});
