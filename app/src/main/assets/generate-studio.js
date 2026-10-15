import {saveLocal} from './ai-media.js';
import {MODEL_CATALOG,MODELS} from './generate-models.js';
import {takeStudioHandoff} from './studio-handoff.js';
const $=id=>document.getElementById(id),ru=navigator.language.startsWith('ru');
const say=(en,r)=>ru?r:en;
const strings={back:'← Назад',pilot:'Предпросмотр студии',workspace:'ВАША СТУДИЯ',video:'Видео',image:'Изображения',audio:'Аудио',dashboard:'Главная ↗',translation:'Перевод · позже',create:'Создать',history:'Мои результаты',label:'ТВОРЧЕСКАЯ СТУДИЯ',headline:'Ваша идея. Создайте её.',prompt:'Опишите, что хотите создать',addPhoto:'Фото',clear:'Убрать фото',generate:'Создать ✦',consent:'Я согласен отправить запрос и фотографии в Google для генерации.',pilotNote:'Предпросмотр студии. Оплата не включена.',chooseModel:'Выберите модель',modelHint:'Выберите инструмент для своей задачи. У каждой модели указан статус подключения.',settings:'Настройки',format:'Формат',capabilityNote:'Настройки соответствуют выбранной модели. Неподдерживаемые параметры не отправляются.',trackType:'Тип аудио',song:'Песня с вокалом',instrumental:'Без слов',voiceoverMode:'Озвучка · подключение готовится',voiceover:'Открыть существующий инструмент озвучки →',language:'Язык',voice:'Голос',done:'Готово',download:'Скачать',share:'Поделиться',delete:'Удалить',saveNote:'Сохраните копию. Удаление результата не удаляет скачанные файлы.',historyHint:'Здесь доступны сохранённые результаты студии. Генерация не запускается автоматически.',checkResult:'Проверить последний результат',historyLoading:'Загружаем результаты…',historyNone:'Сохранённых результатов пока нет.',historyOpen:'Открыть',historyReady:'Готово',historyProcessing:'В работе',historyFailed:'Ошибка',filterAll:'Все',filterImages:'Изображения',filterVideos:'Видео',filterFailed:'Ошибки',filterProcessing:'В работе'};
if(ru){document.documentElement.lang='ru';document.querySelectorAll('[data-t]').forEach(e=>e.textContent=strings[e.dataset.t]||e.textContent);}
const requested=new URLSearchParams(location.search).get('studio');
let kind=requested==='image'?'image':requested==='audio'?'music':'video';
let config={enabled:false,models:[]},catalog=MODEL_CATALOG.map(m=>({...m,enabled:false}));
let refs=[],modelId=MODELS[kind].id,url,blob,job,busy=false,generation=0,historyView=false,historyFilter='all';
let estimateTimer=null,estimateSignature='';
let historyThumbUrls=[];
const drafts={};
let nativeBase='';try{const base=window.AndroidBridge?.getApiBase?.();if(typeof base==='string'&&base.startsWith('https://'))nativeBase=base;}catch(_){}
const apiBase=()=>String(window.VV_API_BASE||nativeBase||localStorage.getItem('vv_api_base')||location.origin).replace(/\/$/,'');
async function api(path,options={}){const token=localStorage.getItem('vv_token');const response=await fetch(apiBase()+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})}});if(!response.ok){const d=await response.json().catch(()=>({}));throw new Error(d.error||'REQUEST_FAILED');}return response;}
let aiBilling=null;
function moneyMinor(amount,currency){try{return new Intl.NumberFormat(undefined,{style:'currency',currency:String(currency||'usd').toUpperCase()}).format(Number(amount||0)/100);}catch(_){return (Number(amount||0)/100).toFixed(2)+' '+String(currency||'usd').toUpperCase();}}
function walletStat(label,value){const x=document.createElement('div');x.className='wallet-stat';const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=String(value);x.append(l,v);return x;}
const walletKinds={purchase:['Credit purchase','Покупка кредитов'],reserve:['Generation reserve','Резерв генерации'],captured:['Generation charged','Списание за генерацию'],released:['Generation refund','Возврат резерва'],payment_refund:['Payment refund','Возврат платежа'],owner_adjustment:['Owner adjustment','Корректировка владельца']};
function ledgerDelta(label,value){if(!value)return null;const span=document.createElement('span');span.className=value>0?'positive':'negative';span.textContent=label+' '+(value>0?'+':'')+Number(value).toLocaleString();return span;}
function renderWalletHistory(items){
 const root=$('walletHistory');root.replaceChildren();
 if(!items?.length){const p=document.createElement('p');p.className='wallet-empty';p.textContent=say('No AI credit activity yet.','Операций с AI-кредитами пока нет.');root.append(p);return;}
 for(const item of items.slice(0,20)){const row=document.createElement('article');row.className='wallet-ledger';const title=document.createElement('strong'),labels=walletKinds[item.kind]||[item.kind,item.kind];title.textContent=ru?labels[1]:labels[0];const date=document.createElement('small');try{date.textContent=new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.created_at||item.createdAt));}catch(_){date.textContent='';}const deltas=document.createElement('div');deltas.className='wallet-deltas';for(const node of [ledgerDelta(say('available','доступно'),Number(item.available_delta??item.availableDelta??0)),ledgerDelta(say('held','резерв'),Number(item.reserved_delta??item.reservedDelta??0)),ledgerDelta(say('debt','долг'),Number(item.debt_delta??item.debtDelta??0))])if(node)deltas.append(node);row.append(title,date,deltas);root.append(row);}
}
async function loadAiWallet(){
 try{
  const response=await fetch(apiBase()+'/api/ai-billing/config',{cache:'no-store'}),cfg=await response.json().catch(()=>({}));if(!response.ok||!cfg.enabled){$('walletButton').hidden=true;return false;}
  aiBilling=cfg;$('walletButton').hidden=false;$('walletMode').textContent=cfg.mode==='live'?say('Live Stripe checkout. Payment is completed on Stripe.','Оплата через live Stripe Checkout. Платёж завершается на Stripe.'):say('Stripe test checkout. No real charge should be made in test mode.','Тестовый Stripe Checkout. В тестовом режиме реального списания быть не должно.');
  $('creditPacks').replaceChildren();for(const p of cfg.packs||[]){const card=document.createElement('article');card.className='credit-pack';const title=document.createElement('strong');title.textContent=Number(p.credits).toLocaleString()+' AI credits';const price=document.createElement('small');price.textContent=moneyMinor(p.amount,p.currency);const b=document.createElement('button');b.type='button';b.textContent=cfg.mode==='live'?say('Continue to Stripe','Перейти в Stripe'):say('Open test checkout','Открыть тестовую оплату');b.onclick=()=>void buyCredits(p,b);card.append(title,price,b);$('creditPacks').append(card);}
  if(!localStorage.getItem('vv_token')){$('walletBalance').textContent='—';$('walletSummary').replaceChildren();renderWalletHistory([]);$('walletStatus').textContent=say('Sign in to view your AI credit balance or buy credits.','Войдите, чтобы увидеть баланс AI-кредитов или купить кредиты.');return true;}
  const [balance,history]=await Promise.all([api('/api/ai-billing/balance').then(r=>r.json()),api('/api/ai-billing/history').then(r=>r.json()).catch(()=>({items:[]}))]);
  $('walletBalance').textContent=Number(balance.available||0).toLocaleString();$('walletSummary').replaceChildren(walletStat(say('Available','Доступно'),Number(balance.available||0).toLocaleString()),walletStat(say('Held','В резерве'),Number(balance.reserved||0).toLocaleString()),walletStat(say('Debt','Долг'),Number(balance.debt||0).toLocaleString()));renderWalletHistory(history.items||[]);$('walletStatus').textContent='';return true;
 }catch(_){$('walletButton').hidden=true;return false;}
}
async function buyCredits(pack,button){
 if(!localStorage.getItem('vv_token')){$('walletStatus').textContent=say('Sign in before opening checkout.','Войдите перед оплатой.');return;}
 button.disabled=true;$('walletStatus').textContent=say('Preparing Stripe Checkout…','Подготавливаем Stripe Checkout…');
 try{
  const d=await(await api('/api/ai-billing/checkout',{method:'POST',body:JSON.stringify({requestId:crypto.randomUUID(),sku:pack.sku})})).json(),u=new URL(d.url);
  if(u.protocol!=='https:'||u.hostname!=='checkout.stripe.com')throw Error('UNSAFE_CHECKOUT_URL');
  location.assign(u.toString());
 }catch(e){$('walletStatus').textContent=errorText(e);button.disabled=false;}
}
$('walletButton').onclick=()=>{$('walletDialog').showModal();void loadAiWallet();};
$('walletRefresh').onclick=async()=>{$('walletRefresh').disabled=true;$('walletStatus').textContent=say('Refreshing…','Обновляем…');try{await loadAiWallet();}finally{$('walletRefresh').disabled=false;}};

const modelKind=()=>kind==='music'&&$('musicMode').value==='voice'?'voice':kind;
const currentModel=()=>catalog.find(m=>m.id===modelId&&m.kind===modelKind());
const connected=m=>!!m?.adapter&&!!m.enabled;
function errorText(e){return ({AUTH_REQUIRED:say('Sign in from the dashboard first.','Сначала войдите в аккаунт на главной.'),INVALID_SESSION:say('Your session expired. Sign in again.','Сессия истекла. Войдите снова.'),OWNER_PILOT_ONLY:say('Generation is currently limited to the owner preview.','Генерация пока доступна только владельцу.'),PUBLIC_AI_DISABLED:say('Public AI generation is not enabled yet.','Публичная AI-генерация пока не включена.'),AI_ENTITLEMENTS_NOT_CONFIGURED:say('AI plan access is not configured yet.','Доступ к AI по тарифам пока не настроен.'),AI_PLAN_NOT_ENTITLED:say('Your current plan does not include this AI generation workflow.','Ваш текущий тариф не включает эту AI-генерацию.'),AI_PLAN_INACTIVE:say('An active eligible plan is required for AI generation.','Для AI-генерации нужен активный подходящий тариф.'),PUBLIC_AI_NOT_READY:say('AI billing is not ready for public generation yet. No request was started.','AI-биллинг ещё не готов для публичной генерации. Запрос не запускался.'),GENERATION_REQUEST_ID_REQUIRED:say('A safe request identifier is required before generation can start.','Перед генерацией нужен безопасный идентификатор запроса.'),INVALID_GENERATION_REQUEST_ID:say('The generation request identifier is invalid.','Идентификатор запроса генерации недействителен.'),GENERATION_REQUEST_CONFLICT:say('This request identifier was already used for different generation settings. No second generation was started.','Этот идентификатор уже использован с другими настройками. Вторая генерация не запускалась.'),PAYMENTS_NOT_ACTIVATED:say('AI credit payments are not activated yet.','Оплата AI-кредитов пока не включена.'),AI_CHECKOUT_UNAVAILABLE:say('Stripe Checkout is temporarily unavailable. No payment was completed.','Stripe Checkout временно недоступен. Платёж не был завершён.'),CHECKOUT_MODE_CONFLICT:say('This checkout request belongs to a different Stripe mode. Start a new checkout.','Этот запрос оплаты относится к другому режиму Stripe. Начните новую оплату.'),UNSAFE_CHECKOUT_URL:say('Checkout was blocked because the returned payment address was not Stripe.','Оплата заблокирована: полученный адрес не принадлежит Stripe.'),PILOT_LIMIT_REACHED:say('The approved test limit has been reached.','Согласованный тестовый лимит исчерпан.'),INSUFFICIENT_AI_CREDITS:say('You do not have enough AI credits for this request.','Недостаточно AI-кредитов для этого запроса.'),AI_WALLET_UNAVAILABLE:say('AI credit reservation is temporarily unavailable. No generation was started.','Резервирование AI-кредитов временно недоступно. Генерация не запускалась.'),BILLING_REVIEW_REQUIRED:say('This result has a held credit reservation that must be reviewed before deletion.','У этого результата есть резерв кредитов, который нужно проверить перед удалением.'),PROCESSING_CANNOT_BE_CANCELLED:say('This generation is still active and cannot be deleted yet.','Эта генерация ещё выполняется и пока не может быть удалена.'),GENERATION_FAILED_NO_AUTOMATIC_RETRY:say('Generation could not finish. No automatic retry was started.','Генерация не завершилась. Повторный запрос автоматически не запускался.'),AI_PROVIDER_BUSY:say('The AI provider is busy right now. You can try again later; no automatic retry was started.','AI-провайдер сейчас перегружен. Можно повторить позже; автоматический повтор не запускался.'),AI_PROVIDER_NOT_CONFIGURED:say('This AI provider is not available yet. Choose another enabled model.','Этот AI-провайдер пока недоступен. Выберите другую включённую модель.'),AI_MODEL_NOT_AVAILABLE:say('This model is not available right now. Choose another enabled model.','Эта модель сейчас недоступна. Выберите другую включённую модель.'),AI_MODEL_MAINTENANCE:say('This model is temporarily under maintenance. Choose another model or try later.','Эта модель временно на обслуживании. Выберите другую или попробуйте позже.'),AI_GENERATION_REJECTED:say('The provider could not complete this generation. No automatic retry was started.','Провайдер не смог завершить эту генерацию. Автоматический повтор не запускался.'),AI_PROVIDER_RESPONSE_INVALID:say('The provider returned an incomplete response. No automatic retry was started.','Провайдер вернул неполный ответ. Автоматический повтор не запускался.'),AI_RESULT_UNAVAILABLE:say('The provider did not return a usable result. No automatic retry was started.','Провайдер не вернул пригодный результат. Автоматический повтор не запускался.'),AI_RESULT_TOO_LARGE:say('The generated result is larger than the current safe download limit.','Созданный результат превышает текущий безопасный лимит загрузки.'),AI_RESULT_DOWNLOAD_FAILED:say('The result was created but could not be downloaded from the provider yet. Try checking it again later.','Результат создан, но пока не удалось скачать его у провайдера. Попробуйте проверить позже.'),AI_PROVIDER_STATUS_INVALID:say('The provider returned an unexpected job status. No duplicate generation was started.','Провайдер вернул неожиданный статус задачи. Дублирующая генерация не запускалась.'),AI_PROVIDER_RESULT_BLOCKED:say('The provider result link was blocked by Deepsyq security checks.','Ссылка на результат провайдера была заблокирована проверкой безопасности Deepsyq.'),AI_STORAGE_FAILED:say('The result could not be saved safely. No automatic regeneration was started.','Не удалось безопасно сохранить результат. Автоматическая повторная генерация не запускалась.'),AI_PROVIDER_TIMEOUT:say('The provider took too long to respond. No automatic retry was started.','Провайдер слишком долго не отвечал. Автоматический повтор не запускался.'),AI_PROVIDER_FAILED:say('The AI provider returned an error. No automatic retry was started.','AI-провайдер вернул ошибку. Автоматический повтор не запускался.'),AI_GENERATION_FAILED:say('Generation could not finish. No automatic retry was started.','Генерация не завершилась. Автоматический повтор не запускался.'),AI_RATE_LIMIT:say('You reached the current hourly AI generation limit. Try again later.','Достигнут текущий часовой лимит AI-генераций. Попробуйте позже.'),AI_CONCURRENCY_LIMIT:say('You already have the maximum number of active generations. Wait for one to finish.','Уже запущено максимальное количество одновременных генераций. Дождитесь завершения одной из них.'),AI_PRICING_NOT_APPROVED:say('Pricing for this AI model is not approved yet. No request was started.','Цена для этой AI-модели ещё не утверждена. Запрос не запускался.'),STILL_PROCESSING_RELOAD_TO_CHECK:say('Still processing. Check this result again later.','Ещё обрабатывается. Проверьте этот результат позже.')})[e.message]||e.message;}
async function loadGenerationAccess(){
 const el=$('accessInfo');if(!el||!localStorage.getItem('vv_token')){if(el)el.hidden=true;return;}
 try{
  const a=await(await api('/api/studio/access')).json();el.hidden=false;
  if(a.scope==='owner'){el.textContent=say('Owner preview access. Public plan limits do not apply to this preview.','Доступ владельца. Публичные тарифные лимиты к этому preview не применяются.');return;}
  if(a.allowed){const usage=Number.isInteger(a.activeJobs)&&Number.isInteger(a.jobsThisHour)?say(` Currently: ${a.activeJobs}/${a.maxConcurrent} active · ${a.jobsThisHour}/${a.maxPerHour} in the last hour.`,` Сейчас: ${a.activeJobs}/${a.maxConcurrent} активных · ${a.jobsThisHour}/${a.maxPerHour} за последний час.`):'';el.textContent=say(`Plan ${a.plan}: up to ${a.maxConcurrent} active generation(s) and ${a.maxPerHour} per hour.`,`Тариф ${a.plan}: до ${a.maxConcurrent} одновременных генераций и ${a.maxPerHour} в час.`)+usage;return;}
  el.textContent=({PUBLIC_AI_DISABLED:say('Public AI generation is not enabled yet.','Публичная AI-генерация пока не включена.'),AI_ENTITLEMENTS_NOT_CONFIGURED:say('AI plan access is not configured yet.','Доступ к AI по тарифам пока не настроен.'),AI_PLAN_NOT_ENTITLED:say('Your current plan does not include AI generation yet.','Текущий тариф пока не включает AI-генерацию.'),AI_PLAN_INACTIVE:say('An active eligible plan is required for AI generation.','Для AI-генерации нужен активный подходящий тариф.')})[a.reason]||say('AI plan access is not available yet.','Доступ к AI по тарифу пока недоступен.');
 }catch(_){el.hidden=true;}
}
function estimateKey(){const m=currentModel();return [kind,m?.id||'',$('ratio')?.value||'',kind==='music'?$('musicMode')?.value||'':'',refs.length,config?.pricingConfigured===true,!!localStorage.getItem('vv_token')].join('|');}
function scheduleEstimate(){
 const el=$('creditEstimate');if(!el)return;clearTimeout(estimateTimer);const key=estimateKey();
 if(!config?.pricingConfigured||!localStorage.getItem('vv_token')||!currentModel()?.enabled){estimateSignature='';el.hidden=true;el.textContent='';return;}
 if(key===estimateSignature)return;estimateTimer=setTimeout(()=>void loadEstimate(key),350);
}
async function loadEstimate(key){
 const el=$('creditEstimate');try{
  const d=await(await api('/api/studio/estimate',{method:'POST',body:JSON.stringify({kind,model:modelId,ratio:$('ratio').value,musicMode:$('musicMode').value,referenceCount:refs.length})})).json();
  if(key!==estimateKey())return;estimateSignature=key;el.textContent=say(`Estimated cost: ${d.credits.toLocaleString()} AI credits · no generation started`,`Ориентировочная стоимость: ${d.credits.toLocaleString()} AI-кредитов · генерация не запускалась`);el.hidden=false;
 }catch(e){if(key!==estimateKey())return;estimateSignature=key;if(e.message==='AI_PRICING_NOT_APPROVED'){el.textContent=errorText(e);el.hidden=false;}else{el.hidden=true;el.textContent='';}}
}
function availability(){const m=currentModel();scheduleEstimate();document.querySelector('[data-t=consent]').textContent=say('I agree to send this prompt and reference photos to '+(m?.provider||'the selected provider')+' for generation.','Я согласен отправить запрос и фотографии в '+(m?.provider||'выбранный сервис')+' для генерации.');$('generate').disabled=busy||!connected(m)||!$('consent').checked||!$('prompt').value.trim();$('modelButton').disabled=busy;$('settingsButton').disabled=busy;$('references').disabled=busy;$('prompt').disabled=busy||kind==='translation';$('availability').textContent=kind==='translation'?say('File translation is not connected yet. No file will be uploaded.','Перевод файлов ещё не подключён. Файл не будет загружен.'):!m?.adapter?say('This model is not connected yet. You can prepare your settings; no request will be sent.','Модель пока не подключена. Можно выбрать настройки; запрос не отправляется.'):connected(m)?say('Owner preview. Each attempt uses the approved test quota.','Тест владельца. Каждая попытка расходует согласованный лимит.'):say('Generation is not enabled. Provider access and test budget need approval.','Генерация не включена. Нужно подключение и согласованный бюджет.');}
function storeDraft(){drafts[kind]={prompt:$('prompt').value,modelId,ratio:$('ratio').value,refs,musicMode:$('musicMode').value};}
function renderModels(){const list=catalog.filter(m=>m.kind===modelKind());$('modelChoices').replaceChildren();for(const m of list){const b=document.createElement('button');b.type='button';b.className='model-card';b.dataset.connected=String(m.adapter);b.setAttribute('aria-pressed',String(m.id===modelId));const title=document.createElement('strong');title.textContent=m.label;const description=document.createElement('small');description.textContent=ru?m.descriptionRu||m.description||'':m.description||'';const state=document.createElement('span');state.className='connection';state.textContent=m.provider+' · '+(m.adapter?say('Adapter prepared','Адаптер подготовлен'):say('API connection pending','API не подключён'));b.append(title,description,state);b.onclick=()=>{if(busy)return;const limit=Number(m.references||0);if(refs.length>limit&&!confirm(say('This model supports '+limit+' references. Remove '+(refs.length-limit)+' photo(s) to switch models?','Эта модель поддерживает '+limit+' изображений. Убрать '+(refs.length-limit)+' фото для переключения?')))return;refs=refs.slice(0,limit);modelId=m.id;$('consent').checked=false;renderModel();$('modelDialog').close();};$('modelChoices').append(b);}}
function renderRatios(){const m=currentModel(),previous=$('ratio').value;$('ratio').replaceChildren();for(const r of m?.ratios||[])$('ratio').add(new Option(r,r));if(m?.ratios.includes(previous))$('ratio').value=previous;$('ratioLabel').hidden=!m?.ratios.length;$('ratioChoices').replaceChildren();for(const r of m?.ratios||[]){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',r);b.setAttribute('aria-pressed',String(r===$('ratio').value));const shape=document.createElement('span');shape.className='ratio-drawing';const [w,h]=r.split(':').map(Number);shape.style.width=Math.round(Math.min(38,27*w/h))+'px';shape.style.height=Math.round(Math.min(27,38*h/w))+'px';const text=document.createElement('span');text.textContent=r;b.append(shape,text);b.onclick=()=>{$('ratio').value=r;$('consent').checked=false;updateRatioSelection();availability();};$('ratioChoices').append(b);}updateRatioSelection();}
function updateRatioSelection(){for(const b of $('ratioChoices').children)b.setAttribute('aria-pressed',String(b.getAttribute('aria-label')===$('ratio').value));const m=currentModel();$('settingsButton').textContent=kind==='music'?say('Audio settings ⌄','Настройки аудио ⌄'):[$('ratio').value,m?.quality,m?.duration].filter(Boolean).join(' · ')+' ⌄';}
function renderModel(){let m=currentModel();if(!m){m=catalog.find(m=>m.kind===modelKind());modelId=m?.id||'';}$('modelButton').textContent=(m?.label||say('Model','Модель'))+' ⌄';$('referenceBox').hidden=!m?.references;renderRatios();renderRefs();renderModels();$('qualityValue').textContent=m?.quality||'';$('durationValue').textContent=m?.duration||'';$('voiceSettings').hidden=modelKind()!=='voice';availability();}
function select(next,{remember=true}={}){if(busy)return;if(remember)storeDraft();kind=next;$('consent').checked=false;const d=drafts[kind];refs=d?.refs||[];$('prompt').value=d?.prompt||'';$('musicMode').value=d?.musicMode||'song';modelId=d?.modelId||config.models?.find(m=>m.kind===kind)?.id||MODELS[kind]?.id||'';document.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===kind)));$('taskTitle').textContent={video:say('Create a video','Создать видео'),image:say('Create an image','Создать изображение'),music:say('Create audio','Создать аудио'),translation:say('Translate your file','Перевести файл')}[kind];$('taskDescription').textContent={video:say('Describe a scene or add a photo. Choose your model and bring the idea to life.','Опишите сцену или добавьте фото. Выберите модель и оживите свою идею.'),image:say('Start with a description. Add reference photos to guide the look.','Начните с описания. Добавьте фотографии, чтобы задать нужный образ.'),music:say('Create a short song, an instrumental, or prepare a voiceover.','Создайте короткую песню, музыку без слов или подготовьте озвучку.'),translation:say('Translation will be added after the studio is ready.','Перевод добавим после подготовки студии.')}[kind];$('musicOptions').hidden=kind!=='music';$('prompt').placeholder=kind==='music'?say('Describe the sound, mood and language. Add your lyrics or voiceover text…','Опишите звучание, настроение и язык. Добавьте текст песни или озвучки…'):kind==='image'?say('Describe your image: subject, style, colours and light…','Опишите изображение: объект, стиль, цвета и свет…'):say('Describe your video: scene, movement and atmosphere…','Опишите видео: сцену, движение и атмосферу…');$('examples').replaceChildren();const examples=kind==='video'?[['A cinematic product reveal with soft studio light','Презентация товара с мягким студийным светом'],['A calm ocean at sunset, gentle camera movement','Спокойный океан на закате и плавное движение камеры']]:kind==='image'?[['A premium product photo on a clean background','Фото товара на чистом фоне'],['A colourful illustrated poster','Яркий иллюстрированный постер']]:kind==='music'?[['A joyful pop song in English about a fresh start','Позитивная поп-песня на английском о новом начале'],['Instrumental relaxing piano for a travel video','Спокойное фортепиано для видео о путешествии']]:[];for(const [en,r] of examples){const b=document.createElement('button');b.type='button';b.textContent=say(en,r);b.onclick=()=>{if(busy)return;const next=say(en,r),existing=$('prompt').value.trim();if(existing&&existing!==next&&!confirm(say('Replace your current description with this example?','Заменить ваше описание этим примером?')))return;$('prompt').value=next;$('consent').checked=false;availability();$('prompt').focus();};$('examples').append(b);}renderModel();if(d?.ratio&&currentModel()?.ratios.includes(d.ratio)){$('ratio').value=d.ratio;updateRatioSelection();}if(kind!=='translation'){const u=new URL(location.href);u.searchParams.set('studio',kind==='music'?'audio':kind);history.replaceState(null,'',u);}setHistory(false);}
const imageEditPrompts={
 background:'Replace the background with a clean studio setting. Preserve the referenced subject, details, colors and any visible branding.',
 lighting:'Improve lighting with natural highlights and balanced shadows. Preserve the subject, identity, texture and composition.',
 detail:'Enhance clarity and natural detail while preserving the original subject, proportions, text and colors.',
 style:'Give the image a refined editorial look while keeping the main reference subject recognizable and faithful.'
};
document.querySelectorAll('[data-image-edit]').forEach(button=>button.addEventListener('click',()=>{
 if(busy||kind!=='image'||!refs.length)return;
 const suggestion=imageEditPrompts[button.dataset.imageEdit];if(!suggestion)return;
 const input=$('prompt'),current=input.value.trim();
 if(current&&current!==suggestion&&!confirm(say('Replace your current prompt?','Заменить текущее описание?')))return;
 input.value=suggestion;$('consent').checked=false;availability();input.focus();
 $('status').textContent=say('Edit prompt prepared; review your settings before generating.','Запрос подготовлен. Проверьте настройки перед генерацией.');
}));
function renderRefs(){
 for(const img of $('refPreview').querySelectorAll('img'))URL.revokeObjectURL(img.src);
 $('refPreview').replaceChildren();$('references').value='';
 const max=currentModel()?.references||0;
 $('clearRefs').hidden=!refs.length;
 $('imageEditPresets').hidden=kind!=='image'||!refs.length;
 $('refHint').textContent=max?say('PNG/JPG · '+refs.length+'/'+max+' references · 1 MB each','PNG/JPG · '+refs.length+'/'+max+' изображений · до 1 МБ'):'';
 refs.forEach((ref,index)=>{
  const tile=document.createElement('div');tile.className='studio-reference-tile';
  const img=document.createElement('img');img.alt=say('Reference photo '+(index+1),'Изображение '+(index+1));img.src=URL.createObjectURL(ref.file);
  const remove=document.createElement('button');remove.type='button';remove.textContent='×';
  remove.setAttribute('aria-label',say('Remove reference '+(index+1),'Убрать изображение '+(index+1)));
  remove.disabled=busy;
  remove.onclick=()=>{if(busy)return;refs.splice(index,1);$('consent').checked=false;renderRefs();availability();};
  const controls=document.createElement('div');controls.className='reference-order-controls';
  for(const [direction,label] of [[-1,say('Move reference left','Переместить влево')],[1,say('Move reference right','Переместить вправо')]]){
   const move=document.createElement('button');move.type='button';move.textContent=direction<0?'←':'→';
   move.setAttribute('aria-label',label+' '+(index+1));move.disabled=busy||index+direction<0||index+direction>=refs.length;
   move.onclick=()=>{if(busy)return;const destination=index+direction;if(destination<0||destination>=refs.length)return;
    [refs[index],refs[destination]]=[refs[destination],refs[index]];
    $('consent').checked=false;renderRefs();availability();
   };
   controls.append(move);
  }
  tile.append(img,remove,controls);$('refPreview').append(tile);
 });
}
async function acceptFiles(files,{append=false}={}){
 if(busy)return false;
 try{
  const max=currentModel()?.references||0,selected=Array.from(files||[]);
  if(!selected.length)return false;
  if(selected.length+(append?refs.length:0)>max)throw Error(say('This model supports at most '+max+' reference photos. Remove an existing reference first.','Эта модель поддерживает до '+max+' изображений. Сначала уберите лишние.'));
  const next=append?[...refs]:[];
  for(const file of selected){
   if(!['image/png','image/jpeg'].includes(file.type)||!file.size||file.size>1024*1024)throw Error(say('Use nonempty PNG or JPG photos under 1 MB.','Нужны непустые PNG/JPG до 1 МБ.'));
   const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(file);});
   next.push({file,mimeType:file.type,data});
  }
  refs=next;$('consent').checked=false;renderRefs();availability();return true;
 }catch(e){$('status').textContent=errorText(e);$('references').value='';return false;}
}
$('references').onchange=()=>void acceptFiles(Array.from($('references').files),{append:true});$('creator').ondragover=e=>{if(currentModel()?.references)e.preventDefault();};$('creator').ondrop=e=>{e.preventDefault();if(currentModel()?.references)void acceptFiles(Array.from(e.dataTransfer.files),{append:true});};
$('clearRefs').onclick=()=>{if(busy)return;refs=[];renderRefs();};document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>select(b.dataset.kind));$('prompt').oninput=availability;$('consent').onchange=availability;$('ratio').onchange=()=>{$('consent').checked=false;updateRatioSelection();availability();};
$('musicMode').onchange=()=>{$('consent').checked=false;modelId='';renderModel();};
$('modelButton').onclick=()=>{renderModels();$('modelDialog').showModal();};$('settingsButton').onclick=()=>$('settingsDialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
function clearHistoryThumbs(){for(const u of historyThumbUrls)URL.revokeObjectURL(u);historyThumbUrls=[];}
async function loadHistoryImageThumbnail(item,preview){
 try{
  const response=await api(`/api/studio/jobs/${encodeURIComponent(item.id)}/media`),b=await response.blob();if(!b.type.startsWith('image/'))return;
  const u=URL.createObjectURL(b);historyThumbUrls.push(u);const img=document.createElement('img');img.className='history-thumb';img.src=u;img.alt=say('Generated image preview','Предпросмотр созданного изображения');img.loading='lazy';preview.replaceChildren(img);
 }catch(_){/* Keep the lightweight placeholder if preview retrieval fails. */}
}
function observeHistoryThumbnail(item,preview){
 if(item.kind!=='image'||item.status!=='ready')return;
 if(!('IntersectionObserver'in window)){void loadHistoryImageThumbnail(item,preview);return;}
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();void loadHistoryImageThumbnail(item,preview);}},{rootMargin:'180px'});
 observer.observe(preview);
}
function historyState(status){return status==='ready'?say('Ready','Готово'):status==='queued'?say('Queued','В очереди'):status==='processing'?say('Processing','В работе'):status==='finalizing'?say('Finalizing','Завершаем'):status==='failed'?say('Failed','Ошибка'):status;}
function historyDate(value){try{return new Intl.DateTimeFormat(navigator.language||'en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch(_){return String(value||'');}}
function historyCredits(item){const n=Number(item.creditsCharged||item.creditsReserved||0);return n>0?say(n+' AI credits',n+' AI-кредитов'):'';}
function prepareHistoryItem(item,{settings=false}={}){
 if(busy)return;select(item.kind==='music'?'music':item.kind);
 if(item.model&&catalog.some(m=>m.id===item.model&&m.kind===(item.kind==='music'?'music':item.kind))){modelId=item.model;renderModel();}
 $('prompt').value=item.prompt||'';
 if(settings&&item.settings?.ratio&&currentModel()?.ratios?.includes(item.settings.ratio)){$('ratio').value=item.settings.ratio;updateRatioSelection();}
 if(settings&&item.kind==='music'&&['song','instrumental'].includes(item.settings?.musicMode)){$('musicMode').value=item.settings.musicMode;renderModel();}
 $('consent').checked=false;availability();setHistory(false);$('prompt').focus();
}
async function downloadHistoryItem(item){
 if(item.status!=='ready'||busy)return;busy=true;availability();
 try{const response=await api(`/api/studio/jobs/${encodeURIComponent(item.id)}/media`),b=await response.blob();const ext=b.type.startsWith('video/')?'mp4':b.type==='image/jpeg'?'jpg':b.type.startsWith('image/')?'png':b.type==='audio/wav'?'wav':'mp3';await saveLocal(new File([b],`Deepsyq-${item.id}.${ext}`,{type:b.type}));}
 catch(e){$('status').textContent=errorText(e);}finally{busy=false;availability();}
}
async function deleteHistoryItem(item){
 if(busy||['queued','processing','finalizing'].includes(item.status))return;
 if(!confirm(say('Delete this saved result? Downloaded copies are not affected.','Удалить сохранённый результат? Скачанные копии останутся.')))return;
 busy=true;availability();try{await api(`/api/studio/jobs/${encodeURIComponent(item.id)}`,{method:'DELETE'});if(job===item.id){++generation;clearResult();sessionStorage.removeItem('vu_generation_job');job=null;}$('status').textContent=say('Result deleted.','Результат удалён.');await loadHistory();}catch(e){$('status').textContent=errorText(e);}finally{busy=false;availability();}
}
async function openHistoryJob(id){
 if(busy)return;job=id;sessionStorage.setItem('vu_generation_job',id);busy=true;availability();$('status').textContent=say('Opening saved result…','Открываем сохранённый результат…');
 try{await watch(id,++generation);setHistory(false);}catch(e){$('status').textContent=errorText(e);busy=false;availability();}
}
async function loadHistory(){
 const list=$('historyList');list.hidden=false;clearHistoryThumbs();list.replaceChildren();const loading=document.createElement('p');loading.className='hint';loading.textContent=say('Loading results…','Загружаем результаты…');list.append(loading);
 try{
  const d=await(await api('/api/studio/jobs?filter='+encodeURIComponent(historyFilter))).json();list.replaceChildren();
  if(!d.items?.length){const p=document.createElement('p');p.className='hint';p.textContent=say('No results in this filter yet.','В этом фильтре пока нет результатов.');list.append(p);return;}
  for(const item of d.items){
   const card=document.createElement('article');card.className='history-card';
   const preview=document.createElement('div');preview.className='history-preview';preview.dataset.kind=item.kind;preview.textContent=item.kind==='image'?'✧':item.kind==='video'?'▷':'♫';preview.setAttribute('aria-hidden','true');
   const head=document.createElement('div');head.className='history-card-head';
   const title=document.createElement('strong');title.textContent=(item.kind==='music'?say('Audio','Аудио'):item.kind==='image'?say('Image','Изображение'):say('Video','Видео'))+(item.model?' · '+item.model:'');
   const state=document.createElement('span');state.className='history-status';state.dataset.status=item.status;state.textContent=historyState(item.status);head.append(title,state);
   const meta=document.createElement('small');meta.textContent=[historyDate(item.createdAt),item.provider,historyCredits(item)].filter(Boolean).join(' · ');
   const prompt=document.createElement('p');prompt.className='history-prompt';prompt.textContent=item.prompt||'';
   const actions=document.createElement('div');actions.className='history-actions';
   const open=document.createElement('button');open.type='button';open.textContent=say('Open','Открыть');open.onclick=()=>openHistoryJob(item.id);open.disabled=item.status==='failed';
   const download=document.createElement('button');download.type='button';download.textContent=say('Download','Скачать');download.disabled=item.status!=='ready';download.onclick=()=>void downloadHistoryItem(item);
   const reuse=document.createElement('button');reuse.type='button';reuse.textContent=say('Reuse prompt','Повторить запрос');reuse.disabled=!item.prompt;reuse.onclick=()=>prepareHistoryItem(item);
   const regenerate=document.createElement('button');regenerate.type='button';regenerate.textContent=say('Regenerate','Создать снова');regenerate.disabled=!item.prompt;regenerate.title=say('Prepares the previous prompt and settings. It does not start a paid generation.','Подготавливает прошлый запрос и настройки. Платная генерация сама не запускается.');regenerate.onclick=()=>prepareHistoryItem(item,{settings:true});
   const remove=document.createElement('button');remove.type='button';remove.textContent=say('Delete','Удалить');remove.disabled=['queued','processing','finalizing'].includes(item.status);remove.onclick=()=>void deleteHistoryItem(item);
   actions.append(open,download,reuse,regenerate,remove);card.append(preview,head,meta,prompt,actions);list.append(card);observeHistoryThumbnail(item,preview);
  }
 }catch(e){list.replaceChildren();const p=document.createElement('p');p.className='hint';p.textContent=errorText(e);list.append(p);}
}
document.querySelectorAll('[data-history-filter]').forEach(button=>button.onclick=()=>{historyFilter=button.dataset.historyFilter;document.querySelectorAll('[data-history-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));void loadHistory();});
function setHistory(on){historyView=on;$('showCreate').setAttribute('aria-pressed',String(!on));$('showHistory').setAttribute('aria-pressed',String(on));$('historyEmpty').hidden=!on;$('historyList').hidden=!on;$('empty').hidden=on||!!blob;$('resumeJob').hidden=!sessionStorage.getItem('vu_generation_job');if(on)void loadHistory();}
$('showCreate').onclick=()=>setHistory(false);$('showHistory').onclick=()=>setHistory(true);
function clearResult(){if(url)URL.revokeObjectURL(url);url=null;blob=null;$('media').replaceChildren();$('lyrics').textContent='';$('actions').hidden=true;$('continueImage').hidden=true;$('saveNote').hidden=true;$('empty').hidden=historyView;}
async function watch(id,epoch){for(let i=0;i<120&&epoch===generation;i++){const d=await(await api(`/api/studio/jobs/${encodeURIComponent(id)}`)).json();if(d.status==='ready'){const b=await(await api(`/api/studio/jobs/${encodeURIComponent(id)}/media`)).blob();if(epoch!==generation)return;clearResult();blob=b;url=URL.createObjectURL(b);const tag=d.mime.startsWith('image/')?'img':d.mime.startsWith('video/')?'video':'audio';const media=document.createElement(tag);media.src=url;if(tag==='img')media.alt=say('Generated image','Созданное изображение');else media.controls=true;$('media').append(media);$('lyrics').textContent=d.text||'';$('empty').hidden=true;$('historyEmpty').hidden=true;$('actions').hidden=false;$('continueImage').hidden=!b.type.startsWith('image/');$('saveNote').hidden=false;$('status').textContent=say('Ready. Preview and save your creation.','Готово. Посмотрите и сохраните результат.');busy=false;availability();return;}if(d.status==='failed'||d.status==='unknown')throw Error(d.error||'GENERATION_FAILED');const wait=Math.max(3000,Math.min(20000,Number(d.retryAfterSeconds||5)*1000));await new Promise(r=>setTimeout(r,wait));}throw Error('STILL_PROCESSING_RELOAD_TO_CHECK');}
$('creator').onsubmit=async e=>{e.preventDefault();if($('generate').disabled)return;busy=true;availability();setHistory(false);clearResult();const epoch=++generation;$('status').textContent=say('Submitting your request…','Отправляем запрос…');try{const d=await(await api('/api/studio/jobs',{method:'POST',body:JSON.stringify({requestId:crypto.randomUUID(),kind,model:modelId,prompt:$('prompt').value,ratio:$('ratio').value,musicMode:$('musicMode').value,references:refs.map(({mimeType,data})=>({mimeType,data})),consent:$('consent').checked})})).json();job=d.id;sessionStorage.setItem('vu_generation_job',job);$('status').textContent=say('Generating. This can take a few minutes.','Генерация. Это может занять несколько минут.');await watch(job,epoch);}catch(e){$('status').textContent=errorText(e);busy=false;availability();}};
// Continue from an existing image in the same browser without an API call.
 // The reference is explicitly prepared for a new Image request; Generate stays manual.
 async function imageResultReference(input){
  if(!input?.type?.startsWith('image/'))throw Error('IMAGE_RESULT_REQUIRED');
  const bitmap=await createImageBitmap(input);
  try{
   let width=bitmap.width,height=bitmap.height;
   const scale=Math.min(1,2048/Math.max(width,height));
   width=Math.max(1,Math.floor(width*scale));height=Math.max(1,Math.floor(height*scale));
   for(let attempt=0;attempt<5;attempt++){
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('IMAGE_PREPARE_FAILED');
    ctx.drawImage(bitmap,0,0,width,height);
    for(const quality of [.9,.75,.6,.45]){
     const result=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
     if(result&&result.size>0&&result.size<=1024*1024)return new File([result],'deepsyq-image-reference.jpg',{type:'image/jpeg'});
    }
    width=Math.max(1,Math.floor(width*.7));height=Math.max(1,Math.floor(height*.7));
   }
   throw Error('IMAGE_PREPARE_FAILED');
  }finally{bitmap.close();}
 }
 $('continueImage').onclick=async()=>{
  if(!blob||busy||!blob.type.startsWith('image/'))return;
  busy=true;availability();$('status').textContent=say('Preparing this image as your next reference…','Готовим изображение как основу следующей редакции…');
  try{
   const file=await imageResultReference(blob);
   // select() and acceptFiles() deliberately reject changes while a paid job is busy.
   // Preparation is finished now, so unlock before applying the new local draft.
   busy=false;
   // Keep the current image draft intact when continuing from an image.
   // Switching from Video/Audio uses the saved Image draft without touching the original result.
   if(kind!=='image')select('image',{remember:true});
   if((currentModel()?.references||0)<1)throw Error('IMAGE_REFERENCE_UNSUPPORTED');
   const maxRefs=currentModel()?.references||0;
   if(refs.length>=maxRefs&&!confirm(say('Replace your existing reference photos with this result?','Заменить имеющиеся фотографии этим результатом?'))){
    $('status').textContent=say('Your existing references are unchanged.','Ваши фотографии оставлены без изменений.');return;
   }
   const append=refs.length>0&&refs.length<maxRefs;
   const accepted=await acceptFiles([file],{append});
   if(!accepted)throw Error('IMAGE_REFERENCE_PREPARE_FAILED');
   $('consent').checked=false;$('prompt').focus();availability();
   $('status').textContent=say('Image added as a reference. Update your prompt, review the model and generate when ready. No new generation was started.','Изображение добавлено как пример. Измените запрос, проверьте модель и запустите генерацию сами. Новая генерация не запускалась.');
  }catch(_){$('status').textContent=say('Could not prepare the image as a reference. Download it and add it manually.','Не получилось подготовить изображение. Скачайте его и добавьте вручную.');}
  finally{busy=false;availability();}
 };
 function filename(){const ext=blob?.type.startsWith('video/')?'mp4':blob?.type==='image/jpeg'?'jpg':blob?.type.startsWith('image/')?'png':blob?.type==='audio/wav'?'wav':'mp3';return `Deepsyq-${job}.${ext}`;}
$('download').onclick=async()=>{if(!blob||busy)return;busy=true;availability();try{await saveLocal(new File([blob],filename(),{type:blob.type}));}catch(e){$('status').textContent=errorText(e);}finally{busy=false;availability();}};
$('share').onclick=async()=>{if(!blob||busy)return;const file=new File([blob],filename(),{type:blob.type});try{if(window.AndroidBridge&&window.VUShareFile){busy=true;availability();try{await window.VUShareFile({blob:file,name:file.name});}finally{busy=false;availability();}return;}if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file]});else $('status').textContent=say('File sharing is unavailable in this browser. Download the file to share it.','Этот браузер не поддерживает отправку файла. Скачайте его и поделитесь.');}catch(e){if(e.name!=='AbortError')$('status').textContent=say('Could not share. Try downloading the file.','Не удалось поделиться. Попробуйте скачать файл.');}};
$('remove').onclick=async()=>{if(!job||busy)return;busy=true;availability();try{await api(`/api/studio/jobs/${encodeURIComponent(job)}`,{method:'DELETE'});++generation;clearResult();sessionStorage.removeItem('vu_generation_job');job=null;$('status').textContent=say('Result deleted. Downloaded copies are kept.','Результат удалён. Скачанные копии остаются.');if(historyView)await loadHistory();else setHistory(false);}catch(e){$('status').textContent=errorText(e);}finally{busy=false;availability();}};
async function applyLocalStudioHandoff(){
 try{
  const h=await takeStudioHandoff();if(!h)return false;
  const target=h.kind==='music'?'music':h.kind;if(target!==kind)select(target);
  if(h.defaultModel&&catalog.some(m=>m.id===h.defaultModel&&m.kind===target)){modelId=h.defaultModel;renderModel();}
  $('prompt').value=String(h.prompt||'').slice(0,2000);
  const ratio=h.settings?.ratio;if(ratio&&currentModel()?.ratios?.includes(ratio)){$('ratio').value=ratio;updateRatioSelection();}
  const max=currentModel()?.references||0,files=(h.files||[]).slice(0,max);if(files.length)await acceptFiles(files);
  $('consent').checked=false;availability();const dropped=(h.files||[]).length-files.length;
  $('status').textContent=dropped?say(`Workflow prepared. This model accepts ${max} reference file(s), so ${dropped} local file(s) were not attached. Review everything before generating.`,`Шаблон подготовлен. Эта модель принимает ${max} файл(а), поэтому ${dropped} файл(а) не были прикреплены. Проверьте всё перед генерацией.`):say('Workflow prepared locally. Review the prompt, references and settings before generating.','Шаблон подготовлен локально. Проверьте запрос, фотографии и настройки перед генерацией.');return true;
 }catch(_){$('status').textContent=say('The local workflow handoff could not be restored. Add your references here instead.','Не удалось восстановить локальный шаблон. Добавьте фотографии здесь.');return false;}
}
function applyTemplateStart(){
 const raw=sessionStorage.getItem('deepsyq_template_start');if(!raw)return false;sessionStorage.removeItem('deepsyq_template_start');
 try{
  const t=JSON.parse(raw),target=t.generationType==='image'?'image':t.generationType==='audio'?'music':['video','product_video'].includes(t.generationType)?'video':null;if(!target)return false;
  if(target!==kind)select(target);
  if(t.defaultModel&&catalog.some(m=>m.id===t.defaultModel&&m.kind===target)){modelId=t.defaultModel;renderModel();}
  $('prompt').value=String(t.promptTemplate||'').slice(0,2000);
  const ratio=t.defaultSettings?.ratio;if(ratio&&currentModel()?.ratios?.includes(ratio)){$('ratio').value=ratio;updateRatioSelection();}
  $('consent').checked=false;availability();$('status').textContent=say('Template prepared. Review the prompt, references and settings before generating.','Шаблон подготовлен. Проверьте запрос, фотографии и настройки перед генерацией.');return true;
 }catch(_){$('status').textContent=say('The template could not be prepared.','Не удалось подготовить шаблон.');return false;}
}
$('resumeJob').onclick=()=>{if(busy)return;const previous=sessionStorage.getItem('vu_generation_job');if(!previous)return;job=previous;busy=true;availability();watch(job,++generation).catch(e=>{$('status').textContent=errorText(e);busy=false;availability();});};
select(kind,{remember:false});
try{config=await(await api('/api/studio/config')).json();await loadGenerationAccess();catalog=config.catalog||[...config.models.map(m=>({...m,id:m.id||MODELS[m.kind]?.id,adapter:true,provider:'Google'})),...MODEL_CATALOG.filter(m=>!config.models.some(c=>(c.id||MODELS[c.kind]?.id)===m.id)).map(m=>({...m,enabled:false}))];const preferred=config.models?.find(m=>m.kind===kind&&m.enabled);if(preferred?.id)modelId=preferred.id;renderModel();}catch(_){availability();}
const restored=await applyLocalStudioHandoff();if(!restored)applyTemplateStart();
const previous=sessionStorage.getItem('vu_generation_job');if(previous&&config.enabled){job=previous;busy=true;availability();watch(job,++generation).catch(e=>{$('status').textContent=errorText(e);busy=false;availability();});}

if(new URLSearchParams(location.search).get('view')==='history')setHistory(true);

await loadAiWallet();
const aiCheckoutState=new URLSearchParams(location.search).get('ai_checkout');
if((aiCheckoutState==='returned'||aiCheckoutState==='cancelled')&&!$('walletButton').hidden){
 if(!$('walletDialog').open)$('walletDialog').showModal();
 $('walletStatus').textContent=aiCheckoutState==='returned'?say('Returned from Stripe. Credits appear only after Stripe confirms the payment webhook. Use Refresh balance if confirmation is still pending.','Вы вернулись из Stripe. Кредиты появятся только после подтверждения платежа webhook. Если подтверждение ещё идёт, нажмите «Обновить баланс».'):say('Checkout was cancelled. No AI credits were added by this return.','Оплата отменена. По этому возврату AI-кредиты не добавлены.');
 const u=new URL(location.href);u.searchParams.delete('ai_checkout');history.replaceState(null,'',u);
}
