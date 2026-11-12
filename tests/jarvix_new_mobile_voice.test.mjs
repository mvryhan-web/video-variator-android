import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture({recognition=true,meter=false,smalltalkAudio=true}={}){
  const source=fs.readFileSync('app/src/main/assets/jarvix-new-voice.js','utf8')
    .replace(/^import .*?;\s*$/gm,'')
    .replace('export function installJarvixNewVoice(){','function installJarvixNewVoice(){');
  const events={},listeners={},played=[],classes=new Set(),recognizers=[],buttons=[],elements=[];
  let lastSpeech='';
  const orb={
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
    play(){return Promise.resolve().then(()=>{this.onended?.();});}
    pause(){}
  }
  class AudioContextMock{
    createAnalyser(){return {fftSize:512,getByteTimeDomainData(samples){
      for(let i=0;i<samples.length;i++)samples[i]=i%2?136:120;
    }};}
    createMediaStreamSource(){return {connect(){}};}
    resume(){return Promise.resolve();}
    close(){return Promise.resolve();}
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
    fetch:async()=>Response.json({found:false}),
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
    assert.match(transcript.textContent,/Скажите что-нибудь/);
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
    assert.match(transcript.textContent,/Скажите что-нибудь/);
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
test('real microphone audio samples drive local meter, meter stops on end',async()=>{
  const f=fixture({meter:true});
  try{
    f.clickSphere();await f.flush();
    await new Promise(resolve=>setTimeout(resolve,165));
    const meter=f.elements.find(x=>x.id==='jv-new-audio-fill');
    assert.ok(meter);
    assert.notEqual(meter.style.transform,'scaleX(.05)');
    assert.match(meter.style.transform,/^scaleX\(0\./);
    f.stop();
    assert.equal(meter.style.transform,'scaleX(.05)');
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
