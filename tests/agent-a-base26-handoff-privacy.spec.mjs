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
