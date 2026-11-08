import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createJarvixVoiceSession,isSpokenEcho} from '../app/src/main/assets/jarvix-conversational-voice.js';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const capture=()=>{
 const sessions=[], phases=[], errors=[], spoken=[], turns=[],completed=[];
 const winListeners=new Map(),docListeners=new Map();
 const emitter=handlers=>({
   addEventListener(name,fn){const list=handlers.get(name)||new Set();list.add(fn);handlers.set(name,list);},
   removeEventListener(name,fn){handlers.get(name)?.delete(fn);},
   emit(name,event={}){for(const cb of handlers.get(name)||[])cb(event);}
 });
 const win={...emitter(winListeners),setTimeout,clearTimeout,performance:{now:()=>Date.now()}};
 const doc={...emitter(docListeners),visibilityState:'visible'};
 class Recognition{
   constructor(){this.running=false;this.calls=0;this.aborted=0;sessions.push(this);}
   start(){this.calls++;this.running=true;this.onstart?.();}
   abort(){this.aborted++;this.running=false;}
   emit(text,{final=true}={}){this.onresult?.({resultIndex:0,results:[{0:{transcript:text},isFinal:final}]});}
   end(){this.running=false;this.onend?.();}
   error(code){this.onerror?.({error:code});}
 }
 let stopCount=0,sphereCount=0;
 const config={getRecognizer:()=>Recognition,getLanguage:()=> 'ru',
  win,doc,onPhase:phase=>phases.push(phase),onError:e=>errors.push(e),
  onTurn:async text=>{turns.push(text);return {reply:'JARVIX says: '+text};},
  speak:(text,done)=>{spoken.push(text);completed.push(done);},
  stopSpeech:()=>{stopCount++;},
  deactivateSphere:()=>{sphereCount++}
 };
 return {config,sessions,phases,errors,spoken,turns,completed,win,doc,
   get stopCount(){return stopCount;},get sphereCount(){return sphereCount;}};
};

test('voice is strictly opt-in, uses one microphone and the existing chat-turn handler',async()=>{
 const s=capture(),v=createJarvixVoiceSession(s.config);
 assert.equal(s.sessions.length,0);assert.equal(v.phase(),'idle');
 assert.equal(v.start(),true);assert.equal(s.sphereCount,1);
 assert.equal(s.sessions.length,1);assert.equal(s.sessions[0].lang,'ru-RU');
 assert.equal(v.phase(),'listening');
 s.sessions[0].emit('Привет JARVIX',{final:false});
 await wait(290);assert.equal(s.turns.length,0,'interim speech cannot submit');
 s.sessions[0].emit('Привет JARVIX');
 await wait(300);
 assert.deepEqual(s.turns,['Привет JARVIX']);
 assert.deepEqual(s.spoken,['JARVIX says: Привет JARVIX']);
 assert.equal(v.phase(),'speaking');
 s.completed[0]();
 assert.equal(v.phase(),'listening');
 assert.equal(s.sessions.length,1,'no new recognizer loop after speech');
 v.stop();assert.equal(v.phase(),'idle');assert.equal(s.sessions[0].aborted,1);
});

test('recognition is deduplicated; the assistant speech echo never sends another turn',async()=>{
 const s=capture(),v=createJarvixVoiceSession(s.config);v.start();
 s.sessions[0].emit('Покажи тарифы');
 await wait(300);
 assert.equal(s.turns.length,1);
 s.sessions[0].emit('JARVIX says: Покажи тарифы');
 await wait(320);
 assert.equal(s.turns.length,1);
 assert.equal(v.phase(),'speaking');
 s.completed[0]();
 s.sessions[0].emit('Покажи тарифы');
 await wait(290);
 assert.equal(s.turns.length,1,'same quick final replay not double-submitted');
 v.stop();
 assert.equal(isSpokenEcho('Вот доступные тарифы','Вот доступные тарифы и цены'),true);
 assert.equal(isSpokenEcho('Открой мои работы','Посмотрите доступные тарифы'),false);
});

test('barge-in stops prior audio and sends next turn in same live voice session',async()=>{
 const s=capture(),v=createJarvixVoiceSession(s.config);v.start();
 s.sessions[0].emit('Что умеешь');
 await wait(300);
 assert.equal(v.phase(),'speaking');
 const old=s.completed[0];
 s.sessions[0].emit('Открой видео студию');
 await wait(300);
 assert.deepEqual(s.turns,['Что умеешь','Открой видео студию']);
 assert.ok(s.stopCount>=2,'old audio immediately stops on user speech');
 assert.equal(v.phase(),'speaking');
 old();
 assert.equal(v.phase(),'speaking','stale voice completion must not stop new response');
 s.completed[1]();assert.equal(v.phase(),'listening');
 s.sessions[0].emit('стоп');
 await wait(300);
 assert.equal(s.turns.length,2,'stop phrase does not send or trigger charges');
 v.stop();
});

test('stop cancels a pending async AI answer, account switch and hidden tab shut down the microphone',async()=>{
 const s=capture();
 let complete;
 s.config.onTurn=async text=>{s.turns.push(text);return new Promise(r=>{complete=r;});};
 const v=createJarvixVoiceSession(s.config);v.start();
 s.sessions[0].emit('Объясни мне это');
 await wait(300);
 assert.equal(v.phase(),'thinking');
 v.stop();complete({reply:'late response'});
 await wait(10);
 assert.deepEqual(s.spoken,[],'must not speak late AI response');
 assert.equal(s.sessions[0].aborted,1);
 v.start();s.win.emit('storage',{key:'vv_token',newValue:'other-account'});
 assert.equal(v.phase(),'idle');
 v.start();s.doc.visibilityState='hidden';s.doc.emit('visibilitychange');
 assert.equal(v.phase(),'idle');
 v.start();s.win.emit('pagehide');
 assert.equal(v.phase(),'idle');
 v.destroy();assert.equal(s.sessions.length,4);
});

test('browser errors, unsupported API and cancelled speech do not auto-start mic',async()=>{
 const s=capture();s.config.getRecognizer=()=>undefined;
 const unavailable=createJarvixVoiceSession(s.config);
 assert.equal(unavailable.start(),false);assert.equal(unavailable.phase(),'idle');
 assert.equal(s.sessions.length,0);unavailable.destroy();
 s.config.getRecognizer=()=>class Failing{start(){throw Error('denied')};abort(){}};
 const broken=createJarvixVoiceSession(s.config);
 assert.equal(broken.start(),true);await wait(5);assert.equal(broken.phase(),'listening');
 broken.stop();broken.destroy();
 const y=capture(),v=createJarvixVoiceSession(y.config);v.start();
 y.sessions[0].error('not-allowed');
 assert.equal(v.phase(),'idle');
 assert.equal(y.sessions[0].aborted,1);
 v.destroy();
});

test('four speech-recognition languages and caller-scoped lifecycle hooks',()=>{
 for(const [language,expected] of [['ru','ru-RU'],['en','en-US'],['fr','fr-FR'],['es','es-ES']]){
  const s=capture();s.config.getLanguage=()=>language;
  const v=createJarvixVoiceSession(s.config);v.start();
  assert.equal(s.sessions[0].lang,expected);
  v.stop();v.destroy();
 }
});

test('existing JARVIX brain, text mic, safe navigation and preview CSS are REUSED without a second agent',async()=>{
 const base=new URL('../app/src/main/assets/',import.meta.url);
 const [chat,html,voiceInput,css,action]=await Promise.all([
   readFile(new URL('jarvix-chat.js',base),'utf8'),
   readFile(new URL('jarvix-chat.html',base),'utf8'),
   readFile(new URL('jarvix-voice-input.js',base),'utf8'),
   readFile(new URL('jarvix-conversational-voice.css',base),'utf8'),
   readFile(new URL('jarvix-action-plan.js',base),'utf8')
 ]);
 assert.match(chat,/bindJarvixConversationalVoice/);
 assert.match(chat,/sendCurrentChatTurn/);
 assert.match(chat,/processMessage\(m\)/);
 assert.match(chat,/api\('\/api\/jarvix\/chat'/);
 assert.match(chat,/getJarvixLanguage/);
 assert.match(chat,/deactivateSphere:deactivateJarvisVoice/);
 assert.match(voiceInput,/bindVoiceInput/);
 assert.match(html,/id="jMic"/);
 assert.match(html,/jarvix-conversational-voice\.css/);
 assert.match(css,/#jChatForm #jTalk/);
 assert.match(action,/export const ACTION_ROUTES/);
 assert.doesNotMatch(chat,/new\.api\.key|token\.log/i);
});
