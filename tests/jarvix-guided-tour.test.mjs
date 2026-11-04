import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/src/main/assets/jarvix-guided-tour.js',import.meta.url),'utf8').replace(/^import .*;$/mg,'').replace(/export /g,'');
function setup(lang){
 const clips=[],themes=[],moves=[];let resumed=0;
 const context=vm.createContext({getJarvixLanguage:()=>lang,Audio:class{constructor(url){this.url=url;clips.push(this);}play(){return Promise.resolve();}pause(){this.paused=true;}},applySiteTheme:t=>themes.push(t),speakJarvis:()=>assert.fail('bundled locale clips should play'),stopAllSpeech(){},updateJarvisState(){},resumeJarvisRecognition(){resumed++;},setTimeout:()=>1,clearTimeout(){},document:{querySelectorAll:()=>[]},window:{addEventListener(){}},URL,location:{href:'https://test.example/deepsyq.html',pathname:'/deepsyq.html',assign:url=>moves.push(url)},sessionStorage:{setItem(){}}});
 vm.runInContext(source,context);return {context,clips,themes,moves,resumed:()=>resumed};
}
for(const lang of ['ru','en','fr','es'])test(`tour uses bundled ${lang} clips and navigation waits until finish`,()=>{
 const s=setup(lang);vm.runInContext('startJarvixGuidedTour()',s.context);
 assert.equal(s.clips[0].url,`media/jarvix/clips/jarvix_tour_intro${lang==='ru'?'':'_'+lang}.mp3`);
 for(let i=0;i<3;i++)s.clips[i].onended();assert.equal(s.moves.length,0);s.clips[3].onended();assert.match(s.moves[0],/generate-studio.html\?studio=image/);
});
test('Stop detaches audio callbacks and stale completion cannot restart the tour',()=>{
 const s=setup('ru');vm.runInContext('startJarvixGuidedTour()',s.context);const audio=s.clips[0],late=audio.onended;
 vm.runInContext('stopJarvixGuidedTour()',s.context);late();assert.equal(s.clips.length,1);assert.equal(audio.onended,null);assert.equal(audio.paused,true);assert.equal(s.resumed(),0);assert.equal(s.moves.length,0);
});
