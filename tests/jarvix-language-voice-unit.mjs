import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../app/src/main/assets/jarvis-core.js',import.meta.url),'utf8');
function runtime(voices=[],selected='en',pageLanguage='ru') {
 const events=[],spoken=[];
 const context=vm.createContext({
  stopOwnerSpeech:()=>{},
  document:{documentElement:{lang:pageLanguage}}, navigator:{language:'ru-RU'},
  localStorage:{getItem:()=>selected},
  window:{speechSynthesis:{getVoices:()=>voices,cancel(){},speak:u=>spoken.push(u)},dispatchEvent:e=>events.push(e)},
  CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},
  SpeechSynthesisUtterance:class {constructor(text){this.text=text;}},
  isJarvisActive:false,keepListening:false,isJarvisListening:false,
  isJarvisSpeaking:false,currentSpokenUtterance:'',speechVersion:0,currentTtsAudio:null,
  timers:[],setTimeout:fn=>context.timers.push(fn),console
 });
 const selectors=source.slice(source.indexOf('let cachedVoices'),source.indexOf('function getTopBtn'));
 const stop=source.slice(source.indexOf('export function stopAllSpeech'),source.indexOf('let isJarvisSpeaking'));
 const speech=source.slice(source.indexOf('export function speakLocalSpeechSynthesis'),source.indexOf('let lastSpokenText'));
 vm.runInContext((selectors+stop+speech).replaceAll('export function','function'),context);
 return {context,events,spoken};
}

test('selected RU/EN/FR/ES wins over Russian browser and old page locale',()=>{
 for(const selected of ['ru','en','fr','es','en-US','fr-FR']) {
  const {context}=runtime([],selected);
  assert.equal(vm.runInContext('getJarvixLanguage()',context),selected.slice(0,2));
 }
});

test('voice list never falls back to female or unidentified voices in any language',()=>{
 for(const [lang,female,male] of [['ru','Irina','Dmitry'],['en','Samantha','George'],['fr','Hortense','Henri'],['es','Monica','Jorge']]) {
  const voices=[{lang,name:female},{lang,name:'Google '+lang},{lang,name:'Microsoft Paulina Manuela'}];
  let state=runtime(voices,lang);
  assert.equal(vm.runInContext(`getJarvixVoice('${lang}')`,state.context),null);
  vm.runInContext(`speakLocalSpeechSynthesis('test', null, '${lang}')`,state.context);
  assert.equal(state.spoken.length,0);
  assert.equal(state.events[0].type,'jarvix:voice-unavailable');
  state=runtime([...voices,{lang,name:male}],lang);
  vm.runInContext(`speakLocalSpeechSynthesis('test', null, '${lang}')`,state.context);
  assert.equal(state.spoken.length,1);
  assert.equal(state.spoken[0].voice.name,male);
  assert.equal(state.spoken[0].lang.slice(0,2),lang);
  assert.equal(state.spoken[0].pitch,1);
 }
});


test('Stop invalidates a pending speech completion instead of navigating or resuming',()=>{
 const state=runtime([{lang:'en',name:'George'}],'en');
 vm.runInContext("let completed=0; speakLocalSpeechSynthesis('hello',()=>completed++, 'en');",state.context);
 state.spoken[0].onend();
 vm.runInContext('stopAllSpeech()',state.context);
 for(const callback of state.context.timers)callback();
 assert.equal(vm.runInContext('completed',state.context),0);
});
