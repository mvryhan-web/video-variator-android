import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './jarvix-cloudflare-branch-worker.js';

const host='https://owner-f2-jarvix-unified-voic.deepsyq.pages.dev';
const env={ASSETS:{async fetch(request){return new Response('original static asset: '+new URL(request.url).pathname,{status:200});}}};
test('branch TEST worker preserves all original static assets, without modifying site-wide routes',async()=>{
 const r=await worker.fetch(new Request(host+'/jarvix-chat.html'),env);
 assert.equal(r.status,200);
 assert.match(await r.text(),/original static asset: \/jarvix-chat\.html/);
});
test('branch bridge routes existing JARVIX status/voice and chat to canonical TEST ONLY',async()=>{
 let calls=[];const native=globalThis.fetch;
 globalThis.fetch=async(request)=>{
  calls.push({url:request.url,method:request.method,origin:request.headers.get('origin')});
  return Response.json({ok:true,llm:{connected:true},speechModelInstalled:true});
 };
 try{
  for(const path of ['/api/jarvix/status','/api/jarvix/voice-config']){
   const r=await worker.fetch(new Request(host+path),env);
   assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);
  }
  const r=await worker.fetch(new Request(host+'/api/jarvix/chat',{method:'POST',
   headers:{'Origin':host,'Content-Type':'application/json'},body:JSON.stringify({message:'Привет'})}),env);
  assert.equal(r.status,200);
  assert.deepEqual(calls.map(x=>x.url),[
   'https://deepsyq.pages.dev/api/jarvix/status',
   'https://deepsyq.pages.dev/api/jarvix/voice-config',
   'https://deepsyq.pages.dev/api/jarvix/chat'
  ]);
  assert.equal(calls[2].origin,host,'do NOT falsify Origin to defeat upstream CSRF controls');
  assert.equal(calls[2].method,'POST');
 }finally{globalThis.fetch=native;}
});
test('branch bridge fails closed for billing/generation/admin/unknown routes and unexpected HTTP methods',async()=>{
 const forbidden=['/api/studio/jobs','/api/stripe/create-checkout-session','/api/me','/api/admin','/api/jarvix/unknown'];
 for(const path of forbidden){
  const res=await worker.fetch(new Request(host+path),env);
  assert.equal(res.status,403,path);
 }
 const method=await worker.fetch(new Request(host+'/api/jarvix/chat'),env);
 assert.equal(method.status,405);
 const foreign=await worker.fetch(new Request(host+'/api/jarvix/chat',{method:'POST',headers:{Origin:'https://malicious.example'},body:'{}'}),env);
 assert.equal(foreign.status,403);
 const big=await worker.fetch(new Request(host+'/api/jarvix/status?'+'a'.repeat(401)),env);
 assert.equal(big.status,400);
});
