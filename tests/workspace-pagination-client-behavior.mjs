import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../app/src/main/assets/my-creations.html',import.meta.url),'utf8');
const inline = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline, 'existing My Creations inline module');

function element(id = '') {
  return {
    id, dataset:{}, children:[], hidden:true, disabled:false, textContent:'',
    value:'', innerHTML:'', onclick:null,
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    setAttribute(name,value) { if(!this.attributes)this.attributes={}; this.attributes[name]=value; }
  };
}
function mockCard(i) {
  return {
    id:'item_'+String(i).padStart(3,'0'), title:'User image '+i,
    type:'image', status:'completed',createdAt:'2026-11-01T00:00:00.000Z',
    previewPlaceholder:{label:'Preview Available'}
  };
}
function harness({signedIn=true,pagingAvailable=true}={}) {
  const names=['wsStatus','cardsGrid','searchInput','typeSelect','statusSelect','refreshBtn',
    'wsLoadMore','cnt-recent','cnt-favorites','cnt-completed','cnt-drafts'];
  const ids=Object.fromEntries(names.map(id=>[id,element(id)]));
  const tabNames=['recent','favorites','completed','drafts'];
  const buttons=tabNames.map(s=>{const e=element();e.dataset.sec=s;return e;});
  const calls=[];
  let token = signedIn ? 'safe-token' : null;
  const legacyCards=Array.from({length:30},(_,i)=>mockCard(i));
  const legacy={
    sections:{recent:legacyCards,favorites:[legacyCards[0]],completed:legacyCards,drafts:[]},
    counts:{recent:30,favorites:1,completed:30,drafts:0}
  };
  const fetch=async (url,{headers}={})=>{
    calls.push({url,headers});
    const params=new URL(url,'https://deepsyq.example').searchParams;
    let data=legacy;
    if(params.has('section')&&pagingAvailable){
      const isNext=params.get('cursor')==='next_30';
      data={items:isNext?Array.from({length:5},(_,i)=>mockCard(i+30)):legacyCards,
        pageInfo:{hasMore:!isNext,nextCursor:isNext?null:'next_30',count:isNext?5:30}};
    }
    return {ok:true,json:async()=>structuredClone(data)};
  };
  const doc={
    getElementById(id){return ids[id] || null;},
    querySelectorAll(q){assert.equal(q,'[data-sec]');return buttons;},
    createElement(){return element();}
  };
  const context=vm.createContext({
    document:doc,localStorage:{getItem:k=>k==='vv_token'?token:null},
    fetch,URLSearchParams,Date,Set,Object,Array,Error,encodeURIComponent,prompt:()=>null,
    console
  });
  new vm.Script(inline,{filename:'my-creations.inline.js'}).runInContext(context,{timeout:2500});
  return {ids,buttons,calls,setToken(value){token=value;}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('F4 client: 30 initial + 5 next results, correct signed cursor, no duplicate cards',async()=>{
  const {ids,calls}=harness();
  await settle();
  await settle();
  assert.equal(ids.cardsGrid.children.length,30);
  assert.equal(ids.wsLoadMore.hidden,false,'load more appears after first page');
  assert.equal(typeof ids.wsLoadMore.onclick,'function');
  ids.wsLoadMore.onclick();
  await settle();
  await settle();
  assert.equal(ids.cardsGrid.children.length,35,'new results appended, not replaced');
  assert.equal(ids.wsLoadMore.hidden,true,'last page has no load-more');
  const pagedUrls=calls.filter(c=>c.url.includes('section=recent'));
  assert.equal(pagedUrls.length,2);
  assert.ok(pagedUrls[1].url.includes('cursor=next_30'));
  assert.ok(pagedUrls.every(c=>c.url.includes('pageSize=30')));
  assert.ok(calls.every(c=>c.headers.Authorization==='Bearer safe-token'));
  assert.ok(calls.every(c=>!c.url.includes('userId=')),'never send client-controlled owner ID');
});

test('F4 client: a legacy-only server still renders existing saved works',async()=>{
  const {ids,calls}=harness({pagingAvailable:false});
  await settle();await settle();
  assert.equal(ids.cardsGrid.children.length,30);
  assert.equal(ids.wsLoadMore.hidden,true);
  assert.equal(calls.length,2,'legacy followed by one safe optional enhancement request');
});

test('F4 client: favorites remain a legacy section without W4.4 mutation',async()=>{
  const {ids,buttons,calls}=harness();
  await settle();await settle();
  buttons[1].onclick();
  assert.equal(ids.cardsGrid.children.length,1);
  assert.equal(ids.wsLoadMore.hidden,true);
  assert.equal(calls.filter(c=>c.url.includes('section=favorites')).length,0);
});

test('F4 client: signed-out view remains private, with no network call',async()=>{
  const {ids,calls}=harness({signedIn:false});
  await settle();
  assert.equal(calls.length,0);
  assert.equal(ids.wsLoadMore.hidden,true);
  assert.ok(ids.cardsGrid.children[0].innerHTML.includes('Sign in to view your creations'));
});


test('F4 client: logging out immediately clears previous account card memory',async()=>{
  const {ids,buttons,calls,setToken}=harness();
  await settle();await settle();
  assert.equal(ids.cardsGrid.children.length,30);
  setToken(null);
  ids.refreshBtn.onclick();
  assert.equal(ids.cardsGrid.children.length,1);
  for (const section of ['recent','favorites','completed','drafts']) assert.equal(ids['cnt-'+section].textContent,'0');
  assert.ok(ids.cardsGrid.children[0].innerHTML.includes('Sign in to view your creations'));
  buttons[2].onclick();
  assert.equal(ids.cardsGrid.children.length,1,'must not restore previous users cards on tab switch');
  assert.equal(calls.length,2,'logout does not contact authenticated endpoint');
});
