import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture({recognition=true,finalResults=true}={}){
  const source=fs.readFileSync('app/src/main/assets/jarvix-new-voice.js','utf8')
    .replace(/^import .*?;\s*$/gm,'')
    .replace('export function installJarvixNewVoice(){','function installJarvixNewVoice(){');
  const events={},listeners={},played=[],classes=new Set(),recognizers=[],buttons=[];
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
      const x={tag,hidden:false,style:{},dataset:{},disabled:false,
        setAttribute(name,value){this[name]=value},
        addEventListener(name,cb){this['on'+name]=cb}};
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
  const context={
    window:{addEventListener:(event,cb)=>{listeners[event]=cb},
      ...(recognition?{webkitSpeechRecognition:Recognition}:{})},
    location:{hostname:'jarvis-new.deepsyq.pages.dev'},
    navigator:{language:'ru-RU',mediaDevices:{getUserMedia:async()=>({
      getTracks:()=>[{stop(){}}]
    })}},
    localStorage:{getItem:key=>key==='deepsyq_home_language'?'ru':null},
    document:doc,innerWidth:420,innerHeight:800,
    URL,Blob,Audio,console,
    setTimeout,clearTimeout,queueMicrotask,
    recordedReply:async()=>null,ownerLibraryReply:undefined,
    helloRecording:async()=>({audioUrl:'/media/jarvix/conversation/hello_ru.mp3',text:'Привет! Я JARVIX.'}),
    smalltalkReply:async(message)=>{lastSpeech=message;return {audioUrl:'/media/jarvix/conversation/smalltalk_ru.mp3',text:'Спасибо!'};}
  };
  vm.runInNewContext(source+'\nthis.__exports={installJarvixNewVoice,stop};',context,{timeout:3000});
  context.__exports.installJarvixNewVoice();
  const clickSphere=()=>events.click({
    target:{closest:selector=>selector==='#topJarvisBtn'?orb:null},
    preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}
  });
  const flush=async()=>{for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));};
  return {context,orb,buttons,classes,recognizers,played,clickSphere,flush,
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
