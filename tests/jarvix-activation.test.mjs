import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import{readFileSync}from'node:fs';
const source=readFileSync(new URL('../app/src/main/assets/jarvis-core.js',import.meta.url),'utf8');
const activate=source.slice(source.indexOf('export function activateJarvisVoice()'),source.indexOf('export function deactivateJarvisVoice()')).replace('export function','function');
test('ordinary orb activation acknowledges then listens; never starts a tour',()=>{
 const replies=[];let starts=0,tours=0;const data=new Map();
 const c=vm.createContext({isJarvisActive:false,keepListening:false,unlockOwnerSpeech(){},sessionStorage:{setItem:(k,v)=>data.set(k,v)},getTopBtn:()=>null,getJarvixLanguage:()=> 'en',speakJarvis:(t,done)=>replies.push({t,done}),resumeJarvisRecognition:()=>starts++,updateJarvisState(){},isTourActive:()=>false,startJarvixGuidedTour:()=>tours++});
 vm.runInContext(activate,c);vm.runInContext('activateJarvisVoice()',c);
 assert.equal(tours,0);assert.equal(starts,0);assert.equal(replies[0].t,'Listening closely. Go ahead.');replies[0].done();assert.equal(starts,1);assert.equal(data.get('jarvix_active'),'1');
 vm.runInContext('isJarvisActive=false;keepListening=false;activateJarvisVoice()',c);assert.equal(replies[1].t,replies[0].t);assert.equal(tours,0);
});
