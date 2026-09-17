(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const qsa=s=>Array.from(document.querySelectorAll(s));
  const core=window.VideoVariatorCore;
  const sessionDownloads=new Map();
  const state={
    locale:'en',config:null,user:null,token:localStorage.getItem('vv_token')||'',history:readHistory(),trialUsed:Number(localStorage.getItem('vv_trial_used')||0),pendingPlan:null
  };

  const translations={
    en:{brandTag:'Video variation made simple',navDashboard:'Dashboard',navHistory:'History',navPlans:'Plans',navFaq:'FAQ',languageAuto:'Language: Auto',localProcessing:'Video processing runs locally on your device.',signIn:'Sign in',signOut:'Sign out',trialPill:'2 free videos included',heroTitle:'Create your next video variation',heroText:'Upload a video, choose a processing style, and let Video Variator handle the rest.',usageLabel:'Video credits',statProcessed:'Processed',statProcessedSub:'videos completed',statRemaining:'Remaining',statRemainingSub:'video credits',statPlan:'Current plan',trialStatus:'No card required',newProject:'New variation',newProjectSub:'Choose one or more videos, or select an entire folder.',engineStandby:'Engine standby',engineLoading:'Loading engine…',engineReady:'Engine ready',chooseVideos:'Choose videos',chooseVideosSub:'One or multiple files',chooseFolder:'Choose folder',chooseFolderSub:'Batch process a folder',noFiles:'No videos selected yet.',variantsLabel:'Variations per video',modeLabel:'Processing mode',modeGentle:'Gentle',modeBalanced:'Balanced',modeDynamic:'Dynamic',qualityLabel:'Output quality',startProcessing:'Create variations',cancel:'Cancel',preparing:'Preparing your video',preparingSub:'Getting everything ready…',stageUpload:'Load',stageProcess:'Process',stageSave:'Save',stageDone:'Done',readyTitle:'Your videos are ready',readyText:'Completed files were saved to your device.',viewHistory:'View history',historyTitle:'Download history',historySub:'Your recent processed files and download status.',clearHistory:'Clear history',historyEmptyTitle:'No processed videos yet',historyEmptyText:'Your completed videos will appear here.',firstOffer:'Intro offer available on your first subscription',plansTitle:'Choose the plan that fits your workflow',plansSub:'Start with two free videos. Upgrade only when you need more.',perMonth:'/ month',videosPerMonth:'videos per billing cycle',chooseBasic:'Choose Basic',choosePro:'Choose Pro',chooseBusiness:'Choose Business',mostPopular:'Most popular',guaranteeTitle:'Money-back guarantee',guaranteeText:'Eligible first subscription purchases are covered by our refund policy. Full eligibility terms are shown before checkout.',manageBilling:'Manage billing',faqTitle:'Frequently asked questions',faqSub:'Everything you need to know before processing your videos.',faq1q:'What counts as one video credit?',faq1a:'One source video counts as one credit, even if you create multiple variations from it in the same processing job.',faq2q:'Where are my videos processed?',faq2a:'Video processing is designed to run locally on your device. Account, billing, usage, and history metadata may sync with the service.',faq3q:'Do I need a credit card for the free test?',faq3a:'No. New accounts receive two free video credits before a paid subscription is required.',faq4q:'Can I cancel my subscription?',faq4a:'Yes. You can manage or cancel your subscription from the billing portal.',faq5q:'What happens when I reach my limit?',faq5a:'Processing pauses until your next billing cycle or until you switch to a plan with a higher allowance.',faq6q:'What video formats are supported?',faq6a:'Common formats such as MP4, MOV, M4V, WebM, MKV, and AVI are accepted when your device can read them.',authTitle:'Sign in to sync your account',authSub:'Keep your plan, video credits, and history connected across devices.',continueGoogle:'Continue with Google',continueApple:'Continue with Apple',authNotice:'Secure sign-in opens through the provider. Video files are not uploaded for authentication.',freeTrial:'Free trial',trial:'Trial',basic:'Basic',pro:'Pro',business:'Business',file:'file',files:'files',video:'video',videos:'videos',processing:'Processing',saving:'Saving',loading:'Loading',done:'Done',saved:'Saved to device',download:'Download',availableSession:'Available this session',metadataOnly:'File already saved locally',creditsNeeded:'You need more video credits for this job.',goPlans:'Choose a plan to continue.',signInRequired:'Sign in before choosing a paid plan.',billingUnavailable:'Billing is not configured yet.',authUnavailable:'Sign-in will activate after production OAuth credentials are configured.',folderAndroid:'Folder selection is available in the Android app. In a browser, choose a folder from the file picker.',clearConfirm:'History cleared.',jobComplete:'Processing complete.',processingError:'Processing failed. Please try again.',canceled:'Processing canceled.',historyStatusSaved:'Saved',historyStatusReady:'Ready to download'},
    fr:{brandTag:'La variation vidéo, simplement',navDashboard:'Tableau de bord',navHistory:'Historique',navPlans:'Offres',navFaq:'FAQ',languageAuto:'Langue : automatique',localProcessing:'Le traitement vidéo s’effectue localement sur votre appareil.',signIn:'Se connecter',signOut:'Se déconnecter',trialPill:'2 vidéos gratuites incluses',heroTitle:'Créez votre prochaine variation vidéo',heroText:'Importez une vidéo, choisissez un style de traitement et laissez Video Variator faire le reste.',usageLabel:'Crédits vidéo',statProcessed:'Traitées',statProcessedSub:'vidéos terminées',statRemaining:'Restants',statRemainingSub:'crédits vidéo',statPlan:'Offre actuelle',trialStatus:'Aucune carte requise',newProject:'Nouvelle variation',newProjectSub:'Choisissez une ou plusieurs vidéos, ou un dossier entier.',engineStandby:'Moteur en attente',engineLoading:'Chargement du moteur…',engineReady:'Moteur prêt',chooseVideos:'Choisir des vidéos',chooseVideosSub:'Un ou plusieurs fichiers',chooseFolder:'Choisir un dossier',chooseFolderSub:'Traitement par lot',noFiles:'Aucune vidéo sélectionnée.',variantsLabel:'Variations par vidéo',modeLabel:'Mode de traitement',modeGentle:'Léger',modeBalanced:'Équilibré',modeDynamic:'Dynamique',qualityLabel:'Qualité de sortie',startProcessing:'Créer les variations',cancel:'Annuler',preparing:'Préparation de la vidéo',preparingSub:'Préparation en cours…',stageUpload:'Charger',stageProcess:'Traiter',stageSave:'Enregistrer',stageDone:'Terminé',readyTitle:'Vos vidéos sont prêtes',readyText:'Les fichiers terminés ont été enregistrés sur votre appareil.',viewHistory:'Voir l’historique',historyTitle:'Historique des téléchargements',historySub:'Vos fichiers récents et leur statut.',clearHistory:'Effacer l’historique',historyEmptyTitle:'Aucune vidéo traitée',historyEmptyText:'Vos vidéos terminées apparaîtront ici.',firstOffer:'Offre de bienvenue disponible sur votre premier abonnement',plansTitle:'Choisissez l’offre adaptée à votre rythme',plansSub:'Commencez avec deux vidéos gratuites, puis passez à une offre si nécessaire.',perMonth:'/ mois',videosPerMonth:'vidéos par cycle de facturation',chooseBasic:'Choisir Basic',choosePro:'Choisir Pro',chooseBusiness:'Choisir Business',mostPopular:'Le plus populaire',guaranteeTitle:'Garantie de remboursement',guaranteeText:'Les premiers abonnements éligibles sont couverts par notre politique de remboursement. Les conditions complètes sont affichées avant le paiement.',manageBilling:'Gérer la facturation',faqTitle:'Questions fréquentes',faqSub:'Tout ce qu’il faut savoir avant de traiter vos vidéos.',faq1q:'Qu’est-ce qu’un crédit vidéo ?',faq1a:'Une vidéo source utilise un crédit, même si vous créez plusieurs variations dans la même tâche.',faq2q:'Où mes vidéos sont-elles traitées ?',faq2a:'Le traitement est conçu pour rester local sur votre appareil. Les données de compte, facturation, usage et historique peuvent être synchronisées.',faq3q:'Faut-il une carte bancaire pour tester ?',faq3a:'Non. Chaque nouveau compte reçoit deux crédits vidéo gratuits.',faq4q:'Puis-je annuler mon abonnement ?',faq4a:'Oui. Vous pouvez gérer ou annuler votre abonnement depuis le portail de facturation.',faq5q:'Que se passe-t-il quand j’atteins ma limite ?',faq5a:'Le traitement se met en pause jusqu’au prochain cycle ou jusqu’à un changement d’offre.',faq6q:'Quels formats sont pris en charge ?',faq6a:'Les formats courants comme MP4, MOV, M4V, WebM, MKV et AVI sont acceptés si votre appareil peut les lire.',authTitle:'Connectez-vous pour synchroniser votre compte',authSub:'Retrouvez votre offre, vos crédits et votre historique sur plusieurs appareils.',continueGoogle:'Continuer avec Google',continueApple:'Continuer avec Apple',authNotice:'La connexion sécurisée s’ouvre chez le fournisseur. Vos fichiers vidéo ne sont pas envoyés pour l’authentification.',freeTrial:'Essai gratuit',trial:'Essai',basic:'Basic',pro:'Pro',business:'Business',processing:'Traitement',saving:'Enregistrement',loading:'Chargement',done:'Terminé',saved:'Enregistré sur l’appareil',download:'Télécharger',availableSession:'Disponible pendant cette session',metadataOnly:'Fichier déjà enregistré localement',creditsNeeded:'Vous n’avez pas assez de crédits vidéo pour cette tâche.',goPlans:'Choisissez une offre pour continuer.',signInRequired:'Connectez-vous avant de choisir une offre payante.',billingUnavailable:'La facturation n’est pas encore configurée.',authUnavailable:'La connexion sera disponible après la configuration des identifiants OAuth.',clearConfirm:'Historique effacé.',jobComplete:'Traitement terminé.',processingError:'Le traitement a échoué. Réessayez.',canceled:'Traitement annulé.',historyStatusSaved:'Enregistré',historyStatusReady:'Prêt à télécharger'},
    ru:{brandTag:'Простая вариация видео',navDashboard:'Главная',navHistory:'История',navPlans:'Тарифы',navFaq:'FAQ',languageAuto:'Язык: автоматически',localProcessing:'Видео обрабатывается локально на вашем устройстве.',signIn:'Войти',signOut:'Выйти',trialPill:'2 бесплатных видео включены',heroTitle:'Создайте следующую вариацию видео',heroText:'Загрузите видео, выберите стиль обработки, остальное сделает Video Variator.',usageLabel:'Видео-кредиты',statProcessed:'Обработано',statProcessedSub:'готовых видео',statRemaining:'Осталось',statRemainingSub:'видео-кредитов',statPlan:'Текущий тариф',trialStatus:'Карта не требуется',newProject:'Новая вариация',newProjectSub:'Выберите одно или несколько видео либо целую папку.',engineStandby:'Движок готов к запуску',engineLoading:'Загрузка движка…',engineReady:'Движок готов',chooseVideos:'Выбрать видео',chooseVideosSub:'Один или несколько файлов',chooseFolder:'Выбрать папку',chooseFolderSub:'Пакетная обработка',noFiles:'Видео ещё не выбраны.',variantsLabel:'Вариаций на видео',modeLabel:'Режим обработки',modeGentle:'Мягкий',modeBalanced:'Сбалансированный',modeDynamic:'Динамичный',qualityLabel:'Качество',startProcessing:'Создать вариации',cancel:'Отменить',preparing:'Подготовка видео',preparingSub:'Подготавливаем всё необходимое…',stageUpload:'Загрузка',stageProcess:'Обработка',stageSave:'Сохранение',stageDone:'Готово',readyTitle:'Ваши видео готовы',readyText:'Готовые файлы сохранены на устройстве.',viewHistory:'Открыть историю',historyTitle:'История скачиваний',historySub:'Недавние обработанные файлы и их статус.',clearHistory:'Очистить историю',historyEmptyTitle:'Пока нет обработанных видео',historyEmptyText:'Готовые видео появятся здесь.',firstOffer:'Стартовое предложение на первую подписку',plansTitle:'Выберите тариф под ваш объём работы',plansSub:'Начните с двух бесплатных видео и подключайте тариф только при необходимости.',perMonth:'/ месяц',videosPerMonth:'видео за платёжный период',chooseBasic:'Выбрать Basic',choosePro:'Выбрать Pro',chooseBusiness:'Выбрать Business',mostPopular:'Самый популярный',guaranteeTitle:'Гарантия возврата средств',guaranteeText:'Подходящие первые покупки подписки покрываются политикой возврата. Полные условия показываются перед оплатой.',manageBilling:'Управление подпиской',faqTitle:'Частые вопросы',faqSub:'Всё важное перед обработкой видео.',faq1q:'Что считается одним видео-кредитом?',faq1a:'Одно исходное видео использует один кредит, даже если в одной задаче создаётся несколько вариаций.',faq2q:'Где обрабатываются мои видео?',faq2a:'Обработка рассчитана на локальную работу на вашем устройстве. Данные аккаунта, оплаты, использования и истории могут синхронизироваться.',faq3q:'Нужна ли карта для бесплатного теста?',faq3a:'Нет. Каждый новый аккаунт получает два бесплатных видео-кредита.',faq4q:'Можно отменить подписку?',faq4a:'Да. Подпиской можно управлять или отменить её через платёжный портал.',faq5q:'Что будет, когда лимит закончится?',faq5a:'Обработка приостановится до следующего платёжного периода или перехода на более высокий тариф.',faq6q:'Какие форматы поддерживаются?',faq6a:'Поддерживаются распространённые форматы MP4, MOV, M4V, WebM, MKV и AVI, если устройство может их прочитать.',authTitle:'Войдите для синхронизации аккаунта',authSub:'Тариф, кредиты и история будут доступны на ваших устройствах.',continueGoogle:'Продолжить с Google',continueApple:'Продолжить с Apple',authNotice:'Безопасный вход открывается у провайдера. Видео для авторизации не загружаются.',freeTrial:'Бесплатный тест',trial:'Тест',basic:'Basic',pro:'Pro',business:'Business',processing:'Обработка',saving:'Сохранение',loading:'Загрузка',done:'Готово',saved:'Сохранено на устройство',download:'Скачать',availableSession:'Доступно в этой сессии',metadataOnly:'Файл уже сохранён локально',creditsNeeded:'Для этой задачи не хватает видео-кредитов.',goPlans:'Выберите тариф, чтобы продолжить.',signInRequired:'Перед выбором платного тарифа войдите в аккаунт.',billingUnavailable:'Оплата пока не настроена.',authUnavailable:'Вход заработает после настройки OAuth-данных.',clearConfirm:'История очищена.',jobComplete:'Обработка завершена.',processingError:'Ошибка обработки. Попробуйте ещё раз.',canceled:'Обработка отменена.',historyStatusSaved:'Сохранено',historyStatusReady:'Можно скачать'},
    uk:{brandTag:'Проста варіація відео',navDashboard:'Головна',navHistory:'Історія',navPlans:'Тарифи',navFaq:'FAQ',languageAuto:'Мова: автоматично',localProcessing:'Відео обробляється локально на вашому пристрої.',signIn:'Увійти',signOut:'Вийти',trialPill:'2 безкоштовні відео включено',heroTitle:'Створіть наступну варіацію відео',heroText:'Завантажте відео, виберіть стиль обробки, а решту зробить Video Variator.',usageLabel:'Відео-кредити',statProcessed:'Оброблено',statProcessedSub:'готових відео',statRemaining:'Залишилось',statRemainingSub:'відео-кредитів',statPlan:'Поточний тариф',trialStatus:'Картка не потрібна',newProject:'Нова варіація',newProjectSub:'Виберіть одне або кілька відео чи цілу папку.',engineStandby:'Рушій очікує',engineLoading:'Завантаження рушія…',engineReady:'Рушій готовий',chooseVideos:'Вибрати відео',chooseVideosSub:'Один або кілька файлів',chooseFolder:'Вибрати папку',chooseFolderSub:'Пакетна обробка',noFiles:'Відео ще не вибрано.',variantsLabel:'Варіацій на відео',modeLabel:'Режим обробки',modeGentle:'М’який',modeBalanced:'Збалансований',modeDynamic:'Динамічний',qualityLabel:'Якість',startProcessing:'Створити варіації',cancel:'Скасувати',preparing:'Підготовка відео',preparingSub:'Готуємо все необхідне…',stageUpload:'Завантаження',stageProcess:'Обробка',stageSave:'Збереження',stageDone:'Готово',readyTitle:'Ваші відео готові',readyText:'Готові файли збережено на пристрої.',viewHistory:'Відкрити історію',historyTitle:'Історія завантажень',historySub:'Останні оброблені файли та їхній статус.',clearHistory:'Очистити історію',historyEmptyTitle:'Оброблених відео ще немає',historyEmptyText:'Готові відео з’являться тут.',firstOffer:'Стартова пропозиція на першу підписку',plansTitle:'Оберіть тариф під свій обсяг роботи',plansSub:'Почніть із двох безкоштовних відео та переходьте на тариф за потреби.',perMonth:'/ місяць',videosPerMonth:'відео за платіжний період',chooseBasic:'Обрати Basic',choosePro:'Обрати Pro',chooseBusiness:'Обрати Business',mostPopular:'Найпопулярніший',guaranteeTitle:'Гарантія повернення коштів',guaranteeText:'Перші покупки підписки, що відповідають умовам, покриваються політикою повернення. Повні умови показуються до оплати.',manageBilling:'Керувати підпискою',faqTitle:'Поширені запитання',faqSub:'Усе важливе перед обробкою відео.',faq1q:'Що вважається одним відео-кредитом?',faq1a:'Одне вихідне відео використовує один кредит, навіть якщо в межах однієї задачі створено кілька варіацій.',faq2q:'Де обробляються мої відео?',faq2a:'Обробка розрахована на локальну роботу на вашому пристрої. Дані акаунта, оплати, використання та історії можуть синхронізуватися.',faq3q:'Чи потрібна картка для безкоштовного тесту?',faq3a:'Ні. Кожен новий акаунт отримує два безкоштовні відео-кредити.',faq4q:'Чи можна скасувати підписку?',faq4a:'Так. Підпискою можна керувати або скасувати її через платіжний портал.',faq5q:'Що станеться, коли ліміт закінчиться?',faq5a:'Обробка призупиниться до наступного платіжного періоду або переходу на вищий тариф.',faq6q:'Які формати підтримуються?',faq6a:'Підтримуються поширені формати MP4, MOV, M4V, WebM, MKV та AVI, якщо пристрій може їх прочитати.',authTitle:'Увійдіть для синхронізації акаунта',authSub:'Тариф, кредити та історія будуть доступні на ваших пристроях.',continueGoogle:'Продовжити з Google',continueApple:'Продовжити з Apple',authNotice:'Безпечний вхід відкривається у провайдера. Відео для авторизації не завантажуються.',freeTrial:'Безкоштовний тест',trial:'Тест',basic:'Basic',pro:'Pro',business:'Business',processing:'Обробка',saving:'Збереження',loading:'Завантаження',done:'Готово',saved:'Збережено на пристрій',download:'Завантажити',availableSession:'Доступно в цій сесії',metadataOnly:'Файл уже збережено локально',creditsNeeded:'Для цієї задачі не вистачає відео-кредитів.',goPlans:'Оберіть тариф, щоб продовжити.',signInRequired:'Перед вибором платного тарифу увійдіть до акаунта.',billingUnavailable:'Оплату ще не налаштовано.',authUnavailable:'Вхід запрацює після налаштування OAuth-даних.',clearConfirm:'Історію очищено.',jobComplete:'Обробку завершено.',processingError:'Помилка обробки. Спробуйте ще раз.',canceled:'Обробку скасовано.',historyStatusSaved:'Збережено',historyStatusReady:'Можна завантажити'}
  };

  function detectLocale(){
    const raw=(navigator.languages?.[0]||navigator.language||'en-US').toLowerCase();
    if(raw.startsWith('fr'))return'fr'; if(raw.startsWith('ru'))return'ru'; if(raw.startsWith('uk'))return'uk'; return'en';
  }
  function t(key){return translations[state.locale]?.[key]||translations.en[key]||key;}
  function applyLocale(){
    state.locale=detectLocale(); document.documentElement.lang=state.locale==='en'?'en-US':state.locale;
    $('localeBadge').textContent=state.locale.toUpperCase();
    qsa('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(translations[state.locale]?.[key]||translations.en[key])el.textContent=t(key);});
    renderDashboard(); renderHistory();
  }

  function readHistory(){try{return JSON.parse(localStorage.getItem('vv_history')||'[]').slice(0,100)}catch(_){return[]}}
  function saveHistory(){localStorage.setItem('vv_history',JSON.stringify(state.history.slice(0,100).map(({blob,...x})=>x)));}
  function bytes(n){const u=['B','KB','MB','GB'];let i=0,v=n||0;while(v>=1024&&i<u.length-1){v/=1024;i++}return`${v.toFixed(v>=100?0:v>=10?1:2)} ${u[i]}`;}
  function toast(message){const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,3200);}

  function apiBase(){
    if(window.VV_API_BASE)return String(window.VV_API_BASE).replace(/\/$/,'');
    if(location.protocol==='http:'||location.protocol==='https:')return location.origin;
    return localStorage.getItem('vv_api_base')||'';
  }
  async function api(path,options={}){
    const base=apiBase(); if(!base)throw new Error('API_UNAVAILABLE');
    const headers={'Content-Type':'application/json',...(options.headers||{})}; if(state.token)headers.Authorization=`Bearer ${state.token}`;
    const r=await fetch(base+path,{...options,headers}); const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||`Request failed (${r.status})`); return data;
  }

  function creditModel(){
    if(state.user?.usage)return state.user.usage;
    return {plan:'trial',limit:2,used:Math.min(2,state.trialUsed),remaining:Math.max(0,2-state.trialUsed),active:false};
  }
  function planName(id){return id==='basic'?'Basic':id==='pro'?'Pro':id==='business'?'Business':t('freeTrial');}
  function renderDashboard(){
    const u=creditModel(),processed=state.history.filter(x=>x.sourceCredit===true).length||u.used||0;
    $('creditText').textContent=`${u.remaining} / ${u.limit}`; $('creditBar').style.width=`${u.limit?Math.max(0,Math.min(100,u.remaining/u.limit*100)):0}%`;
    $('planLabel').textContent=planName(u.plan); $('processedCount').textContent=processed; $('remainingCount').textContent=u.remaining; $('currentPlan').textContent=planName(u.plan);
    $('planStatus').textContent=u.active?'Active subscription':t('trialStatus'); $('manageBillingBtn').hidden=!u.active;
    $('signInBtn').textContent=state.user?t('signOut'):t('signIn'); $('accountChip').hidden=!state.user; if(state.user)$('accountChip').textContent=state.user.email||state.user.name||'Account';
  }

  function renderHistory(){
    const list=$('historyList'),empty=$('historyEmpty'); list.innerHTML=''; empty.hidden=state.history.length>0;
    state.history.forEach(item=>{
      const row=document.createElement('article');row.className='historyItem card';
      const left=document.createElement('div');const title=document.createElement('h4');title.textContent=item.name;const meta=document.createElement('div');meta.className='historyMeta';meta.textContent=`${new Date(item.createdAt).toLocaleString()} · ${item.resolution||''}`;left.append(title,meta);
      const right=document.createElement('div');const blob=sessionDownloads.get(item.id);
      if(blob){const b=document.createElement('button');b.className='ghostBtn';b.textContent=t('download');b.onclick=()=>downloadBlob(item.name,blob);right.appendChild(b);}
      else{const badge=document.createElement('span');badge.className='historyBadge';badge.textContent=item.saved?t('historyStatusSaved'):t('historyStatusReady');right.appendChild(badge);}
      row.append(left,right);list.appendChild(row);
    });
  }
  function addHistory(results,sourceCount){
    results.forEach((r,i)=>{sessionDownloads.set(r.id,r.blob);state.history.unshift({id:r.id,name:r.name,sourceName:r.sourceName,createdAt:r.createdAt,resolution:r.resolution,saved:r.saved,path:r.path||null,sourceCredit:i<sourceCount});});
    saveHistory();renderHistory();renderDashboard();
  }
  function downloadBlob(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}

  function showView(name){
    qsa('.view').forEach(v=>v.classList.toggle('active',v.id===`${name}View`));qsa('.navBtn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    const key={dashboard:'navDashboard',history:'navHistory',plans:'navPlans',faq:'navFaq'}[name]||'navDashboard';$('pageTitle').textContent=t(key);document.querySelector('.sidebar')?.classList.remove('open');
  }

  function updateFileSummary(){
    const files=core.getFiles();$('startBtn').disabled=!files.length||core.state.running;
    if(!files.length){$('fileSummary').textContent=t('noFiles');return;}
    const total=files.reduce((s,f)=>s+(f.size||0),0),names=files.slice(0,3).map(f=>f.name).join(', ');
    $('fileSummary').textContent=`${files.length} ${files.length===1?t('video'):t('videos')} · ${bytes(total)} · ${names}${files.length>3?'…':''}`;
  }

  function setStage(stage){
    const order=['upload','process','save','done'],map={load:'upload',process:'process',save:'save',done:'done'};const current=map[stage]||stage,idx=order.indexOf(current);
    qsa('.stage').forEach((el,i)=>{el.classList.toggle('active',i===idx);el.classList.toggle('done',i<idx||current==='done');});
    $('progressStage').textContent=current==='upload'?t('loading'):current==='process'?t('processing'):current==='save'?t('saving'):t('done');
  }

  core.configure({
    onEngine(status){const el=$('engineBadge');el.classList.toggle('ready',status==='ready');el.textContent=status==='ready'?t('engineReady'):status==='loading'?t('engineLoading'):t('engineStandby');},
    onProgress(p){const n=Math.round(p*100);$('progressPercent').textContent=n+'%';$('progressBar').style.width=n+'%';},
    onStage(stage,info={}){setStage(stage);if(stage==='process'){$('progressTitle').textContent=info.file||t('processing');$('progressText').textContent=`${t('processing')} ${info.job||''}${info.total?` / ${info.total}`:''}`;}else if(stage==='save'){$('progressText').textContent=t('saving');}else if(stage==='done'){$('progressTitle').textContent=t('readyTitle');$('progressText').textContent=t('jobComplete');}},
    onLog(line){console.debug('[VideoVariator]',line);}
  });

  async function refreshAccount(){
    if(!state.token){state.user=null;renderDashboard();return;}
    try{const data=await api('/api/me');state.user=data.user||data;renderDashboard();}
    catch(_){state.token='';state.user=null;localStorage.removeItem('vv_token');renderDashboard();}
  }

  async function startProcessing(){
    const files=core.getFiles();if(!files.length)return;const credits=creditModel();
    if(files.length>credits.remaining){showView('plans');toast(`${t('creditsNeeded')} ${t('goPlans')}`);return;}
    $('progressCard').hidden=false;$('resultsCard').hidden=true;$('cancelBtn').hidden=false;$('startBtn').disabled=true;$('progressBar').style.width='0%';$('progressPercent').textContent='0%';setStage('upload');
    try{
      const result=await core.process({variants:Number($('variantCount').value),mode:$('mode').value,resolution:$('resolution').value});
      addHistory(result.results,result.sourceCount);
      if(state.user){try{await api('/api/usage/consume',{method:'POST',body:JSON.stringify({count:result.sourceCount})});await refreshAccount();}catch(e){console.warn(e);}}
      else{state.trialUsed=Math.min(2,state.trialUsed+result.sourceCount);localStorage.setItem('vv_trial_used',String(state.trialUsed));renderDashboard();}
      $('readyText').textContent=window.AndroidBridge?t('readyText'):`${result.outputCount} ${result.outputCount===1?t('video'):t('videos')} ${t('availableSession').toLowerCase()}.`;$('resultsCard').hidden=false;toast(t('jobComplete'));
    }catch(e){if(String(e.message).toLowerCase().includes('cancel'))toast(t('canceled'));else toast(t('processingError'));console.error(e);}
    finally{$('cancelBtn').hidden=true;$('startBtn').disabled=!core.getFiles().length;}
  }

  function openAuth(){state.pendingPlan=state.pendingPlan||null;$('authModal').hidden=false;initProviderButtons();}
  function closeAuth(){$('authModal').hidden=true;}
  async function authSuccess(token){state.token=token;localStorage.setItem('vv_token',token);closeAuth();await refreshAccount();if(state.pendingPlan){const p=state.pendingPlan;state.pendingPlan=null;checkout(p);}}

  function initProviderButtons(){
    const c=state.config||{};
    if(c.googleClientId&&window.google?.accounts?.id){
      try{$('googleButton').innerHTML='';google.accounts.id.initialize({client_id:c.googleClientId,callback:async resp=>{try{const d=await api('/api/auth/google',{method:'POST',body:JSON.stringify({credential:resp.credential})});await authSuccess(d.token);}catch(e){toast(e.message);}}});google.accounts.id.renderButton($('googleButton'),{theme:'outline',size:'large',width:350,text:'continue_with'});}catch(e){console.warn(e);}
    }
  }
  async function appleSignIn(){
    const c=state.config||{};if(!c.appleClientId||!c.appleRedirectUri||!window.AppleID?.auth){toast(t('authUnavailable'));return;}
    try{AppleID.auth.init({clientId:c.appleClientId,scope:'name email',redirectURI:c.appleRedirectUri,state:crypto.randomUUID?.()||String(Date.now()),nonce:crypto.randomUUID?.()||String(Math.random()),usePopup:true});const res=await AppleID.auth.signIn();const d=await api('/api/auth/apple',{method:'POST',body:JSON.stringify({idToken:res.authorization?.id_token,user:res.user||null})});await authSuccess(d.token);}catch(e){console.warn(e);toast(e.message||t('authUnavailable'));}
  }

  async function checkout(plan){
    if(!state.user){state.pendingPlan=plan;openAuth();toast(t('signInRequired'));return;}
    try{const d=await api('/api/billing/checkout',{method:'POST',body:JSON.stringify({plan})});if(!d.url)throw new Error(t('billingUnavailable'));location.href=d.url;}
    catch(e){toast(e.message==='API_UNAVAILABLE'?t('billingUnavailable'):e.message);}
  }
  async function manageBilling(){try{const d=await api('/api/billing/portal',{method:'POST',body:'{}'});if(d.url)location.href=d.url;}catch(e){toast(e.message==='API_UNAVAILABLE'?t('billingUnavailable'):e.message);}}

  async function loadConfig(){
    try{state.config=await api('/api/config');if(state.config?.introOfferText){const el=document.querySelector('[data-i18n="firstOffer"]');if(el)el.textContent=state.config.introOfferText;}initProviderButtons();}
    catch(_){state.config={};}
  }

  qsa('.navBtn').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  qsa('[data-view-jump]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.viewJump)));
  $('menuBtn').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
  $('fileInput').addEventListener('change',e=>{core.setFiles(e.target.files);updateFileSummary();});
  $('startBtn').addEventListener('click',startProcessing);$('cancelBtn').addEventListener('click',()=>core.cancel());
  $('signInBtn').addEventListener('click',()=>{if(state.user){state.token='';state.user=null;localStorage.removeItem('vv_token');renderDashboard();}else openAuth();});
  qsa('[data-close-auth]').forEach(x=>x.addEventListener('click',closeAuth));$('googleFallback').addEventListener('click',()=>{if(!state.config?.googleClientId)toast(t('authUnavailable'));});$('appleButton').addEventListener('click',appleSignIn);
  qsa('.planBtn').forEach(b=>b.addEventListener('click',()=>checkout(b.dataset.plan)));$('manageBillingBtn').addEventListener('click',manageBilling);
  $('clearHistoryBtn').addEventListener('click',()=>{state.history=[];sessionDownloads.clear();saveHistory();renderHistory();renderDashboard();toast(t('clearConfirm'));});

  window.VideoVariatorUI={setFiles(files){core.setFiles(files);updateFileSummary();},toast,refreshAccount,showView};
  if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{});
  applyLocale();renderHistory();renderDashboard();loadConfig().then(refreshAccount);
})();
