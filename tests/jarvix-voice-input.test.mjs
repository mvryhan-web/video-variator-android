import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {bindVoiceInput} from '../app/src/main/assets/jarvix-voice-input.js';

function setup({supported=true,initial=''}={}){
 const waveNodes=[],errors=[],recs=[],changes=[],classes=new Set();
 const doc=globalThis.document;
 const node=()=>({className:'',hidden:false,children:[],attributes:{},append(child){this.children.push(child);},setAttribute(k,v){this.attributes[k]=v;}});
 globalThis.document={createElement:()=>node()};
 const input={value:initial,required:true,dispatchEvent(e){changes.push(e.type);}};
 const mic={dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;},before(v){waveNodes.push(v);},title:''};
 const form={classList:{toggle(name,value){value?classes.add(name):classes.delete(name);}}};
 class FakeRecognition{
  constructor(){recs.push(this);}
  start(){this.started=true;}
  stop(){this.stopped=true;queueMicrotask(()=>{if(this.finalTranscript)this.emit(this.finalTranscript);this.onend?.();});}
  abort(){this.aborted=true;queueMicrotask(()=>this.onend?.());}
  emit(transcript){this.onresult?.({resultIndex:0,results:[[{transcript}]]});}
 }
 const voice=bindVoiceInput({mic,input,form,onError:e=>errors.push(e),
  getRecognizer:()=>supported?FakeRecognition:null,getLanguage:()=> 'ru'});
 const restore=()=>{globalThis.document=doc;};
 return {mic,input,form,voice,waveNodes,errors,recs,changes,classes,restore};
}
test('mic becomes square stop, five animated wave bars appear only while recording',async()=>{
 const p=setup();
 try{
  assert.equal(p.mic.dataset.voiceRecording,'false');
  assert.equal(p.waveNodes[0].hidden,true);
  p.mic.onclick();
  assert.equal(p.mic.dataset.voiceRecording,'true');
  assert.equal(p.waveNodes[0].hidden,false);
  assert.equal(p.waveNodes[0].children.length,5);
  assert.equal(p.mic.attributes['aria-pressed'],'true');
  assert.match(p.mic.attributes['aria-label'],/остановить/i);
  assert.equal(p.input.required,false);
  assert.equal(p.classes.has('j-voice-recording'),true);
  p.recs[0].emit('Привет');
  p.mic.onclick(); // Stop does not submit anything.
  await p.voice.stop();
  assert.equal(p.input.value,'Привет');
  assert.equal(p.mic.dataset.voiceRecording,'false');
  assert.equal(p.waveNodes[0].hidden,true);
  assert.equal(p.mic.attributes['aria-pressed'],'false');
  assert.equal(p.input.required,true);
  assert.equal(p.classes.has('j-voice-recording'),false);
 }finally{p.restore();}
});
test('Send awaits final speech result emitted after stop, preserves typed draft, then mic resets',async()=>{
 const p=setup({initial:'Напиши'});
 try{
  p.mic.onclick();
  p.recs[0].emit('привет');
  p.recs[0].finalTranscript='привет, мир'; // Browser supplies final result only after stop.
  let sent='';
  await p.voice.stop();
  if(p.input.value.trim())sent=p.input.value.trim();
  assert.equal(sent,'Напиши привет, мир');
  assert.equal(p.mic.dataset.voiceRecording,'false');
  assert.equal(p.recs[0].stopped,true);
  assert.ok(p.changes.includes('input'));
 }finally{p.restore();}
});
test('No speech recognized: Send may stop even when input was initially required',async()=>{
 const p=setup();
 try{
  p.mic.onclick();
  assert.equal(p.input.required,false,'native validation cannot block stop-before-send');
  await p.voice.stop();
  assert.equal(p.input.value,'');
  assert.equal(p.input.required,true);
 }finally{p.restore();}
});
test('Mic permission errors and unsupported browser reset UI without sending a message',async()=>{
 const p=setup({supported:false});
 try{
  p.mic.onclick();assert.match(p.errors[0],/unavailable/);
  assert.equal(p.mic.dataset.voiceRecording,'false');
 }finally{p.restore();}
 const v=setup();
 try{
  v.mic.onclick();
  v.recs[0].onerror({error:'not-allowed'});
  assert.match(v.errors[0],/not-allowed/);
  assert.equal(v.mic.dataset.voiceRecording,'false');
  assert.equal(v.waveNodes[0].hidden,true);
 }finally{v.restore();}
});
test('Automatic end and explicit account-switch abort restore microphone and keep the draft',async()=>{
 const p=setup();
 try{
  p.mic.onclick();p.recs[0].emit('Тест');
  p.recs[0].onend();
  assert.equal(p.input.value,'Тест');
  assert.equal(p.mic.dataset.voiceRecording,'false');
  p.mic.onclick();
  const rec=p.recs[1];
  await p.voice.abort();
  assert.equal(rec.aborted,true);
  assert.equal(p.mic.dataset.voiceRecording,'false');
 }finally{p.restore();}
});
test('Composer submit always stops transcription before onSend, with send not blocked by an empty active draft',async()=>{
 const src=await readFile(new URL('../app/src/main/assets/jarvix-composer.js',import.meta.url),'utf8');
 assert.match(src,/await voice\.stop\(\);if\(!input\.value\.trim\(\)\)return;await onSend\(/);
 assert.match(src,/stop\(\)\{void voice\.abort\(\);\}/);
 assert.match(src,/bindVoiceInput\(\{mic,input,form,onError\}\)/);
 const css=await readFile(new URL('../app/src/main/assets/jarvix-chat.css',import.meta.url),'utf8');
 assert.match(css,/#jMic\[data-voice-recording="true"\]::after/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
