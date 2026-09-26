(() => {
  'use strict';
  const core=window.VideoVariatorCore;
  if(!core)return;
  const $=id=>document.getElementById(id);
  const locale=(()=>{const raw=(navigator.languages?.[0]||navigator.language||'en-US').toLowerCase();if(raw.startsWith('fr'))return'fr';if(raw.startsWith('ru'))return'ru';if(raw.startsWith('uk'))return'uk';return'en';})();
  const copy={
    en:{hero:'Turn your old video into fresh new versions',heroText:'Upload once, choose your variations, and create privacy-first results locally on your device.',choose:'Choose video',back:'Back',download:'Download',saved:'Completed files are saved automatically to Gallery / Movies / VideoUniquifier.',saveOk:'Saved to your device.',saveFail:'Could not save this video. Please try again.',authPending:'Google and Apple sign-in require production OAuth credentials.',authBrowser:'Secure sign-in opens in your browser and returns you to Video Uniquifier.',online:'Online',offline:'Offline',local:'Local processing',private:'Private by design',autosave:'Automatic saving',drop:'Drop a video here or browse',dropSub:'Your source stays on this device',studio:'Creator studio',audBasic:'For everyday creators',audPro:'For growing creators',audBusiness:'For high-volume teams'},
    fr:{hero:'Rendez votre ancienne vidéo unique',heroText:'Importez une vidéo, choisissez un style de traitement et laissez Video Uniquifier faire le reste.',choose:'Choisir une vidéo',back:'Retour',download:'Télécharger',saved:'Les vidéos sont enregistrées automatiquement dans Gallery / Movies / VideoUniquifier.',saveOk:'Enregistré sur votre appareil.',saveFail:'Impossible d’enregistrer cette vidéo. Réessayez.',authPending:'La connexion Google et Apple nécessite les identifiants OAuth de production.',authBrowser:'La connexion sécurisée s’ouvre dans votre navigateur puis revient dans Video Uniquifier.',online:'En ligne',offline:'Hors ligne',local:'Traitement local',private:'Confidentiel par conception',autosave:'Enregistrement automatique',drop:'Déposez une vidéo ici ou parcourez vos fichiers',dropSub:'Votre source reste sur cet appareil',studio:'Studio créateur',audBasic:'Pour les créateurs du quotidien',audPro:'Pour les créateurs en croissance',audBusiness:'Pour les équipes à volume élevé'},
    ru:{hero:'Уникализируй своё старое видео',heroText:'Загрузи видео, выбери режим обработки — остальное сделает Video Uniquifier.',choose:'Выбрать видео',back:'Назад',download:'Скачать',saved:'Видео автоматически сохраняются в Галерею / Movies / VideoUniquifier.',saveOk:'Видео сохранено на устройство.',saveFail:'Не удалось сохранить видео. Попробуй ещё раз.',authPending:'Для входа через Google и Apple нужны production OAuth-данные.',authBrowser:'Безопасный вход откроется в браузере и вернёт тебя обратно в Video Uniquifier.',online:'Онлайн',offline:'Нет сети',local:'Локальная обработка',private:'Приватность по умолчанию',autosave:'Автосохранение',drop:'Перетащите видео сюда или выберите файл',dropSub:'Исходное видео остаётся на этом устройстве',studio:'Студия создателя',audBasic:'Для повседневных задач',audPro:'Для активных создателей',audBusiness:'Для больших объёмов'},
    uk:{hero:'Зроби своє старе відео унікальним',heroText:'Завантаж відео, обери режим обробки — решту зробить Video Uniquifier.',choose:'Вибрати відео',back:'Назад',download:'Завантажити',saved:'Відео автоматично зберігаються в Gallery / Movies / VideoUniquifier.',saveOk:'Відео збережено на пристрій.',saveFail:'Не вдалося зберегти відео. Спробуйте ще раз.',authPending:'Для входу через Google та Apple потрібні production OAuth-дані.',authBrowser:'Безпечний вхід відкриється у браузері та поверне вас до Video Uniquifier.',online:'Онлайн',offline:'Немає мережі',local:'Локальна обробка',private:'Приватність за замовчуванням',autosave:'Автозбереження',drop:'Перетягніть відео сюди або виберіть файл',dropSub:'Вихідне відео залишається на цьому пристрої',studio:'Студія автора',audBasic:'Для щоденних задач',audPro:'Для активних авторів',audBusiness:'Для великих обсягів'}
  };
  const c=copy[locale]||copy.en;
  const ui=()=>window.VideoVariatorUI;
  const toast=m=>ui()?.toast?.(m);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function applyBranding(){
    document.title='Video Uniquifier';
    document.querySelector('meta[name="description"]')?.setAttribute('content','Video Uniquifier creates privacy-first variations of your own videos directly on your device.');
    document.querySelectorAll('.brand b').forEach(el=>el.textContent='Video Uniquifier');
    document.querySelectorAll('.brandMark').forEach(el=>el.textContent='VU');
    document.querySelectorAll('.brand small').forEach(el=>el.textContent='One video. Many versions.');
    document.querySelectorAll('.topTitle .eyebrow,#authModal .eyebrow').forEach(el=>el.textContent='VIDEO UNIQUIFIER');
    if($('heroTitle'))$('heroTitle').textContent=c.hero;
    const heroText=document.querySelector('[data-i18n="heroText"]');if(heroText)heroText.textContent=c.heroText;
    const choose=document.querySelector('[data-i18n="chooseVideos"]');if(choose)choose.textContent=c.choose;
    const chooseSub=document.querySelector('[data-i18n="chooseVideosSub"]');if(chooseSub)chooseSub.textContent='';
    const readyText=$('readyText');if(readyText)readyText.textContent=c.saved;
    document.querySelectorAll('[data-plan-audience]').forEach(el=>{const key=el.dataset.planAudience;el.textContent=key==='basic'?c.audBasic:key==='pro'?c.audPro:c.audBusiness;});
    document.querySelectorAll('.privacyPoint span').forEach(el=>{if(el.textContent.includes('Video Variator'))el.textContent=el.textContent.replaceAll('Video Variator','Video Uniquifier');});
    document.querySelectorAll('#updateBanner p').forEach(el=>el.textContent=el.textContent.replaceAll('Video Variator','Video Uniquifier'));
  }

  function currentPlan(){return ($('currentPlan')?.textContent||'Trial').trim().toLowerCase();}
  function maxVariants(){const p=currentPlan();if(p.includes('administrator')||p.includes('business'))return 15;if(p==='pro'||p.includes('pro'))return 10;return 5;}
  function installVariantOptions(){
    const select=$('variantCount');if(!select)return;
    for(let i=6;i<=15;i++){if(select.querySelector(`option[value="${i}"]`))continue;const o=document.createElement('option');o.value=String(i);o.textContent=i<=10?`${i} · Pro`:`${i} · Business`;select.appendChild(o);}
    if(!select.parentElement.querySelector('.variantLockNote')){const note=document.createElement('div');note.className='variantLockNote';note.textContent='Basic: up to 5 · Pro: up to 10 · Business: up to 15';select.parentElement.appendChild(note);}
    enforceVariantAccess();
  }
  function enforceVariantAccess(){
    const select=$('variantCount');if(!select)return;const max=maxVariants();
    Array.from(select.options).forEach(o=>{o.disabled=Number(o.value)>max;});
    if(Number(select.value)>max){select.value=String(max);select.dispatchEvent(new Event('change',{bubbles:true}));}
  }

  function clearPreviousResultState(){
    window.__vuLastResults=[];
    const results=$('resultsCard');if(results)results.hidden=true;
    const old=results?.querySelector('.readyDownloads');if(old)old.remove();
    const err=$('errorCard');if(err)err.hidden=true;
  }

  const originalEstimate=core.estimateCredits?.bind(core);
  if(originalEstimate)core.estimateCredits=(variants=1)=>originalEstimate(Math.min(maxVariants(),Math.max(1,Number(variants)||1)));
  const originalProcess=core.process?.bind(core);
  if(originalProcess)core.process=async options=>{
    clearPreviousResultState();
    const safeOptions={...(options||{}),variants:Math.min(maxVariants(),Math.max(1,Number(options?.variants)||1))};
    try{
      const result=await originalProcess(safeOptions);
      window.__vuLastResults=result.results||[];
      if(window.AndroidBridge&&core.saveToDevice){
        for(const r of window.__vuLastResults){
          if(r.saved)continue;
          try{const saved=await core.saveToDevice(r.name,r.blob);r.saved=!!saved?.saved;r.path=saved?.path||r.path;}catch(_){ }
        }
      }
      setTimeout(renderReadyDownloads,0);
      return result;
    }catch(e){
      window.__vuLastResults=[];
      const results=$('resultsCard');if(results)results.hidden=true;
      throw e;
    }
  };

  async function browserSave(name,blob){
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();await sleep(300);URL.revokeObjectURL(url);return{saved:true,path:'Downloads'};
  }
  async function saveResult(result){
    try{
      const saved=window.AndroidBridge&&core.saveToDevice?await core.saveToDevice(result.name,result.blob):await browserSave(result.name,result.blob);
      if(saved?.saved!==false){result.saved=true;result.path=saved?.path||result.path;toast(c.saveOk);}else throw new Error('SAVE_FAILED');
    }catch(e){console.error(e);toast(c.saveFail);}
  }
  function renderReadyDownloads(){
    const card=$('resultsCard'),results=window.__vuLastResults||[];if(!card||!results.length)return;
    card.querySelector('[data-view-jump="history"]')?.setAttribute('hidden','');
    let box=card.querySelector('.readyDownloads');if(!box){box=document.createElement('div');box.className='readyDownloads';card.appendChild(box);}box.innerHTML='';
    results.forEach(r=>{const row=document.createElement('div');row.className='readyDownloadRow';const info=document.createElement('div');info.className='readyDownloadInfo';const name=document.createElement('b');name.textContent=r.name;const meta=document.createElement('small');meta.textContent=`${r.resolution||''} · ${r.saved?c.saved:'Ready'}`;info.append(name,meta);const b=document.createElement('button');b.className='primaryBtn';b.textContent=c.download;b.addEventListener('click',()=>saveResult(r));const share=document.createElement("button");share.className="ghostBtn";share.textContent=({ru:"Поделиться",fr:"Partager",uk:"Поділитися"})[(navigator.language||"en").slice(0,2)]||"Share";share.onclick=()=>window.VUShareFile?.(r);row.append(info,b,share);if(window.VUResultDelete)row.append(window.VUResultDelete.button(r,()=>{row.remove();if(!box.children.length)card.hidden=true;}));box.appendChild(row);});
    if($('readyText'))$('readyText').textContent=c.saved;
  }

  function installPremiumDetails(){
    const hero=document.querySelector('.hero > div:first-child');
    if(hero&&!hero.querySelector('.heroTrust')){
      const row=document.createElement('div');row.className='heroTrust';
      [[c.local,'local'],[c.private,'private'],[c.autosave,'save']].forEach(([label,type])=>{const chip=document.createElement('span');chip.dataset.trust=type;const dot=document.createElement('i');dot.textContent=type==='local'?'●':type==='private'?'◆':'✓';chip.append(dot,document.createTextNode(label));row.appendChild(chip);});
      hero.appendChild(row);
    }
    const picker=document.querySelector('.picker');
    if(picker){const b=picker.querySelector('b'),small=picker.querySelector('small');if(b)b.textContent=c.drop;if(small)small.textContent=c.dropSub;picker.setAttribute('aria-label',c.drop);}
    const head=document.querySelector('.workspace .sectionHead > div');
    if(head&&!head.querySelector('.workspaceEyebrow')){const e=document.createElement('span');e.className='workspaceEyebrow';e.textContent=c.studio;head.prepend(e);}
  }

  function installBackButton(){
    const topbar=document.querySelector('.topbar');if(!topbar||$('backBtn'))return;
    const b=document.createElement('button');b.id='backBtn';b.className='ghostBtn';b.textContent=`← ${c.back}`;b.hidden=true;topbar.insertBefore(b,topbar.querySelector('.topTitle'));
    const stack=[];let suppress=false;
    const active=()=>document.querySelector('.view.active')?.id?.replace(/View$/,'')||'dashboard';
    const update=()=>{b.hidden=active()==='dashboard'&&stack.length===0;};
    document.querySelectorAll('.navBtn,[data-view-jump]').forEach(el=>el.addEventListener('click',()=>{if(suppress)return;const from=active(),to=el.dataset.view||el.dataset.viewJump;if(to&&to!==from)stack.push(from);setTimeout(update,0);},true));
    b.addEventListener('click',()=>{const target=stack.pop()||'dashboard';suppress=true;ui()?.showView?.(target);suppress=false;setTimeout(update,0);});
    const observer=new MutationObserver(update);document.querySelectorAll('.view').forEach(v=>observer.observe(v,{attributes:true,attributeFilter:['class']}));update();
  }

  function installSidebarSwipe(){
    const sidebar=document.querySelector('.sidebar');if(!sidebar)return;
    let sx=null,sy=null;
    sidebar.addEventListener('touchstart',e=>{const t=e.touches?.[0];if(!t)return;sx=t.clientX;sy=t.clientY;},{passive:true});
    sidebar.addEventListener('touchend',e=>{if(sx===null||sy===null)return;const t=e.changedTouches?.[0];if(!t){sx=sy=null;return;}const dx=t.clientX-sx,dy=t.clientY-sy;if(dx<-48&&Math.abs(dx)>Math.abs(dy)*1.15)sidebar.classList.remove('open');sx=sy=null;},{passive:true});
  }

  function installNetworkBadge(){
    const topbar=document.querySelector('.topbar'),actions=document.querySelector('.accountActions');if(!topbar||!actions||$('connectionBadge'))return;
    const badge=document.createElement('span');badge.id='connectionBadge';badge.className='connectionBadge';topbar.insertBefore(badge,actions);
    const sync=()=>{badge.classList.toggle('offline',!navigator.onLine);badge.textContent=navigator.onLine?c.online:c.offline;};window.addEventListener('online',sync);window.addEventListener('offline',sync);sync();
  }

  function installVersion(){
    const card=$('checkUpdateBtn')?.closest('.profileCard');if(!card||card.querySelector('.versionLine'))return;
    const line=document.createElement('div');line.className='versionLine';let version='5.0.0';try{version=window.AndroidBridge?.getAppVersion?.()||version;}catch(_){ }line.textContent=`Video Uniquifier · v${version}`;card.appendChild(line);
  }

  function apiBase(){try{const n=window.AndroidBridge?.getApiBase?.();if(n)return String(n).replace(/\/$/,'');}catch(_){ }return String(window.VV_API_BASE||location.origin||'').replace(/\/$/,'');}
  function installAuthStatus(){
    const card=document.querySelector('.authCard');if(!card||card.querySelector('.authSetupStatus'))return;
    const status=document.createElement('div');status.className='authSetupStatus';status.textContent=c.authPending;card.appendChild(status);
    fetch(apiBase()+'/api/config',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(cfg=>{if(cfg&&(cfg.googleClientId||cfg.appleClientId))status.textContent=c.authBrowser;}).catch(()=>{});
  }

  function installNativeAuthBridge(){
    let native=false;try{native=!!window.AndroidBridge?.openExternalAuth;}catch(_){ }
    const mobileProvider=new URLSearchParams(location.search).get('mobileAuth');

    if(native){
      const slot=$('googleButton');
      const renderNativeGoogle=()=>{
        if(!slot)return;
        if(slot.querySelector('[data-native-google]'))return;
        slot.innerHTML='<button type="button" class="providerBtn" data-native-google><span class="googleG">G</span><span>Continue with Google</span></button>';
        slot.querySelector('[data-native-google]')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();window.AndroidBridge.openExternalAuth('google');},true);
      };
      renderNativeGoogle();
      if(slot)new MutationObserver(()=>{if(!slot.querySelector('[data-native-google]'))renderNativeGoogle();}).observe(slot,{childList:true,subtree:true});
      $('appleButton')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();window.AndroidBridge.openExternalAuth('apple');},true);
      return;
    }

    if(!['google','apple'].includes(mobileProvider||''))return;
    document.documentElement.dataset.mobileAuth=mobileProvider;
    const returnToApp=token=>{if(!token)return;location.href='videouniquifier://auth#token='+encodeURIComponent(token);};
    const validateToken=async token=>{
      if(!token)return false;
      try{const r=await fetch(apiBase()+'/api/me',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});if(r.ok){returnToApp(token);return true;}}catch(_){ }
      return false;
    };
    const existing=localStorage.getItem('vv_token');
    validateToken(existing).then(valid=>{
      if(valid)return;
      if(existing)localStorage.removeItem('vv_token');
      setTimeout(()=>{$('signInBtn')?.click();if(mobileProvider==='google')$('appleButton')?.setAttribute('hidden','');else $('googleButton')?.setAttribute('hidden','');},250);
    });
    let last='';const timer=setInterval(async()=>{const token=localStorage.getItem('vv_token')||'';if(!token||token===last)return;last=token;if(await validateToken(token))clearInterval(timer);},350);
    setTimeout(()=>clearInterval(timer),5*60*1000);
  }

  function interceptHistoryDownloads(){
    $('historyList')?.addEventListener('click',e=>{if(!window.AndroidBridge)return;const button=e.target.closest('button');if(!button||button.textContent.trim()!==c.download)return;const row=button.closest('.historyItem'),name=row?.querySelector('h4')?.textContent,result=(window.__vuLastResults||[]).find(r=>r.name===name);if(!result)return;e.preventDefault();e.stopImmediatePropagation();saveResult(result);},true);
  }

  function installProcessingStateGuard(){
    $('startBtn')?.addEventListener('click',clearPreviousResultState,true);
    const progress=$('progressCard');if(progress)new MutationObserver(()=>{if(!progress.hidden){const results=$('resultsCard');if(results)results.hidden=true;}}).observe(progress,{attributes:true,attributeFilter:['hidden']});
    const error=$('errorCard');if(error)new MutationObserver(()=>{if(!error.hidden){const results=$('resultsCard');if(results)results.hidden=true;const progress=$('progressCard');if(progress)progress.hidden=true;}}).observe(error,{attributes:true,attributeFilter:['hidden']});
    const results=$('resultsCard');if(results)new MutationObserver(()=>{if(!results.hidden){const progress=$('progressCard');if(progress)progress.hidden=true;const error=$('errorCard');if(error)error.hidden=true;}}).observe(results,{attributes:true,attributeFilter:['hidden']});
  }
  function observePlan(){const el=$('currentPlan');if(!el)return;new MutationObserver(()=>enforceVariantAccess()).observe(el,{childList:true,characterData:true,subtree:true});}
  function observeResults(){const card=$('resultsCard');if(!card)return;new MutationObserver(()=>{if(!card.hidden)renderReadyDownloads();}).observe(card,{attributes:true,attributeFilter:['hidden']});}

  applyBranding();installPremiumDetails();installVariantOptions();installBackButton();installSidebarSwipe();installNetworkBadge();installVersion();installAuthStatus();installNativeAuthBridge();interceptHistoryDownloads();installProcessingStateGuard();observePlan();observeResults();
})();
