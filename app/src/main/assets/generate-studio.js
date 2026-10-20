import {saveLocal} from './ai-media.js';
import {MODEL_CATALOG,MODELS} from './generate-models.js';
import {takeStudioHandoff} from './studio-handoff.js';
import {studioCreditWalletState} from './studio-credit-wallet.js';
import {progressView} from './studio-job-progress.js';
const $=id=>document.getElementById(id),ru=navigator.language.startsWith('ru');
const say=(en,r)=>ru?r:en;
const strings={back:'← Назад',pilot:'Предпросмотр студии',workspace:'ВАША СТУДИЯ',video:'Видео',image:'Изображения',audio:'Аудио',dashboard:'Главная ↗',translation:'Перевод · позже',create:'Создать',history:'Мои результаты',label:'ТВОРЧЕСКАЯ СТУДИЯ',headline:'Ваша идея. Создайте её.',prompt:'Опишите, что хотите создать',addPhoto:'Фото',clear:'Убрать фото',generate:'Создать ✦',consent:'Я согласен отправить запрос и фотографии в Google для генерации.',pilotNote:'Предпросмотр студии. Оплата не включена.',chooseModel:'Выберите модель',modelHint:'Выберите инструмент для своей задачи. У каждой модели указан статус подключения.',settings:'Настройки',format:'Формат',capabilityNote:'Настройки соответствуют выбранной модели. Неподдерживаемые параметры не отправляются.',trackType:'Тип аудио',song:'Песня с вокалом',instrumental:'Без слов',voiceoverMode:'Озвучка · подключение готовится',voiceover:'Открыть существующий инструмент озвучки →',language:'Язык',voice:'Голос',done:'Готово',download:'Скачать',share:'Поделиться',delete:'Удалить',saveNote:'Сохраните копию. Удаление результата не удаляет скачанные файлы.',historyHint:'Здесь доступны сохранённые результаты студии. Генерация не запускается автоматически.',checkResult:'Проверить последний результат',historyLoading:'Загружаем результаты…',historyNone:'Сохранённых результатов пока нет.',historyOpen:'Открыть',historyReady:'Готово',historyProcessing:'В работе',historyFailed:'Ошибка',filterAll:'Все',filterImages:'Изображения',filterVideos:'Видео',filterFailed:'Ошибки',filterProcessing:'В работе'};
if(ru){document.documentElement.lang='ru';document.querySelectorAll('[data-t]').forEach(e=>e.textContent=strings[e.dataset.t]||e.textContent);$('backgroundVideo').textContent='Продолжить в фоне →';document.querySelector('#videoBackgroundControls .hint').textContent='Остановить ожидание в этой вкладке без отмены серверной видеозадачи. Вернитесь в Историю позже, чтобы проверить результат. Закрытие вкладки само по себе не отменяет задачу.';}
const requested=new URLSearchParams(location.search).get('studio');
let kind=requested==='image'?'image':requested==='audio'?'music':'video';
let config={enabled:false,models:[]},catalog=MODEL_CATALOG.map(m=>({...m,enabled:false}));
let refs=[],modelId=MODELS[kind].id,url,blob,job,busy=false,generation=0,historyView=false,historyFilter='all';
let estimateTimer=null,estimateSignature='';
let historyThumbUrls=[],historyMediaUrl=null,historyMediaPlayer=null,historyMediaButton=null,historyMediaEpoch=0;
const drafts={};
let activeVideoWatchId=null; // Current browser polling only; the provider job is server-owned.
let lastJobProgress=null;
function updateJobProgress(status,amounts={}){
 lastJobProgress=progressView(status,{...amounts,locale:ru?'ru':'en'});
 const panel=$('jobProgress');if(!panel)return;
 $('jobProgressStage').textContent=lastJobProgress.heading;
 $('jobProgressCredits').textContent=lastJobProgress.credits;
 $('jobProgressHint').textContent=lastJobProgress.hint;
 panel.dataset.status=lastJobProgress.status;
 panel.hidden=false; // CSS hides status while History is visible.
}
const imageBatchQuantity=()=>kind==='image'&&config?.imageBatchEnabled?Number($('imageQuantity').value||1):1;
let imageDraftKey=null,imageDraftReady=false,imageDraftLoaded=false,imageDraftNeedsPhotos=false;
async function initializeImageDraft(){
 try{
  // Hash the active session credential; never store or log the credential in draft metadata.
  const identity=localStorage.getItem('vv_token')||'anonymous';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity));
  imageDraftKey='deepsyq_image_draft_v1_'+Array.from(new Uint8Array(digest).slice(0,16),b=>b.toString(16).padStart(2,'0')).join('');
  const raw=sessionStorage.getItem(imageDraftKey);
  if(!raw||raw.length>4500)return;
  const saved=JSON.parse(raw);
  if(saved?.v!==1||Date.now()-Number(saved.savedAt)>24*60*60*1000){
   sessionStorage.removeItem(imageDraftKey);return;
  }
  if(typeof saved.prompt!=='string'||saved.prompt.length>2000)return;
  const model=MODEL_CATALOG.find(m=>m.kind==='image'&&m.id===saved.modelId);
  if(!model)return;
  drafts.image={prompt:saved.prompt,modelId:model.id,ratio:model.ratios.includes(saved.ratio)?saved.ratio:model.ratios[0],resolution:model.capabilities?.resolutions?.includes(saved.resolution)?saved.resolution:model.quality,outputFormat:model.capabilities?.outputFormats?.includes(saved.outputFormat)?saved.outputFormat:model.capabilities?.outputFormats?.[0]||'auto',quantity:Number.isInteger(saved.quantity)&&saved.quantity>=1&&saved.quantity<=4?saved.quantity:1,refs:[],musicMode:'song'};
  imageDraftLoaded=true;imageDraftNeedsPhotos=!!saved.hadReferences;
 }catch(_){imageDraftKey=null;}
}
function saveImageDraft(){
 if(!imageDraftReady||!imageDraftKey||kind!=='image')return;
 try{
  const prompt=$('prompt').value.slice(0,2000);
  const payload={v:1,savedAt:Date.now(),prompt,modelId,ratio:$('ratio').value,resolution:$('imageResolution').value,outputFormat:$('imageOutputFormat').value,quantity:imageBatchQuantity(),hadReferences:refs.length>0||imageDraftNeedsPhotos};
  const current=MODEL_CATALOG.find(m=>m.kind==='image'&&m.id===payload.modelId);
  const hasSettings=payload.modelId!==MODELS.image.id||payload.ratio!==(current?.ratios?.[0]||'')||payload.resolution!==(current?.quality||'')||payload.outputFormat!==(current?.capabilities?.outputFormats?.[0]||'auto')||payload.quantity>1;
  if(prompt.trim()||payload.hadReferences||hasSettings)sessionStorage.setItem(imageDraftKey,JSON.stringify(payload));
  else sessionStorage.removeItem(imageDraftKey);
 }catch(_){/* Tab storage unavailable; editing stays in memory. */}
}
function showImageDraftState(){
 const bar=$('imageDraftBar');if(!bar)return;
 bar.hidden=kind!=='image';
 if(bar.hidden)return;
 const message=!imageDraftKey?say('Tab autosave is unavailable in this browser.','В этом браузере автосохранение недоступно.'):
  imageDraftNeedsPhotos&&!refs.length?say('Text and settings restored. Reference photos were not stored; add them again before generating.','Текст и настройки восстановлены. Фотографии не сохранялись — добавьте их заново перед генерацией.'):
  say('Prompt and settings autosave in this tab for up to 24 hours. Photos stay only in memory.','Текст и настройки сохраняются в этой вкладке до 24 часов. Фотографии в хранилище не записываются.');
 $('imageDraftMessage').textContent=message;
 $('imageDraftSkipPhotos').hidden=!(imageDraftNeedsPhotos&&!refs.length);
}
$('imageDraftSkipPhotos').onclick=()=>{
 if(busy||kind!=='image')return;
 imageDraftNeedsPhotos=false;$('consent').checked=false;availability();
 $('status').textContent=say('Continuing without the old reference photos. Review your prompt before generating.','Продолжаем без прежних фотографий. Проверьте запрос перед генерацией.');
};
$('clearImageDraft').onclick=()=>{
 if(busy||kind!=='image')return;
 if(!confirm(say('Clear your image prompt, settings and attached references?','Очистить запрос, настройки и прикреплённые фотографии?')))return;
 imageDraftReady=false;imageDraftLoaded=false;imageDraftNeedsPhotos=false;
 refs=[];$('prompt').value='';modelId=config.models?.find(m=>m.kind==='image'&&m.enabled)?.id||MODELS.image.id;
 $('consent').checked=false;renderModel();drafts.image=null;
 try{if(imageDraftKey)sessionStorage.removeItem(imageDraftKey);}catch(_){}
 showImageDraftState();availability();imageDraftReady=true;
 $('status').textContent=say('Image draft cleared. No generated results were deleted.','Черновик изображения очищен. Готовые результаты не удалены.');
};

// Reuse the same session-identity hash as Image drafts; store settings only, never media bytes.
let videoDraftKey=null,videoDraftReady=false,videoDraftLoaded=false;
let videoDraftNeedsPhotos=false,videoDraftExpectedRefs=0,videoDraftPendingMode='text';
async function initializeVideoDraft(){
 if(!imageDraftKey)return;
 videoDraftKey=imageDraftKey.replace('deepsyq_image_draft_v1_','deepsyq_video_draft_v1_');
 try{
  const raw=sessionStorage.getItem(videoDraftKey);
  if(!raw||raw.length>4500)return;
  const saved=JSON.parse(raw);
  if(saved?.v!==1||!Number.isFinite(saved.savedAt)||Date.now()-saved.savedAt>24*60*60*1000||saved.savedAt>Date.now()){
   sessionStorage.removeItem(videoDraftKey);return;
  }
  if(typeof saved.prompt!=='string'||saved.prompt.length>2000)return;
  const model=MODEL_CATALOG.find(m=>m.kind==='video'&&m.id===saved.modelId);
  if(!model)return;
  const count=saved.referenceCount;
  if(!Number.isInteger(count)||count<0||count>model.references)return;
  const mode=saved.videoInputMode;
  if(!model.capabilities?.videoInputModes?.includes(mode))return;
  if(mode==='text'&&count!==0||mode==='first_frame'&&count!==1||mode==='first_last'&&count!==2||mode==='reference_image'&&(count<1||count>3))return;
  drafts.video={prompt:saved.prompt,modelId:model.id,ratio:model.ratios.includes(saved.ratio)?saved.ratio:model.ratios[0],
   videoResolution:model.capabilities.resolutions.includes(saved.videoResolution)?saved.videoResolution:model.quality,
   videoDuration:model.capabilities.durations.includes(saved.videoDuration)?saved.videoDuration:model.capabilities.durationSeconds,
   videoInputMode:'text',refs:[],musicMode:'song'};
  videoDraftLoaded=true;
  videoDraftNeedsPhotos=count>0;videoDraftExpectedRefs=count;videoDraftPendingMode=mode;
 }catch(_){videoDraftKey=null;}
}
function saveVideoDraft(){
 if(!videoDraftReady||!videoDraftKey||kind!=='video')return;
 try{
  const prompt=$('prompt').value.slice(0,2000),model=currentModel();
  const referenceCount=videoDraftNeedsPhotos?videoDraftExpectedRefs:refs.length;
  const mode=videoDraftNeedsPhotos?videoDraftPendingMode:$('videoInputMode').value;
  const data={v:1,savedAt:Date.now(),prompt,modelId,ratio:$('ratio').value,
   videoResolution:$('videoResolution').value,videoDuration:Number($('videoDuration').value),
   videoInputMode:mode,referenceCount};
  const hasChanges=modelId!==MODELS.video.id||data.ratio!==model?.ratios?.[0]||data.videoResolution!==model?.quality||
   data.videoDuration!==model?.capabilities?.durationSeconds||mode!=='text'||referenceCount>0;
  if(prompt.trim()||hasChanges)sessionStorage.setItem(videoDraftKey,JSON.stringify(data));
  else sessionStorage.removeItem(videoDraftKey);
 }catch(_){/* Nonpersistent tab storage does not prevent editing or generation. */}
}
function showVideoDraftState(){
 const bar=$('videoDraftBar');if(!bar)return;
 bar.hidden=kind!=='video';if(bar.hidden)return;
 $('videoDraftMessage').textContent=!videoDraftKey?
  say('Private tab autosave is unavailable in this browser.','В этом браузере недоступно сохранение черновика видео.'):
  videoDraftNeedsPhotos&&(!currentModel()?.capabilities?.videoInputModes?.includes(videoDraftPendingMode)||videoDraftExpectedRefs>Number(currentModel()?.references||0))?
   say('The old photo mode is not supported by this model. Choose another compatible model or Continue without old photos. No AI request was started.','Прежний режим фотографий не поддерживается этой моделью. Выберите совместимую модель или продолжите без старых фотографий. AI-запрос не запускался.'):
  videoDraftNeedsPhotos?
   say('Video settings restored. Attach '+videoDraftExpectedRefs+' reference photo(s) again ('+refs.length+' added so far). Original photos were never stored.','Настройки видео восстановлены. Добавьте заново '+videoDraftExpectedRefs+' фото (сейчас добавлено: '+refs.length+'). Исходные фото не сохранялись.'):
   say('Video description and settings stay in this tab for up to 24 hours. Reference photos are never stored.','Описание и параметры видео сохраняются в этой вкладке до 24 часов. Фотографии не записываются в хранилище.');
 $('videoDraftSkipPhotos').hidden=!videoDraftNeedsPhotos;
}
$('videoDraftSkipPhotos').onclick=()=>{
 if(busy||kind!=='video'||!videoDraftNeedsPhotos)return;
 if(refs.length&&!confirm(say('Discard the photos just attached and continue with text only?','Удалить уже прикреплённые фотографии и продолжить только с текстом?')))return;
 refs=[];videoDraftNeedsPhotos=false;videoDraftExpectedRefs=0;videoDraftPendingMode='text';
 $('consent').checked=false;renderRefs();availability();
 $('status').textContent=say('Continuing without the previous photos. Review the video settings before generating.','Продолжаем без прежних фотографий. Проверьте настройки видео перед генерацией.');
};
$('clearVideoDraft').onclick=()=>{
 if(busy||kind!=='video')return;
 if(!confirm(say('Clear your video description, settings and attached photos? Generated History is not deleted.','Очистить описание видео, настройки и фотографии? Готовые результаты в Истории сохранятся.')))return;
 videoDraftReady=false;videoDraftLoaded=false;videoDraftNeedsPhotos=false;videoDraftExpectedRefs=0;videoDraftPendingMode='text';
 refs=[];$('prompt').value='';modelId=config.models?.find(m=>m.kind==='video'&&m.enabled)?.id||MODELS.video.id;
 $('ratio').value='';$('videoInputMode').value='';$('videoResolution').value='';$('videoDuration').value='';$('consent').checked=false;
 renderModel();drafts.video=null;
 try{if(videoDraftKey)sessionStorage.removeItem(videoDraftKey);}catch(_){}
 videoDraftReady=true;showVideoDraftState();availability();
 $('status').textContent=say('Video draft cleared. Previous generated results are untouched.','Черновик видео очищен. Созданные ранее результаты не затронуты.');
};

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
 const btn=$('walletButton'),summary=$('walletSummary'),packs=$('creditPacks');
 // An authenticated customer's existing AI wallet is readable even when
 // credit-pack checkout is disabled. Checkout and wallet are separate gates.
 btn.hidden=false;$('walletBalance').textContent='—';
 summary.replaceChildren();packs.replaceChildren();renderWalletHistory([]);
 let cfg={};
 try{
  const response=await fetch(apiBase()+'/api/ai-billing/config',{cache:'no-store'});
  if(response.ok)cfg=await response.json().catch(()=>({}));
 }catch(_){/* Checkout config unavailable: continue reading existing wallet. */}
 const state=studioCreditWalletState(cfg);
 aiBilling=state.checkoutMode?cfg:null;
 $('walletMode').textContent=state.checkoutMode==='live'
  ?say('Live Stripe checkout. Credits are added only after a confirmed webhook.','Оплата через Stripe. Кредиты поступают только после подтверждённого webhook.')
  :state.checkoutMode==='test'
  ?say('Stripe test checkout. No real charge is made in test mode.','Тестовая оплата Stripe. Реальные деньги не списываются.')
  :say('Credit purchases are not active. Your existing AI credits remain available to view.','Покупка кредитов неактивна. Свои AI-кредиты можно просматривать.');
 for(const p of state.packs){
  const card=document.createElement('article');card.className='credit-pack';
  const title=document.createElement('strong');title.textContent=p.credits.toLocaleString()+' AI credits';
  const price=document.createElement('small');price.textContent=moneyMinor(p.amount,p.currency);
  const button=document.createElement('button');button.type='button';
  button.textContent=state.checkoutMode==='live'?say('Continue to Stripe','Перейти в Stripe'):say('Open test checkout','Открыть тестовую оплату');
  button.onclick=()=>void buyCredits(p,button);card.append(title,price,button);packs.append(card);
 }
 if(!localStorage.getItem('vv_token')){
  $('walletStatus').textContent=say('Sign in to view your AI credit balance.','Войдите, чтобы увидеть баланс AI-кредитов.');
  return true;
 }
 try{
  const [balance,history]=await Promise.all([
   api('/api/ai-wallet/balance').then(r=>r.json()),
   api('/api/ai-wallet/history').then(r=>r.json()).catch(()=>({items:[]}))
  ]);
  const totals=studioCreditWalletState(cfg,balance).totals;
  if(!totals)throw Error('INVALID_WALLET_TOTALS');
  $('walletBalance').textContent=totals.available.toLocaleString();
  summary.replaceChildren(
   walletStat(say('Available','Доступно'),totals.available.toLocaleString()),
   walletStat(say('Held','В резерве'),totals.reserved.toLocaleString()),
   walletStat(say('Debt','Долг'),totals.debt.toLocaleString())
  );
  renderWalletHistory(Array.isArray(history.items)?history.items:[]);
  $('walletStatus').textContent='';return true;
 }catch(_){
  $('walletBalance').textContent='—';summary.replaceChildren();renderWalletHistory([]);
  $('walletStatus').textContent=say('AI wallet information is temporarily unavailable. Please refresh later.','Информация об AI-кредитах временно недоступна. Обновите позже.');
  return false;
 }
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
function errorText(e){const messages={AUTH_REQUIRED:say('Sign in from the dashboard first.','Сначала войдите в аккаунт на главной.'),INVALID_SESSION:say('Your session expired. Sign in again.','Сессия истекла. Войдите снова.'),OWNER_PILOT_ONLY:say('Generation is currently limited to the owner preview.','Генерация пока доступна только владельцу.'),PUBLIC_AI_DISABLED:say('Public AI generation is not enabled yet.','Публичная AI-генерация пока не включена.'),AI_ENTITLEMENTS_NOT_CONFIGURED:say('AI plan access is not configured yet.','Доступ к AI по тарифам пока не настроен.'),AI_PLAN_NOT_ENTITLED:say('Your current plan does not include this AI generation workflow.','Ваш текущий тариф не включает эту AI-генерацию.'),AI_PLAN_INACTIVE:say('An active eligible plan is required for AI generation.','Для AI-генерации нужен активный подходящий тариф.'),PUBLIC_AI_NOT_READY:say('AI billing is not ready for public generation yet. No request was started.','AI-биллинг ещё не готов для публичной генерации. Запрос не запускался.'),GENERATION_REQUEST_ID_REQUIRED:say('A safe request identifier is required before generation can start.','Перед генерацией нужен безопасный идентификатор запроса.'),INVALID_GENERATION_REQUEST_ID:say('The generation request identifier is invalid.','Идентификатор запроса генерации недействителен.'),GENERATION_REQUEST_CONFLICT:say('This request identifier was already used for different generation settings. No second generation was started.','Этот идентификатор уже использован с другими настройками. Вторая генерация не запускалась.'),PAYMENTS_NOT_ACTIVATED:say('AI credit payments are not activated yet.','Оплата AI-кредитов пока не включена.'),AI_CHECKOUT_UNAVAILABLE:say('Stripe Checkout is temporarily unavailable. No payment was completed.','Stripe Checkout временно недоступен. Платёж не был завершён.'),CHECKOUT_MODE_CONFLICT:say('This checkout request belongs to a different Stripe mode. Start a new checkout.','Этот запрос оплаты относится к другому режиму Stripe. Начните новую оплату.'),UNSAFE_CHECKOUT_URL:say('Checkout was blocked because the returned payment address was not Stripe.','Оплата заблокирована: полученный адрес не принадлежит Stripe.'),PILOT_LIMIT_REACHED:say('The approved test limit has been reached.','Согласованный тестовый лимит исчерпан.'),INSUFFICIENT_AI_CREDITS:say('You do not have enough AI credits for this request.','Недостаточно AI-кредитов для этого запроса.'),AI_WALLET_UNAVAILABLE:say('AI credit reservation is temporarily unavailable. No generation was started.','Резервирование AI-кредитов временно недоступно. Генерация не запускалась.'),BILLING_REVIEW_REQUIRED:say('This result has a held credit reservation that must be reviewed before deletion.','У этого результата есть резерв кредитов, который нужно проверить перед удалением.'),PROCESSING_CANNOT_BE_CANCELLED:say('This generation is still active and cannot be deleted yet.','Эта генерация ещё выполняется и пока не может быть удалена.'),GENERATION_FAILED_NO_AUTOMATIC_RETRY:say('Generation could not finish. No automatic retry was started.','Генерация не завершилась. Повторный запрос автоматически не запускался.'),AI_PROVIDER_BUSY:say('The AI provider is busy right now. You can try again later; no automatic retry was started.','AI-провайдер сейчас перегружен. Можно повторить позже; автоматический повтор не запускался.'),AI_PROVIDER_NOT_CONFIGURED:say('This AI provider is not available yet. Choose another enabled model.','Этот AI-провайдер пока недоступен. Выберите другую включённую модель.'),AI_MODEL_NOT_AVAILABLE:say('This model is not available right now. Choose another enabled model.','Эта модель сейчас недоступна. Выберите другую включённую модель.'),AI_MODEL_MAINTENANCE:say('This model is temporarily under maintenance. Choose another model or try later.','Эта модель временно на обслуживании. Выберите другую или попробуйте позже.'),AI_GENERATION_REJECTED:say('The provider could not complete this generation. No automatic retry was started.','Провайдер не смог завершить эту генерацию. Автоматический повтор не запускался.'),AI_PROVIDER_RESPONSE_INVALID:say('The provider returned an incomplete response. No automatic retry was started.','Провайдер вернул неполный ответ. Автоматический повтор не запускался.'),AI_RESULT_UNAVAILABLE:say('The provider did not return a usable result. No automatic retry was started.','Провайдер не вернул пригодный результат. Автоматический повтор не запускался.'),AI_RESULT_TOO_LARGE:say('The generated result is larger than the current safe download limit.','Созданный результат превышает текущий безопасный лимит загрузки.'),AI_RESULT_DOWNLOAD_FAILED:say('The result was created but could not be downloaded from the provider yet. Try checking it again later.','Результат создан, но пока не удалось скачать его у провайдера. Попробуйте проверить позже.'),AI_PROVIDER_STATUS_INVALID:say('The provider returned an unexpected job status. No duplicate generation was started.','Провайдер вернул неожиданный статус задачи. Дублирующая генерация не запускалась.'),AI_PROVIDER_RESULT_BLOCKED:say('The provider result link was blocked by Deepsyq security checks.','Ссылка на результат провайдера была заблокирована проверкой безопасности Deepsyq.'),AI_STORAGE_FAILED:say('The result could not be saved safely. No automatic regeneration was started.','Не удалось безопасно сохранить результат. Автоматическая повторная генерация не запускалась.'),AI_PROVIDER_TIMEOUT:say('The provider took too long to respond. No automatic retry was started.','Провайдер слишком долго не отвечал. Автоматический повтор не запускался.'),AI_PROVIDER_FAILED:say('The AI provider returned an error. No automatic retry was started.','AI-провайдер вернул ошибку. Автоматический повтор не запускался.'),AI_GENERATION_FAILED:say('Generation could not finish. No automatic retry was started.','Генерация не завершилась. Автоматический повтор не запускался.'),AI_RATE_LIMIT:say('You reached the current hourly AI generation limit. Try again later.','Достигнут текущий часовой лимит AI-генераций. Попробуйте позже.'),AI_CONCURRENCY_LIMIT:say('You already have the maximum number of active generations. Wait for one to finish.','Уже запущено максимальное количество одновременных генераций. Дождитесь завершения одной из них.'),UNSUPPORTED_VIDEO_RESOLUTION:say('This model does not support that video resolution.','Эта модель не поддерживает выбранное разрешение видео.'),UNSUPPORTED_VIDEO_DURATION:say('The chosen video length is not compatible with these model settings.','Выбранная длительность видео несовместима с настройками модели.'),UNSUPPORTED_VIDEO_INPUT_MODE:say('The selected input mode is not supported by this video model.','Эта модель не поддерживает выбранный режим референсов.'),INVALID_VIDEO_REFERENCES:say('The number of reference photos does not match the selected video mode.','Количество фотографий не соответствует режиму видео.'),UNSUPPORTED_VIDEO_SETTINGS:say('Video options are not supported for this generation.','Параметры видео не поддерживаются для этой генерации.'),UNSUPPORTED_RESOLUTION:say('This image resolution is not supported by the selected model.','Выбранная модель не поддерживает это разрешение.'),INVALID_IMAGE_QUANTITY:say('Choose between 1 and 4 images for a batch.','Выберите от 1 до 4 изображений.'),IMAGE_BATCH_NOT_ENABLED:say('Multiple-image batches are not enabled. No jobs started.','Пакетная генерация ещё не включена. Задачи не запускались.'),AI_ESTIMATE_CHANGED:say('The approved price changed. No new image was started. Review your credits quote again.','Цена изменилась. Новое изображение не запущено. Проверьте расчёт кредитов снова.'),UNSUPPORTED_IMAGE_CONTROL:say('Seed or Negative Prompt is not supported by this model. Describe exclusions in the main prompt.','Эта модель не поддерживает отдельные Seed или Negative Prompt. Опишите ограничения в основном запросе.'),UNSUPPORTED_IMAGE_FORMAT:say('This output format is not supported by the selected model.','Эта модель не поддерживает выбранный формат изображения.'),AI_PRICING_NOT_APPROVED:say('Pricing for this AI model, resolution or format is not approved yet. No request was started.','Стоимость этой AI-модели, разрешения или формата ещё не утверждена. Запрос не запускался.'),STILL_PROCESSING_RELOAD_TO_CHECK:say('Still processing. Check this result again later.','Ещё обрабатывается. Проверьте этот результат позже.')};return Object.hasOwn(messages,e?.message)?messages[e.message]:say(
 'Unable to complete this request. Check your results and wallet before trying again.',
 'Не удалось выполнить запрос. Перед повтором проверьте результаты и кошелёк.'
);}
async function loadGenerationAccess(){
 const el=$('accessInfo');if(!el||!localStorage.getItem('vv_token')){if(el)el.hidden=true;return;}
 try{
  const a=await(await api('/api/studio/access')).json();el.hidden=false;
  if(a.scope==='owner'){el.textContent=say('Owner preview access. Public plan limits do not apply to this preview.','Доступ владельца. Публичные тарифные лимиты к этому preview не применяются.');return;}
  if(a.allowed){const usage=Number.isInteger(a.activeJobs)&&Number.isInteger(a.jobsThisHour)?say(` Currently: ${a.activeJobs}/${a.maxConcurrent} active · ${a.jobsThisHour}/${a.maxPerHour} in the last hour.`,` Сейчас: ${a.activeJobs}/${a.maxConcurrent} активных · ${a.jobsThisHour}/${a.maxPerHour} за последний час.`):'';el.textContent=say(`Plan ${a.plan}: up to ${a.maxConcurrent} active generation(s) and ${a.maxPerHour} per hour.`,`Тариф ${a.plan}: до ${a.maxConcurrent} одновременных генераций и ${a.maxPerHour} в час.`)+usage;return;}
  el.textContent=({PUBLIC_AI_DISABLED:say('Public AI generation is not enabled yet.','Публичная AI-генерация пока не включена.'),AI_ENTITLEMENTS_NOT_CONFIGURED:say('AI plan access is not configured yet.','Доступ к AI по тарифам пока не настроен.'),AI_PLAN_NOT_ENTITLED:say('Your current plan does not include AI generation yet.','Текущий тариф пока не включает AI-генерацию.'),AI_PLAN_INACTIVE:say('An active eligible plan is required for AI generation.','Для AI-генерации нужен активный подходящий тариф.')})[a.reason]||say('AI plan access is not available yet.','Доступ к AI по тарифу пока недоступен.');
 }catch(_){el.hidden=true;}
}
function estimateKey(){const m=currentModel();return [kind,m?.id||'',$('ratio')?.value||'',kind==='image'?$('imageResolution').value:'',kind==='image'?$('imageOutputFormat').value:'',kind==='image'?imageBatchQuantity():1,kind==='video'?$('videoResolution').value:'',kind==='video'?$('videoDuration').value:'',kind==='video'?$('videoInputMode').value:'',kind==='music'?$('musicMode')?.value||'':'',refs.length,config?.pricingConfigured===true,!!localStorage.getItem('vv_token')].join('|');}
function scheduleEstimate(){
 const el=$('creditEstimate');if(!el)return;clearTimeout(estimateTimer);const key=estimateKey();
 if(!config?.pricingConfigured||!localStorage.getItem('vv_token')||!currentModel()?.enabled){estimateSignature='';el.hidden=true;el.textContent='';return;}
 if(key===estimateSignature)return;estimateTimer=setTimeout(()=>void loadEstimate(key),350);
}
async function loadEstimate(key){
 const el=$('creditEstimate');try{
  const d=await(await api('/api/studio/estimate',{method:'POST',body:JSON.stringify({kind,model:modelId,ratio:$('ratio').value,...(kind==='image'?{resolution:$('imageResolution').value,outputFormat:$('imageOutputFormat').value}:{}),...(kind==='video'?{videoResolution:$('videoResolution').value,videoDuration:Number($('videoDuration').value),videoInputMode:$('videoInputMode').value}:{}),musicMode:$('musicMode').value,referenceCount:refs.length,quantity:imageBatchQuantity()})})).json();
  if(key!==estimateKey())return;estimateSignature=key;el.textContent=d.quantity>1?say(`Batch estimate: ${d.quantity} separate image jobs × ${d.perImageCredits.toLocaleString()} = ${d.credits.toLocaleString()} AI credits. No generation started.`,`Пакет: ${d.quantity} отдельных изображения × ${d.perImageCredits.toLocaleString()} = ${d.credits.toLocaleString()} AI-кредитов. Генерация не запускалась.`):say(`Estimated cost: ${d.credits.toLocaleString()} AI credits · no generation started`,`Ориентировочная стоимость: ${d.credits.toLocaleString()} AI-кредитов · генерация не запускалась`);el.hidden=false;
 }catch(e){if(key!==estimateKey())return;estimateSignature=key;if(e.message==='AI_PRICING_NOT_APPROVED'){el.textContent=errorText(e);el.hidden=false;}else{el.hidden=true;el.textContent='';}}
}
function availability(){const m=currentModel();$('videoBackgroundControls').hidden=!(busy&&activeVideoWatchId&&activeVideoWatchId===job);scheduleEstimate();document.querySelector('[data-t=consent]').textContent=say('I agree to send this prompt and reference photos to '+(m?.provider||'the selected provider')+' for generation.','Я согласен отправить запрос и фотографии в '+(m?.provider||'выбранный сервис')+' для генерации.');$('generate').disabled=busy||!connected(m)||!$('consent').checked||!$('prompt').value.trim()||(kind==='image'&&imageDraftNeedsPhotos&&!refs.length)||(kind==='video'&&videoDraftNeedsPhotos);$('modelButton').disabled=busy;$('settingsButton').disabled=busy;$('references').disabled=busy;$('prompt').disabled=busy||kind==='translation';$('availability').textContent=kind==='translation'?say('File translation is not connected yet. No file will be uploaded.','Перевод файлов ещё не подключён. Файл не будет загружен.'):!m?.adapter?say('This model is not connected yet. You can prepare your settings; no request will be sent.','Модель пока не подключена. Можно выбрать настройки; запрос не отправляется.'):connected(m)?say('Owner preview. Each attempt uses the approved test quota.','Тест владельца. Каждая попытка расходует согласованный лимит.'):say('Generation is not enabled. Provider access and test budget need approval.','Генерация не включена. Нужно подключение и согласованный бюджет.');if(kind==='image'){if(refs.length)imageDraftNeedsPhotos=false;showImageDraftState();saveImageDraft();}else if(kind==='video'){showVideoDraftState();saveVideoDraft();}}
function storeDraft(){drafts[kind]={prompt:$('prompt').value,modelId,ratio:$('ratio').value,resolution:$('imageResolution').value,outputFormat:$('imageOutputFormat').value,quantity:imageBatchQuantity(),videoResolution:$('videoResolution').value,videoDuration:Number($('videoDuration').value),videoInputMode:$('videoInputMode').value,refs,musicMode:$('musicMode').value};if(kind==='image')saveImageDraft();}
function renderModels(){const list=catalog.filter(m=>m.kind===modelKind());$('modelChoices').replaceChildren();for(const m of list){const b=document.createElement('button');b.type='button';b.className='model-card';b.dataset.connected=String(m.adapter);b.setAttribute('aria-pressed',String(m.id===modelId));const title=document.createElement('strong');title.textContent=m.label;const description=document.createElement('small');description.textContent=ru?m.descriptionRu||m.description||'':m.description||'';const state=document.createElement('span');state.className='connection';state.textContent=m.provider+' · '+(m.adapter?say('Adapter prepared','Адаптер подготовлен'):say('API connection pending','API не подключён'));b.append(title,description,state);b.onclick=()=>{if(busy)return;const limit=Number(m.references||0);if(refs.length>limit&&!confirm(say('This model supports '+limit+' references. Remove '+(refs.length-limit)+' photo(s) to switch models?','Эта модель поддерживает '+limit+' изображений. Убрать '+(refs.length-limit)+' фото для переключения?')))return;refs=refs.slice(0,limit);modelId=m.id;$('consent').checked=false;renderModel();$('modelDialog').close();};$('modelChoices').append(b);}}
function renderRatios(){const m=currentModel(),previous=$('ratio').value;$('ratio').replaceChildren();for(const r of m?.ratios||[])$('ratio').add(new Option(r,r));if(m?.ratios.includes(previous))$('ratio').value=previous;$('ratioLabel').hidden=!m?.ratios.length;$('ratioChoices').replaceChildren();for(const r of m?.ratios||[]){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',r);b.setAttribute('aria-pressed',String(r===$('ratio').value));const shape=document.createElement('span');shape.className='ratio-drawing';const [w,h]=r.split(':').map(Number);shape.style.width=Math.round(Math.min(38,27*w/h))+'px';shape.style.height=Math.round(Math.min(27,38*h/w))+'px';const text=document.createElement('span');text.textContent=r;b.append(shape,text);b.onclick=()=>{$('ratio').value=r;$('consent').checked=false;updateRatioSelection();availability();};$('ratioChoices').append(b);}updateRatioSelection();}
function renderVideoInputMode(){
 const model=currentModel(),active=kind==='video',count=refs.length;
 const allowed=active?(model?.capabilities?.videoInputModes||['text','first_frame']):[];
 const options=allowed.filter(mode=>mode==='text'?count===0:mode==='first_frame'?count===1:mode==='first_last'?count===2:mode==='reference_image'?count>=1&&count<=3:false);
 const select=$('videoInputMode'),previous=select.value;
 select.replaceChildren();
 const labels={
  text:say('Text to video','Текст → видео'),
  first_frame:say('Photo as first frame','Фото — первый кадр'),
  first_last:say('First and last frames','Первый и последний кадры'),
  reference_image:say('Reference images (scene guidance)','Референсы для сцены')
 };
 for(const value of options)select.add(new Option(labels[value],value));
 if(options.includes(previous))select.value=previous;
 else if(options.length)select.value=options[0];
 $('videoInputModeLabel').hidden=!active;
 $('videoInputModeNote').hidden=!active;
 if(ru&&active){
  $('videoInputModeLabel').querySelector('span').textContent='Роль фотографий в видео';
  $('videoInputModeNote').textContent='Первый кадр — ровно 1 фото; первый и последний кадры — ровно 2; референсы для сцены — 1–3. Эти режимы нельзя смешивать. Загрузка видео- и аудиореференсов пока недоступна: сначала необходимо безопасное хранилище с доступом для провайдера.';
 }
}
function renderVideoSettings(){
 renderVideoInputMode();
 const model=currentModel(),video=kind==='video';
 const resolutions=video?(model?.capabilities?.resolutions||[model.quality]):[];
 const resolution=$('videoResolution'),previousResolution=resolution.value;
 resolution.replaceChildren();
 for(const value of resolutions)resolution.add(new Option(value,value));
 resolution.value=resolutions.includes(previousResolution)?previousResolution:model?.quality||resolutions[0]||'';
 const durations=video?(model?.capabilities?.durations||[model?.capabilities?.durationSeconds]).filter(value=>Number.isInteger(value)&&(model?.provider!=='Google'||(resolution.value==='720p'&&!refs.length)||value===8)):[];
 const duration=$('videoDuration'),previousDuration=Number(duration.value);
 duration.replaceChildren();
 for(const seconds of durations)duration.add(new Option(seconds+' '+say('seconds','сек.'),String(seconds)));
 duration.value=durations.includes(previousDuration)?String(previousDuration):String(durations.includes(model?.capabilities?.durationSeconds)?model.capabilities.durationSeconds:durations[0]||'');
 $('videoResolutionLabel').hidden=!video;
 $('videoDurationLabel').hidden=!video;
 $('videoSettingsNote').hidden=!video;
 if(ru&&video){
  $('videoResolutionLabel').querySelector('span').textContent='Разрешение видео';
  $('videoDurationLabel').querySelector('span').textContent='Длительность видео';
  $('videoSettingsNote').textContent='Доступные параметры зависят от модели. Для Veo при 1080p или использовании фотографии длительность должна составлять 8 секунд. Нестандартным настройкам нужна отдельно утверждённая стоимость в AI-кредитах.';
 }
}
function renderImageResolution(){
 const select=$('imageResolution'),model=currentModel(),choices=kind==='image'?(model?.capabilities?.resolutions||[]):[];
 const previous=select.value;select.replaceChildren();
 for(const resolution of choices)select.add(new Option(resolution,resolution));
 if(choices.includes(previous))select.value=previous;
 else if(choices.includes(model?.quality))select.value=model.quality;
 $('imageResolutionLabel').hidden=kind!=='image'||!choices.length;
 $('imageResolutionNote').hidden=kind!=='image'||choices.length<2;
}
function renderImageOutputFormat(){
 const select=$('imageOutputFormat'),model=currentModel(),choices=kind==='image'?(model?.capabilities?.outputFormats||['auto']):[];
 const previous=select.value;select.replaceChildren();
 for(const format of choices)select.add(new Option(format==='auto'?say('Provider default','Формат провайдера'):format==='jpeg'?'JPEG':'PNG',format));
 if(choices.includes(previous))select.value=previous;
 $('imageOutputFormatLabel').hidden=kind!=='image'||choices.length<2;
 $('imageOutputFormatNote').hidden=kind!=='image'||choices.length<2;
}
function renderImageQuantity(){
 const enabled=kind==='image'&&config.imageBatchEnabled===true;
 if(!enabled)$('imageQuantity').value='1';
 $('imageQuantityLabel').hidden=!enabled;
 $('imageQuantityNote').hidden=!enabled;
 if(ru&&enabled){
  $('imageQuantityLabel').querySelector('span').textContent='Изображений в пакете';
  for(const option of $('imageQuantity').options)option.textContent=option.value+' '+(option.value==='1'?'изображение':'изображения');
  $('imageQuantityNote').textContent='Каждое изображение — отдельная задача и отдельное списание. Пакет выполняется по очереди, останавливается при ошибке и не запускает повторов. Перед началом нужно подтвердить общую стоимость.';
 }
}
function updateRatioSelection(){for(const b of $('ratioChoices').children)b.setAttribute('aria-pressed',String(b.getAttribute('aria-label')===$('ratio').value));const m=currentModel();$('settingsButton').textContent=kind==='music'?say('Audio settings ⌄','Настройки аудио ⌄'):[$('ratio').value,kind==='image'?$('imageResolution').value:kind==='video'?$('videoResolution').value:m?.quality,kind==='image'&&m?.capabilities?.outputFormats?.length>1?$('imageOutputFormat').value.toUpperCase():'',kind==='image'&&imageBatchQuantity()>1?imageBatchQuantity()+' images':'',kind==='video'?$('videoDuration').value+'s':m?.duration].filter(Boolean).join(' · ')+' ⌄';}
function renderModel(){let m=currentModel();if(!m){m=catalog.find(m=>m.kind===modelKind());modelId=m?.id||'';}$('modelButton').textContent=(m?.label||say('Model','Модель'))+' ⌄';$('referenceBox').hidden=!m?.references;renderImageResolution();renderImageOutputFormat();renderImageQuantity();renderVideoSettings();
 $('imageUnsupportedControls').hidden=kind!=='image'||Boolean(m?.capabilities?.supportsSeed||m?.capabilities?.supportsNegativePrompt);
 if(ru)$('imageUnsupportedControls').textContent='Seed и Negative Prompt не являются отдельными параметрами API у этих моделей. Укажите нежелательные элементы в основном запросе, например «Без текста и логотипов». Неподдерживаемые поля провайдеру не отправляются.';
 renderRatios();renderRefs();renderModels();$('qualityValue').textContent=kind==='image'?'':kind==='video'?$('videoResolution').value:(m?.quality||'');$('durationValue').textContent=kind==='video'?$('videoDuration').value+'s':m?.duration||'';$('voiceSettings').hidden=modelKind()!=='voice';availability();}
function select(next,{remember=true}={}){if(busy)return;if(remember)storeDraft();kind=next;$('imageDraftBar').hidden=kind!=='image';$('videoDraftBar').hidden=kind!=='video';$('consent').checked=false;const d=drafts[kind];refs=d?.refs||[];$('prompt').value=d?.prompt||'';$('musicMode').value=d?.musicMode||'song';modelId=d?.modelId||config.models?.find(m=>m.kind===kind)?.id||MODELS[kind]?.id||'';document.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===kind)));$('taskTitle').textContent={video:say('Create a video','Создать видео'),image:say('Create an image','Создать изображение'),music:say('Create audio','Создать аудио'),translation:say('Translate your file','Перевести файл')}[kind];$('taskDescription').textContent={video:say('Describe a scene or add a photo. Choose your model and bring the idea to life.','Опишите сцену или добавьте фото. Выберите модель и оживите свою идею.'),image:say('Start with a description. Add reference photos to guide the look.','Начните с описания. Добавьте фотографии, чтобы задать нужный образ.'),music:say('Create a short song, an instrumental, or prepare a voiceover.','Создайте короткую песню, музыку без слов или подготовьте озвучку.'),translation:say('Translation will be added after the studio is ready.','Перевод добавим после подготовки студии.')}[kind];$('musicOptions').hidden=kind!=='music';$('prompt').placeholder=kind==='music'?say('Describe the sound, mood and language. Add your lyrics or voiceover text…','Опишите звучание, настроение и язык. Добавьте текст песни или озвучки…'):kind==='image'?say('Describe your image: subject, style, colours and light…','Опишите изображение: объект, стиль, цвета и свет…'):say('Describe your video: scene, movement and atmosphere…','Опишите видео: сцену, движение и атмосферу…');$('examples').replaceChildren();const examples=kind==='video'?[['A cinematic product reveal with soft studio light','Презентация товара с мягким студийным светом'],['A calm ocean at sunset, gentle camera movement','Спокойный океан на закате и плавное движение камеры']]:kind==='image'?[['A premium product photo on a clean background','Фото товара на чистом фоне'],['A colourful illustrated poster','Яркий иллюстрированный постер']]:kind==='music'?[['A joyful pop song in English about a fresh start','Позитивная поп-песня на английском о новом начале'],['Instrumental relaxing piano for a travel video','Спокойное фортепиано для видео о путешествии']]:[];for(const [en,r] of examples){const b=document.createElement('button');b.type='button';b.textContent=say(en,r);b.onclick=()=>{if(busy)return;const next=say(en,r),existing=$('prompt').value.trim();if(existing&&existing!==next&&!confirm(say('Replace your current description with this example?','Заменить ваше описание этим примером?')))return;$('prompt').value=next;$('consent').checked=false;availability();$('prompt').focus();};$('examples').append(b);}renderModel();if(d?.ratio&&currentModel()?.ratios.includes(d.ratio)){$('ratio').value=d.ratio;updateRatioSelection();}if(kind==='image'&&currentModel()?.capabilities?.resolutions?.includes(d?.resolution)){$('imageResolution').value=d.resolution;updateRatioSelection();}if(kind==='image'&&currentModel()?.capabilities?.outputFormats?.includes(d?.outputFormat)){$('imageOutputFormat').value=d.outputFormat;updateRatioSelection();}if(kind==='image'&&config.imageBatchEnabled===true&&Number.isInteger(d?.quantity)&&d.quantity>=1&&d.quantity<=4){$('imageQuantity').value=String(d.quantity);updateRatioSelection();}if(kind==='video'&&currentModel()?.capabilities?.videoInputModes?.includes(d?.videoInputMode)&&[...$('videoInputMode').options].some(o=>o.value===d.videoInputMode))$('videoInputMode').value=d.videoInputMode;if(kind==='video'&&currentModel()?.capabilities?.resolutions?.includes(d?.videoResolution)){$('videoResolution').value=d.videoResolution;renderVideoSettings();}if(kind==='video'&&currentModel()?.capabilities?.durations?.includes(d?.videoDuration)&&[...$('videoDuration').options].some(o=>o.value===String(d.videoDuration))){$('videoDuration').value=String(d.videoDuration);updateRatioSelection();}if(kind!=='translation'){const u=new URL(location.href);u.searchParams.set('studio',kind==='music'?'audio':kind);history.replaceState(null,'',u);}setHistory(false);if(kind==='image'){showImageDraftState();saveImageDraft();}else if(kind==='video'){showVideoDraftState();saveVideoDraft();}}
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
// Local-only reference cropping: no uploads, provider calls, or credit use.
const cropDialog=$('cropReferenceDialog');
let cropImage=null,cropObjectUrl='',cropIndex=-1,cropOriginalFile=null,cropApplying=false,cropDrag=null;
const cropRatio=$('cropReferenceRatio'),cropZoom=$('cropReferenceZoom'),cropX=$('cropReferenceX'),cropY=$('cropReferenceY');
function cropBounds(){
 const w=cropImage.naturalWidth,h=cropImage.naturalHeight;
 const wanted=cropRatio.value==='original'?w/h:Number(cropRatio.value.split(':')[0])/Number(cropRatio.value.split(':')[1]);
 const baseW=Math.min(w,h*wanted),baseH=baseW/wanted,zoom=Math.max(1,Number(cropZoom.value)||1);
 const cw=baseW/zoom,ch=baseH/zoom;
 const x=(w-cw)*Number(cropX.value)/100,y=(h-ch)*Number(cropY.value)/100;
 return {x,y,w:cw,h:ch,ratio:wanted};
}
function drawCropPreview(){
 if(!cropImage)return;
 const crop=cropBounds(),canvas=$('cropReferencePreview');
 const size=Math.min(480,Math.round(360*crop.ratio));
 const width=Math.max(1,size),height=Math.max(1,Math.round(width/crop.ratio));
 if(canvas.width!==width)canvas.width=width;
 if(canvas.height!==height)canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
 ctx.drawImage(cropImage,crop.x,crop.y,crop.w,crop.h,0,0,width,height);
}
function resetCropView(){
 cropRatio.value='original';cropZoom.value='1';cropX.value='50';cropY.value='50';drawCropPreview();
}
function closeCrop(){if(!cropApplying&&cropDialog.open)cropDialog.close();}
cropDialog.addEventListener('close',()=>{
 if(cropObjectUrl)URL.revokeObjectURL(cropObjectUrl);
 cropObjectUrl='';cropImage=null;cropIndex=-1;cropOriginalFile=null;cropDrag=null;
});
cropDialog.addEventListener('cancel',event=>{if(cropApplying)event.preventDefault();});
$('cropReferenceCancel').onclick=closeCrop;
$('cropReferenceClose').onclick=closeCrop;
$('cropReferenceReset').onclick=resetCropView;
for(const el of [cropRatio,cropZoom,cropX,cropY])el.addEventListener('input',drawCropPreview);
$('cropReferencePreview').addEventListener('pointerdown',event=>{
 if(!cropImage||cropApplying)return;
 const canvas=$('cropReferencePreview');
 cropDrag={pointerId:event.pointerId,x:event.clientX,y:event.clientY,xValue:Number(cropX.value),yValue:Number(cropY.value),crop:cropBounds()};
 canvas.setPointerCapture(event.pointerId);
});
$('cropReferencePreview').addEventListener('pointermove',event=>{
 if(!cropDrag||event.pointerId!==cropDrag.pointerId||!cropImage)return;
 const box=$('cropReferencePreview').getBoundingClientRect(),region=cropDrag.crop;
 const roomX=cropImage.naturalWidth-region.w,roomY=cropImage.naturalHeight-region.h;
 if(roomX>0)cropX.value=String(Math.max(0,Math.min(100,cropDrag.xValue-(event.clientX-cropDrag.x)/box.width*region.w/roomX*100)));
 if(roomY>0)cropY.value=String(Math.max(0,Math.min(100,cropDrag.yValue-(event.clientY-cropDrag.y)/box.height*region.h/roomY*100)));
 drawCropPreview();
});
for(const type of ['pointerup','pointercancel'])$('cropReferencePreview').addEventListener(type,()=>{cropDrag=null;});
async function openCropReference(index){
 if(busy||cropApplying||!refs[index]||cropDialog.open)return;
 cropIndex=index;cropOriginalFile=refs[index].file;
 $('cropReferenceStatus').textContent=say('Loading image…','Загружаем изображение…');
 const img=new Image();cropImage=null;
 cropObjectUrl=URL.createObjectURL(cropOriginalFile);
 cropDialog.showModal();
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=cropObjectUrl;});
  if(!cropDialog.open||cropIndex!==index)return;
  if(!img.naturalWidth||!img.naturalHeight)throw Error('EMPTY_IMAGE');
  cropImage=img;resetCropView();$('cropReferenceStatus').textContent='';
 }catch(_){$('cropReferenceStatus').textContent=say('This photo could not be opened for cropping.','Не удалось открыть фото для кадрирования.');}
}
async function exportReferenceCrop(){
 const region=cropBounds(),maxEdge=Math.max(region.w,region.h);
 let factor=Math.min(1,2048/maxEdge);
 for(let attempt=0;attempt<6;attempt++){
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(region.w*factor));canvas.height=Math.max(1,Math.round(region.h*factor));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('CROP_CANVAS_UNAVAILABLE');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(cropImage,region.x,region.y,region.w,region.h,0,0,canvas.width,canvas.height);
  for(const quality of [.92,.8,.65,.5]){
   const output=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
   if(output?.size>0&&output.size<=1024*1024){
    return new File([output],'deepsyq-cropped-reference.jpg',{type:'image/jpeg'});
   }
  }
  factor*=.72;
 }
 throw Error('CROP_TOO_LARGE');
}
$('cropReferenceApply').onclick=async()=>{
 if(!cropImage||cropApplying||busy||cropIndex<0)return;
 cropApplying=true;
 for(const id of ['cropReferenceCancel','cropReferenceClose','cropReferenceApply','cropReferenceReset'])$(id).disabled=true;
 $('cropReferenceStatus').textContent=say('Preparing crop locally…','Подготавливаем кадрирование…');
 try{
  const index=cropIndex,old=refs[index];
  const file=await exportReferenceCrop();
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
  if(!old||old.file!==cropOriginalFile||refs[index]!==old)throw Error('REFERENCE_CHANGED');
  refs[index]={...old,file,mimeType:'image/jpeg',data,originalFile:old.originalFile||old.file,originalData:old.originalData||old.data,originalMimeType:old.originalMimeType||old.mimeType};
  $('consent').checked=false;renderRefs();availability();cropDialog.close();
  $('status').textContent=say('Cropped reference applied. Your original file is unchanged on your device.','Обрезанный референс применён. Исходный файл на устройстве не изменён.');
 }catch(_){$('cropReferenceStatus').textContent=say('Could not apply this crop. The existing reference has not been changed.','Не удалось применить кадрирование. Исходный референс в редакторе сохранён.');}
 finally{cropApplying=false;for(const id of ['cropReferenceCancel','cropReferenceClose','cropReferenceApply','cropReferenceReset'])$(id).disabled=false;}
};
function renderRefs(){
 for(const img of $('refPreview').querySelectorAll('img'))URL.revokeObjectURL(img.src);
 $('refPreview').replaceChildren();$('references').value='';
 const max=currentModel()?.references||0;
 renderVideoSettings();
 $('clearRefs').hidden=!refs.length;
 $('imageEditPresets').hidden=kind!=='image'||!refs.length;
 $('refHint').textContent=max?say('PNG/JPG · '+refs.length+'/'+max+' references · upload up to 16 MB each, optimized locally to 1 MB','PNG/JPG · '+refs.length+'/'+max+' изображений · исходник до 16 МБ, подготовка до 1 МБ'):'';
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
  const crop=document.createElement('button');crop.type='button';crop.className='reference-crop-action';
  crop.textContent=say('Crop','Обрезать');crop.disabled=busy;
  crop.setAttribute('aria-label',say('Crop reference photo ','Обрезать изображение ')+(index+1));
  crop.onclick=()=>void openCropReference(index);
  const undo=document.createElement('button');undo.type='button';undo.className='reference-undo-action';
  undo.textContent=say('Original','Исходное');undo.hidden=!ref.originalFile;undo.disabled=busy;
  undo.onclick=()=>{if(busy||!ref.originalFile)return;
   refs[index]={file:ref.originalFile,mimeType:ref.originalMimeType||ref.originalFile.type,data:ref.originalData};
   $('consent').checked=false;renderRefs();availability();
  };
  tile.append(img,remove,controls,crop,undo);$('refPreview').append(tile);
 });
 if(kind==='video'&&videoDraftNeedsPhotos&&refs.length===videoDraftExpectedRefs&&
   [...$('videoInputMode').options].some(o=>o.value===videoDraftPendingMode)){
  $('videoInputMode').value=videoDraftPendingMode;
  videoDraftNeedsPhotos=false;videoDraftExpectedRefs=0;videoDraftPendingMode='text';
  $('status').textContent=say('Reference photos reattached. Review their order and input mode before generating.','Фотографии прикреплены заново. Проверьте порядок кадров и режим перед генерацией.');
 }
 if(kind==='video')updateRatioSelection();
}
// Large reference photos are prepared locally. Provider payloads still obey the original 1 MB cap.
const REFERENCE_LIMIT=1024*1024,REFERENCE_INPUT_LIMIT=16*1024*1024,REFERENCE_PIXEL_LIMIT=48_000_000;
async function prepareReferenceUpload(source){
 if(!source||!['image/png','image/jpeg'].includes(source.type)||!source.size||source.size>REFERENCE_INPUT_LIMIT)
  throw Error(say('Choose PNG or JPG files up to 16 MB.','Выберите PNG или JPG размером до 16 МБ.'));
 if(source.size<=REFERENCE_LIMIT)return {file:source,optimized:false};
 let bitmap;
 try{bitmap=await createImageBitmap(source);}catch(_){throw Error(say('This image cannot be decoded in your browser. Try another PNG or JPG file.','Браузер не смог открыть изображение. Попробуйте другой PNG или JPG.'));}
 try{
  const pixels=bitmap.width*bitmap.height;
  if(!bitmap.width||!bitmap.height||pixels>REFERENCE_PIXEL_LIMIT)throw Error(say('Image dimensions are too large to prepare safely. Please resize the image first.','Размеры фотографии слишком большие. Уменьшите её перед загрузкой.'));
  let scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));
  // Keep PNG as PNG: logos and transparent background must not silently become opaque JPEGs.
  const type=source.type;
  for(let attempt=0;attempt<8;attempt++){
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.floor(bitmap.width*scale));
   canvas.height=Math.max(1,Math.floor(bitmap.height*scale));
   const context=canvas.getContext('2d');if(!context)throw Error('REFERENCE_PREPARE_FAILED');
   context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const qualities=type==='image/jpeg'?[.9,.8,.68,.54]:[undefined];
   for(const quality of qualities){
    const result=await new Promise(resolve=>canvas.toBlob(resolve,type,quality));
    if(result?.size>0&&result.size<=REFERENCE_LIMIT){
     const basename=String(source.name||'reference').replace(/\.[^.]*$/,'').replace(/[^a-z0-9_-]/gi,'_').slice(0,45)||'reference';
     const extension=type==='image/png'?'png':'jpg';
     return {file:new File([result],basename+'-optimized.'+extension,{type,lastModified:Date.now()}),optimized:true};
    }
   }
   scale*=.72;
  }
  throw Error(say('Could not make this image small enough. Please choose a different photo.','Не удалось уменьшить фотографию до 1 МБ. Выберите другую.'));
 }finally{bitmap.close();}
}
async function acceptFiles(files,{append=false}={}){
 if(busy||cropApplying)return false;
 let accepted=false;
 try{
  const max=currentModel()?.references||0,selected=Array.from(files||[]);
  if(!selected.length)return false;
  if(selected.length+(append?refs.length:0)>max)throw Error(say('This model supports at most '+max+' reference photos. Remove an existing reference first.','Эта модель поддерживает до '+max+' изображений. Сначала уберите лишние.'));
  busy=true;availability();$('status').textContent=say('Preparing reference photos locally. No files have been uploaded.','Подготавливаем фотографии на устройстве. Файлы ещё не отправлялись.');
  const next=append?[...refs]:[];
  let optimizedCount=0;
  for(const source of selected){
   const prepared=await prepareReferenceUpload(source);
   const file=prepared.file;
   if(prepared.optimized)optimizedCount++;
   const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(file);});
   next.push({file,mimeType:file.type,data});
  }
  refs=next;$('consent').checked=false;accepted=true;
  $('status').textContent=optimizedCount?say(optimizedCount+' large photo(s) optimized locally to fit the 1 MB reference limit. Original files were unchanged.','Больших фотографий уменьшено: '+optimizedCount+'. Подготовка выполнена на устройстве; оригиналы не изменены.'):say('Reference photos are ready. Generate will start only after your approval.','Фотографии готовы. Генерация начнётся только после вашего подтверждения.');
 }catch(e){$('status').textContent=errorText(e);}
 finally{
  busy=false;
  if(accepted)renderRefs();else $('references').value='';
  availability();
 }
 return accepted;
}
$('references').onchange=()=>void acceptFiles(Array.from($('references').files),{append:true});$('creator').ondragover=e=>{if(currentModel()?.references)e.preventDefault();};$('creator').ondrop=e=>{e.preventDefault();if(currentModel()?.references)void acceptFiles(Array.from(e.dataTransfer.files),{append:true});};
$('clearRefs').onclick=()=>{if(busy)return;refs=[];$('consent').checked=false;renderRefs();availability();};document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>select(b.dataset.kind));$('prompt').oninput=()=>{$('consent').checked=false;availability();};$('consent').onchange=availability;$('ratio').onchange=()=>{$('consent').checked=false;updateRatioSelection();availability();};$('imageResolution').onchange=()=>{$('consent').checked=false;updateRatioSelection();availability();};$('imageOutputFormat').onchange=()=>{$('consent').checked=false;updateRatioSelection();availability();};$('imageQuantity').onchange=()=>{$('consent').checked=false;updateRatioSelection();availability();};$('videoResolution').onchange=()=>{$('consent').checked=false;renderVideoSettings();updateRatioSelection();availability();};$('videoDuration').onchange=()=>{$('consent').checked=false;updateRatioSelection();availability();};$('videoInputMode').onchange=()=>{$('consent').checked=false;availability();};
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

// Preview only on explicit user interaction. This is an authenticated read of the user's
// existing result; no provider dispatch, regeneration, or new credit reservation.
const HISTORY_PREVIEW_MAX_BYTES=128*1024*1024;
function clearHistoryMediaPreview(){
 ++historyMediaEpoch;
 if(historyMediaPlayer){
  historyMediaPlayer.pause();
  historyMediaPlayer.removeAttribute('src');
  historyMediaPlayer.load();
  historyMediaPlayer.remove();
  historyMediaPlayer=null;
 }
 if(historyMediaUrl){URL.revokeObjectURL(historyMediaUrl);historyMediaUrl=null;}
 if(historyMediaButton?.isConnected){
  historyMediaButton.disabled=false;
  historyMediaButton.textContent=say('Preview media','Просмотр');
 }
 historyMediaButton=null;
}
async function previewHistoryMedia(item,holder,button){
 if(historyMediaButton===button&&historyMediaPlayer){
  clearHistoryMediaPreview();holder.replaceChildren();return;
 }
 clearHistoryMediaPreview();
 const epoch=historyMediaEpoch;
 historyMediaButton=button;button.disabled=true;
 button.textContent=say('Loading preview…','Загружаем…');
 holder.replaceChildren();
 try{
  const response=await api('/api/studio/jobs/'+encodeURIComponent(item.id)+'/media');
  const reportedSize=Number(response.headers.get('content-length')||0);
  if(reportedSize>HISTORY_PREVIEW_MAX_BYTES)throw Error('PREVIEW_TOO_LARGE');
  const blob=await response.blob();
  if(epoch!==historyMediaEpoch||!historyView||!button.isConnected)return;
  if(blob.size>HISTORY_PREVIEW_MAX_BYTES)throw Error('PREVIEW_TOO_LARGE');
  const expected=item.kind==='video'?'video/':'audio/';
  if(!blob.type.toLowerCase().startsWith(expected))throw Error('PREVIEW_UNSUPPORTED_FORMAT');
  const player=document.createElement(item.kind==='video'?'video':'audio');
  player.controls=true;player.preload='metadata';player.autoplay=false;
  if(item.kind==='video')player.playsInline=true;
  player.setAttribute('aria-label',item.kind==='video'?say('Saved video preview','Просмотр сохранённого видео'):say('Saved audio preview','Прослушать сохранённое аудио'));
  const objectUrl=URL.createObjectURL(blob);
  player.src=objectUrl;historyMediaUrl=objectUrl;historyMediaPlayer=player;
  holder.replaceChildren(player);button.disabled=false;
  button.textContent=say('Close preview','Закрыть просмотр');
 }catch(error){
  if(epoch!==historyMediaEpoch||!button.isConnected)return;
  button.disabled=false;button.textContent=say('Preview media','Просмотр');
  const message=document.createElement('p');message.className='hint';
  message.textContent=error.message==='PREVIEW_TOO_LARGE'?
   say('This file is too large for an in-page preview. Use Download.','Файл слишком большой для просмотра. Используйте «Скачать».'):
   error.message==='PREVIEW_UNSUPPORTED_FORMAT'?
   say('The saved file is not a supported video/audio preview. Use Download.','Формат файла не подходит для просмотра. Используйте «Скачать».'):
   say('Preview is unavailable. Your saved result was not changed.','Предпросмотр недоступен. Сохранённый результат не изменён.');
  holder.replaceChildren(message);
 }
}
function historyState(status){return status==='ready'?say('Ready','Готово'):status==='queued'?say('Queued','В очереди'):status==='processing'?say('Processing','В работе'):status==='finalizing'?say('Finalizing','Завершаем'):status==='failed'?say('Failed','Ошибка'):status;}
function historyDate(value){try{return new Intl.DateTimeFormat(navigator.language||'en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch(_){return String(value||'');}}
function historyCredits(item){const n=Number(item.creditsCharged||item.creditsReserved||0);return n>0?say(n+' AI credits',n+' AI-кредитов'):'';}
function prepareHistoryItem(item,{settings=false}={}){
 if(busy)return;
 const targetKind=item.kind==='music'?'music':item.kind;
 const previousCount=kind==='video'?refs.length:(drafts.video?.refs?.length||0);
 const oldPhotos=settings&&item.kind==='video'&&Number.isInteger(item.settings?.referenceCount)&&item.settings.referenceCount>0;
 if(oldPhotos&&previousCount&&!confirm(say('Preparing this historical video will detach your current video photos. Continue?','Для подготовки прежнего видео потребуется убрать текущие фотографии из редактора. Продолжить?')))return;
 // Never reuse unrelated current Canvas reference photos in regenerated jobs.
 const imageRefs=targetKind===kind?refs:(drafts.image?.refs||[]);
 if(settings&&item.kind==='image'&&imageRefs.length&&!confirm(say(
  'Preparing this saved image will detach your current Image draft photos. The saved job is unchanged. Continue?',
  'Подготовка сохранённого изображения уберёт фото из текущего черновика. Сохранённый результат не изменится. Продолжить?')))return;
 select(targetKind);
 if(settings&&item.kind==='image'){
  refs=[];if(drafts.image)drafts.image.refs=[];
  imageDraftNeedsPhotos=false;renderRefs();
 }
 if(item.model&&catalog.some(m=>m.id===item.model&&m.kind===targetKind)){modelId=item.model;renderModel();}
 $('prompt').value=item.prompt||'';
 if(settings&&item.kind==='video'){
  videoDraftNeedsPhotos=false;videoDraftExpectedRefs=0;videoDraftPendingMode='text';
  const n=Number(item.settings?.referenceCount||0),oldMode=item.settings?.videoInputMode||(n===1?'first_frame':'unsupported');
  // Legacy History jobs may lack videoInputMode; one old photo always meant first_frame.
  // An unsupported historical mode remains blocked until the user explicitly chooses text-only.
  if(Number.isInteger(n)&&n>0&&n<=3){
   refs=[];videoDraftNeedsPhotos=true;videoDraftExpectedRefs=n;videoDraftPendingMode=oldMode;
   renderRefs();
  }
 }
 if(settings&&item.settings?.ratio&&currentModel()?.ratios?.includes(item.settings.ratio)){$('ratio').value=item.settings.ratio;updateRatioSelection();}if(settings&&kind==='image'&&currentModel()?.capabilities?.resolutions?.includes(item.settings?.resolution)){$('imageResolution').value=item.settings.resolution;updateRatioSelection();}if(settings&&kind==='image'&&currentModel()?.capabilities?.outputFormats?.includes(item.settings?.outputFormat)){$('imageOutputFormat').value=item.settings.outputFormat;updateRatioSelection();}
 if(settings&&item.kind==='video'){if(item.settings?.referenceCount>0&&!refs.length)$('status').textContent=say('Previous video referenced photos that were not saved in this draft. Re-add them and choose the reference mode before generating.','В прежнем видео использовались фотографии, которые не сохранились в черновике. Добавьте их заново и выберите режим референсов перед генерацией.');if(currentModel()?.capabilities?.resolutions?.includes(item.settings?.videoResolution))$('videoResolution').value=item.settings.videoResolution;renderVideoSettings();if(currentModel()?.capabilities?.durations?.includes(item.settings?.videoDuration)&&[...$('videoDuration').options].some(o=>o.value===String(item.settings.videoDuration)))$('videoDuration').value=String(item.settings.videoDuration);updateRatioSelection();}
 if(settings&&item.kind==='video'&&currentModel()?.capabilities?.videoInputModes?.includes(item.settings?.videoInputMode)&&[...$('videoInputMode').options].some(o=>o.value===item.settings.videoInputMode))$('videoInputMode').value=item.settings.videoInputMode;
 if(settings&&item.kind==='music'&&['song','instrumental'].includes(item.settings?.musicMode)){$('musicMode').value=item.settings.musicMode;renderModel();}
 $('consent').checked=false;availability();setHistory(false);$('prompt').focus();
 if(settings&&item.kind==='image')$('status').textContent=say(
  'Saved prompt and settings are ready. Old reference photos are not restored. Add photos if needed and review consent before generating.',
  'Запрос и настройки готовы. Старые фотографии не восстановлены. При необходимости добавьте фото и подтвердите согласие перед генерацией.');
}
async function editHistoryImage(item){
 if(busy||item.kind!=='image'||item.status!=='ready')return;
 busy=true;availability();$('status').textContent=say('Preparing the saved image for editing…','Готовим сохранённое изображение для редактирования…');
 try{
  const response=await api('/api/studio/jobs/'+encodeURIComponent(item.id)+'/media');
  const savedImage=await response.blob();
  await useResultAsImageReference(savedImage,{suggestedPrompt:item.prompt||''});
 }catch(e){
  $('status').textContent=['IMAGE_RESULT_REQUIRED','IMAGE_PREPARE_FAILED','IMAGE_REFERENCE_PREPARE_FAILED','IMAGE_REFERENCE_UNSUPPORTED'].includes(e.message)?
   say('Unable to prepare this saved image as a reference. Your existing draft was kept.','Не удалось подготовить сохранённое изображение. Ваш текущий черновик сохранён.'):errorText(e);
 }finally{busy=false;availability();}
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
// A single, authenticated status check for an existing Video job. Never creates or retries a paid task.
async function checkHistoryVideo(item){
 if(busy||item.kind!=='video'||!['queued','processing','finalizing'].includes(item.status))return;
 busy=true;availability();
 $('status').textContent=say('Checking this video job…','Проверяем состояние видеозадачи…');
 try{
  const d=await(await api('/api/studio/jobs/'+encodeURIComponent(item.id))).json();
  if(d.id!==item.id||(d.kind&&d.kind!=='video'))throw Error('STUDIO_STORAGE_UNAVAILABLE');
  if(d.status==='ready')$('status').textContent=say('Video is ready. Select Open in History to view or download it.','Видео готово. Нажмите «Открыть» в Истории, чтобы посмотреть или скачать его.');
  else if(d.status==='failed')$('status').textContent=say('Video generation failed. No automatic retry was started.','Генерация видео завершилась ошибкой. Автоматического повтора не было.');
  else if(d.status==='unknown')$('status').textContent=say('Video status is uncertain. No new task was submitted or charged. Do not regenerate until the original task is reviewed.','Статус видео неизвестен. Новая задача не отправлялась. Не запускайте повтор, пока не проверена исходная задача.');
  else $('status').textContent=say('Video is still '+(d.status==='queued'?'queued':d.status==='finalizing'?'finalizing':'processing')+'. The server task continues without this page open.','Видео ещё '+(d.status==='queued'?'в очереди':d.status==='finalizing'?'завершается':'обрабатывается')+'. Серверная задача продолжается без открытой страницы.');
  await loadHistory();
 }catch(e){$('status').textContent=errorText(e);}
 finally{busy=false;availability();}
}
async function openHistoryJob(id){
 if(busy)return;job=id;sessionStorage.setItem('vu_generation_job',id);if(sessionStorage.getItem('vu_generation_background_job')===id)sessionStorage.removeItem('vu_generation_background_job');busy=true;availability();$('status').textContent=say('Opening saved result…','Открываем сохранённый результат…');
 const epoch=++generation;try{await watch(id,epoch);if(epoch===generation)setHistory(false);}catch(e){if(epoch!==generation)return;activeVideoWatchId=null;$('status').textContent=errorText(e);busy=false;availability();}
}
async function loadHistory(){
 const list=$('historyList');list.hidden=false;clearHistoryMediaPreview();clearHistoryThumbs();list.replaceChildren();const loading=document.createElement('p');loading.className='hint';loading.textContent=say('Loading results…','Загружаем результаты…');list.append(loading);
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
   if(item.kind==='image'&&item.status==='ready'){
    const edit=document.createElement('button');edit.type='button';
    edit.textContent=say('Edit image','Редактировать изображение');
    edit.title=say('Use this saved image as a reference in Image Generation. No AI job starts automatically.','Использовать сохранённое изображение как референс. Генерация не запускается автоматически.');
    edit.onclick=()=>void editHistoryImage(item);
    actions.append(edit);
   }
   if(item.kind==='video'&&['queued','processing','finalizing'].includes(item.status)){
    const check=document.createElement('button');check.type='button';
    check.textContent=say('Check status','Проверить статус');
    check.title=say('Check this existing video task once. No new generation or charge.','Однократно проверить существующую видеозадачу без новой генерации и списания.');
    check.onclick=()=>void checkHistoryVideo(item);
    actions.append(check);
   }
   const inlinePreview=document.createElement('div');inlinePreview.className='history-inline-media';
   if(item.status==='ready'&&['video','music','audio'].includes(item.kind)){
    const previewButton=document.createElement('button');previewButton.type='button';
    previewButton.textContent=say('Preview media','Просмотр');
    previewButton.title=say('Load your saved media on demand. No new AI generation or charge.','Загрузить готовый результат по нажатию. Новая генерация и списание не выполняются.');
    previewButton.onclick=()=>void previewHistoryMedia(item,inlinePreview,previewButton);
    actions.append(previewButton);
   }
   actions.append(open,download,reuse,regenerate,remove);card.append(preview,head,meta,prompt,actions,inlinePreview);list.append(card);observeHistoryThumbnail(item,preview);
  }
 }catch(e){list.replaceChildren();const p=document.createElement('p');p.className='hint';p.textContent=errorText(e);list.append(p);}
}
document.querySelectorAll('[data-history-filter]').forEach(button=>button.onclick=()=>{historyFilter=button.dataset.historyFilter;document.querySelectorAll('[data-history-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));void loadHistory();});
function setHistory(on){if(!on)clearHistoryMediaPreview();historyView=on;$('showCreate').setAttribute('aria-pressed',String(!on));$('showHistory').setAttribute('aria-pressed',String(on));$('historyEmpty').hidden=!on;$('historyList').hidden=!on;$('empty').hidden=on||!!blob;$('resumeJob').hidden=!sessionStorage.getItem('vu_generation_job');if(on)void loadHistory();}
window.addEventListener('pagehide',()=>{clearHistoryMediaPreview();clearHistoryThumbs();});
$('showCreate').onclick=()=>{const u=new URL(location.href);u.searchParams.delete('view');history.replaceState(null,'',u);setHistory(false);};$('showHistory').onclick=()=>setHistory(true);
function clearResult(){if(url)URL.revokeObjectURL(url);url=null;blob=null;$('media').replaceChildren();$('lyrics').textContent='';$('actions').hidden=true;$('continueImage').hidden=true;$('saveNote').hidden=true;$('empty').hidden=historyView;}
async function watch(id,epoch){
 for(let i=0;i<120&&epoch===generation;i++){
  const d=await(await api('/api/studio/jobs/'+encodeURIComponent(id))).json();
  // The user can stop browser polling at any moment; ignore late HTTP responses.
  if(epoch!==generation)return;
  updateJobProgress(d.status,{creditsReserved:d.creditsReserved,creditsCharged:d.creditsCharged});
  if(d.kind==='video'&&['queued','processing','finalizing'].includes(d.status)){
   activeVideoWatchId=id;availability();
  }
  if(d.status==='ready'){
   const b=await(await api('/api/studio/jobs/'+encodeURIComponent(id)+'/media')).blob();
   if(epoch!==generation)return;
   activeVideoWatchId=null;
   clearResult();blob=b;url=URL.createObjectURL(b);
   const tag=d.mime.startsWith('image/')?'img':d.mime.startsWith('video/')?'video':'audio';
   const media=document.createElement(tag);media.src=url;
   if(tag==='img')media.alt=say('Generated image','Созданное изображение');else media.controls=true;
   $('media').append(media);$('lyrics').textContent=d.text||'';
   $('empty').hidden=true;$('historyEmpty').hidden=true;
   $('actions').hidden=false;$('continueImage').hidden=!b.type.startsWith('image/');
   $('saveNote').hidden=false;
   $('status').textContent=say('Ready. Preview and save your creation.','Готово. Посмотрите и сохраните результат.');
   if(sessionStorage.getItem('vu_generation_background_job')===id)sessionStorage.removeItem('vu_generation_background_job');
   busy=false;availability();return;
  }
  if(d.status==='failed'||d.status==='unknown'){activeVideoWatchId=null;throw Error(d.error||'GENERATION_FAILED');}
  const wait=Math.max(3000,Math.min(20000,Number(d.retryAfterSeconds||5)*1000));
  await new Promise(r=>setTimeout(r,wait));
 }
 if(epoch!==generation)return;
 activeVideoWatchId=null;throw Error('STILL_PROCESSING_RELOAD_TO_CHECK');
}
$('backgroundVideo').onclick=()=>{
 if(!busy||!activeVideoWatchId||job!==activeVideoWatchId)return;
 const backgroundJob=job;
 ++generation; // Stop only the local watcher, never the provider task or wallet reservation.
 activeVideoWatchId=null;busy=false;
 sessionStorage.setItem('vu_generation_job',backgroundJob);
 sessionStorage.setItem('vu_generation_background_job',backgroundJob);
 const u=new URL(location.href);u.searchParams.set('view','history');history.replaceState(null,'',u);
 historyFilter='video';document.querySelectorAll('[data-history-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.historyFilter==='video')));
 setHistory(true);availability();
 $('status').textContent=say(
  'Video job saved in History. Browser waiting stopped; generation was NOT cancelled. Return later to check its status.',
  'Видеозадача сохранена в Истории. Ожидание в браузере остановлено, генерация НЕ отменена. Проверьте результат позже.'
 );
};

async function createImageBatch(){
 const quantity=imageBatchQuantity();
 if(quantity<2||quantity>4||!config.imageBatchEnabled)throw Error('IMAGE_BATCH_NOT_ENABLED');
 // This is N ordinary, independently idempotent image jobs, NOT a single multi-output provider call.
 const params={kind:'image',model:modelId,prompt:$('prompt').value,ratio:$('ratio').value,
  resolution:$('imageResolution').value,outputFormat:$('imageOutputFormat').value,
  musicMode:$('musicMode').value,references:refs.map(({mimeType,data})=>({mimeType,data})),consent:true};
 const estimate=await(await api('/api/studio/estimate',{method:'POST',body:JSON.stringify({
  kind:'image',model:params.model,ratio:params.ratio,resolution:params.resolution,
  outputFormat:params.outputFormat,referenceCount:params.references.length,quantity
 })})).json();
 const perImage=Number(estimate.perImageCredits),total=Number(estimate.credits);
 if(estimate.quantity!==quantity||estimate.kind!=='image'||estimate.model!==params.model||!Number.isSafeInteger(perImage)||perImage<1||
    !Number.isSafeInteger(total)||total!==perImage*quantity)throw Error('AI_PRICING_NOT_APPROVED');
 if(!confirm(say(
  'Generate '+quantity+' images as '+quantity+' separate AI jobs? Each costs '+perImage+' credits; total up to '+total+' credits. Jobs run one at a time. If one fails, the batch stops; no job retries automatically. Completed jobs remain in History.',
  'Создать '+quantity+' изображения отдельными AI-задачами? Каждая стоит '+perImage+' кредитов; всего до '+total+' кредитов. Задачи выполняются по очереди. При ошибке пакет остановится, автоматических повторов не будет. Готовые результаты останутся в Истории.'
 ))){$('status').textContent=say('Batch cancelled; no images were submitted.','Пакет отменён, изображения не отправлялись.');return;}
 const epoch=++generation;
 let submitted=0,ready=0;
 setHistory(false);clearResult();
 for(let index=0;index<quantity;index++){
  job=null;updateJobProgress('submitting');
  busy=true;availability();
  $('status').textContent=say('Creating image '+(index+1)+' of '+quantity+'…','Создаём изображение '+(index+1)+' из '+quantity+'…');
  try{
   // New ID exactly once per job. Ambiguous network responses are NEVER submitted again.
   const requestId=crypto.randomUUID();
   const reply=await(await api('/api/studio/jobs',{method:'POST',body:JSON.stringify({
    ...params,requestId,expectedCredits:perImage
   })})).json();
   if(!reply.id)throw Error('STUDIO_STORAGE_UNAVAILABLE');
   submitted++;
   job=reply.id;
   sessionStorage.setItem('vu_generation_job',job);
   updateJobProgress(reply.status||'processing',{creditsReserved:reply.creditsReserved});
   await watch(job,epoch);
   ready++;
  }catch(e){
   if(!job)updateJobProgress('unconfirmed');
   $('status').textContent=say(
    'Batch stopped after '+submitted+' submitted and '+ready+' completed image(s). '+errorText(e)+' Check History: a job may still be processing. No automatic retries were made.',
    'Пакет остановлен: отправлено '+submitted+', готово '+ready+'. '+errorText(e)+' Проверьте Историю: одна из задач ещё может выполняться. Автоматических повторов не было.'
   );
   return;
  }
 }
 $('status').textContent=say('Batch complete: '+ready+' images saved as separate results in History.','Пакет завершён: '+ready+' изображения сохранены отдельно в Истории.');
}
$('creator').onsubmit=async e=>{e.preventDefault();if($('generate').disabled)return;busy=true;availability();if(kind==='image'&&imageBatchQuantity()>1){try{await createImageBatch();}catch(e){$('status').textContent=errorText(e);}finally{busy=false;availability();}return;}setHistory(false);clearResult();job=null;updateJobProgress('submitting');const epoch=++generation;$('status').textContent=say('Submitting your request…','Отправляем запрос…');try{const d=await(await api('/api/studio/jobs',{method:'POST',body:JSON.stringify({requestId:crypto.randomUUID(),kind,model:modelId,prompt:$('prompt').value,ratio:$('ratio').value,...(kind==='image'?{resolution:$('imageResolution').value,outputFormat:$('imageOutputFormat').value}:{}),...(kind==='video'?{videoResolution:$('videoResolution').value,videoDuration:Number($('videoDuration').value),videoInputMode:$('videoInputMode').value}:{}),musicMode:$('musicMode').value,references:refs.map(({mimeType,data})=>({mimeType,data})),consent:$('consent').checked})})).json();if(!d.id)throw Error('STUDIO_STORAGE_UNAVAILABLE');job=d.id;sessionStorage.setItem('vu_generation_job',job);updateJobProgress(d.status||'processing',{creditsReserved:d.creditsReserved});if(kind==='video'){activeVideoWatchId=job;availability();}$('status').textContent=say('Generating. This can take a few minutes.','Генерация. Это может занять несколько минут.');await watch(job,epoch);}catch(e){if(epoch!==generation)return;activeVideoWatchId=null;if(!job)updateJobProgress('unconfirmed');$('status').textContent=errorText(e);busy=false;availability();}};
// Continue from an existing image in the same browser without an API call.
 // The reference is explicitly prepared for a new Image request; Generate stays manual.
 async function imageResultReference(input){
 if(!['image/jpeg','image/png'].includes(input?.type)||!input.size||input.size>30*1024*1024)throw Error('IMAGE_RESULT_REQUIRED');
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
// Shared History and recent-result editing path. Conversion is local; no paid provider action.
async function useResultAsImageReference(result,{suggestedPrompt=''}={}){
 const file=await imageResultReference(result);
 // Release the local preparation lock before using existing Studio draft controls.
 busy=false;
 if(kind!=='image')select('image',{remember:true});
 const maxRefs=Number(currentModel()?.references||0);
 if(maxRefs<1)throw Error('IMAGE_REFERENCE_UNSUPPORTED');
 if(refs.length>=maxRefs&&!confirm(say('Replace your existing reference photos with this image?','Заменить имеющиеся фотографии этим изображением?'))){
  $('status').textContent=say('Your existing references are unchanged.','Ваши фотографии оставлены без изменений.');
  return false;
 }
 const append=refs.length>0&&refs.length<maxRefs;
 const hadPrompt=!!$('prompt').value.trim();
 if(!await acceptFiles([file],{append}))throw Error('IMAGE_REFERENCE_PREPARE_FAILED');
 if(!hadPrompt&&suggestedPrompt)$('prompt').value=String(suggestedPrompt).slice(0,2000);
 $('consent').checked=false;
 setHistory(false);$('prompt').focus();availability();
 $('status').textContent=say('Image ready as a reference. Describe your changes and review the model before generating. No AI request was started.','Изображение готово как референс. Опишите изменения и проверьте модель. AI-генерация не запускалась.');
 return true;
}
$('continueImage').onclick=async()=>{
 if(!blob||busy||!blob.type.startsWith('image/'))return;
 busy=true;availability();$('status').textContent=say('Preparing this image as your next reference…','Готовим изображение для следующей редакции…');
 try{await useResultAsImageReference(blob);}
 catch(_){$('status').textContent=say('Could not prepare this image. Download it and add it manually.','Не удалось подготовить изображение. Скачайте его и добавьте вручную.');}
 finally{busy=false;availability();}
};
function filename(){const ext=blob?.type.startsWith('video/')?'mp4':blob?.type==='image/jpeg'?'jpg':blob?.type.startsWith('image/')?'png':blob?.type==='audio/wav'?'wav':'mp3';return `Deepsyq-${job}.${ext}`;}
$('download').onclick=async()=>{if(!blob||busy)return;busy=true;availability();try{await saveLocal(new File([blob],filename(),{type:blob.type}));}catch(e){$('status').textContent=errorText(e);}finally{busy=false;availability();}};
$('share').onclick=async()=>{if(!blob||busy)return;const file=new File([blob],filename(),{type:blob.type});try{if(window.AndroidBridge&&window.VUShareFile){busy=true;availability();try{await window.VUShareFile({blob:file,name:file.name});}finally{busy=false;availability();}return;}if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file]});else $('status').textContent=say('File sharing is unavailable in this browser. Download the file to share it.','Этот браузер не поддерживает отправку файла. Скачайте его и поделитесь.');}catch(e){if(e.name!=='AbortError')$('status').textContent=say('Could not share. Try downloading the file.','Не удалось поделиться. Попробуйте скачать файл.');}};
$('remove').onclick=async()=>{if(!job||busy)return;busy=true;availability();try{await api(`/api/studio/jobs/${encodeURIComponent(job)}`,{method:'DELETE'});++generation;clearResult();sessionStorage.removeItem('vu_generation_job');job=null;$('status').textContent=say('Result deleted. Downloaded copies are kept.','Результат удалён. Скачанные копии остаются.');if(historyView)await loadHistory();else setHistory(false);}catch(e){$('status').textContent=errorText(e);}finally{busy=false;availability();}};
async function applyLocalStudioHandoff(){
 try{
  const h=await takeStudioHandoff();if(!h)return false;
  const target=h.kind==='music'?'music':h.kind;if(target!==kind)select(target);if(target==='video'){videoDraftNeedsPhotos=false;videoDraftExpectedRefs=0;videoDraftPendingMode='text';}
  if(h.defaultModel&&catalog.some(m=>m.id===h.defaultModel&&m.kind===target)){modelId=h.defaultModel;renderModel();}
  $('prompt').value=String(h.prompt||'').slice(0,2000);
  const ratio=h.settings?.ratio;if(ratio&&currentModel()?.ratios?.includes(ratio)){$('ratio').value=ratio;updateRatioSelection();}const resolution=h.settings?.resolution;if(kind==='image'&&currentModel()?.capabilities?.resolutions?.includes(resolution)){$('imageResolution').value=resolution;updateRatioSelection();}const outputFormat=h.settings?.outputFormat;if(kind==='image'&&currentModel()?.capabilities?.outputFormats?.includes(outputFormat)){$('imageOutputFormat').value=outputFormat;updateRatioSelection();}
  const max=currentModel()?.references||0,files=(h.files||[]).slice(0,max);if(files.length)await acceptFiles(files);
  $('consent').checked=false;availability();const dropped=(h.files||[]).length-files.length;
  $('status').textContent=dropped?say(`Workflow prepared. This model accepts ${max} reference file(s), so ${dropped} local file(s) were not attached. Review everything before generating.`,`Шаблон подготовлен. Эта модель принимает ${max} файл(а), поэтому ${dropped} файл(а) не были прикреплены. Проверьте всё перед генерацией.`):say('Workflow prepared locally. Review the prompt, references and settings before generating.','Шаблон подготовлен локально. Проверьте запрос, фотографии и настройки перед генерацией.');return true;
 }catch(_){$('status').textContent=say('The local workflow handoff could not be restored. Add your references here instead.','Не удалось восстановить локальный шаблон. Добавьте фотографии здесь.');return false;}
}
function applyTemplateStart(){
 const raw=sessionStorage.getItem('deepsyq_template_start');if(!raw)return false;sessionStorage.removeItem('deepsyq_template_start');
 try{
  const t=JSON.parse(raw),target=t.generationType==='image'?'image':t.generationType==='audio'?'music':t.generationType==='video'?'video':null;if(!target)return false;
  if(target!==kind)select(target);
  if(target==='video'){videoDraftNeedsPhotos=false;videoDraftExpectedRefs=0;videoDraftPendingMode='text';}
  if(t.defaultModel&&catalog.some(m=>m.id===t.defaultModel&&m.kind===target)){modelId=t.defaultModel;renderModel();}
  $('prompt').value=String(t.promptTemplate||'').slice(0,2000);
  const ratio=t.defaultSettings?.ratio;if(ratio&&currentModel()?.ratios?.includes(ratio)){$('ratio').value=ratio;updateRatioSelection();}const outputFormat=t.defaultSettings?.outputFormat;if(kind==='image'&&currentModel()?.capabilities?.outputFormats?.includes(outputFormat)){$('imageOutputFormat').value=outputFormat;updateRatioSelection();}
  $('consent').checked=false;availability();$('status').textContent=say('Template prepared. Review the prompt, references and settings before generating.','Шаблон подготовлен. Проверьте запрос, фотографии и настройки перед генерацией.');return true;
 }catch(_){$('status').textContent=say('The template could not be prepared.','Не удалось подготовить шаблон.');return false;}
}
$('resumeJob').onclick=()=>{if(busy)return;const previous=sessionStorage.getItem('vu_generation_job');if(!previous)return;job=previous;if(sessionStorage.getItem('vu_generation_background_job')===job)sessionStorage.removeItem('vu_generation_background_job');busy=true;availability();const epoch=++generation;watch(job,epoch).catch(e=>{if(epoch!==generation)return;activeVideoWatchId=null;$('status').textContent=errorText(e);busy=false;availability();});};
await initializeImageDraft();
await initializeVideoDraft();
select(kind,{remember:false});
try{config=await(await api('/api/studio/config')).json();await loadGenerationAccess();catalog=config.catalog||[...config.models.map(m=>({...m,id:m.id||MODELS[m.kind]?.id,adapter:true,provider:'Google'})),...MODEL_CATALOG.filter(m=>!config.models.some(c=>(c.id||MODELS[c.kind]?.id)===m.id)).map(m=>({...m,enabled:false}))];const preferred=config.models?.find(m=>m.kind===kind&&m.enabled);if(preferred?.id&&!(kind==='image'&&imageDraftLoaded)&&!(kind==='video'&&videoDraftLoaded))modelId=preferred.id;renderModel();if(kind==='image'&&imageDraftLoaded){const d=drafts.image;if(currentModel()?.ratios?.includes(d?.ratio))$('ratio').value=d.ratio;if(currentModel()?.capabilities?.resolutions?.includes(d?.resolution))$('imageResolution').value=d.resolution;if(currentModel()?.capabilities?.outputFormats?.includes(d?.outputFormat))$('imageOutputFormat').value=d.outputFormat;if(config.imageBatchEnabled===true&&Number.isInteger(d?.quantity)&&d.quantity>=1&&d.quantity<=4)$('imageQuantity').value=String(d.quantity);updateRatioSelection();}if(kind==='video'&&videoDraftLoaded){const d=drafts.video;if(currentModel()?.ratios?.includes(d?.ratio))$('ratio').value=d.ratio;if(currentModel()?.capabilities?.resolutions?.includes(d?.videoResolution))$('videoResolution').value=d.videoResolution;renderVideoSettings();if([...$('videoDuration').options].some(o=>o.value===String(d?.videoDuration)))$('videoDuration').value=String(d.videoDuration);updateRatioSelection();}}catch(_){availability();}
const restored=await applyLocalStudioHandoff();if(!restored)applyTemplateStart();
imageDraftReady=true;videoDraftReady=true;if(kind==='image'){showImageDraftState();saveImageDraft();}else if(kind==='video'){showVideoDraftState();saveVideoDraft();}
const previous=sessionStorage.getItem('vu_generation_job');if(previous&&config.enabled&&sessionStorage.getItem('vu_generation_background_job')!==previous){job=previous;busy=true;availability();const epoch=++generation;watch(job,epoch).catch(e=>{if(epoch!==generation)return;activeVideoWatchId=null;$('status').textContent=errorText(e);busy=false;availability();});}else if(previous&&sessionStorage.getItem('vu_generation_background_job')===previous){job=previous;setHistory(true);$('status').textContent=say('The video job is being tracked in History. Check its status when ready.','Видеозадача находится в Истории. Проверяйте её статус там.');}

if(new URLSearchParams(location.search).get('view')==='history')setHistory(true);

await loadAiWallet();
const aiCheckoutState=new URLSearchParams(location.search).get('ai_checkout');
if((aiCheckoutState==='returned'||aiCheckoutState==='cancelled')&&!$('walletButton').hidden){
 if(!$('walletDialog').open)$('walletDialog').showModal();
 $('walletStatus').textContent=aiCheckoutState==='returned'?say('Returned from Stripe. Credits appear only after Stripe confirms the payment webhook. Use Refresh balance if confirmation is still pending.','Вы вернулись из Stripe. Кредиты появятся только после подтверждения платежа webhook. Если подтверждение ещё идёт, нажмите «Обновить баланс».'):say('Checkout was cancelled. No AI credits were added by this return.','Оплата отменена. По этому возврату AI-кредиты не добавлены.');
 const u=new URL(location.href);u.searchParams.delete('ai_checkout');history.replaceState(null,'',u);
}
