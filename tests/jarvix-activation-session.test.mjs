import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/src/main/assets/jarvis-core.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('export function activateJarvisVoice'),source.indexOf('// Escape is the same')).replace(/export /g,'');
function setup(){const memory=new Map(),spoken=[];let tours=0,resolve;
 const c=vm.createContext({activationVersion:0,isJarvisActive:false,keepListening:false,isJarvisSpeaking:false,isJarvisListening:false,jarvisRecognition:null,silenceTimer:null,jarvixContext:{},unlockOwnerSpeech(){},getTopBtn:()=>null,sessionStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},prepareOwnerGreetings(){},getJarvixLanguage:()=> 'ru',fetch:()=>new Promise(r=>resolve=r),speakJarvis:t=>spoken.push(t),resumeJarvisRecognition(){},pauseJarvisRecognition(){},startJarvixGuidedTour(){tours++;},stopJarvixGuidedTour(){},isTourActive:()=>false,cancelJarvixTurn(){},stopAllSpeech(){},clearTimeout(){}});
 vm.runInContext(code,c);return {c,spoken,tours:()=>tours,finish:()=>resolve({json:async()=>({phrases:{ru:[{id:'jarvix_ru_37',text:'Слушаю вас очень внимательно.'}]}})})};}
test('introduction runs once; Stop and re-enable use only listening phrase',async()=>{const s=setup();vm.runInContext('toggleJarvisVoice();toggleJarvisVoice();toggleJarvisVoice()',s.c);s.finish();await new Promise(r=>setImmediate(r));assert.equal(s.tours(),1);assert.deepEqual(s.spoken,['Слушаю вас очень внимательно.']);});
test('Stop cancels a pending reactivation phrase',async()=>{const s=setup();vm.runInContext('toggleJarvisVoice();toggleJarvisVoice();toggleJarvisVoice();toggleJarvisVoice()',s.c);s.finish();await new Promise(r=>setImmediate(r));assert.equal(s.tours(),1);assert.equal(s.spoken.length,0);assert.equal(s.c.isJarvisActive,false);});
