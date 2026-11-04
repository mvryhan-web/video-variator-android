import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/src/main/assets/jarvis-core.js',import.meta.url),'utf8');
const control=source.slice(source.indexOf('export function pauseJarvisRecognition()'),source.indexOf('// 10. Silence Timer'));
function setup(){
 const instances=[],timers=[],commands=[];
 const context=vm.createContext({recognitionVersion:0,isJarvisActive:true,keepListening:true,isJarvisSpeaking:false,isJarvisListening:false,jarvisRecognition:null,
 window:{SpeechRecognition:class{constructor(){instances.push(this);}start(){}stop(){}}},
 localStorage:{getItem:()=> 'ru'},document:{documentElement:{lang:'ru'}},
 updateJarvisState(){},getTopBtn:()=>null,resetSilenceTimer(){},getJarvixLanguage:()=> 'ru',
 handleJarvisVoiceCommand:text=>commands.push(text),setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},console});
 vm.runInContext(control.replace(/export /g,''),context);vm.runInContext('resumeJarvisRecognition()',context);
 return {context,instances,timers,commands};
}
test('delayed recognition result cannot navigate after Stop',()=>{
 const s=setup(),recognition=s.instances[0];recognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'открой тарифы'}],{isFinal:true})]});
 vm.runInContext('isJarvisActive=false;keepListening=false;pauseJarvisRecognition()',s.context);s.timers.forEach(fn=>fn());assert.equal(s.commands.length,0);
});
test('stale onend cannot restart recognition after a new speech pause',()=>{
 const s=setup();s.instances[0].onend();vm.runInContext('pauseJarvisRecognition()',s.context);s.timers.forEach(fn=>fn());assert.equal(s.instances.length,1);
});
test('listening does not start while assistant is speaking',()=>{
 const s=setup();vm.runInContext('isJarvisSpeaking=true;resumeJarvisRecognition()',s.context);assert.equal(s.instances.length,1);
});
