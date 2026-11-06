/* Account entitlements only. Never sends source files, recordings or text. */
(() => {
 'use strict';
 const minimum={photo:null,audio:null,prompter:null,photo_batch:'basic',video:'basic',clips:'pro',motion:'pro',tts:'pro',stt:'pro'};
 const language=(navigator.languages?.[0]||navigator.language||'en').slice(0,2);
 const words={en:{title:'Everyday Tools',free:'Free',single:'Free single photo · Basic batches',included:'Included',trial:'trial available',locked:'subscription required',login:'Sign in to use your five trial tasks.',exhausted:'Your five trial tasks are used. Choose a subscription to continue.',unavailable:'Could not check access. Check your connection and try again.',plans:'Compare plans',signIn:'Sign in',all:'All tools included',inPlan:p=>`Included in your ${p} subscription`,remaining:n=>`3 tools free · ${n} of 5 trial tasks remaining`,pending:n=>`${n} task(s) in progress`,choose:p=>`Included with ${p}`,speech:'Cloud voice limits still apply.'},ru:{title:'Повседневные инструменты',free:'Бесплатно',single:'Одно фото бесплатно · Пакет: Basic',included:'Включено',trial:'можно попробовать',locked:'нужна подписка',login:'Войдите, чтобы использовать пять пробных задач.',exhausted:'Пять пробных задач использованы. Выберите подписку, чтобы продолжить.',unavailable:'Не удалось проверить доступ. Проверьте соединение и попробуйте ещё раз.',plans:'Сравнить планы',signIn:'Войти',all:'Все инструменты включены',inPlan:p=>`Входит в вашу подписку ${p}`,remaining:n=>`3 инструмента бесплатно · осталось ${n} из 5 пробных задач`,pending:n=>`В обработке: ${n}`,choose:p=>`Входит в ${p}`,speech:'Лимиты облачной озвучки сохраняются.'},fr:{title:'Outils du quotidien',free:'Gratuit',single:'Une photo gratuite · Lots : Basic',included:'Inclus',trial:'essai disponible',locked:'abonnement requis',login:'Connectez-vous pour utiliser vos cinq essais.',exhausted:'Vos cinq essais sont utilisés. Choisissez un abonnement.',unavailable:'Impossible de vérifier l’accès. Vérifiez votre connexion et réessayez.',plans:'Comparer les offres',signIn:'Se connecter',all:'Tous les outils inclus',inPlan:p=>`Inclus dans votre abonnement ${p}`,remaining:n=>`3 outils gratuits · ${n} essais sur 5 restants`,pending:n=>`${n} tâche(s) en cours`,choose:p=>`Inclus avec ${p}`,speech:'Les limites des voix cloud restent applicables.'},uk:{title:'Щоденні інструменти',free:'Безкоштовно',single:'Одне фото безкоштовно · Пакет: Basic',included:'Включено',trial:'можна спробувати',locked:'потрібна підписка',login:'Увійдіть, щоб використати п’ять пробних завдань.',exhausted:'П’ять пробних завдань використано. Оберіть підписку.',unavailable:'Не вдалося перевірити доступ. Перевірте з’єднання та спробуйте ще раз.',plans:'Порівняти плани',signIn:'Увійти',all:'Усі інструменти включені',inPlan:p=>`Входить до вашої підписки ${p}`,remaining:n=>`3 інструменти безкоштовно · залишилося ${n} із 5 пробних завдань`,pending:n=>`В обробці: ${n}`,choose:p=>`Входить до ${p}`,speech:'Ліміти хмарного озвучення зберігаються.'}};
 const copy=words[language]||words.en,planName=p=>p?p[0].toUpperCase()+p.slice(1):'',active=new Map();let access=null,notice='';
 const token=()=>localStorage.getItem('vv_token')||'';
 const base=()=>location.protocol==='file:'?(window.AndroidBridge?.getApiBase?.()||'https://video-variator-android.onrender.com'):location.origin;
 const failure=code=>Object.assign(Error(code),{code});
 async function request(path,body){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{const response=await fetch(base()+path,{method:body?'POST':'GET',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json',...(token()?{Authorization:'Bearer '+token()}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok){if(response.status===401)localStorage.removeItem('vv_token');throw failure(data.error||'TOOLS_UNAVAILABLE');}return data;}
  catch(error){if(error.code)throw error;throw failure('TOOLS_UNAVAILABLE');}finally{clearTimeout(timer);}
 }
 function message(error){return ['AUTH_REQUIRED','INVALID_SESSION','USER_NOT_FOUND'].includes(error?.code)?copy.login:error?.code==='TOOL_TRIAL_EXHAUSTED'?copy.exhausted:copy.unavailable;}
 function readQueue(){try{const items=JSON.parse(localStorage.getItem('vu_tool_settlements')||'[]');return Array.isArray(items)?items.filter(x=>x&&typeof x.id==='string'&&['completed','canceled'].includes(x.outcome)):[];}catch(_){return[];}}
 function queue(id,outcome){const items=readQueue().filter(x=>x.id!==id);items.push({id,outcome});localStorage.setItem('vu_tool_settlements',JSON.stringify(items.slice(-100)));}
 function dequeue(id){localStorage.setItem('vu_tool_settlements',JSON.stringify(readQueue().filter(x=>x.id!==id)));}
 async function settle(id,outcome){queue(id,outcome);let last;for(let i=0;i<2;i++){try{const data=await request('/api/tools/runs/'+id,{outcome});access=data.access;dequeue(id);active.delete(id);notice='';render();return;}catch(error){last=error;if(['RUN_NOT_FOUND','RUN_ALREADY_FINISHED','INVALID_TOOL_RUN'].includes(error.code)){dequeue(id);active.delete(id);break;}if(error.code!=='TOOLS_UNAVAILABLE')break;}}throw last;}
 async function refresh(){if(!token()){access=null;render();return;}try{access=await request('/api/tools/access');notice='';}catch(error){access=null;notice=message(error);}render();}
 async function begin(tool){
  if(!Object.hasOwn(minimum,tool))throw failure('INVALID_TOOL_RUN');
  if(!minimum[tool])return {complete:async()=>{},cancel:async()=>{}};
  if(!token()){notice=copy.login;render();throw failure('AUTH_REQUIRED');}
  const requestId=crypto.randomUUID();let data,last;
  for(let i=0;i<2;i++){try{data=await request('/api/tools/runs',{tool,requestId});break;}catch(error){last=error;if(error.code!=='TOOLS_UNAVAILABLE')break;}}
  if(!data){if(last?.code==='TOOLS_UNAVAILABLE')queue(requestId,'canceled');notice=message(last);render();throw last;}
  if(data.run.state!=='pending'){notice=copy.unavailable;render();throw failure('RUN_ALREADY_FINISHED');}
  access=data.access;notice='';active.set(data.run.id,true);render();
  let finished=false;
  return {async complete(){if(finished)return;await settle(data.run.id,'completed');finished=true;},async cancel(){if(finished)return;await settle(data.run.id,'canceled');finished=true;}};
 }
 function badge(tool){if(tool==='photo')return copy.single;if(!minimum[tool])return copy.free;const name=planName(minimum[tool]);if(access?.tools?.[tool]?.included)return copy.included;return name+' · '+(token()&&access?.trial.remaining>0?copy.trial:copy.locked);}
 function render(){
  // Entitlements and per-tool availability stay active, but the owner removed
  // the promotional "3 tools free / trial tasks remaining" banner everywhere.
  document.querySelectorAll('[data-hub-tool]').forEach(card=>{
   let el=card.querySelector('.toolAccessBadge');
   if(!el){el=document.createElement('span');el.className='toolAccessBadge';card.append(el);}
   el.textContent=badge(card.dataset.hubTool);
   card.dataset.access=access?.tools?.[card.dataset.hubTool]?.included?'included':minimum[card.dataset.hubTool]?'subscription':'free';
  });
  const message=notice||(access?.trial.pending?copy.pending(access.trial.pending):'');
  const detail=document.getElementById('hubNotice');
  if(detail&&message)detail.textContent=message;
 }
 function setup(){
  const page=document.querySelector('.free-tools-page')||document.getElementById('speechText')?.closest('main');
  if(page){
   // No access advertisement is inserted. Server-side checks and tool badges remain.
   const heading=page.querySelector('.free-tools-hero h1');if(heading)heading.textContent=copy.title;
   const audioBack=document.querySelector('[data-s=back]');if(audioBack)audioBack.textContent='← '+copy.title;
   const free=document.querySelector('[data-s=free]');if(free)free.textContent=copy.choose('Pro');
   window.addEventListener('vu:toolchange',render);window.addEventListener('storage',event=>{if(event.key==='vv_token')refresh();});
   render();
   (async()=>{if(token())for(const item of readQueue()){try{await settle(item.id,item.outcome);}catch(_){}}await refresh();})();
  }
  const planNotes={en:{basic:'Batch photo and video compression included.',pro:'All eight tools included. Cloud voice limits apply.',business:'All eight tools included, with your existing higher video allowance.',lifetime:'Existing tool package included permanently. Paid AI generation is separate. Cloud voice limits apply.'},ru:{basic:'Включены пакетное сжатие фото и сжатие видео.',pro:'Включены все восемь инструментов. Действуют лимиты облачных голосов.',business:'Все восемь инструментов и ваш увеличенный объём видеокредитов.',lifetime:'Существующий пакет инструментов навсегда. Платная AI-генерация отдельно. Лимиты облачных голосов сохраняются.'},fr:{basic:'Compression de lots de photos et de vidéos incluse.',pro:'Les huit outils inclus. Limites des voix cloud applicables.',business:'Les huit outils et votre allocation vidéo supérieure.',lifetime:'Le pack d’outils existant à vie. Génération IA payante séparée. Limites des voix cloud applicables.'},uk:{basic:'Включено пакетне стиснення фото та стиснення відео.',pro:'Усі вісім інструментів. Діють ліміти хмарних голосів.',business:'Усі вісім інструментів і збільшений обсяг відеокредитів.',lifetime:'Наявний пакет інструментів назавжди. Платна AI-генерація окремо. Діють ліміти хмарних голосів.'}}[language]||{basic:'Batch photo and video compression included.',pro:'All eight tools included. Cloud voice limits apply.',business:'All eight tools included, with your existing higher video allowance.',lifetime:'Existing tool package included permanently. Paid AI generation is separate. Cloud voice limits apply.'};
  document.querySelectorAll('.priceCard .planBtn').forEach(button=>{const note=document.createElement('p');note.className='toolSubscriptionNote';note.textContent=planNotes[button.dataset.plan];button.before(note);});
  const query=new URLSearchParams(location.search),back=query.get('toolReturn');
  if(query.get('signIn')==='1'&&back){let url;try{url=new URL(back,location.href);}catch(_){return;}if(url.origin!==location.origin||!['free-tools.html','audio-studio.html'].includes(url.pathname.split('/').pop()))return;
   let opened=false;const chip=document.getElementById('accountChip'),button=document.getElementById('signInBtn');if(!chip||!button)return;
   const check=()=>{if(token()&&!chip.hidden){location.replace(url.href);return;}if(!token()&&!opened){opened=true;button.click();}};new MutationObserver(check).observe(chip,{attributes:true,childList:true,subtree:true});check();
  }
 }
 window.VUToolAccess=Object.freeze({begin,refresh,message,render});
 window.addEventListener('pagehide',()=>{for(const id of active.keys()){if(readQueue().some(x=>x.id===id&&x.outcome==='completed'))continue;queue(id,'canceled');fetch(base()+'/api/tools/runs/'+id,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({outcome:'canceled'})}).catch(()=>{});}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();

