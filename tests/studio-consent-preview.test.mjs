import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import{readFileSync}from'node:fs';
const source=readFileSync(new URL('../app/src/main/assets/lumina-terms.js',import.meta.url),'utf8');
for(const accepted of [false,true])test(`dismissing notice never bypasses generation consent: accepted=${accepted}`,()=>{
 let boot,submit,prompt=0,prevented=0,stopped=0;
 const creator={addEventListener(name,fn,opts){assert.equal(name,'submit');assert.equal(opts.capture,true);submit=fn;}};
 const c=vm.createContext({window:{},location:{pathname:'/generate-studio.html'},document:{addEventListener:(_,fn)=>boot=fn,getElementById:id=>id==='creator'?creator:null},localStorage:{getItem:()=>accepted?'true':null},sessionStorage:{getItem:()=>null},setTimeout(){}});
 vm.runInContext(source,c);boot();c.window.openLuminaTermsModal=()=>prompt++;
 submit({preventDefault:()=>prevented++,stopImmediatePropagation:()=>stopped++});
 assert.equal(prevented,accepted?0:1);assert.equal(stopped,accepted?0:1);assert.equal(prompt,accepted?0:1);
});
