import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app/src/main/assets/generate-studio.js',import.meta.url),'utf8');
const boundary=source.slice(source.indexOf('// A Studio document belongs'),source.indexOf('\nlet aiBilling='));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
function harness(){
 let auth='A',reloads=0,revoked=[],calls=[],listeners={},tick;
 class El{constructor(){this.value='private';this.checked=true;this.textContent='private';this.hidden=false;this.children=[];}replaceChildren(){this.children=[];this.textContent='';}querySelectorAll(){return [];}}
 const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new El());return nodes.get(id);};
 const session=new Map([['image-A','private'],['video-A','private'],['vu_generation_job','old-job'],['vu_generation_background_job','old-job'],['deepsyq_template_start','private'],['deepsyq_studio_handoff_id','old-handoff']]);
 const add=(k,f)=>{(listeners[k]||=[]).push(f);};
 const ctx={$:el,console,Error,Set,Object,AbortController,Response,URL:{revokeObjectURL:u=>revoked.push(u)},localStorage:{getItem:()=>auth},sessionStorage:{removeItem:k=>session.delete(k),setItem:(k,v)=>session.set(k,v)},document:{hidden:false,body:{inert:false,style:{}},getElementById:el,querySelectorAll:()=>[],addEventListener:add},window:{addEventListener:add},location:{reload:()=>reloads++},clearTimeout:()=>{},setInterval:f=>tick=f,apiBase:()=>'',clearResult:()=>{el('media').replaceChildren();},clearHistoryMediaPreview:()=>{},clearHistoryThumbs:()=>{},fetch:(path,options)=>{const d=deferred();calls.push({path,options,...d});return d.promise;}};
 vm.createContext(ctx);vm.runInContext("let generation=0,historyLoadEpoch=0,estimateTimer=null,estimateSignature='x',imageDraftReady=true,videoDraftReady=true,refs=['old'],job='old',busy=true,activeVideoWatchId='old',imageDraftKey='image-A',videoDraftKey='video-A';const drafts={image:{prompt:'private'}};"+boundary+'\nglobalThis.boundary={api,ensureStudioAccount,state:()=>({generation,historyLoadEpoch,refs,drafts,job,busy,imageDraftReady,videoDraftReady})};',ctx);
 return{ctx,el,calls,session,auth:v=>auth=v,event:(k,e={})=>(listeners[k]||[]).forEach(f=>f(e)),tick:()=>tick(),reloads:()=>reloads,ui:ctx.boundary};
}
test('account storage event immediately scrubs prompt refs history consent and wallet',()=>{const h=harness();h.auth('B');h.event('storage',{key:'vv_token'});for(const id of ['prompt','references'])assert.equal(h.el(id).value,'');for(const id of ['historyList','walletSummary','walletHistory','creditPacks'])assert.equal(h.el(id).textContent,'');assert.equal(h.el('consent').checked,false);assert.equal(h.ctx.document.body.inert,true);assert.equal(h.reloads(),1);assert.deepEqual([...h.session.keys()],['deepsyq_studio_account_reset_notice']);});
test('same account focus retains editor and does not reload',()=>{const h=harness();h.event('focus');assert.equal(h.el('prompt').value,'private');assert.equal(h.reloads(),0);});
test('silent rotation is caught before click dispatch',()=>{const h=harness();h.auth('B');let prevented=0,stopped=0;h.event('click',{preventDefault:()=>prevented++,stopImmediatePropagation:()=>stopped++});assert.equal(prevented,1);assert.equal(stopped,1);assert.equal(h.calls.length,0);});
test('periodic guard catches silent same-tab rotation',()=>{const h=harness();h.auth('B');h.tick();assert.equal(h.reloads(),1);assert.equal(h.el('prompt').value,'');});
test('pagehide freezes private DOM while preserving same-account saved drafts',()=>{const h=harness();h.event('pagehide');assert.equal(h.ctx.document.body.style.visibility,'hidden');assert.equal(h.el('prompt').value,'');assert.ok(h.session.has('image-A'));assert.equal(h.ui.ensureStudioAccount(),false);});
test('persisted pageshow reloads clean context and removes cross-account pointers',()=>{const h=harness();h.event('pagehide');h.auth('B');h.event('pageshow',{persisted:true});assert.equal(h.reloads(),1);assert.equal(h.session.size,0);});
test('private request uses document account and bypasses cache',async()=>{const h=harness(),p=h.ui.api('/api/studio/jobs');assert.equal(h.calls[0].options.headers.Authorization,'Bearer A');assert.equal(h.calls[0].options.cache,'no-store');h.calls[0].resolve(new Response('{}'));const r=await p;await r.json();});
test('late fetch response from old document is rejected and aborted',async()=>{const h=harness(),p=h.ui.api('/api/studio/jobs');h.auth('B');h.calls[0].resolve(new Response('{}'));await assert.rejects(p,/STUDIO_ACCOUNT_CHANGED/);assert.equal(h.calls[0].options.signal.aborted,true);assert.equal(h.reloads(),1);});
test('token change during JSON parsing rejects body before rendering',async()=>{const h=harness(),body=deferred(),p=h.ui.api('/api/studio/jobs');h.calls[0].resolve({ok:true,json:()=>body.promise,blob:async()=>new Blob()});const r=await p;const read=r.json();h.auth('B');body.resolve({prompt:'private'});await assert.rejects(read,/STUDIO_ACCOUNT_CHANGED/);});
test('old image Blob cannot return after rotation',async()=>{const h=harness(),body=deferred(),p=h.ui.api('/api/studio/jobs/id/media');h.calls[0].resolve({ok:true,json:async()=>({}),blob:()=>body.promise});const r=await p;const read=r.blob();h.auth('B');body.resolve({private:true});await assert.rejects(read,/STUDIO_ACCOUNT_CHANGED/);});
test('all outstanding account requests are aborted together',async()=>{const h=harness(),a=h.ui.api('/api/studio/jobs'),b=h.ui.api('/api/ai-wallet/balance');h.auth('B');h.event('focus');assert.ok(h.calls.every(x=>x.options.signal.aborted));for(const c of h.calls)c.reject(Error('aborted'));await Promise.allSettled([a,b]);});
test('frozen old document cannot issue mutations using B credentials',async()=>{const h=harness();h.auth('B');await assert.rejects(h.ui.api('/api/studio/jobs/A',{method:'DELETE'}),/STUDIO_ACCOUNT_CHANGED/);assert.equal(h.calls.length,0);});
test('delayed local photo preparation cannot restore references after account rotation',async()=>{
 const h=harness(),prepared=deferred();
 h.ctx.currentModel=()=>({references:3});h.ctx.prepareReferenceUpload=()=>prepared.promise;h.ctx.availability=()=>{};h.ctx.say=x=>x;h.ctx.errorText=()=>'';h.ctx.cropApplying=false;h.ctx.renderRefs=()=>{throw Error('stale references rendered');};
 const fn=source.slice(source.indexOf('async function acceptFiles('),source.indexOf("$('references').onchange="));
 vm.runInContext('busy=false;refs=[];'+fn+'\nglobalThis.accept=acceptFiles;',h.ctx);
 const pending=h.ctx.accept([{name:'private.png'}]);h.auth('B');prepared.resolve({file:{},optimized:false});assert.equal(await pending,false);assert.equal(h.ui.state().refs.length,0);assert.equal(h.el('refPreview').textContent,'');
});
test('delayed image conversion cannot restore prior prompt or image reference',async()=>{
 const h=harness(),converted=deferred();h.ctx.imageResultReference=()=>converted.promise;h.ctx.select=()=>{throw Error('old conversion selected new composer');};h.ctx.currentModel=()=>({references:3});
 const fn=source.slice(source.indexOf('async function useResultAsImageReference('),source.indexOf("$('continueImage').onclick="));
 vm.runInContext(fn+'\nglobalThis.reuse=useResultAsImageReference;',h.ctx);
 const pending=h.ctx.reuse({},{suggestedPrompt:'PRIVATE_OLD_PROMPT'});h.auth('B');converted.resolve({});await assert.rejects(pending,/STUDIO_ACCOUNT_CHANGED/);assert.equal(h.el('prompt').value,'');
});
