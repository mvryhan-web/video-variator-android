import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app/src/main/assets/jarvis-core.js',import.meta.url),'utf8');
const functionSource=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end)).replace('export function','function');

test('direct and compatibility sphere activation both use JARVIX NEW',()=>{
  let calls=0;
  const context={toggleJarvixNewVoice:()=>calls++};
  vm.runInNewContext(
    functionSource('export function activateJarvisVoice()', 'export function deactivateJarvisVoice()')+
    functionSource('export function toggleJarvisVoice()', '// Global Escape listener')+
    'activateJarvisVoice(); toggleJarvisVoice();',context);
  assert.equal(calls,2);
});

test('initialization clears legacy voice state and preserves the current conversation',()=>{
  const stored=new Map([['jarvix_active','1'],['jarvix_say_on_load','Old greeting'],['lastActivity','1'],['jarvix_active_conversation','existing']]);
  let installs=0;
  const context={
    window:{},
    document:{addEventListener(){}},
    prepareOwnerGreetings(){},
    localStorage:{getItem:()=>null},
    sessionStorage:{removeItem:key=>stored.delete(key)},
    getTopBtn:()=>null,
    setTimeout:(_callback,delay)=>assert.notEqual(delay,350),
    JARVIX_LAST_ACTIVITY_KEY:'lastActivity',
    installJarvixNewVoice:()=>installs++
  };
  vm.runInNewContext(functionSource('export function initJarvis()', '// Auto-boot on load')+'initJarvis();',context);
  assert.equal(installs,1);
  assert.deepEqual([...stored],[['jarvix_active_conversation','existing']]);
});
