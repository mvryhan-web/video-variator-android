import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync('scripts/jarvix_new_paid_gateway.js','utf8');
const {handleJarvixPaid}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const token='test_session_'+'X'.repeat(36);
const endpoint='https://jarvis-new.deepsyq.pages.dev/api/jarvix-new/paid/';
const cfg=()=>({
  JARVIX_PAID_ENABLED:'true',
  JARVIX_MODEL_CHAT_URL:'https://example.org/v1/chat/completions',
  JARVIX_ENTITLEMENT_VERIFY_URL:'https://auth.example.org/v1/verify',
  JARVIX_BILLING_RESERVATION_URL:'https://billing.example.org/v1/reserve',
  JARVIX_OWNER_VOICE_RENDER_URL:'https://voice.example.org/v1/tts',
  JARVIX_OWNER_VOICE_ID:'jarvix-owner-v3',
  JARVIX_MODEL_API_KEY:'only_in_backend_api_key_123',
  JARVIX_ENTITLEMENT_SERVICE_KEY:'only_in_backend_verify_key_123',
  JARVIX_BILLING_SERVICE_KEY:'only_in_backend_bill_key_123',
  JARVIX_OWNER_VOICE_API_KEY:'only_in_backend_voice_key_123',
  JARVIX_MODEL_BASIC:'test-basic',JARVIX_MODEL_PRO:'test-pro',JARVIX_MODEL_BUSINESS:'test-business',
  JARVIX_MAX_RESERVATION_CENTS:'15',JARVIX_MAX_OUTPUT_TOKENS:'128'
});
const request=(suffix,method='GET',body=undefined,headers={})=>new Request(endpoint+suffix,{method,
 headers:{...(method==='POST'?{'content-type':'application/json'}:{}),...headers},
 ...(body!==undefined?{body:JSON.stringify(body)}:{})});
const auth={Authorization:'Bearer '+token};
const post=(body,headers=auth)=>request('turn','POST',body,headers);
const input=(extra={})=>({message:'Скажи привет',language:'ru',history:[{role:'user',content:'Привет'}],...extra});
function mock({plan='pro',verified=true,active=true,modelOk=true,voiceOk=true,voiceId='jarvix-owner-v3',captureOk=true,reserveOk=true}={}){
 const calls=[];
 const old=global.fetch;
 global.fetch=async (url,options={})=>{
  let u=String(url),payload=JSON.parse(options.body||'{}');
  calls.push({url:u,action:payload.action||null,model:payload.model,voiceId:payload.voiceId,headers:options.headers,payload});
  if(u.includes('auth.example.org')){
   assert.equal(options.headers['x-jarvix-user-session'],token);
   return Response.json({verified,active,plan,subjectId:'user-4321'});
  }
  if(u.includes('billing.example.org')){
   if(payload.action==='reserve')return Response.json({allowed:reserveOk,reservationId:'reserve_abcdef1234'});
   if(payload.action==='capture')return Response.json({ok:captureOk});
   if(payload.action==='release')return Response.json({ok:true});
   throw Error('Unexpected billing action');
  }
  if(u.includes('example.org/v1/chat')){
   return modelOk?Response.json({choices:[{message:{content:'Привет! Я JARVIX.'}}]}):
     new Response('provider unavailable',{status:503});
  }
  if(u.includes('voice.example.org')){
   const bytes=new Uint8Array(1400).fill(12);
   bytes.set([73,68,51],0); // MP3 fixture header, not speech.
   return new Response(voiceOk?bytes:'NO_AUDIO',{status:voiceOk?200:503,
     headers:{'content-type':voiceOk?'audio/mpeg':'text/plain','x-jarvix-voice-id':voiceId}});
  }
  throw Error('Unexpected external URL '+u);
 };
 return {calls,restore(){global.fetch=old;}};
}
test('default OFF never calls any external service, even with user-supplied paid plan',async()=>{
 const m=mock();
 try{
  let r=await handleJarvixPaid(post(input({plan:'business',provider:'test'})),{});
  assert.equal(r.status,503);assert.deepEqual(m.calls,[]);
  let st=await handleJarvixPaid(request('status'),{});
  assert.equal(st.status,200);
  assert.equal((await st.json()).enabled,false);
 }finally{m.restore();}
});
test('incomplete secrets, malformed URLs or missing billing fail closed',async()=>{
 const m=mock();
 try{
  let e=cfg();delete e.JARVIX_BILLING_SERVICE_KEY;
  assert.equal((await handleJarvixPaid(post(input()),e)).status,503);
  e=cfg();e.JARVIX_MODEL_CHAT_URL='http://127.0.0.1/v1/chat/completions';
  assert.equal((await handleJarvixPaid(post(input()),e)).status,503);
  assert.deepEqual(m.calls,[]);
 }finally{m.restore();}
});
test('wrong hostname never routes provider, no matter flags',async()=>{
 const m=mock();
 try{
  let r=await handleJarvixPaid(new Request('https://deepsyq.app/api/jarvix-new/paid/status'),cfg());
  assert.equal(r.status,404);assert.deepEqual(m.calls,[]);
 }finally{m.restore();}
});
test('anonymous users denied before any external call',async()=>{
 const m=mock();
 try{assert.equal((await handleJarvixPaid(post(input(),{}),cfg())).status,401);
     assert.deepEqual(m.calls,[]);}finally{m.restore();}
});
test('inactive plan or trial can NEVER invoke paid provider',async()=>{
 for(const opt of [{plan:'trial'},{active:false},{verified:false}]){
  const m=mock(opt);
  try{
   assert.equal((await handleJarvixPaid(post(input({plan:'business'})),cfg())).status,403);
   assert.equal(m.calls.filter(x=>x.url.includes('chat')).length,0);
   assert.equal(m.calls.filter(x=>x.url.includes('billing')).length,0);
  }finally{m.restore();}
 }
});
test('verified paid plan is taken from server, not client, and uses reserved budget',async()=>{
 const m=mock();
 try{
  const r=await handleJarvixPaid(post(input({plan:'business',model:'hijacked-model'})),cfg());
  assert.equal(r.status,200);
  const body=await r.json();
  assert.equal(body.voice,'jarvix-owner');
  assert.equal(body.tier,'pro');
  assert.equal(body.text,'Привет! Я JARVIX.');
  assert.equal(Buffer.from(body.audioBase64,'base64').length,1400);
  const provider=m.calls.find(x=>x.url.includes('/chat/'));
  assert.equal(provider.model,'test-pro');
  assert.ok(!provider.payload.messages.some(x=>String(x.content).includes('hijacked-model')));
  const actions=m.calls.filter(x=>x.action).map(x=>x.action);
  assert.deepEqual(actions,['reserve','capture']);
  assert.equal(m.calls.find(x=>x.action==='reserve').payload.maxReservationCents,15);
 }finally{m.restore();}
});
test('access check does not reserve budget or trigger provider',async()=>{
 const m=mock({plan:'basic'});
 try{
  let r=await handleJarvixPaid(request('access','GET',undefined,auth),cfg());
  assert.equal(r.status,200);assert.equal((await r.json()).tier,'basic');
  assert.equal(m.calls.length,1);
  assert.ok(m.calls[0].url.includes('auth.example.org'));
 }finally{m.restore();}
});
test('budget refusal prevents all model and voice operations',async()=>{
 const m=mock({reserveOk:false});
 try{
  const r=await handleJarvixPaid(post(input()),cfg());
  assert.equal(r.status,402);
  assert.equal(m.calls.filter(x=>x.url.includes('/chat')).length,0);
  assert.equal(m.calls.filter(x=>x.url.includes('voice.example')).length,0);
 }finally{m.restore();}
});
test('provider failure releases unused reservation',async()=>{
 const m=mock({modelOk:false});
 try{
  const r=await handleJarvixPaid(post(input()),cfg());
  assert.equal(r.status,502);
  assert.deepEqual(m.calls.filter(x=>x.action).map(x=>x.action),['reserve','release']);
 }finally{m.restore();}
});
test('non-JARVIX voice fails closed and releases unused reservation',async()=>{
 const m=mock({voiceId:'generic-other-voice'});
 try{
  const r=await handleJarvixPaid(post(input()),cfg());
  assert.equal(r.status,502);
  assert.deepEqual(m.calls.filter(x=>x.action).map(x=>x.action),['reserve','release']);
 }finally{m.restore();}
});
test('capture uncertainty is NOT followed by potentially duplicate release',async()=>{
 const m=mock({captureOk:false});
 try{
  const r=await handleJarvixPaid(post(input()),cfg());
  assert.equal(r.status,503);
  assert.deepEqual(m.calls.filter(x=>x.action).map(x=>x.action),['reserve','capture']);
 }finally{m.restore();}
});
test('rejects oversized messages and invalid lang without allocating budget',async()=>{
 const m=mock();
 try{
  for(const body of [input({language:'de'}),input({message:'x'.repeat(1400)})]){
   assert.equal((await handleJarvixPaid(post(body),cfg())).status,400);
  }
  assert.equal(m.calls.filter(x=>x.action).length,0);
 }finally{m.restore();}
});

test('CosyVoice renders the model answer through the configured workspace before capture',async()=>{
 const m=mock();
 const fallback=global.fetch;
 const env={...cfg(),JARVIX_COSYVOICE_WORKSPACE_ID:'ws-fixture',
  JARVIX_COSYVOICE_API_KEY:'server_test_cosy_key',
  JARVIX_COSYVOICE_VOICE_ID:'cosyvoice-v3-plus-jarvixtest-fixture'};
 delete env.JARVIX_OWNER_VOICE_RENDER_URL;
 delete env.JARVIX_OWNER_VOICE_API_KEY;
 const sent=[];
 try{
  global.fetch=async(url,options)=>{
   if(!String(url).includes('maas.aliyuncs.com'))return fallback(url,options);
   assert.equal(options.headers.Upgrade,'websocket');
   assert.equal(options.headers.Authorization,'Bearer '+env.JARVIX_COSYVOICE_API_KEY);
   assert.ok(m.calls.some(c=>c.action==='reserve'));
   assert.ok(!m.calls.some(c=>c.action==='capture'));
   const ws=new EventTarget();
   ws.accept=()=>{};ws.close=()=>{};
   ws.send=raw=>{
    const msg=JSON.parse(raw);
    sent.push(msg);
    const emit=data=>ws.dispatchEvent(new MessageEvent('message',{data}));
    const event=name=>JSON.stringify({header:{event:name,task_id:msg.header.task_id}});
    if(msg.header.action==='run-task')queueMicrotask(()=>emit(event('task-started')));
    if(msg.header.action==='finish-task')queueMicrotask(()=>{
     const bytes=new Uint8Array(1400);bytes.set([73,68,51]);
     emit(bytes.buffer);emit(event('task-finished'));
    });
   };
   return {webSocket:ws};
  };
  const response=await handleJarvixPaid(post(input()),env);
  assert.equal(response.status,200);
  assert.equal((await response.json()).audioMime,'audio/mpeg');
  assert.equal(sent[0].payload.parameters.voice,env.JARVIX_COSYVOICE_VOICE_ID);
  assert.equal(sent[1].payload.input.text,'Привет! Я JARVIX.');
  assert.ok(m.calls.some(c=>c.action==='capture'));
 }finally{m.restore();}
});
