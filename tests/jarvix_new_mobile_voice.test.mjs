import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture({recognition=true,meter=false,smalltalkAudio=true,rejectAudio=false,silent=false}={}){
  const source=fs.readFileSync('app/src/main/assets/jarvix-new-voice.js','utf8')
    .replace(/^import .*?;\s*$/gm,'')
    .replace('export function installJarvixNewVoice(){','function installJarvixNewVoice(){');
  const events={},listeners={},played=[],classes=new Set(),recognizers=[],buttons=[],elements=[];
  let webAudioPlayCount=0;
  let lastSpeech='';
  const orb={
    style:{vars:{},setProperty(name,value){this.vars[name]=value}},
    classList:{toggle:(c,b)=>b?classes.add(c):classes.delete(c),
      remove:(...c)=>c.forEach(k=>classes.delete(k)),add:c=>classes.add(c)},
    getBoundingClientRect:()=>({left:100,width:64,bottom:58}),
    setAttribute:(key,value)=>{orb[key]=value}
  };
  const doc={
    getElementById:id=>id==='topJarvisBtn'?orb:null,
    createElement:tag=>{
      const x={tag,hidden:false,style:{},dataset:{},disabled:false,children:[],
        appendChild(child){this.children.push(child)},
        setAttribute(name,value){this[name]=value},
        addEventListener(name,cb){this['on'+name]=cb}};
      elements.push(x);
      if(tag==='button')buttons.push(x);
      return x;
    },
    head:{append(){}},body:{appendChild(){}},
    addEventListener:(type,cb)=>{events[type]=cb}
  };
  class Recognition{
    static instances=recognizers;
    constructor(){recognizers.push(this);}
    start(){this.onstart?.();}
    stop(){this.onend?.();}
    abort(){this.onend?.();}
    emit(text,isFinal=true){
      this.onresult?.({results:[Object.assign([{transcript:text}],{isFinal})]});
    }
  }
  class Audio{
    constructor(url){this.url=url;this.currentTime=0;played.push(url);}
    play(){return rejectAudio?Promise.reject(new Error('NotAllowedError')):
      Promise.resolve().then(()=>{this.onended?.();});}
    pause(){}
  }
  class AudioContextMock{
    constructor(){this.state='running';this.destination={};}
    createAnalyser(){return {fftSize:512,getByteTimeDomainData(samples){
      for(let i=0;i<samples.length;i++)samples[i]=silent?128:(i%2?136:120);
    }};}
    createMediaStreamSource(){return {connect(){}};}
    createBufferSource(){return {connect(){},stop(){this.onended?.()},
      start(){webAudioPlayCount++;queueMicrotask(()=>this.onended?.());}};}
    decodeAudioData(){return Promise.resolve({duration:1.5});}
    resume(){this.state='running';return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
  }
  const context={
    window:{addEventListener:(event,cb)=>{listeners[event]=cb},
      ...(recognition?{webkitSpeechRecognition:Recognition}:{}),
      ...(meter?{AudioContext:AudioContextMock}:{})},
    location:{hostname:'jarvis-new.deepsyq.pages.dev'},
    navigator:{language:'ru-RU',mediaDevices:{getUserMedia:async()=>({
      getTracks:()=>[{stop(){}}]
    })}},
    localStorage:{getItem:key=>key==='deepsyq_home_language'?'ru':null},
    document:doc,innerWidth:420,innerHeight:800,
    URL,Blob,Audio,console,AbortController,
    fetch:async url=>{
      if(String(url).includes('/media/jarvix/')){
        const bytes=new Uint8Array(2000).fill(12);bytes.set([73,68,51],0);
        return new Response(bytes,{status:200,headers:{'content-type':'audio/mpeg'}});
      }
      return Response.json({found:false});
    },
    setTimeout,clearTimeout,setInterval,clearInterval,queueMicrotask,
    recordedReply:async()=>null,ownerLibraryReply:undefined,
    helloRecording:async()=>({audioUrl:'/media/jarvix/conversation/hello_ru.mp3',text:'Привет! Я JARVIX.'}),
    smalltalkReply:async(message)=>{lastSpeech=message;return smalltalkAudio?
      {audioUrl:'/media/jarvix/conversation/smalltalk_ru.mp3',text:'Спасибо!'}:null;},
    smalltalkTextReply:async(message)=>message==='Как дела?'?
      {text:'Всё хорошо, спасибо! А у тебя?',source:'prepared-conversation-text-only'}:null,
  };
  vm.runInNewContext(source+'\nthis.__exports={installJarvixNewVoice,stop};',context,{timeout:3000});
  context.__exports.installJarvixNewVoice();
  const clickSphere=()=>events.click({
    target:{closest:selector=>selector==='#topJarvisBtn'?orb:null},
    preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}
  });
  const flush=async()=>{for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));};
  return {context,orb,buttons,elements,classes,recognizers,played,clickSphere,flush,
    get webAudioPlayCount(){return webAudioPlayCount;},
    get speech(){return lastSpeech;},stop:context.__exports.stop};
}
test('phone-style sphere click requests microphone and relistens after greeting MP3',async()=>{
  const f=fixture();
  try{
    f.clickSphere();
    await f.flush();
    assert.equal(f.played[0],'/media/jarvix/conversation/hello_ru.mp3');
    assert.ok(f.recognizers.length>=1);
    assert.equal(f.buttons.length,1);
    assert.match(f.buttons[0].textContent,/Слушаю вас/);
    assert.ok(f.classes.has('jv-new-voice-listening'));
  }finally{f.stop();}
});
test('recognized sentence is processed and speech listening starts again',async()=>{
  const f=fixture();
  try{
    f.clickSphere();await f.flush();
    const r=f.recognizers.at(-1);
    r.emit('Как дела?',true);
    await f.flush();
    assert.equal(f.speech,'Как дела?');
    assert.ok(f.played.includes('/media/jarvix/conversation/smalltalk_ru.mp3'));
    assert.ok(f.recognizers.length>=2);
    assert.match(f.buttons[0].textContent,/Слушаю вас/);
  }finally{f.stop();}
});
test('when mobile browser does not deliver final result, end event processes interim speech',async()=>{
  const f=fixture();
  try{
    f.clickSphere();await f.flush();
    const r=f.recognizers.at(-1);
    r.emit('Привет Джарвис',false);
    r.onend();
    await f.flush();
    assert.equal(f.speech,'Привет Джарвис');
    assert.ok(f.recognizers.length>=2);
  }finally{f.stop();}
});
test('under-sphere microphone chip can re-arm voice recognition with user click',async()=>{
  const f=fixture();
  try{
    f.clickSphere();await f.flush();
    const old=f.recognizers.length;
    const chip=f.buttons[0];
    assert.equal(chip.hidden,false);
    chip.onclick({preventDefault(){},stopPropagation(){}});
    await f.flush();
    // Active listener is left in place when already listening.
    assert.equal(f.recognizers.length,old);
    f.recognizers.at(-1).onerror({error:'network'});
    assert.match(chip.textContent,/Нажмите/);
    chip.onclick({preventDefault(){},stopPropagation(){}});
    await f.flush();
    assert.equal(f.recognizers.length,old+1);
    assert.match(chip.textContent,/Слушаю вас/);
  }finally{f.stop();}
});
test('unsupported mobile speech engine produces actionable status without fake listening',async()=>{
  const f=fixture({recognition:false});
  try{
    f.clickSphere();await f.flush();
    assert.equal(f.recognizers.length,0);
    assert.match(f.buttons[0].textContent,/Голосовой ввод недоступен/);
    assert.equal(f.classes.has('jv-new-voice-listening'),false);
  }finally{f.stop();}
});

test('live partial words appear under sphere before final question is sent',async()=>{
  const f=fixture();
  try{
    f.clickSphere();await f.flush();
    const transcript=f.elements.find(x=>x.id==='jv-new-transcript-text');
    const panel=f.elements.find(x=>x.id==='jv-new-transcript');
    assert.ok(transcript && panel);
    assert.equal(panel.hidden,true,'No framed prompt before actual speech');
    const r=f.recognizers.at(-1);
    r.emit('Как',false);
    assert.equal(transcript.textContent,'Как');
    assert.equal(transcript.dataset.actual,'true');
    assert.equal(panel.dataset.final,'false');
    assert.equal(f.speech,'');
    r.emit('Как дела?',false);
    assert.equal(transcript.textContent,'Как дела?');
    assert.equal(f.speech,'');
    r.emit('Как дела?',true);
    assert.equal(panel.dataset.final,'true');
    await f.flush();
    assert.equal(f.speech,'Как дела?');
    assert.ok(f.recognizers.length>=2);
    assert.equal(panel.hidden,true,'No empty prompt before next speech');
  }finally{f.stop();}
});
test('final transcript combines multiple results and displays complete question',async()=>{
  const f=fixture();
  try{
    f.clickSphere();await f.flush();
    const r=f.recognizers.at(-1);
    const transcript=f.elements.find(x=>x.id==='jv-new-transcript-text');
    r.onresult({results:[
      Object.assign([{transcript:'Как'}],{isFinal:true}),
      Object.assign([{transcript:' дела'}],{isFinal:false})
    ]});
    assert.equal(transcript.textContent,'Как дела');
    assert.equal(f.speech,'');
    r.onresult({results:[
      Object.assign([{transcript:'Как'}],{isFinal:true}),
      Object.assign([{transcript:' дела?'}],{isFinal:true})
    ]});
    await f.flush();
    assert.equal(f.speech,'Как дела?');
  }finally{f.stop();}
});
test('real microphone audio volume expands existing sphere and calms when stopped',async()=>{
  const f=fixture({meter:true});
  try{
    f.clickSphere();await f.flush();
    const panel=f.elements.find(x=>x.id==='jv-new-transcript');
    assert.ok(panel);
    assert.equal(panel.hidden,true,'No empty speech frame');
    await new Promise(resolve=>setTimeout(resolve,165));
    const scale=Number(f.orb.style.vars['--jv-mic-scale']);
    assert.ok(scale>1,'Actual mic audio must enlarge the sphere');
    assert.ok(scale<=1.19,'Never distort owner sphere');
    assert.equal(f.orb['data-jv-mic-live'],'true');
    assert.equal(f.classes.has('jv-new-voice-listening'),true);
    f.stop();
    assert.equal(f.classes.has('jv-new-voice-listening'),false);
  }finally{f.stop();}
});
test('recognized "Как дела?" receives honest visible TEXT response when voice MP3 is not yet created',async()=>{
  const f=fixture({smalltalkAudio:false});
  try{
    f.clickSphere();await f.flush();
    const recognizer=f.recognizers.at(-1);
    recognizer.emit('Как',false);
    const transcript=f.elements.find(x=>x.id==='jv-new-transcript-text');
    assert.equal(transcript.textContent,'Как');
    recognizer.emit('Как дела?',true);
    await f.flush();
    const bot=f.elements.find(x=>x.id==='jv-new-transcript-reply');
    assert.ok(bot);
    assert.equal(bot.hidden,false);
    assert.equal(bot.textContent,'JARVIX: Всё хорошо, спасибо! А у тебя?');
    assert.equal(f.played.length,1,'No fabricated spoken MP3 for missing response');
    assert.equal(transcript.textContent,'Как дела?');
  }finally{f.stop();}
});

test('quiet real microphone has no fabricated speech pulsing',async()=>{
  const f=fixture({meter:true,silent:true});
  try{
    f.clickSphere();await f.flush();
    await new Promise(resolve=>setTimeout(resolve,170));
    assert.equal(f.orb.style.vars['--jv-mic-scale'],'1.000');
    assert.equal(f.orb['data-jv-mic-live'],'false');
  }finally{f.stop();}
});
test('original recorded voice plays using user-unlocked Web Audio when mobile Audio.play is blocked',async()=>{
  const f=fixture({meter:true,rejectAudio:true});
  try{
    f.clickSphere();await f.flush();
    assert.equal(f.played[0],'/media/jarvix/conversation/hello_ru.mp3');
    assert.equal(f.webAudioPlayCount,1);
    assert.ok(f.recognizers.length>=1,'Return to mic after audible greeting');
    const recognition=f.recognizers.at(-1);
    recognition.emit('Привет',true);
    await f.flush();
    assert.equal(f.webAudioPlayCount,2,'Second owner-recorded reply also uses Web Audio');
  }finally{f.stop();}
});

test('interim recognized words pulse sphere if phone has no WebAudio analyser',async()=>{
  const f=fixture({meter:false});
  try{
    f.clickSphere();await f.flush();
    assert.equal(f.orb.style.vars['--jv-mic-scale']||'1.000','1.000');
    const r=f.recognizers.at(-1);
    r.emit('Как',false);
    assert.ok(Number(f.orb.style.vars['--jv-mic-scale'])>1);
    r.emit('Как дела',false);
    assert.ok(Number(f.orb.style.vars['--jv-mic-scale'])>1);
    await new Promise(resolve=>setTimeout(resolve,215));
    assert.equal(f.orb.style.vars['--jv-mic-scale'],'1.000');
  }finally{f.stop();}
});
