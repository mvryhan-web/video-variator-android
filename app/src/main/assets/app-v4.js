(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const qsa=s=>Array.from(document.querySelectorAll(s));
  const core=window.VideoVariatorCore;
  const sessionDownloads=new Map();
  const persistentMedia=window.VUPersistentMedia;
  const trialUsed=Number(localStorage.getItem('vv_trial_used')||0);
  const state={
    locale:'en',config:null,user:null,token:localStorage.getItem('vv_token')||'',pendingPlan:null,
    trialUsed:Math.max(0,Math.min(2,trialUsed)),estimate:null,history:readJson('vv_history',[]).slice(0,100),
    metrics:readJson('vv_metrics',{attempts:0,successes:0,errors:0,outputs:0,credits:0,seconds:0}),swReg:null,reloading:false
  };

  const en={
    brandTag:'One video. Many versions.',navDashboard:'Dashboard',navHistory:'History',navAnalytics:'Analytics',navPlans:'Plans',navFaq:'FAQ',navProfile:'Profile & Settings',
    languageAuto:'Language: Auto',localProcessing:'Video processing runs locally on your device.',secureHttps:'HTTPS required for online services',signIn:'Sign in',signOut:'Sign out',
    trialPill:'2 free videos included',heroText:'Upload once, choose your variations, and create privacy-first results locally on your device.',statProcessed:'Processed',statProcessedSub:'outputs created',statRemaining:'Remaining',statPlan:'Current plan',trialStatus:'No card required',
    newProject:'New variation',newProjectSub:'Choose one or more videos. Completed files are saved automatically.',engineStandby:'Engine standby',engineLoading:'Loading engine…',engineReady:'Engine ready',chooseVideos:'Choose videos',chooseVideosSub:'One or multiple files',noFiles:'No videos selected yet.',
    variantsLabel:'Variations per video',modeLabel:'Processing mode',formatLabel:'Video format',qualityLabel:'Output resolution',estimatedCost:'Estimated processing cost',startProcessing:'Create variations',cancel:'Cancel',
    preparing:'Preparing your video',preparingSub:'Getting everything ready…',stageUpload:'Load',stageProcess:'Process',stageSave:'Save',stageDone:'Done',readyTitle:'Done',readyText:'Completed files were saved automatically.',viewHistory:'View history',recentIssue:'Recent issue',
    historyTitle:'Download history',historySub:'Your recent processed files and download status.',clearHistory:'Clear history',historyEmptyTitle:'No processed videos yet',historyEmptyText:'Your completed videos will appear here.',
    analyticsTitle:'Analytics',analyticsSub:'Track usage, output volume, and processing reliability.',creditsUsed:'Credits used',outputsCreated:'Outputs created',successRate:'Success rate',browserCompatibility:'Browser compatibility',browserCompatibilityText:'The interface is tested in Chromium, Firefox, WebKit, and mobile browser profiles. Codec support can vary by device.',
    firstOffer:'Intro discount available on your first subscription',plansTitle:'Choose the plan that fits your workflow',plansSub:'One second of generated video uses one credit. The selected number of variations multiplies the base cost.',perMonth:'/ month',mostPopular:'Recommended',guaranteeTitle:'Money-back guarantee',guaranteeText:'Eligible first subscription purchases are covered by our refund policy. Full eligibility terms are shown before checkout.',
    faqTitle:'Frequently asked questions',faqSub:'Everything you need to know before processing your videos.',profileTitle:'Profile & Settings',profileSub:'Manage your account, subscription, privacy, and updates.',
    processing:'Processing',saving:'Saving',loading:'Loading',done:'Done',download:'Download',share:'Share',historyStatusSaved:'Saved',historyStatusReady:'Ready',freeTrial:'Free trial',
    creditsNeeded:'You do not have enough credits for this job.',freeVideosNeeded:'You do not have enough free test videos for this job.',signInRequired:'Sign in before choosing a paid plan.',billingUnavailable:'Billing is not configured yet.',authUnavailable:'Sign-in will activate after production OAuth credentials are configured.',clearConfirm:'History cleared.',jobComplete:'Processing complete.',processingError:'Processing failed. Please try again.',canceled:'Processing canceled.',
    updateChecking:'Checking for updates…',upToDate:'You are using the latest available version.'
  };
  const translations={
    en,
    fr:{navDashboard:'Tableau de bord',navHistory:'Historique',navAnalytics:'Analytique',navPlans:'Offres',navFaq:'FAQ',navProfile:'Profil et réglages',signIn:'Se connecter',signOut:'Se déconnecter',startProcessing:'Créer les variations',cancel:'Annuler',analyticsTitle:'Analytique',profileTitle:'Profil et réglages'},
    ru:{navDashboard:'Главная',navHistory:'История',navAnalytics:'Аналитика',navPlans:'Тарифы',navFaq:'FAQ',navProfile:'Профиль и настройки',signIn:'Войти',signOut:'Выйти',startProcessing:'Создать вариации',cancel:'Отменить',analyticsTitle:'Аналитика',profileTitle:'Профиль и настройки'},
    uk:{navDashboard:'Головна',navHistory:'Історія',navAnalytics:'Аналітика',navPlans:'Тарифи',navFaq:'FAQ',navProfile:'Профіль і налаштування',signIn:'Увійти',signOut:'Вийти',startProcessing:'Створити варіації',cancel:'Скасувати',analyticsTitle:'Аналітика',profileTitle:'Профіль і налаштування'}
  };

  function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch(_){return fallback;}}
  function detectLocale(){const raw=(navigator.languages?.[0]||navigator.language||'en-US').toLowerCase();if(raw.startsWith('fr'))return'fr';if(raw.startsWith('ru'))return'ru';if(raw.startsWith('uk'))return'uk';return'en';}
  function t(key){return translations[state.locale]?.[key]||en[key]||key;}
  function applyLocale(){state.locale=detectLocale();document.documentElement.lang=state.locale==='en'?'en-US':state.locale;$('localeBadge').textContent=state.locale.toUpperCase();qsa('[data-i18n]').forEach(el=>{const v=t(el.dataset.i18n);if(v)el.textContent=v;});renderAll();}
  function bytes(n){const units=['B','KB','MB','GB'];let i=0,v=n||0;while(v>=1024&&i<units.length-1){v/=1024;i++;}return `${v.toFixed(v>=100?0:v>=10?1:2)} ${units[i]}`;}
  function toast(message){const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,3500);}
  function saveHistory(){localStorage.setItem('vv_history',JSON.stringify(state.history.slice(0,100)));}
  function saveMetrics(){localStorage.setItem('vv_metrics',JSON.stringify(state.metrics));}

  function apiBase(){if(window.VV_API_BASE)return String(window.VV_API_BASE).replace(/\/$/,'');if(location.protocol==='https:'||location.protocol==='http:')return location.origin;return localStorage.getItem('vv_api_base')||'';}
  async function api(path,options={}){const base=apiBase();if(!base)throw new Error('API_UNAVAILABLE');const headers={'Content-Type':'application/json',...(options.headers||{})};if(state.token)headers.Authorization=`Bearer ${state.token}`;const r=await fetch(base+path,{...options,headers});const data=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(data.error||`Request failed (${r.status})`);e.status=r.status;throw e;}return data;}

  function usage(){if(state.user?.usage)return state.user.usage;return{plan:'trial',limit:2,used:state.trialUsed,remaining:Math.max(0,2-state.trialUsed),active:false,unit:'videos'};}
  function planName(id){return id==='basic'?'Basic':id==='pro'?'Pro':id==='business'?'Business':id==='lifetime'?'Lifetime':'Free trial';}
  function activePlan(){const u=usage();return u.active&&['basic','pro','business','lifetime'].includes(u.plan)?u.plan:'trial';}
  function policyFor(plan){
    if(plan==='lifetime')return{modes:['gentle','balanced','dynamic'],qualities:['720','1080','2160'],maxVariants:15,label:'Lifetime: all modes · 720p / 1080p / 4K · up to 15 variations · all current & future features'};
    if(plan==='business')return{modes:['gentle','balanced','dynamic'],qualities:['2160'],maxVariants:15,label:'Business: Gentle + Balance + Dynamic · 4K · up to 15 variations'};
    if(plan==='pro')return{modes:['gentle','balanced'],qualities:['1080'],maxVariants:10,label:'Pro: Gentle + Balance · 1080p · up to 10 variations'};
    if(plan==='basic')return{modes:['gentle'],qualities:['720'],maxVariants:5,label:'Basic: Gentle · 720p · up to 5 variations'};
    return{modes:['gentle','balanced','dynamic'],qualities:['720','1080','2160'],maxVariants:5,label:'Free trial: Gentle + Balance + Dynamic · 720p / 1080p / 4K'};
  }
  function enforcePlanControls(){
    const policy=policyFor(activePlan()),mode=$('mode'),quality=$('quality'),variants=$('variantCount'),allowedQualities=policy.qualities||['720'];
    Array.from(mode.options).forEach(o=>o.disabled=!policy.modes.includes(o.value));
    if(!policy.modes.includes(mode.value))mode.value=policy.modes[0];
    Array.from(quality.options).forEach(o=>o.disabled=!allowedQualities.includes(o.value));
    if(!allowedQualities.includes(quality.value))quality.value=allowedQualities[0];
    quality.disabled=allowedQualities.length===1;
    Array.from(variants.options).forEach(o=>o.disabled=Number(o.value)>policy.maxVariants);
    if(Number(variants.value)>policy.maxVariants)variants.value=String(policy.maxVariants);
    $('planAccessHint').textContent=policy.label;
  }

  function renderDashboard(){
    const u=usage(),paid=u.unit==='credits';
    $('usageLabel').textContent=u.unlimited?'Lifetime access':(paid?'Credits remaining':'Free trial videos');
    if(u.unlimited){$('creditText').textContent='Unlimited';$('creditBar').style.width='100%';}
    else if(paid){$('creditText').textContent=`${u.remaining} / ${u.limit}`;$('creditBar').style.width=`${u.limit?Math.max(0,Math.min(100,u.remaining/u.limit*100)):0}%`;}
    else{$('creditText').textContent=`${u.used} / ${u.limit}`;$('creditBar').style.width=`${u.limit?Math.max(0,Math.min(100,u.used/u.limit*100)):0}%`;}
    $('planLabel').textContent=planName(u.plan);$('processedCount').textContent=state.metrics.outputs||0;$('remainingCount').textContent=u.unlimited?'∞':u.remaining;$('remainingSub').textContent=u.unlimited?'lifetime access':(paid?'credits':'free videos');$('currentPlan').textContent=planName(u.plan);$('planStatus').textContent=u.unlimited?'Permanent':(u.active?(u.status||'Active'):t('trialStatus'));
    $('signInBtn').textContent=state.user?t('signOut'):t('signIn');$('accountChip').hidden=!state.user;if(state.user)$('accountChip').textContent=state.user.email||state.user.name||'Account';renderProfile();enforcePlanControls();
  }
  function renderProfile(){const u=usage(),lifetime=u.plan==='lifetime'&&u.active;$('profileEmail').textContent=state.user?.email||'Not signed in';$('profilePlan').textContent=planName(u.plan);$('profileStatus').textContent=lifetime?'Lifetime · permanent':(u.active?(u.status||'Active'):'Trial / inactive');$('manageBillingBtn').disabled=!state.user||!u.active;$('cancelSubscriptionBtn').disabled=!state.user||!u.active||lifetime;}
  function renderAnalytics(){const m=state.metrics,rate=m.attempts?Math.round(m.successes/m.attempts*100):100;$('analyticsCredits').textContent=m.credits||0;$('analyticsOutputs').textContent=m.outputs||0;$('analyticsDuration').textContent=`${Math.round(m.seconds||0)} sec processed`;$('analyticsSuccess').textContent=`${rate}%`;$('analyticsErrors').textContent=`${m.errors||0} errors`;}
  function historyActionButtons(item,blob,right){
    right.replaceChildren();const d=document.createElement('button');d.className='ghostBtn';d.textContent=t('download');d.onclick=()=>saveResult(item.name,blob);const s=document.createElement('button');s.className='ghostBtn';s.textContent=t('share');s.onclick=()=>shareResult(item.name,blob);right.append(d,s);
  }
  function renderHistory(){
    const list=$('historyList'),empty=$('historyEmpty');list.innerHTML='';empty.hidden=state.history.length>0;
    state.history.forEach(item=>{
      const row=document.createElement('article');row.className='historyItem card';const left=document.createElement('div'),title=document.createElement('h4'),meta=document.createElement('div');title.textContent=item.name;meta.className='historyMeta';
      const detail=item.type==='avatar'?'Avatar Narrator':`${item.credits||0} credits`;meta.textContent=`${new Date(item.createdAt).toLocaleString()} · ${item.resolution||''} · ${item.aspectRatio||''} · ${detail}`;left.append(title,meta);
      const right=document.createElement('div'),blob=sessionDownloads.get(item.id);right.className='historyActions';
      if(blob)historyActionButtons(item,blob,right);
      else{
        const badge=document.createElement('span');badge.className='historyBadge';badge.textContent=item.saved?t('historyStatusSaved'):t('historyStatusReady');right.appendChild(badge);
        if(item.mediaCacheKey&&persistentMedia)persistentMedia.get(item.mediaCacheKey).then(savedBlob=>{if(savedBlob)historyActionButtons(item,savedBlob,right);}).catch(()=>{});
      }
      row.append(left,right);list.appendChild(row);
    });
  }
  function renderAll(){renderDashboard();renderHistory();renderAnalytics();}

  function showView(name){qsa('.view').forEach(v=>v.classList.toggle('active',v.id===`${name}View`));qsa('.navBtn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));const key={dashboard:'navDashboard',history:'navHistory',analytics:'navAnalytics',plans:'navPlans',faq:'navFaq',profile:'navProfile'}[name]||'navDashboard';$('pageTitle').textContent=t(key);document.querySelector('.sidebar')?.classList.remove('open');if(name==='analytics')refreshAnalytics();}
  function getResolution(){const a=$('aspectRatio').value,q=$('quality').value;if(a==='16:9'){if(q==='2160')return'3840x2160';if(q==='1080')return'1920x1080';return'1280x720';}if(q==='2160')return'2160x3840';if(q==='1080')return'1080x1920';return'720x1280';}

  function updateFileSummary(){const files=core.getFiles();$('startBtn').disabled=!files.length||core.state.running;if(!files.length){$('fileSummary').textContent=t('noFiles');state.estimate=null;$('creditEstimate').textContent='—';return;}const total=files.reduce((s,f)=>s+(f.size||0),0),names=files.slice(0,3).map(f=>f.name).join(', ');$('fileSummary').textContent=`${files.length} video${files.length===1?'':'s'} · ${bytes(total)} · ${names}${files.length>3?'…':''}`;scheduleEstimate();}
  let estimateTimer;
  function scheduleEstimate(){clearTimeout(estimateTimer);estimateTimer=setTimeout(estimateCost,160);}
  async function estimateCost(){const files=core.getFiles();if(!files.length)return;const variants=Number($('variantCount').value),stamp=files.map(f=>`${f.name}:${f.size}`).join('|')+':'+variants;$('creditEstimate').textContent='Calculating…';try{const e=await core.estimateCredits(variants);if(stamp!==core.getFiles().map(f=>`${f.name}:${f.size}`).join('|')+':'+$('variantCount').value)return;state.estimate=e;const u=usage();$('creditEstimate').textContent=u.unlimited?`Included with Lifetime · ${e.creditSeconds} credits of processing`:(u.unit==='credits'?`${Math.ceil(e.sourceSeconds)} base × ${e.variants} = ${e.creditSeconds} credits`:`${e.sourceCount} / ${u.limit} free video${e.sourceCount===1?'':'s'}`);$('startBtn').disabled=u.unlimited?false:(u.unit==='credits'?e.creditSeconds>u.remaining:e.sourceCount>u.remaining);}catch(err){state.estimate=null;$('creditEstimate').textContent='Unable to estimate';reportError(err,'estimate');}}

  function setStage(stage){const order=['upload','process','save','done'],map={load:'upload',process:'process',save:'save',done:'done'},current=map[stage]||stage,idx=order.indexOf(current);qsa('.stage').forEach((el,i)=>{el.classList.toggle('active',i===idx);el.classList.toggle('done',i<idx||current==='done');});$('progressStage').textContent=current==='upload'?t('loading'):current==='process'?t('processing'):current==='save'?t('saving'):t('done');}
  core.configure({
    onEngine(status){const el=$('engineBadge');el.classList.toggle('ready',status==='ready');el.textContent=status==='ready'?t('engineReady'):status==='loading'?t('engineLoading'):t('engineStandby');},
    onProgress(p){const n=Math.round(p*100);$('progressPercent').textContent=n+'%';$('progressBar').style.width=n+'%';},
    onStage(stage,info={}){setStage(stage);if(stage==='process'){$('progressTitle').textContent=info.file||t('processing');$('progressText').textContent=`${t('processing')} ${info.job||''}${info.total?` / ${info.total}`:''}`;}else if(stage==='save')$('progressText').textContent=t('saving');else if(stage==='done'){$('progressTitle').textContent=t('done');$('progressText').textContent=t('jobComplete');}},
    onLog(line){console.debug('[VideoVariator]',line);}
  });

  function downloadBlob(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  function blobChunkBase64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(reader.error||new Error('Could not read file'));reader.readAsDataURL(blob);});}
  async function saveResult(name,blob){const bridge=window.AndroidBridge;if(bridge?.startFile){if(!bridge.startFile(name))throw new Error('Android could not create the output file.');for(let i=0;i<blob.size;i+=512*1024){const b64=await blobChunkBase64(blob.slice(i,Math.min(i+512*1024,blob.size)));if(!bridge.appendChunk(b64))throw new Error('Could not save the output file.');}const path=bridge.finishFile();if(!path||path==='error')throw new Error('Could not finish saving the output file.');return path;}downloadBlob(name,blob);return'Downloads';}
  async function shareResult(name,blob){if(window.VUShareFile){await window.VUShareFile({name,blob});return;}const file=new File([blob],name,{type:blob.type||'video/mp4'});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Video Uniquifier'});return;}downloadBlob(name,blob);}
  function autoSaveBrowserResults(results){if(window.AndroidBridge)return;results.forEach((r,i)=>setTimeout(()=>downloadBlob(r.name,r.blob),i*250));}
  async function addHistory(results){const items=[];for(const r of results){sessionDownloads.set(r.id,r.blob);const item={id:r.id,name:r.name,sourceName:r.sourceName,createdAt:r.createdAt,resolution:r.resolution,aspectRatio:r.aspectRatio,durationSeconds:r.durationSeconds,credits:r.credits,saved:r.saved||!window.AndroidBridge,path:r.path||null};state.history.unshift(item);items.push(item);}saveHistory();renderHistory();if(state.user)api('/api/history',{method:'POST',body:JSON.stringify({items})}).catch(()=>{});}

  async function startProcessing(){
    const files=core.getFiles();if(!files.length)return;enforcePlanControls();let estimate=state.estimate;try{if(!estimate)estimate=await core.estimateCredits(Number($('variantCount').value));}catch(e){reportError(e,'duration');return;}
    const u=usage(),needed=u.unit==='credits'?estimate.creditSeconds:estimate.sourceCount;if(!u.unlimited&&needed>u.remaining){showView('plans');toast(u.unit==='credits'?t('creditsNeeded'):t('freeVideosNeeded'));return;}
    state.metrics.attempts++;saveMetrics();$('progressCard').hidden=false;$('resultsCard').hidden=true;$('errorCard').hidden=true;$('cancelBtn').hidden=false;$('startBtn').disabled=true;$('progressBar').style.width='0%';$('progressPercent').textContent='0%';setStage('upload');
    try{
      const result=await core.process({variants:Number($('variantCount').value),mode:$('mode').value,resolution:getResolution()});
      if(state.user){const d=await api('/api/usage/consume',{method:'POST',body:JSON.stringify({seconds:result.creditSeconds,sourceCount:result.sourceCount})});state.user=d.user||state.user;}else{state.trialUsed=Math.min(2,state.trialUsed+result.sourceCount);localStorage.setItem('vv_trial_used',String(state.trialUsed));}
      autoSaveBrowserResults(result.results);await addHistory(result.results);state.metrics.successes++;state.metrics.outputs+=result.outputCount;state.metrics.seconds+=result.creditSeconds;if(u.unit==='credits')state.metrics.credits+=result.creditSeconds;saveMetrics();renderAll();$('readyText').textContent=window.AndroidBridge?'Completed files were saved automatically to Gallery / Movies / VideoUniquifier.':`${result.outputCount} output${result.outputCount===1?'':'s'} sent to your browser downloads automatically.`;$('resultsCard').hidden=false;toast(t('jobComplete'));await refreshAccount();
    }catch(e){if(String(e.message).toLowerCase().includes('cancel'))toast(t('canceled'));else{reportError(e,'processing');toast(t('processingError'));}}
    finally{$('cancelBtn').hidden=true;$('startBtn').disabled=!core.getFiles().length;scheduleEstimate();}
  }

  function safeErrorMessage(error){return String(error?.message||error||'Unknown error').replace(/[\r\n]+/g,' ').slice(0,240);}
  function reportError(error,category='client'){const msg=safeErrorMessage(error);state.metrics.errors++;saveMetrics();$('errorMessage').textContent=msg;$('errorCard').hidden=false;renderAnalytics();if(state.user)api('/api/events',{method:'POST',body:JSON.stringify({type:'error',category,message:msg})}).catch(()=>{});console.error(error);}
  window.addEventListener('error',e=>reportError(e.error||e.message,'window'));window.addEventListener('unhandledrejection',e=>reportError(e.reason,'promise'));

  async function refreshAccount(){if(!state.token){state.user=null;renderAll();scheduleEstimate();return;}try{const d=await api('/api/me');state.user=d.user||d;renderAll();scheduleEstimate();}catch(_){state.token='';state.user=null;localStorage.removeItem('vv_token');renderAll();}}
  async function refreshAnalytics(){if(!state.user){renderAnalytics();return;}try{const d=await api('/api/analytics');if(d.analytics){state.metrics={...state.metrics,...d.analytics};saveMetrics();renderAnalytics();}}catch(e){console.warn(e);}}

  function openAuth(){$('authModal').hidden=false;initProviderButtons();}
  function closeAuth(){$('authModal').hidden=true;}
  async function authSuccess(token){state.token=token;localStorage.setItem('vv_token',token);closeAuth();await refreshAccount();if(state.pendingPlan){const p=state.pendingPlan;state.pendingPlan=null;checkout(p);}}
  function initProviderButtons(){const c=state.config||{};if(c.googleClientId&&window.google?.accounts?.id){try{$('googleButton').innerHTML='';google.accounts.id.initialize({client_id:c.googleClientId,callback:async resp=>{try{const d=await api('/api/auth/google',{method:'POST',body:JSON.stringify({credential:resp.credential})});await authSuccess(d.token);}catch(e){reportError(e,'google-auth');toast(e.message);}}});google.accounts.id.renderButton($('googleButton'),{theme:'outline',size:'large',width:350,text:'continue_with'});}catch(e){console.warn(e);}}}
  async function appleSignIn(){const c=state.config||{};if(!c.appleClientId||!c.appleRedirectUri||!window.AppleID?.auth){toast(t('authUnavailable'));return;}try{AppleID.auth.init({clientId:c.appleClientId,scope:'name email',redirectURI:c.appleRedirectUri,state:crypto.randomUUID?.()||String(Date.now()),nonce:crypto.randomUUID?.()||String(Math.random()),usePopup:true});const res=await AppleID.auth.signIn(),d=await api('/api/auth/apple',{method:'POST',body:JSON.stringify({idToken:res.authorization?.id_token,user:res.user||null})});await authSuccess(d.token);}catch(e){reportError(e,'apple-auth');toast(t('authUnavailable'));}}
  async function checkout(plan){if(!state.user){state.pendingPlan=plan;openAuth();toast(t('signInRequired'));return;}try{const d=await api('/api/billing/checkout',{method:'POST',body:JSON.stringify({plan})});if(!d.url)throw new Error(t('billingUnavailable'));location.href=d.url;}catch(e){reportError(e,'checkout');toast(e.message==='API_UNAVAILABLE'?t('billingUnavailable'):e.message);}}
  async function manageBilling(){if(!state.user){openAuth();return;}try{const d=await api('/api/billing/portal',{method:'POST',body:'{}'});if(d.url)location.href=d.url;}catch(e){reportError(e,'billing-portal');toast(e.message==='API_UNAVAILABLE'?t('billingUnavailable'):e.message);}}
  async function cancelSubscription(){if(!state.user||!usage().active)return;if(usage().plan==='lifetime'){toast('Lifetime access is permanent and has no recurring subscription to cancel.');return;}if(!confirm('Cancel this subscription at the end of the current billing period?'))return;try{await api('/api/billing/cancel',{method:'POST',body:'{}'});toast('Cancellation scheduled for the end of the current billing period.');await refreshAccount();}catch(e){reportError(e,'billing-cancel');toast(e.message);}}
  async function loadConfig(){try{state.config=await api('/api/config');if(state.config?.introOfferText)$('introOffer').textContent=state.config.introOfferText;initProviderButtons();}catch(_){state.config={};}}

  function showUpdateBanner(reg){state.swReg=reg;$('updateBanner').hidden=false;}
  async function setupUpdates(){if(!('serviceWorker'in navigator)||!(location.protocol==='https:'||location.hostname==='localhost'))return;try{const reg=await navigator.serviceWorker.register('sw.js',{updateViaCache:'none'});state.swReg=reg;if(reg.waiting)showUpdateBanner(reg);reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)showUpdateBanner(reg);});});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(state.reloading)return;state.reloading=true;if(!core.state.running)location.reload();});setInterval(()=>reg.update().catch(()=>{}),60*60*1000);}catch(e){console.warn('[sw]',e);}}
  async function checkUpdates(){const status=$('updateStatus');status.textContent=t('updateChecking');try{if(state.swReg)await state.swReg.update();if(window.AndroidBridge?.checkForUpdate)window.AndroidBridge.checkForUpdate();const d=await api('/api/version').catch(()=>null);status.textContent=d?.webVersion?`Web ${d.webVersion} · Android ${d.androidVersion||''}`:t('upToDate');if(state.swReg?.waiting)showUpdateBanner(state.swReg);}catch(_){status.textContent=t('upToDate');}}
  function applyUpdate(){if(state.swReg?.waiting)state.swReg.waiting.postMessage({type:'SKIP_WAITING'});else location.reload();}

  qsa('.navBtn').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  qsa('[data-view-jump]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.viewJump)));
  $('menuBtn').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
  $('fileInput').addEventListener('change',e=>{core.setFiles(e.target.files);updateFileSummary();});
  $('variantCount').addEventListener('change',scheduleEstimate);$('aspectRatio').addEventListener('change',scheduleEstimate);$('mode').addEventListener('change',scheduleEstimate);
  $('startBtn').addEventListener('click',startProcessing);$('cancelBtn').addEventListener('click',()=>core.cancel());$('dismissErrorBtn').addEventListener('click',()=>{$('errorCard').hidden=true;});
  $('signInBtn').addEventListener('click',()=>{if(state.user){state.token='';state.user=null;localStorage.removeItem('vv_token');renderAll();}else openAuth();});
  qsa('[data-close-auth]').forEach(x=>x.addEventListener('click',closeAuth));$('googleFallback').addEventListener('click',()=>{if(!state.config?.googleClientId)toast(t('authUnavailable'));});$('appleButton').addEventListener('click',appleSignIn);
  qsa('.planBtn').forEach(b=>b.addEventListener('click',()=>checkout(b.dataset.plan)));$('manageBillingBtn').addEventListener('click',manageBilling);$('cancelSubscriptionBtn').addEventListener('click',cancelSubscription);$('checkUpdateBtn').addEventListener('click',checkUpdates);$('applyUpdateBtn').addEventListener('click',applyUpdate);
  $('clearHistoryBtn').addEventListener('click',()=>{const mediaKeys=state.history.map(x=>x.mediaCacheKey).filter(Boolean);state.history=[];sessionDownloads.clear();saveHistory();renderHistory();mediaKeys.forEach(k=>persistentMedia?.remove?.(k));toast(t('clearConfirm'));if(state.user)api('/api/history',{method:'DELETE'}).catch(()=>{});});

  window.VideoVariatorUI={setFiles(files){core.setFiles(files);updateFileSummary();},toast,refreshAccount,showView,reportError};
  applyLocale();renderAll();if(location.hash==='#history')showView('history');loadConfig().then(refreshAccount).then(refreshAnalytics);setupUpdates();
})();