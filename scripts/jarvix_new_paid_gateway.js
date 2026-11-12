/**
 * JARVIX NEW paid voice backend (TEST ONLY). Optional; OFF by default.
 *
 * Everything that can spend money is behind server-side gates:
 *   verified logged-in subscriber -> reserved budget -> provider LLM ->
 *   approved owner-voice renderer -> confirmed capture.
 *
 * No browser-provided plan/model/provider/cost is ever trusted. No secrets
 * leave the Worker. NEVER use this module in DEEPSYQ production worker.
 * Integrators must connect a real, durable billing/entitlement service;
 * a static plan flag, JWT claim alone, or fake reservation is forbidden.
 */
const LANGS=new Set(['ru','en','fr','es']);
const PLANS=new Set(['basic','pro','business']);
const API_PREFIX='/api/jarvix-new/paid/';
const MAX_AUDIO_BYTES=2_000_000;
const MAX_MESSAGE=1200;
const MAX_HISTORY=6;

function json(body,status=200){
 return new Response(JSON.stringify(body),{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store','x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer'
 }});
}
function fail(code,status=503){return json({ok:false,error:code},status);}
function enabled(env){return env?.JARVIX_PAID_ENABLED==='true';}
function serverURL(raw){
 if(typeof raw!=='string')return null;
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:'||!u.hostname||u.username||u.password||u.hash||
     u.port||u.search||u.pathname==='/'||
     /^(?:localhost|.*\.localhost|.*\.local|.*\.internal)$/i.test(u.hostname)||
     /^(?:\d{1,3}\.){3}\d{1,3}$/.test(u.hostname)||
     u.hostname.includes(':'))return null;
  return u.href;
 }catch{return null;}
}
function config(env){
 const provider=serverURL(env?.JARVIX_MODEL_CHAT_URL);
 const verify=serverURL(env?.JARVIX_ENTITLEMENT_VERIFY_URL);
 const billing=serverURL(env?.JARVIX_BILLING_RESERVATION_URL);
 const voice=serverURL(env?.JARVIX_OWNER_VOICE_RENDER_URL);
 const voiceId=String(env?.JARVIX_OWNER_VOICE_ID||'');
 const apiKey=String(env?.JARVIX_MODEL_API_KEY||'');
 const entitlementKey=String(env?.JARVIX_ENTITLEMENT_SERVICE_KEY||'');
 const billingKey=String(env?.JARVIX_BILLING_SERVICE_KEY||'');
 const voiceKey=String(env?.JARVIX_OWNER_VOICE_API_KEY||'');
 const basic=String(env?.JARVIX_MODEL_BASIC||'');
 const pro=String(env?.JARVIX_MODEL_PRO||'');
 const business=String(env?.JARVIX_MODEL_BUSINESS||'');
 const budget=Number(env?.JARVIX_MAX_RESERVATION_CENTS);
 const maxTokens=Number(env?.JARVIX_MAX_OUTPUT_TOKENS);
 const validModel=m=>/^[A-Za-z0-9_.:/-]{2,120}$/.test(m);
 const validId=/^[A-Za-z0-9_-]{4,90}$/.test(voiceId);
 return {
  provider,verify,billing,voice,voiceId,apiKey,entitlementKey,billingKey,voiceKey,
  models:{basic,pro,business},
  budget,maxTokens,
  ready:!!(provider&&verify&&billing&&voice&&validId &&
    apiKey.length>=12&&entitlementKey.length>=12&&billingKey.length>=12&&voiceKey.length>=12&&
    [basic,pro,business].every(validModel) &&
    Number.isSafeInteger(budget)&&budget>=1&&budget<=1000&&
    Number.isInteger(maxTokens)&&maxTokens>=16&&maxTokens<=512)
 };
}
function bearer(request){
 const auth=request.headers.get('authorization')||'';
 const m=/^Bearer ([A-Za-z0-9._~-]{20,4096})$/.exec(auth);
 return m?m[1]:null;
}
function requestId(){
 return typeof crypto?.randomUUID==='function'?crypto.randomUUID():
  'r'+Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
}
async function externalPost(url,key,body,{timeout=10000,headers={}}={}){
 const control=new AbortController();
 const timer=setTimeout(()=>control.abort(),timeout);
 try{
  return await fetch(url,{method:'POST',headers:{
   'content-type':'application/json','authorization':'Bearer '+key,
   ...headers
  },body:JSON.stringify(body),signal:control.signal,redirect:'error',
   cache:'no-store'});
 }finally{clearTimeout(timer);}
}
async function safeJSON(response,limit=32_000){
 if(!response?.ok)return null;
 const length=Number(response.headers.get('content-length')||0);
 if(length>limit)return null;
 const t=await response.text();
 if(t.length>limit)return null;
 try{return JSON.parse(t);}catch{return null;}
}
async function verifySession(token,cfg){
 try{
  const response=await externalPost(cfg.verify,cfg.entitlementKey,
   {purpose:'jarvix-new-paid-access'},
   {headers:{'x-jarvix-user-session':token},timeout:6000});
  const data=await safeJSON(response);
  const plan=String(data?.plan||'').toLowerCase();
  if(data?.verified!==true||data?.active!==true||
     !PLANS.has(plan)||typeof data?.subjectId!=='string'||
     !/^[\w:-]{4,160}$/.test(data.subjectId))return null;
  return {subjectId:data.subjectId,plan};
 }catch{return null;}
}
async function billingAction(cfg,action,subscriber,requestKey,receipt){
 const request={action,requestId:requestKey,subjectId:subscriber.subjectId,
  plan:subscriber.plan,maxReservationCents:cfg.budget,
  purpose:'jarvix-new-owner-voice'};
 if(receipt)request.reservationId=receipt;
 const response=await externalPost(cfg.billing,cfg.billingKey,request,{timeout:7000});
 const data=await safeJSON(response,8192);
 if(!data)return null;
 if(action==='reserve'){
  if(data.allowed!==true||typeof data.reservationId!=='string'||
     !/^[A-Za-z0-9:_-]{8,180}$/.test(data.reservationId))return null;
  return data;
 }
 return data.ok===true?data:null;
}
function inputPayload(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||
   typeof data.message!=='string'||data.message.trim().length<1||
   data.message.length>MAX_MESSAGE||!LANGS.has(data.language))return null;
 const history=Array.isArray(data.history)?data.history:[];
 if(history.length>MAX_HISTORY)return null;
 const sanitized=[];
 for(const t of history){
  if(!t||!['user','assistant'].includes(t.role)||
     typeof t.content!=='string'||t.content.length>MAX_MESSAGE)return null;
  sanitized.push({role:t.role,content:t.content});
 }
 return {message:data.message.trim(),language:data.language,history:sanitized};
}
async function paidTurn(request,env,cfg){
 const token=bearer(request);
 if(!token)return fail('LOGIN_REQUIRED',401);
 const ent=await verifySession(token,cfg);
 if(!ent)return fail('PAID_SUBSCRIPTION_REQUIRED',403);
 let payload;
 try{
  if(Number(request.headers.get('content-length')||0)>7000)return fail('REQUEST_TOO_LARGE',413);
  payload=inputPayload(await request.json());
 }catch{return fail('INVALID_REQUEST',400);}
 if(!payload)return fail('INVALID_REQUEST',400);

 const receiptId=requestId();
 let reservation;
 try{reservation=await billingAction(cfg,'reserve',ent,receiptId);}
 catch{return fail('BILLING_UNAVAILABLE',503);}
 if(!reservation)return fail('CREDIT_OR_BUDGET_LIMIT',402);
 let captured=false;
 try{
  const model=cfg.models[ent.plan];
  const messages=[
   {role:'system',content:'You are JARVIX, the DEEPSYQ assistant. Answer naturally in '+payload.language+
     '. Be concise. Do not invent live availability, subscription terms, purchases, generated assets or credits. '+
     'Do not impersonate billing systems or promise refunds. If unsure, say so.'},
   ...payload.history,
   {role:'user',content:payload.message}
  ];
  const llm=await externalPost(cfg.provider,cfg.apiKey,
   {model,messages,temperature:0.5,max_tokens:cfg.maxTokens,stream:false},
   {timeout:22000});
  const llmData=await safeJSON(llm,96_000);
  const answer=llmData?.choices?.[0]?.message?.content;
  if(typeof answer!=='string'||!answer.trim()||answer.length>2100)
   return fail('MODEL_UNAVAILABLE_OR_INVALID',502);

  // Fail closed: JARVIX must NOT silently change into a generic voice.
  const speech=await externalPost(cfg.voice,cfg.voiceKey,
   {text:answer.trim(),language:payload.language,
    voiceId:cfg.voiceId,format:'mp3',sampleRate:48000},
   {timeout:20000});
  if(!speech.ok||!(speech.headers.get('content-type')||'').toLowerCase().startsWith('audio/mpeg')||
     speech.headers.get('x-jarvix-voice-id')!==cfg.voiceId)
   return fail('OWNER_VOICE_UNAVAILABLE',502);
  const buf=await speech.arrayBuffer();
  if(buf.byteLength<1000||buf.byteLength>MAX_AUDIO_BYTES)
   return fail('OWNER_VOICE_INVALID_AUDIO',502);
  const bytes=new Uint8Array(buf);
  if(!((bytes[0]===73&&bytes[1]===68&&bytes[2]===51)||
        (bytes[0]===255&&(bytes[1]&224)===224)))
   return fail('OWNER_VOICE_INVALID_AUDIO',502);

  const confirmation=await billingAction(cfg,'capture',ent,receiptId,reservation.reservationId);
  if(!confirmation)return fail('BILLING_CAPTURE_UNCONFIRMED',503);
  captured=true;
  // base64 is short-lived, not persisted or served as a public R2 asset.
  let binary='';for(let i=0;i<bytes.length;i+=8192)
   binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return json({ok:true,tier:ent.plan,provider:'configured-paid-model',
   voice:'jarvix-owner',language:payload.language,text:answer.trim(),
   audioBase64:btoa(binary),audioMime:'audio/mpeg'});
 }catch{return fail('PAID_VOICE_REQUEST_FAILED',502);}
 finally{
  // Never declare the user charged here; actual reserve/capture/release
  // MUST be durable and idempotent in the billing service.
  if(!captured)try{
   await billingAction(cfg,'release',ent,receiptId,reservation.reservationId);
  }catch{}
 }
}
export async function handleJarvixPaid(request,env){
 const url=new URL(request.url);
 if(!url.pathname.startsWith(API_PREFIX))return null;
 // Only TEST deployment may ever instantiate this module.
 if(url.hostname!=='jarvis-new.deepsyq.pages.dev')
  return fail('TEST_HOST_ONLY',404);
 const action=url.pathname.slice(API_PREFIX.length);
 if(action==='status'&&request.method==='GET'){
  return json({ok:true,enabled:enabled(env)&&config(env).ready,
   mode:enabled(env)&&config(env).ready?'paid-owner-voice':'free-prerecorded',
   plans:['basic','pro','business']});
 }
 if(!['access','turn'].includes(action))return fail('NOT_FOUND',404);
 if((action==='access'&&request.method!=='GET')||
    (action==='turn'&&request.method!=='POST'))return fail('METHOD_NOT_ALLOWED',405);
 if(!enabled(env))return fail('OWNER_HAS_NOT_ENABLED_PAID_AI',503);
 const cfg=config(env);
 if(!cfg.ready)return fail('OWNER_CONFIGURATION_INCOMPLETE',503);
 const token=bearer(request);
 if(!token)return fail('LOGIN_REQUIRED',401);
 if(action==='access'){
  const subscriber=await verifySession(token,cfg);
  if(!subscriber)return json({ok:true,allowed:false,mode:'free'});
  return json({ok:true,allowed:true,mode:'paid-owner-voice',tier:subscriber.plan});
 }
 return paidTurn(request,env,cfg);
}
