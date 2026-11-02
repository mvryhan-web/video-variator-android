import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {validWalletAmount} from '../app/src/main/assets/ai-pricing-display.js';

const source=await readFile(new URL('../app/src/main/assets/pricing-wallet.js',import.meta.url),'utf8');
function deferred(){
 let resolve,reject;
 const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
class El{
 constructor(){this.children=[];this.hidden=false;this.disabled=false;this.ownText='';this.onclick=null;}
 set textContent(v){this.ownText=String(v);this.children=[];}
 get textContent(){return this.ownText+this.children.map(x=>x.textContent||'').join(' ');}
 replaceChildren(...xs){this.children=xs;this.ownText='';}
 append(...xs){this.children.push(...xs);}
}
function harness(){
 const elements=new Map(),docListeners=new Map(),winListeners=new Map(),calls=[];
 let account='A',hidden=false,tick=()=>{};
 const element=id=>{if(!elements.has(id))elements.set(id,new El());return elements.get(id);};
 const document={
  get hidden(){return hidden;},
  getElementById:element,createElement:()=>new El(),
  addEventListener:(type,fn)=>docListeners.set(type,fn),
  dispatchEvent:()=>{}
 };
 const window={addEventListener:(type,fn)=>winListeners.set(type,fn)};
 const fetch=(path,options)=>{const d=deferred();calls.push({path,options,...d});return d.promise;};
 const context={document,window,localStorage:{getItem:()=>account},fetch,AbortController,Intl,Date,Number,String,Set,Promise,Error,Event:class Event{},console,validWalletAmount,setInterval:fn=>{tick=fn;}};
 vm.createContext(context);
 vm.runInContext(
  source.replace(/^import[^\n]*\n/m,'').replace(/void refresh\(\);\s*$/,'')+
   '\nglobalThis.A40={refresh,check};',context
 );
 return {
  ui:context.A40,calls,el:element,
  auth:value=>{account=value;},
  hide:v=>{hidden=v;},
  tick:()=>tick(),
  event:(where,type,data={})=>(where==='document'?docListeners:winListeners).get(type)?.(data),
  ok:(index,result)=>calls[index].resolve({ok:true,json:async()=>result}),
  fail:index=>calls[index].reject(Error('synthetic network failure'))
 };
}
const balance=available=>({available,reserved:2,debt:0});
const history=available=>({items:[{kind:'purchase',available_delta:available,created_at:'2026-11-02T09:00:00Z'}]});
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));};

test('newer same-user wallet refresh wins over a slower older balance and ledger response',async()=>{
 const h=harness(),older=h.ui.refresh(),newer=h.ui.refresh();
 assert.equal(h.calls.length,4);
 h.ok(2,balance(222));h.ok(3,history(222));await newer;
 assert.match(h.el('walletSummary').textContent,/222/);
 h.ok(0,balance(111));h.ok(1,history(111));await older;
 assert.match(h.el('walletSummary').textContent,/222/);
 assert.doesNotMatch(h.el('walletSummary').textContent,/111/);
 assert.match(h.el('walletHistory').textContent,/222/);
 assert.doesNotMatch(h.el('walletHistory').textContent,/111/);
});

test('stale same-user API failure cannot erase a newer successful balance/history',async()=>{
 const h=harness(),older=h.ui.refresh(),newer=h.ui.refresh();
 h.ok(2,balance(555));h.ok(3,history(555));await newer;
 h.fail(0);h.ok(1,history(111));await older;
 assert.match(h.el('walletSummary').textContent,/555/);
 assert.match(h.el('walletHistory').textContent,/555/);
 assert.doesNotMatch(h.el('walletStatus').textContent,/temporarily unavailable/);
});

test('same-tab A-to-B account switch scrubs A before pointer interaction, not after 250ms',async()=>{
 const h=harness(),p=h.ui.refresh();
 h.ok(0,balance(111));h.ok(1,history(111));await p;
 assert.match(h.el('walletSummary').textContent,/111/);
 h.auth('B');h.event('document','pointerdown');
 assert.equal(h.el('walletSection').hidden,true);
 assert.equal(h.el('walletSummary').textContent,'');
 assert.equal(h.el('walletHistory').textContent,'');
 assert.ok(h.calls.filter(c=>c.path.endsWith('/balance')).some(c=>c.options.headers.Authorization==='Bearer B'));
});

test('late A response cannot overwrite B after same-tab keydown identity switch',async()=>{
 const h=harness(),a=h.ui.refresh();
 h.auth('B');h.event('document','keydown');
 const calls=h.calls.filter(c=>c.options.headers.Authorization==='Bearer B');
 assert.ok(calls.length>=2);
 const all=h.calls.filter(c=>c.options.headers.Authorization==='Bearer B');
 for(const c of all)c.resolve({ok:true,json:async()=>c.path.endsWith('/balance')?balance(222):history(222)});
 h.ok(0,balance(111));h.ok(1,history(111));await a;
 await flush();
 assert.doesNotMatch(h.el('walletSummary').textContent,/111/);
 assert.doesNotMatch(h.el('walletHistory').textContent,/111/);
 assert.ok(h.el('walletSummary').textContent.includes('222')||h.el('walletSection').hidden);
});

test('pagehide and hidden lifecycle immediately clear rendered private wallet',async()=>{
 const h=harness(),p=h.ui.refresh();
 h.ok(0,balance(111));h.ok(1,history(111));await p;
 h.event('window','pagehide');
 assert.equal(h.el('walletSummary').textContent,'');
 assert.equal(h.el('walletSection').hidden,true);
 h.auth('B');h.event('window','pageshow',{persisted:true});
 const calls=h.calls.filter(c=>c.options.headers.Authorization==='Bearer B');
 assert.equal(calls.length,2);
 for(const c of calls)c.resolve({ok:true,json:async()=>c.path.endsWith('/balance')?balance(222):history(222)});
 await flush();
 h.hide(true);h.event('document','visibilitychange');
 assert.equal(h.el('walletSummary').textContent,'');
 assert.equal(h.el('walletHistory').textContent,'');
});

test('logout or account switch never keeps an old wallet after an API failure',async()=>{
 const h=harness(),p=h.ui.refresh();
 h.ok(0,balance(111));h.ok(1,history(111));await p;
 h.auth('');h.event('window','storage',{key:'vv_token'});
 assert.equal(h.el('walletSection').hidden,true);
 assert.equal(h.el('walletHistory').textContent,'');
 h.auth('B');h.event('window','focus');
 const b=h.calls.filter(c=>c.options.headers.Authorization==='Bearer B');
 assert.equal(b.length,2);
 b[0].reject(Error('synthetic 503'));b[1].resolve({ok:true,json:async()=>history(111)});
 await flush();
 assert.doesNotMatch(h.el('walletSummary').textContent,/111/);
 assert.doesNotMatch(h.el('walletHistory').textContent,/111/);
});
