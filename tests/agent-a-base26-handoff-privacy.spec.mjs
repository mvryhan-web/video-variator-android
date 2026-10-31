import {test,expect} from '@playwright/test';

test('BASE 26: cross-account Studio handoff cannot reveal another user prompt or reference photo',async({page})=>{
 let paidPosts=0;
 page.on('request',request=>{if(request.method()==='POST'&&/\/api\/studio\/jobs(?:\?|$)/.test(request.url()))paidPosts++;});
 // Keep the real module, origin, IndexedDB and localStorage, but exclude
 // unrelated Home auth initialization from this deterministic unit-in-browser test.
 await page.route('**/deepsyq.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Private handoff fixture</title></head><body></body></html>'}));
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 const actual=await page.evaluate(async()=>{
  const {saveStudioHandoff,takeStudioHandoff}=await import('/studio-handoff.js');
  const photo=new File([new Uint8Array([137,80,78,71,13,10,26,10,1,2,3,4])],'private-a.png',{type:'image/png'});
  localStorage.setItem('vv_token','synthetic-A');
  await saveStudioHandoff({kind:'image',prompt:'PRIVATE ACCOUNT A DESIGN',files:[photo],source:'base26-privacy-test'});
  const aPointer=sessionStorage.getItem('deepsyq_studio_handoff_id');
  localStorage.setItem('vv_token','synthetic-B');
  const bAttempt=await takeStudioHandoff();
  const consumed=sessionStorage.getItem('deepsyq_studio_handoff_id')===null;
  localStorage.setItem('vv_token','synthetic-A');
  const aAfterB=await takeStudioHandoff();
  return {hadRandomPointer:!!aPointer,exposedToB:bAttempt!==null,consumed,exposedAfterConsumption:aAfterB!==null};
 });
 expect(actual).toEqual({hadRandomPointer:true,exposedToB:false,consumed:true,exposedAfterConsumption:false});
 expect(paidPosts).toBe(0);
});

test('BASE 26: same account can consume a local handoff once without storing raw bearer token',async({page})=>{
 // Keep the real module, origin, IndexedDB and localStorage, but exclude
 // unrelated Home auth initialization from this deterministic unit-in-browser test.
 await page.route('**/deepsyq.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Private handoff fixture</title></head><body></body></html>'}));
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 const state=await page.evaluate(async()=>{
  const {saveStudioHandoff,takeStudioHandoff}=await import('/studio-handoff.js');
  localStorage.setItem('vv_token','synthetic-owner-token-secret');
  const original=new File([new Uint8Array([137,80,78,71,13,10,26,10,10,20])],'reference.png',{type:'image/png'});
  await saveStudioHandoff({kind:'image',prompt:'PRIVATE AUTHORIZED HANDOFF',files:[original],source:'base26-privacy-test'});
  const first=await takeStudioHandoff(),second=await takeStudioHandoff();
  return {prompt:first?.prompt||'',fileType:first?.files?.[0]?.type||'',
   fileBytes:first?.files?.[0]?.size||0,oneTime:second===null,
   fingerprintIsHash:/^[0-9a-f]{64}$/.test(first?.ownerFingerprint||''),
   storedRawToken:JSON.stringify(first||{}).includes('synthetic-owner-token-secret'),
   pointerGone:sessionStorage.getItem('deepsyq_studio_handoff_id')===null};
 });
 expect(state).toEqual({prompt:'PRIVATE AUTHORIZED HANDOFF',fileType:'image/png',fileBytes:10,
  oneTime:true,fingerprintIsHash:true,storedRawToken:false,pointerGone:true});
});

test('BASE 26: legacy IndexedDB handoff without account binding is rejected and consumed',async({page})=>{
 // Keep the real module, origin, IndexedDB and localStorage, but exclude
 // unrelated Home auth initialization from this deterministic unit-in-browser test.
 await page.route('**/deepsyq.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Private handoff fixture</title></head><body></body></html>'}));
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async()=>{
  localStorage.setItem('vv_token','account-B');
  const id='legacy-unscoped-test';
  await new Promise((resolve,reject)=>{
   const request=indexedDB.open('deepsyq-studio-handoff-v1',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('handoffs',{keyPath:'id'});
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
    const db=request.result,tx=db.transaction('handoffs','readwrite');
    tx.objectStore('handoffs').put({id,kind:'image',prompt:'PREVIOUS ACCOUNT PRIVATE',
      createdAt:Date.now(),expiresAt:Date.now()+60000,files:[]});
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onerror=()=>reject(tx.error);
   };
  });
  sessionStorage.setItem('deepsyq_studio_handoff_id',id);
  const {takeStudioHandoff}=await import('/studio-handoff.js');
  const got=await takeStudioHandoff();
  return {noLeak:got===null,pointerRemoved:sessionStorage.getItem('deepsyq_studio_handoff_id')===null};
 });
 expect(result).toEqual({noLeak:true,pointerRemoved:true});
});


test('BASE 26 A15: logout/account switch while reading private references aborts async save without handing A data to B',async({page})=>{
 let paidPosts=0;
 page.on('request',request=>{if(request.method()==='POST'&&/\/api\/studio\/jobs(?:\?|$)/.test(request.url()))paidPosts++;});
 await page.route('**/deepsyq.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Private async handoff fixture</title></head><body></body></html>'}));
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async()=>{
  const {saveStudioHandoff,takeStudioHandoff}=await import('/studio-handoff.js');
  localStorage.setItem('vv_token','owner-account-A');
  const photo=new File([new Uint8Array([137,80,78,71,13,10,26,10])],'account-A-private.png',{type:'image/png'});
  let serializationStarted,finishRead;
  const reading=new Promise(resolve=>serializationStarted=resolve);
  const waiting=new Promise(resolve=>finishRead=resolve);
  // Hold the real code at File.arrayBuffer() without faking IndexedDB or the
  // fingerprint logic. A→B happens before the async save may write its record.
  Object.defineProperty(photo,'arrayBuffer',{value:async()=>{
   serializationStarted();
   await waiting;
   return new Uint8Array([137,80,78,71,13,10,26,10]).buffer;
  }});
  const saving=saveStudioHandoff({kind:'image',prompt:'OWNER A ASYNC PRIVATE IDEA',files:[photo],source:'a15-async-race'})
   .then(()=>({accepted:true}),error=>({accepted:false,error:error.message}));
  await reading;
  localStorage.setItem('vv_token','owner-account-B');
  finishRead();
  const outcome=await saving;
  const exposed=await takeStudioHandoff();
  const pointerGone=sessionStorage.getItem('deepsyq_studio_handoff_id')===null;
  localStorage.setItem('vv_token','owner-account-A');
  const aAfter=await takeStudioHandoff();
  return {outcome,exposedToB:exposed!==null,pointerGone,replayedToA:aAfter!==null};
 });
 expect(result).toEqual({
  outcome:{accepted:false,error:'LOCAL_HANDOFF_SESSION_CHANGED'},
  exposedToB:false,pointerGone:true,replayedToA:false
 });
 expect(paidPosts).toBe(0);
});

test('BASE 26 A15: unconsumed A handoff does not survive as B-visible content after reload and logout',async({page})=>{
 let paidPosts=0;
 page.on('request',request=>{if(request.method()==='POST'&&/\/api\/studio\/jobs(?:\?|$)/.test(request.url()))paidPosts++;});
 await page.route('**/deepsyq.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Private reload handoff fixture</title></head><body></body></html>'}));
 await page.goto('/deepsyq.html',{waitUntil:'domcontentloaded'});
 const saved=await page.evaluate(async()=>{
  localStorage.setItem('vv_token','account-A-refresh');
  const {saveStudioHandoff}=await import('/studio-handoff.js');
  const photo=new File([new Uint8Array([1,2,3,4])],'private-photo-A.png',{type:'image/png'});
  await saveStudioHandoff({kind:'image',prompt:'SECRET ACCOUNT A AFTER RELOAD',files:[photo],source:'a15-reload'});
  return !!sessionStorage.getItem('deepsyq_studio_handoff_id');
 });
 expect(saved).toBe(true);
 // Same browser tab, but a newly authenticated account B sees the pointer
 // left by A. A successful take would expose A's prompt AND reference bytes.
 await page.evaluate(()=>{localStorage.removeItem('vv_token');localStorage.setItem('vv_token','account-B-refresh');});
 await page.reload({waitUntil:'domcontentloaded'});
 const fromB=await page.evaluate(async()=>{
  const {takeStudioHandoff}=await import('/studio-handoff.js');
  const found=await takeStudioHandoff();
  return {hasASecret:found!==null,pointerGone:sessionStorage.getItem('deepsyq_studio_handoff_id')===null};
 });
 expect(fromB).toEqual({hasASecret:false,pointerGone:true});
 await page.evaluate(()=>localStorage.setItem('vv_token','account-A-refresh'));
 await page.reload({waitUntil:'domcontentloaded'});
 expect(await page.evaluate(async()=>{
  const {takeStudioHandoff}=await import('/studio-handoff.js');
  return (await takeStudioHandoff())===null;
 })).toBe(true);
 expect(paidPosts).toBe(0);
});
