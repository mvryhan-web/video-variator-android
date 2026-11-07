import test from 'node:test';
import assert from 'node:assert/strict';
import {FREE_DAILY_LIMIT,freeLlmStatus,createFreeJarvix} from '../server/jarvix-free-llm.js';
const env={JARVIX_FREE_LLM_ENABLED:'true',JARVIX_QUOTA_DATABASE_URL:'postgresql://example',
 JARVIX_QUOTA_HASH_SECRET:'quota-test-secret-'.repeat(3),
 JARVIX_GEMINI_FREE_TIER_VERIFIED:'true',GEMINI_API_KEY:'gemini-free-test-key-123456',
 JARVIX_GROQ_FREE_TIER_VERIFIED:'true',GROQ_API_KEY:'groq-free-test-key-123456'};
function quota(){const used=new Map();return {async reserve({identity}){const n=(used.get(identity)||0)+1;used.set(identity,n);return {allowed:n<=FREE_DAILY_LIMIT,remaining:Math.max(0,FREE_DAILY_LIMIT-n),resetAt:'2026-11-08T00:00:00.000Z'};}};}
test('never call external model without all free tier and durable quota flags',async()=>{
 for(const patch of [{JARVIX_FREE_LLM_ENABLED:'false'},{JARVIX_QUOTA_DATABASE_URL:''},
  {JARVIX_GEMINI_FREE_TIER_VERIFIED:'false',JARVIX_GROQ_FREE_TIER_VERIFIED:'false'},
  {GEMINI_API_KEY:'',GROQ_API_KEY:''}]){
  let calls=0;const obj=createFreeJarvix({env:{...env,...patch},quotaStore:quota(),fetchImpl:()=>{calls++;throw Error('paid');}});
  assert.equal(await obj.respond({message:'Hi',identity:'visitor:1',language:'en'}),null);
  assert.equal(calls,0);
 }
 assert.equal(freeLlmStatus({OPENAI_API_KEY:'sk-some-paid-key'}).enabled,false);
});
test('15 per visitor, 16th has exact zero calls and pricing notice',async()=>{
 let calls=0;const obj=createFreeJarvix({env,quotaStore:quota(),fetchImpl:async(url,opts)=>{
  calls++;assert.match(url,/gemini-3\.5-flash-lite:generateContent/);
  assert.ok(!JSON.stringify(opts.body).includes(env.GEMINI_API_KEY));
  return Response.json({candidates:[{content:{parts:[{text:'Ready to help.'}]}}]});
 }});
 for(let i=0;i<15;i++){const result=await obj.respond({message:'Hi',identity:'visitor:1',language:'ru'});assert.equal(result.provider,'gemini-free');assert.equal(result.remaining,14-i);}
 const next=await obj.respond({message:'Hi',identity:'visitor:1',language:'ru'});
 assert.equal(next.limitReached,true);assert.equal(next.pricingUrl,'/pricing.html');assert.equal(calls,15);
 const other=await obj.respond({message:'Hi',identity:'visitor:2',language:'ru'});assert.equal(other.provider,'gemini-free');
});
test('OpenAI open-weight GPT-OSS via Groq free; not paid OpenAI API',async()=>{
 const urls=[];const obj=createFreeJarvix({env,quotaStore:quota(),fetchImpl:async(url,opts)=>{urls.push(url);assert.equal(JSON.parse(opts.body).model,'openai/gpt-oss-20b');return Response.json({choices:[{message:{content:'Bonjour !'}}]});}});
 const result=await obj.respond({message:'Bonjour',identity:'visitor:1',language:'fr',provider:'gpt-oss'});
 assert.equal(result.provider,'gpt-oss-groq-free');assert.deepEqual(urls,['https://api.groq.com/openai/v1/chat/completions']);
});
test('quota backend unavailable always blocks provider call',async()=>{
 let n=0;const service=createFreeJarvix({env,quotaStore:{async reserve(){throw Error('db unavailable');}},fetchImpl:async()=>{n++;return Response.json({});}});
 assert.equal(await service.respond({message:'hello',identity:'visitor:1'}),null);assert.equal(n,0);
});

test('simultaneous attempts allow at most fifteen free provider requests per visitor',async()=>{
 let calls=0,n=0;
 const store={async reserve(){n++;return {allowed:n<=15,remaining:Math.max(0,15-n),resetAt:'2026-11-08T00:00:00.000Z'};}};
 const obj=createFreeJarvix({env,quotaStore:store,fetchImpl:async()=>{calls++;return Response.json({candidates:[{content:{parts:[{text:'Ready.'}]}}]});}});
 const results=await Promise.all(Array.from({length:20},()=>obj.respond({identity:'same-visitor',message:'Hi',language:'en'})));
 assert.equal(calls,15);
 assert.equal(results.filter(x=>x.limitReached).length,5);
 assert.equal(results.filter(x=>x.provider==='gemini-free').length,15);
});

test('Runtime quota SQL is schema-scoped and will not create tables with a privileged role',async()=>{
 const {createPgDailyQuota}=await import('../server/jarvix-free-llm.js');
 const calls=[];
 const client={async query(sql){calls.push(sql);if(sql.startsWith('INSERT INTO'))return {rows:[{used:1}]};return {rows:[]};},release(){}};
 const pool={async query(sql){calls.push(sql);return {rows:[]};},async connect(){return client;}};
 const store=createPgDailyQuota(pool,{secret:'secret-'.repeat(8)});
 const result=await store.reserve({identity:'visitor:one',ip:'127.0.0.1',provider:'gemini'});
 assert.equal(result.allowed,true);assert.equal(result.remaining,14);
 assert.ok(calls.some(sql=>sql.startsWith('SELECT 1 FROM jarvix_quota.jarvix_free_daily')));
 assert.equal(calls.filter(sql=>sql.startsWith('INSERT INTO jarvix_quota.jarvix_free_daily')).length,3);
 assert.equal(calls.some(sql=>sql.toUpperCase().includes('CREATE TABLE')),false);
});

test('Free Gemini system prompt describes verified DEEPSYQ features without inventing financial markets',async()=>{
 let instruction='';
 const obj=createFreeJarvix({env,quotaStore:quota(),fetchImpl:async(_,options)=>{
   const data=JSON.parse(options.body);instruction=data.systemInstruction.parts[0].text;
   return Response.json({candidates:[{content:{parts:[{text:'DEEPSYQ предлагает Image Studio и Video Studio.'}]}}]});
 }});
 const response=await obj.respond({message:'Какие возможности у DEEPSYQ?',language:'ru',identity:'user:test'});
 assert.equal(response.provider,'gemini-free');
 for(const item of ['Image Studio','Video Studio','Audio Studio','Canvas','AI Apps','Everyday Tools','Video Uniquifier']){
   assert.ok(instruction.includes(item),item);
 }
 assert.match(instruction,/не приписывай ей анализ финансовых рынков/i);
});
test('Voice Review Studio displays free Gemini status rather than stale LLM disconnected label',async()=>{
 const {readFile}=await import('node:fs/promises');
 const page=await readFile(new URL('../app/src/main/assets/jarvix-studio-page.js',import.meta.url),'utf8');
 assert.match(page,/status\.freeLlm\?\.enabled/);
 assert.match(page,/Gemini Free включена для JARVIX/);
});

test('JARVIX safe action router covers existing DEEPSYQ tools without paid endpoints',async()=>{
 const {extractAction,ACTION_ROUTES}=await import('../app/src/main/assets/jarvix-action-plan.js');
 const cases=[
  ['Открой Video Studio','video'],['Открой Image Studio','image'],['Открой Audio Studio','audio'],
  ['Открой мои работы','history'],['Открой Canvas','canvas'],['Открой AI Apps','apps'],
  ['Открой инструменты','tools'],['Открой тарифы','pricing'],['Покажи вдохновение','inspiration'],
  ['Открой уникализатор видео','uniquifier'],['Открой телесуфлёр','teleprompter'],
  ['Открой удаление фона','background'],['Открой фото в PDF','pdf'],
  ['Открой коллаж','collage'],['Открой умные напоминания','reminders'],
  ['Открой аватар студию','avatar'],['Открой сравнение моделей','compare'],
  ['Открой виртуального питомца','pets'],['Открой политику конфиденциальности','privacy'],
  ['Открой Audio Trim','audioTools'],['Open the home page','home']
 ];
 for(const [input,target] of cases){
  const a=extractAction(input);
  assert.ok(a,input);assert.equal(a.intent,'NAVIGATE',input);assert.equal(a.target,target,input);
  assert.equal(a.url,ACTION_ROUTES[target],input);
  assert.match(a.url,/^[a-z-]+\.html(?:[?#].*)?$/i);
 }
 for(const [target,url] of Object.entries(ACTION_ROUTES)){
  const page=url.split(/[?#]/)[0];
  assert.match(await (await import('node:fs/promises')).readFile(new URL('../app/src/main/assets/'+page,import.meta.url),'utf8'),/<html/i,target);
  assert.ok(!/admin|billing|checkout|charge/i.test(url),target);
 }
});
test('JARVIX text media commands prepare Studios and never auto bill or falsely claim generation',async()=>{
 const {extractAction}=await import('../app/src/main/assets/jarvix-action-plan.js');
 for(const [input,target,keyword] of [
  ['Создай видео про китов 9:16','video','китов'],
  ['Создай фотографию горного озера','image','горного'],
  ['Сделай музыку про море','audio','море'],
  ['Generate image of a mountain','image','mountain']
 ]){
  const a=extractAction(input);assert.ok(a,input);assert.equal(a.intent,'GENERATE_MEDIA');
  assert.equal(a.target,target);assert.ok(a.raw_prompt.toLowerCase().includes(keyword),input);
 }
 assert.equal(extractAction('Создай видео про китов 9:16').aspect_ratio,'9:16');
 for(const text of ['Как создать видео?','Что ты умеешь?','Сколько стоит видео?','Напиши текст про фото','Оплати подписку','Спиши 100 долларов','Удалить базу данных']){
  assert.equal(extractAction(text),null,text);
 }
 const {readFile}=await import('node:fs/promises');
 const chat=await readFile(new URL('../app/src/main/assets/jarvix-chat.js',import.meta.url),'utf8');
 assert.match(chat,/command\?\.intent==='NAVIGATE'/);
 assert.match(chat,/command\?\.intent==='GENERATE_MEDIA'/);
 assert.match(chat,/saveStudioHandoff\(/);
 assert.match(chat,/message\.mode==='auto'\?'text':resolveMode/);
 assert.match(chat,/No generation or credit charge has started/);
 assert.match(chat,/Number\(quote\.credits\)!==0/);
 assert.match(chat,/consent:false/);
});
