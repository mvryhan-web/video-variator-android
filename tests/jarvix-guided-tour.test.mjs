import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/src/main/assets/jarvix-guided-tour.js',import.meta.url),'utf8').replace(/^import .*;$/mg,'').replace(/export /g,'');
function setup(pack){
 const clips=[],themes=[],moves=[],spoken=[],memory=new Map();let resumed=0;
 const context=vm.createContext({getJarvixLanguage:()=> 'ru',OWNER_GREETING_TEXT:{ru:'original approved greeting'},fetch:async()=>({ok:true,json:async()=>pack}),Audio:class{constructor(url){this.url=url;clips.push(this);}play(){this.onplay?.();return Promise.resolve();}pause(){this.paused=true;}},applySiteTheme:t=>themes.push(t),speakJarvis:t=>spoken.push(t),stopAllSpeech(){},pauseJarvisRecognition(){},updateJarvisState(){},resumeJarvisRecognition(){resumed++;},URL,location:{href:'https://test.example/deepsyq.html',pathname:'/deepsyq.html',search:'',assign:url=>moves.push(url)},localStorage:{getItem:()=> 'neon'},sessionStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)}});
 vm.runInContext(source,context);return {context,clips,themes,moves,spoken,memory,resumed:()=>resumed};
}
test('missing NEW voice pack rolls back to original introduction without themes or forced photo navigation',async()=>{
 const s=setup({ready:false});await vm.runInContext('startJarvixGuidedTour()',s.context);assert.deepEqual(s.spoken,['original approved greeting']);assert.equal(s.clips.length,0);assert.equal(s.themes.length,0);assert.equal(s.moves.length,0);
});
test('showcase applies theme before speech and navigates before destination narration',async()=>{
 const steps=[{theme:'midnight',audio:'media/jarvix/clips/jarvix_showcase_ru_01.mp3'},{url:'pricing.html',audio:'media/jarvix/clips/jarvix_showcase_ru_02.mp3'}];
 const s=setup({ready:true,languages:{ru:steps}});await vm.runInContext('startJarvixGuidedTour()',s.context);assert.equal(s.themes[0],'midnight');assert.equal(s.clips.length,1);s.clips[0].onended();assert.equal(s.moves[0],'https://test.example/pricing.html');assert.equal(s.clips.length,1);
 // Simulate mounting the actual destination document with shared sessionStorage.
 s.context.location.pathname='/pricing.html';s.context.location.href=s.moves[0];vm.runInContext('resumeJarvixGuidedTour()',s.context);assert.equal(s.clips.length,2);s.clips[1].onended();assert.equal(s.themes.at(-1),'neon');assert.equal(s.resumed(),1);
});
test('Stop restores original theme and invalidates late audio completion',async()=>{
 const s=setup({ready:true,languages:{ru:[{theme:'light',audio:'media/jarvix/clips/jarvix_showcase_ru_01.mp3'}]}});await vm.runInContext('startJarvixGuidedTour()',s.context);const audio=s.clips[0],late=audio.onended;vm.runInContext('stopJarvixGuidedTour()',s.context);late();assert.equal(audio.paused,true);assert.equal(audio.onended,null);assert.equal(s.themes.at(-1),'neon');assert.equal(s.resumed(),0);assert.equal(s.memory.size,0);
});
