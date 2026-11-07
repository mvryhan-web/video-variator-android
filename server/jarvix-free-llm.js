/** Free-tier-only JARVIX LLM gateway. No billable OpenAI endpoints. */
import {createHmac} from 'node:crypto';
export const FREE_DAILY_LIMIT=15;
const REPLIES={
 ru:'Бесплатный дневной лимит общения на сегодня исчерпан. Возвращайтесь завтра или оформите подписку в разделе Тарифы для неограниченного доступа.',
 en:'Your free daily conversation limit is reached. Return tomorrow or see Pricing for available plans.',
 fr:'Votre limite quotidienne de conversations gratuites est atteinte. Revenez demain ou consultez les tarifs.',
 es:'Has alcanzado el límite diario de conversaciones gratuitas. Vuelve mañana o consulta los precios.'
};
const INSTRUCTIONS='Ты JARVIS — исполнительный лаконичный ассистент платформы Deepsyq. Отвечай кратко, ёмко, дружелюбно, максимум 1–2 предложения, подбирая подходящие действия на платформе. Не утверждай, что действие выполнено, если ты его не выполнил. Не совершай платежи.';
const keyOk=k=>typeof k==='string'&&k.trim().length>=20&&!/^(mock|test|dummy|placeholder)/i.test(k.trim());
const bounded=(v,defaultVal,upper)=>Number.isInteger(Number(v))&&Number(v)>0&&Number(v)<=upper?Number(v):defaultVal;
export function freeLlmStatus(env=process.env){
 const on=env.JARVIX_FREE_LLM_ENABLED==='true'&&env.JARVIX_FREE_LLM_DISABLE!=='true';
 const db=Boolean(env.JARVIX_QUOTA_DATABASE_URL&&keyOk(env.JARVIX_QUOTA_HASH_SECRET));
 const gemini=on&&db&&env.JARVIX_GEMINI_FREE_TIER_VERIFIED==='true'&&keyOk(env.GEMINI_API_KEY);
 const gptoss=on&&db&&env.JARVIX_GROQ_FREE_TIER_VERIFIED==='true'&&keyOk(env.GROQ_API_KEY);
 return {enabled:on&&db&&(gemini||gptoss),durableQuotaConfigured:db,
  freeDailyLimit:FREE_DAILY_LIMIT,providers:[...(gemini?['gemini-free']:[]),...(gptoss?['gpt-oss-groq-free']:[])]};
}
/** PostgreSQL enforces atomic limit even if multiple requests arrive simultaneously. */
export function createPgDailyQuota(pool,{secret,now=()=>Date.now(),env=process.env}={}){
 if(!pool||!keyOk(secret))throw Error('DURABLE_QUOTA_MISSING');
 let initialization;
 const hash=(kind,text)=>createHmac('sha256',secret).update(kind+'\0'+String(text)).digest('hex');
 async function ready(){
  if(!initialization)initialization=pool.query('SELECT 1 FROM jarvix_quota.jarvix_free_daily LIMIT 1').catch(e=>{initialization=null;throw e;});
  await initialization;
 }
 return {async reserve({identity,ip,provider}){
  if(!identity||!provider)throw Error('BAD_QUOTA_ID');
  await ready();
  const day=new Date(now()).toISOString().slice(0,10),resetAt=new Date(Date.parse(day+'T00:00:00.000Z')+86400000).toISOString();
  const scopes=[[hash('identity',identity),FREE_DAILY_LIMIT],[hash('ip',ip||'unknown'),bounded(env.JARVIX_FREE_IP_DAILY_LIMIT,90,500)],[hash('provider',provider),bounded(env.JARVIX_FREE_GLOBAL_DAILY_LIMIT,50,500)]];
  const client=await pool.connect();let ended=false;
  try{
   await client.query('BEGIN');let remaining=null;
   for(let i=0;i<scopes.length;i++){
    const [key,cap]=scopes[i];
    const q=await client.query('INSERT INTO jarvix_quota.jarvix_free_daily (quota_key,day,used) VALUES ($1,$2,1) ON CONFLICT(quota_key,day) DO UPDATE SET used=jarvix_free_daily.used+1 WHERE jarvix_free_daily.used<$3 RETURNING used',[key,day,cap]);
    if(!q.rows.length){await client.query('ROLLBACK');ended=true;return {allowed:false,remaining:0,resetAt};}
    if(i===0)remaining=FREE_DAILY_LIMIT-Number(q.rows[0].used);
   }
   await client.query('COMMIT');ended=true;
   return {allowed:true,remaining,resetAt};
  }catch(e){if(!ended)try{await client.query('ROLLBACK');}catch{}throw e;}
  finally{client.release();}
 }};
}
function choose(requested,enabled){
 if(requested==='gemini')return enabled.providers.includes('gemini-free')?'gemini':null;
 if(requested==='gpt-oss')return enabled.providers.includes('gpt-oss-groq-free')?'gpt-oss':null;
 return enabled.providers.includes('gemini-free')?'gemini':enabled.providers.includes('gpt-oss-groq-free')?'gpt-oss':null;
}
async function askFreeProvider(provider,{message,language,history,env,fetchImpl}){
 const context=(history||[]).slice(-6).filter(x=>['user','assistant'].includes(x.role)&&typeof x.content==='string')
  .map(x=>(x.role==='user'?'User: ':'JARVIS: ')+x.content.slice(0,700)).join('\n');
 const prompt=context+'\nUser: '+message.slice(0,2000)+'\nJARVIS:';
 const rules=INSTRUCTIONS+' Отвечай на языке '+language+'. Текст максимум 2 предложения.';
 let response,answer;
 if(provider==='gemini'){
  response=await fetchImpl('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
   headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
   body:JSON.stringify({systemInstruction:{parts:[{text:rules}]},
    contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.4,maxOutputTokens:180}})
  });
 }else{
  response=await fetchImpl('https://api.groq.com/openai/v1/chat/completions',{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.GROQ_API_KEY},
   body:JSON.stringify({model:'openai/gpt-oss-20b',messages:[{role:'system',content:rules},{role:'user',content:prompt}],temperature:0.4,max_completion_tokens:180})
  });
 }
 if(!response.ok)throw Error('FREE_PROVIDER_NOT_AVAILABLE');
 const data=await response.json();
 answer=provider==='gemini'?(data.candidates?.[0]?.content?.parts||[]).map(x=>x.text||'').join(''):data.choices?.[0]?.message?.content;
 return typeof answer==='string'?answer.trim().slice(0,500):'';
}
export function createFreeJarvix({env=process.env,fetchImpl=fetch,quotaStore=null}={}){
 return {
  status:()=>freeLlmStatus(env),
  async respond({message,language='ru',identity,ip,history=[],provider:preferred}={}){
   const provider=choose(preferred,freeLlmStatus(env));
   if(!provider||!quotaStore||!identity||!['ru','en','fr','es'].includes(language))return null;
   let allowance;try{allowance=await quotaStore.reserve({identity,ip,provider});}catch{return null;}
   if(!allowance.allowed)return {reply:REPLIES[language],provider:'quota',action:null,limitReached:true,
    freeDailyLimit:FREE_DAILY_LIMIT,remaining:0,resetAt:allowance.resetAt,pricingUrl:'/pricing.html'};
   try{
    const reply=await askFreeProvider(provider,{message,language,history,env,fetchImpl});
    return reply?{reply,provider:provider==='gemini'?'gemini-free':'gpt-oss-groq-free',
      action:null,limitReached:false,freeDailyLimit:FREE_DAILY_LIMIT,remaining:allowance.remaining,resetAt:allowance.resetAt}:null;
   }catch{return null;} // Never retry on a billable provider.
  }
 };
}
