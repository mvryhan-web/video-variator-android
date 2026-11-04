import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {linkModules,verifyRecordings,assertAudioOnlyPaths} from '../scripts/jarvis-stability.mjs';
function fixture(t,files){const root=mkdtempSync(path.join(tmpdir(),'jarvis-contract-'));t.after(()=>rmSync(root,{recursive:true,force:true}));for(const [name,content]of Object.entries(files)){mkdirSync(path.dirname(path.join(root,name)),{recursive:true});writeFileSync(path.join(root,name),content);}return root;}
test('historical missing-export failure is rejected even when both JS files parse',async t=>{
 const root=fixture(t,{'core.js':"export function stop(){}",'tour.js':"import {resume} from './core.js'; export const start=()=>resume();"});
 await assert.rejects(linkModules(root,'tour.js'),/does not provide an export named 'resume'/);
});
test('legitimate circular core/tour imports link without evaluating browser code',async t=>{
 const root=fixture(t,{'core.js':"import {start} from './tour.js';export function resume(){};document.addEventListener('click',start);",'tour.js':"import {resume} from './core.js';export function start(){resume();}"});
 assert.equal((await linkModules(root,'core.js')).modules,2);
});
test('query-string imports cannot silently create a second Jarvis singleton',async t=>{
 const root=fixture(t,{'core.js':"export const active=false;",'tour.js':"import {active} from './core.js?v=7';"});
 await assert.rejects(linkModules(root,'tour.js'),/splits runtime identity/);
});
test('replacing an audio file without updating its manifest fails the gate',t=>{
 const original=Buffer.alloc(100,1),changed=Buffer.alloc(100,2),hash=createHash('sha256').update(original).digest('hex');
 const prefix='app/src/main/assets/media/jarvix/clips/';
 const root=fixture(t,{[prefix+'manifest.json']:JSON.stringify({clips:[{id:'jarvix_ru_76',language:'ru',url:'/media/jarvix/clips/jarvix_ru_76.mp3?v='+hash.slice(0,12),sha256:hash}]}),[prefix+'jarvix_ru_76.mp3']:changed});
 assert.throws(()=>verifyRecordings(root),/Audio bytes changed/);
});

test('audio-only scope rejects shipping changed runtime alongside new recordings',()=>{
 assert.doesNotThrow(()=>assertAudioOnlyPaths(['app/src/main/assets/media/jarvix/clips/jarvix_ru_76.mp3','app/src/main/assets/media/jarvix/clips/manifest.json']));
 assert.throws(()=>assertAudioOnlyPaths(['app/src/main/assets/jarvis-core.js']),/unrelated source/);
});
