(() => {
  'use strict';
  const core=window.VideoVariatorCore;
  if(!core)return;
  const $=id=>document.getElementById(id);
  const locale=(()=>{const raw=(navigator.languages?.[0]||navigator.language||'en-US').toLowerCase();if(raw.startsWith('fr'))return'fr';if(raw.startsWith('ru'))return'ru';if(raw.startsWith('uk'))return'uk';return'en';})();
  const copy={
    en:{hero:'Uniqueify your old video',heroText:'Upload a video, choose a processing style, and let Video Uniquifier handle the rest.',choose:'Choose video',back:'Back',download:'Download',saved:'Saved automatically to your device.',saveOk:'Saved to your device.',saveFail:'Could not save this video. Please try again.',authPending:'Google and Apple sign-in require the production HTTPS backend and OAuth credentials.',online:'Online',offline:'Offline'},
    fr:{hero:'Rendez votre ancienne vidéo unique',heroText:'Importez une vidéo, choisissez un style de traitement et laissez Video Uniquifier faire le reste.',choose:'Choisir une vidéo',back:'Retour',download:'Télécharger',saved:'Enregistré automatiquement sur votre appareil.',saveOk:'Enregistré sur votre appareil.',saveFail:'Impossible d’enregistrer cette vidéo. Réessayez.',authPending:'La connexion Google et Apple nécessite le serveur HTTPS de production et les identifiants OAuth.',online:'En ligne',offline:'Hors ligne'},
    ru:{hero:'Уникализируй своё старое видео',heroText:'Загрузи видео, выбери режим обработки — остальное сделает Video Uniquifier.',choose:'Выбрать видео',back:'Назад',download:'Скачать',saved:'Видео автоматически сохранено на устройство.',saveOk:'Видео сохранено на устройство.',saveFail:'Не удалось сохранить видео. Попробуй ещё раз.',authPending:'Вход через Google и Apple заработает после подключения production HTTPS-сервера и OAuth-данных.',online:'Онлайн',offline:'Нет сети'},
    uk:{hero:'Зроби своє старе відео унікальним',heroText:'Завантаж відео, обери режим обробки — решту зробить Video Uniquifier.',choose:'Вибрати відео',back:'Назад',download:'Завантажити',saved:'Відео автоматично збережено на пристрій.',saveOk:'Відео збережено на пристрій.',saveFail:'Не вдалося зберегти відео. Спробуйте ще раз.',authPending:'Вхід через Google та Apple запрацює після підключення production HTTPS-сервера й OAuth-даних.',online:'Онлайн',offline:'Немає мережі'}
  };
  const c=copy[locale]||copy.en;
  const ui=()=>window.VideoVariatorUI;
  const toast=m=>ui()?.toast?.(m);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function applyBranding(){
    document.title='Video Uniquifier';
    document.querySelector('meta[name="description"]')?.setAttribute('content','Video Uniquifier creates privacy-first variations of your own videos directly on your device.');
    document.querySelectorAll('.brand b').forEach(el=>el.textContent='Video Uniquifier');
    document.querySelectorAll('.topTitle .eyebrow,#authModal .eyebrow').forEach(el=>el.textContent='VIDEO UNIQUIFIER');
    if($('heroTitle'))$('heroTitle').textContent=c.hero;
    const heroText=document.querySelector('[data-i18n="heroText"]');if(heroText)heroText.textContent=c.heroText;
    const choose=document.querySelector('[data-i18n="chooseVideos"]');if(choose)choose.textContent=c.choose;
    const chooseSub=document.querySelector('[data-i18n="chooseVideosSub"]');if(chooseSub)chooseSub.textContent='';
    const readyText=$('readyText');if(readyText)readyText.textContent=c.saved;
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

  const originalEstimate=core.estimateCredits?.bind(core);
  if(originalEstimate)core.estimateCredits=(variants=1)=>originalEstimate(Math.min(maxVariants(),Math.max(1,Number(variants)||1)));
  const originalProcess=core.process?.bind(core);
  if(originalProcess)core.process=async options=>{
    const safeOptions={...(options||{}),variants:Math.min(maxVariants(),Math.max(1,Number(options?.variants)||1))};
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
    results.forEach(r=>{const row=document.createElement('div');row.className='readyDownloadRow';const info=document.createElement('div');info.className='readyDownloadInfo';const name=document.createElement('b');name.textContent=r.name;const meta=document.createElement('small');meta.textContent=`${r.resolution||''} · ${r.saved?c.saved:'Ready'}`;info.append(name,meta);const b=document.createElement('button');b.className='primaryBtn';b.textContent=c.download;b.addEventListener('click',()=>saveResult(r));row.append(info,b);box.appendChild(row);});
    if($('readyText'))$('readyText').textContent=c.saved;
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

  function installNetworkBadge(){
    const topbar=document.querySelector('.topbar'),actions=document.querySelector('.accountActions');if(!topbar||!actions||$('connectionBadge'))return;
    const badge=document.createElement('span');badge.id='connectionBadge';badge.className='connectionBadge';topbar.insertBefore(badge,actions);
    const sync=()=>{badge.classList.toggle('offline',!navigator.onLine);badge.textContent=navigator.onLine?c.online:c.offline;};window.addEventListener('online',sync);window.addEventListener('offline',sync);sync();
  }

  function installVersion(){
    const card=$('checkUpdateBtn')?.closest('.profileCard');if(!card||card.querySelector('.versionLine'))return;
    const line=document.createElement('div');line.className='versionLine';let version='5.0.0';try{version=window.AndroidBridge?.getAppVersion?.()||version;}catch(_){ }line.textContent=`Video Uniquifier · v${version}`;card.appendChild(line);
  }

  function installAuthStatus(){
    const card=document.querySelector('.authCard');if(!card||card.querySelector('.authSetupStatus'))return;
    const status=document.createElement('div');status.className='authSetupStatus';status.textContent=c.authPending;card.appendChild(status);
    const apiConfigured=()=>!!window.VV_API_BASE||location.protocol==='https:';
    $('googleFallback')?.addEventListener('click',e=>{if(apiConfigured())return;e.preventDefault();e.stopImmediatePropagation();status.textContent=c.authPending;},true);
    $('appleButton')?.addEventListener('click',e=>{if(apiConfigured())return;e.preventDefault();e.stopImmediatePropagation();status.textContent=c.authPending;},true);
    setTimeout(()=>{if(document.querySelector('#googleButton iframe,#googleButton [role="button"]'))status.hidden=true;},1600);
  }

  function interceptHistoryDownloads(){
    $('historyList')?.addEventListener('click',e=>{if(!window.AndroidBridge)return;const button=e.target.closest('button');if(!button)return;const row=button.closest('.historyItem'),name=row?.querySelector('h4')?.textContent,result=(window.__vuLastResults||[]).find(r=>r.name===name);if(!result)return;e.preventDefault();e.stopImmediatePropagation();saveResult(result);},true);
  }

  function observePlan(){const el=$('currentPlan');if(!el)return;new MutationObserver(()=>enforceVariantAccess()).observe(el,{childList:true,characterData:true,subtree:true});}
  function observeResults(){const card=$('resultsCard');if(!card)return;new MutationObserver(()=>{if(!card.hidden)renderReadyDownloads();}).observe(card,{attributes:true,attributeFilter:['hidden']});}

  applyBranding();installVariantOptions();installBackButton();installNetworkBadge();installVersion();installAuthStatus();interceptHistoryDownloads();observePlan();observeResults();
})();