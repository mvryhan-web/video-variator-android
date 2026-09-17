(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const qsa = sel => Array.from(document.querySelectorAll(sel));
  const langRaw = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
  const locale = langRaw.startsWith('fr') ? 'fr' : langRaw.startsWith('ru') ? 'ru' : langRaw.startsWith('uk') ? 'uk' : 'en';

  const copy = {
    en:{
      heroTitle:'Create multiple fresh versions from one video.',
      heroText:'Upload once, choose a processing style, and generate ready-to-download variations automatically.',
      free:'2 free videos',noCard:'No card required',local:'Video stays on your device',tryFree:'Try it free',plans:'View plans',
      valueTitle:'Built for fast, repeatable video variation',valueText:'Automatic visual, audio and file-level adjustments are combined for each output while your source video is processed locally on your device.',
      frame:'Frame & crop',motion:'Motion',color:'Color',audio:'Audio & file',styleTitle:'One source. Different processing styles.',original:'Original',gentle:'Gentle',balance:'Balance',dynamic:'Dynamic',
      uploadNote:'Private by design — video processing runs locally on your device.',balancePreview:'First free video: Balance preview available at 720p.',
      plansTitle:'Choose the plan that matches your workflow',plansText:'Simple monthly plans. Credits are based on finished output duration: 1 second = 1 credit.',
      stripe:'Cards & supported wallets via Stripe',cancel:'Manage or cancel from Profile',localShort:'Local video processing',recommended:'Recommended',
      resultTitle:'Your variation is ready. Want more from every upload?',resultText:'Pro unlocks up to 10 variations per video, Balance mode and 1080p output.',resultCta:'Unlock Pro',
      trialDone:'Free trial complete',trialTitle:'Keep creating without interruption',trialText:'Choose a plan and continue straight to secure checkout.',compare:'Compare all plan details',
      faq1q:'Why does Video Uniquifier process locally?',faq1a:'Your video processing is designed to run on your device. Account, billing, usage and history metadata can sync securely over HTTPS, but raw video is not required for account or billing operations.',
      faq2q:'Which plan is best for regular creators?',faq2a:'Pro includes Gentle and Balance modes, up to 10 variations per video and 1080p output. Essential is the lower-cost option for lighter use, while Business adds Dynamic mode, 4K and higher volume.',
      simpleBilling:'Simple monthly billing',simpleBillingText:'Secure checkout is handled by Stripe. Manage your subscription from Profile & Settings.'
    },
    fr:{
      heroTitle:'Créez plusieurs nouvelles versions à partir d’une seule vidéo.',
      heroText:'Importez une fois, choisissez un style de traitement et générez automatiquement des variantes prêtes à télécharger.',
      free:'2 vidéos gratuites',noCard:'Aucune carte requise',local:'La vidéo reste sur votre appareil',tryFree:'Essayer gratuitement',plans:'Voir les offres',
      valueTitle:'Conçu pour créer rapidement des variantes vidéo',valueText:'Des ajustements visuels, audio et techniques sont combinés automatiquement pour chaque sortie, tandis que la vidéo source est traitée localement sur votre appareil.',
      frame:'Cadre & recadrage',motion:'Mouvement',color:'Couleur',audio:'Audio & fichier',styleTitle:'Une source. Plusieurs styles de traitement.',original:'Original',gentle:'Gentle',balance:'Balance',dynamic:'Dynamic',
      uploadNote:'Confidentiel par conception — le traitement vidéo s’effectue localement sur votre appareil.',balancePreview:'Première vidéo gratuite : aperçu Balance disponible en 720p.',
      plansTitle:'Choisissez l’offre adaptée à votre rythme',plansText:'Abonnements mensuels simples. Les crédits dépendent de la durée finale : 1 seconde = 1 crédit.',
      stripe:'Cartes et portefeuilles compatibles via Stripe',cancel:'Gérez ou annulez depuis Profil',localShort:'Traitement vidéo local',recommended:'Recommandé',
      resultTitle:'Votre variante est prête. Vous voulez plus à chaque import ?',resultText:'Pro débloque jusqu’à 10 variantes par vidéo, le mode Balance et la sortie 1080p.',resultCta:'Passer à Pro',
      trialDone:'Essai gratuit terminé',trialTitle:'Continuez à créer sans interruption',trialText:'Choisissez une offre et passez directement au paiement sécurisé.',compare:'Comparer toutes les offres',
      faq1q:'Pourquoi Video Uniquifier traite-t-il les vidéos localement ?',faq1a:'Le traitement vidéo est conçu pour s’effectuer sur votre appareil. Les données de compte, facturation, usage et historique peuvent être synchronisées via HTTPS, sans nécessiter l’envoi de la vidéo brute pour la gestion du compte ou de la facturation.',
      faq2q:'Quelle offre convient aux créateurs réguliers ?',faq2a:'Pro inclut les modes Gentle et Balance, jusqu’à 10 variantes par vidéo et la sortie 1080p. Essential convient à un usage plus léger, tandis que Business ajoute Dynamic, la 4K et un volume supérieur.',
      simpleBilling:'Facturation mensuelle simple',simpleBillingText:'Le paiement sécurisé est géré par Stripe. Gérez votre abonnement depuis Profil et réglages.'
    },
    ru:{
      heroTitle:'Создавайте несколько новых версий из одного видео.',
      heroText:'Загрузите видео один раз, выберите стиль обработки и автоматически получите готовые варианты для скачивания.',
      free:'2 видео бесплатно',noCard:'Карта не нужна',local:'Видео остаётся на устройстве',tryFree:'Попробовать бесплатно',plans:'Посмотреть тарифы',
      valueTitle:'Быстрая и повторяемая вариативная обработка видео',valueText:'Для каждого результата автоматически комбинируются визуальные, аудио и технические изменения, а исходное видео обрабатывается локально на вашем устройстве.',
      frame:'Кадр и обрезка',motion:'Движение',color:'Цвет',audio:'Аудио и файл',styleTitle:'Одно видео. Разные стили обработки.',original:'Оригинал',gentle:'Gentle',balance:'Balance',dynamic:'Dynamic',
      uploadNote:'Приватность по умолчанию — видео обрабатывается локально на вашем устройстве.',balancePreview:'Первое бесплатное видео: можно попробовать Balance в 720p.',
      plansTitle:'Выберите тариф под свой объём работы',plansText:'Простая ежемесячная подписка. Кредиты считаются по длительности готового результата: 1 секунда = 1 кредит.',
      stripe:'Карты и поддерживаемые кошельки через Stripe',cancel:'Управление и отмена в профиле',localShort:'Локальная обработка видео',recommended:'Рекомендуем',
      resultTitle:'Вариант готов. Хотите получать больше из каждой загрузки?',resultText:'Pro открывает до 10 вариантов на видео, режим Balance и качество 1080p.',resultCta:'Открыть Pro',
      trialDone:'Пробный период закончился',trialTitle:'Продолжайте без паузы',trialText:'Выберите тариф и сразу переходите к защищённой оплате.',compare:'Сравнить все тарифы',
      faq1q:'Почему Video Uniquifier обрабатывает видео локально?',faq1a:'Обработка видео работает на вашем устройстве. Данные аккаунта, оплаты, использования и истории могут безопасно синхронизироваться по HTTPS, но исходный видеофайл не нужен для операций аккаунта и биллинга.',
      faq2q:'Какой тариф подходит для регулярной работы?',faq2a:'Pro включает Gentle и Balance, до 10 вариантов на видео и 1080p. Essential подходит для небольшого объёма, а Business добавляет Dynamic, 4K и больше кредитов.',
      simpleBilling:'Простая ежемесячная оплата',simpleBillingText:'Безопасную оплату обрабатывает Stripe. Управлять подпиской можно в Profile & Settings.'
    },
    uk:{
      heroTitle:'Створюйте кілька нових версій з одного відео.',
      heroText:'Завантажте відео один раз, оберіть стиль обробки та автоматично отримайте готові варіанти для завантаження.',
      free:'2 відео безкоштовно',noCard:'Картка не потрібна',local:'Відео залишається на пристрої',tryFree:'Спробувати безкоштовно',plans:'Переглянути тарифи',
      valueTitle:'Швидка та повторювана варіативна обробка відео',valueText:'Для кожного результату автоматично комбінуються візуальні, аудіо та технічні зміни, а вихідне відео обробляється локально на вашому пристрої.',
      frame:'Кадр і обрізка',motion:'Рух',color:'Колір',audio:'Аудіо та файл',styleTitle:'Одне відео. Різні стилі обробки.',original:'Оригінал',gentle:'Gentle',balance:'Balance',dynamic:'Dynamic',
      uploadNote:'Приватність за замовчуванням — відео обробляється локально на вашому пристрої.',balancePreview:'Перше безкоштовне відео: можна спробувати Balance у 720p.',
      plansTitle:'Оберіть тариф під свій обсяг роботи',plansText:'Проста щомісячна підписка. Кредити рахуються за тривалістю готового результату: 1 секунда = 1 кредит.',
      stripe:'Картки та підтримувані гаманці через Stripe',cancel:'Керування й скасування в профілі',localShort:'Локальна обробка відео',recommended:'Рекомендуємо',
      resultTitle:'Варіант готовий. Хочете більше з кожного завантаження?',resultText:'Pro відкриває до 10 варіантів на відео, режим Balance та якість 1080p.',resultCta:'Відкрити Pro',
      trialDone:'Пробний період завершено',trialTitle:'Продовжуйте без паузи',trialText:'Оберіть тариф і одразу переходьте до захищеної оплати.',compare:'Порівняти всі тарифи',
      faq1q:'Чому Video Uniquifier обробляє відео локально?',faq1a:'Обробка відео працює на вашому пристрої. Дані акаунта, оплати, використання та історії можуть безпечно синхронізуватися через HTTPS, але вихідний відеофайл не потрібен для операцій акаунта й білінгу.',
      faq2q:'Який тариф підходить для регулярної роботи?',faq2a:'Pro включає Gentle і Balance, до 10 варіантів на відео та 1080p. Essential підходить для меншого обсягу, а Business додає Dynamic, 4K і більше кредитів.',
      simpleBilling:'Проста щомісячна оплата',simpleBillingText:'Безпечну оплату обробляє Stripe. Керувати підпискою можна в Profile & Settings.'
    }
  };
  const tx = copy[locale] || copy.en;

  /* Keep the existing 50 / 100 / 150 adjustment positioning unchanged. */
  const plans = {
    basic:{name:'Essential',price:'$9',credits:'750',short15:'≈ 50 × 15-sec outputs',short30:'25 × 30-sec outputs',micro:'Up to 50 technical micro-adjustment options',variants:'Up to 5 variations',access:'Gentle · 720p · 9:16 / 16:9',fit:'For occasional creators'},
    pro:{name:'Pro',price:'$24',credits:'2,250',short15:'≈ 150 × 15-sec outputs',short30:'75 × 30-sec outputs',micro:'Up to 100 advanced micro-adjustment options',variants:'Up to 10 variations',access:'Gentle + Balance · 1080p · 9:16 / 16:9',fit:'For regular creators'},
    business:{name:'Business',price:'$99',credits:'15,000',short15:'≈ 1,000 × 15-sec outputs',short30:'500 × 30-sec outputs',micro:'Up to 150 full-pipeline adjustment options',variants:'Up to 15 variations',access:'Gentle + Balance + Dynamic · 4K · 9:16 / 16:9',fit:'For high-volume workflows'}
  };

  let funnelSyncing=false;
  function readFunnel(){try{return JSON.parse(localStorage.getItem('vu_funnel')||'[]');}catch(_){return[];}}
  function writeFunnel(rows){try{localStorage.setItem('vu_funnel',JSON.stringify(rows.slice(-250)));}catch(_){}}
  async function syncFunnelQueue(){
    const token=localStorage.getItem('vv_token');if(!token||funnelSyncing)return;
    funnelSyncing=true;
    try{
      const rows=readFunnel();
      for(const row of rows.filter(r=>!r.sent).slice(0,20)){
        try{
          const r=await fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({type:`funnel_${row.type}`,category:'conversion',message:row.plan||row.source||null}),keepalive:true});
          if(r.ok)row.sent=true;
        }catch(_){break;}
      }
      writeFunnel(rows);
    }finally{funnelSyncing=false;}
  }
  function track(type,data={}){
    try{
      const rows=readFunnel();
      rows.push({id:`${Date.now()}_${Math.random().toString(36).slice(2,8)}`,type,at:new Date().toISOString(),sent:false,...data});
      writeFunnel(rows);syncFunnelQueue();
    }catch(_){/* analytics must never block the product */}
  }

  function goPlans(){
    track('plans_view',{source:'cta'});
    if(window.VideoVariatorUI?.showView){window.VideoVariatorUI.showView('plans');return;}
    document.querySelector('.navBtn[data-view="plans"]')?.click();
  }

  function choosePlan(id,source='pricing'){
    const btn=document.querySelector(`.planBtn[data-plan="${id}"]`);
    if(btn){btn.dataset.conversionSource=source;btn.click();setTimeout(()=>delete btn.dataset.conversionSource,0);return;}
    goPlans();
  }

  function unifyBrand(){
    document.title='Video Uniquifier';
    const meta=document.querySelector('meta[name="description"]');
    if(meta)meta.content='Video Uniquifier creates multiple video variations with privacy-first on-device processing and simple monthly plans.';
    const brand=document.querySelector('.brand');
    if(brand){const mark=brand.querySelector('.brandMark'),name=brand.querySelector('b'),tag=brand.querySelector('small');if(mark)mark.textContent='VU';if(name)name.textContent='Video Uniquifier';if(tag)tag.textContent='Video variation made simple';}
    qsa('.topTitle .eyebrow').forEach(el=>el.textContent='VIDEO UNIQUIFIER');
  }

  function upgradeHero(){
    const hero=document.querySelector('#dashboardView .hero');
    if(!hero||hero.dataset.conversion==='1')return;
    hero.dataset.conversion='1';hero.classList.add('conversionHero');
    const left=hero.firstElementChild;if(!left)return;
    left.classList.add('conversionHeroCopy');
    left.innerHTML=`<span class="heroKicker">VIDEO UNIQUIFIER</span><h2>${tx.heroTitle}</h2><p>${tx.heroText}</p><div class="heroTrust"><span>✓ ${tx.free}</span><span>✓ ${tx.noCard}</span><span>✓ ${tx.local}</span></div><div class="heroActions"><button type="button" class="primaryBtn heroTryBtn">${tx.tryFree}</button><button type="button" class="ghostBtn heroPlansBtn">${tx.plans}</button></div>`;
    left.querySelector('.heroTryBtn')?.addEventListener('click',()=>{track('hero_try_free');$('fileInput')?.click();});
    left.querySelector('.heroPlansBtn')?.addEventListener('click',goPlans);
    const usage=hero.querySelector('.usageBox');
    if(usage&&!usage.querySelector('.usageReassurance'))usage.insertAdjacentHTML('beforeend','<small class="usageReassurance">No hidden upload step · Processing stays local</small>');
  }

  function addValueProof(){
    const hero=document.querySelector('#dashboardView .hero');
    if(!hero||$('conversionValueProof'))return;
    const block=document.createElement('section');block.id='conversionValueProof';block.className='conversionValueProof card';
    block.innerHTML=`<div class="valueProofHead"><div><span class="eyebrow">HOW IT HELPS</span><h3>${tx.valueTitle}</h3><p>${tx.valueText}</p></div><button type="button" class="ghostBtn valueProofPlans">${tx.plans}</button></div><div class="valueProofGrid"><span><b>01</b>${tx.frame}</span><span><b>02</b>${tx.motion}</span><span><b>03</b>${tx.color}</span><span><b>04</b>${tx.audio}</span></div><div class="modePreview"><div class="modePreviewTitle">${tx.styleTitle}</div><div class="modePreviewFlow"><article class="previewCard previewOriginal"><i></i><b>${tx.original}</b><small>Source</small></article><span class="previewArrow">→</span><div class="previewOutputs"><article class="previewCard previewGentle"><i></i><b>${tx.gentle}</b><small>Subtle</small></article><article class="previewCard previewBalance"><i></i><b>${tx.balance}</b><small>Stronger</small></article><article class="previewCard previewDynamic"><i></i><b>${tx.dynamic}</b><small>Broadest</small></article></div></div></div>`;
    hero.insertAdjacentElement('afterend',block);
    block.querySelector('.valueProofPlans')?.addEventListener('click',goPlans);
  }

  function polishWorkspace(){
    const workspace=document.querySelector('.workspace');if(!workspace)return;
    if(!workspace.querySelector('.privacyInline')){
      const note=document.createElement('div');note.className='privacyInline';note.innerHTML=`<span class="privacyPulse"></span><span>${tx.uploadNote}</span>`;
      const picker=workspace.querySelector('.pickerGrid');picker?.insertAdjacentElement('beforebegin',note);
    }
    const picker=workspace.querySelector('.picker');
    if(picker){picker.classList.add('conversionPicker');const b=picker.querySelector('b');if(b)b.textContent=tx.tryFree;}
  }

  function renameBasicDisplay(){
    ['currentPlan','profilePlan','planLabel','planAccessHint'].forEach(id=>{
      const el=$(id);if(!el)return;
      if(el.textContent.includes('Basic'))el.textContent=el.textContent.replaceAll('Basic','Essential');
    });
    qsa('.variantLockNote').forEach(el=>{if(el.textContent.includes('Basic'))el.textContent=el.textContent.replaceAll('Basic','Essential');});
  }

  function syncTrialBalancePreview(){
    const mode=$('mode'),hint=$('planAccessHint');if(!mode||!hint)return;
    const plan=($('currentPlan')?.textContent||'').toLowerCase();
    const trial=plan.includes('trial')||plan.includes('free');
    const remaining=Number(($('remainingCount')?.textContent||'').replace(/[^0-9.-]/g,''));
    const fileCount=$('fileInput')?.files?.length||0;
    const eligible=trial&&remaining===2&&fileCount<=1;
    const balance=Array.from(mode.options).find(o=>o.value==='balanced');
    const dynamic=Array.from(mode.options).find(o=>o.value==='dynamic');
    if(!trial){hint.classList.remove('trialBalancePreview');return;}
    if(balance)balance.disabled=!eligible;
    if(dynamic)dynamic.disabled=true;
    if(!eligible&&mode.value==='balanced')mode.value='gentle';
    if(eligible){
      hint.classList.add('trialBalancePreview');
      if(hint.textContent!==tx.balancePreview)hint.textContent=tx.balancePreview;
    }else{
      hint.classList.remove('trialBalancePreview');
      const fallback='Free trial: Gentle · 720p';if(hint.textContent!==fallback)hint.textContent=fallback;
    }
  }

  function decoratePricing(){
    const view=$('plansView');if(!view)return;
    const hero=view.querySelector('.pricingHero');
    if(hero){
      const offer=$('introOffer');if(offer)offer.hidden=true;
      const h2=hero.querySelector('h2');if(h2)h2.textContent=tx.plansTitle;
      const p=hero.querySelector('p');if(p)p.textContent=tx.plansText;
      if(!hero.querySelector('.pricingTrust'))hero.insertAdjacentHTML('beforeend',`<div class="pricingTrust"><span>✓ ${tx.stripe}</span><span>✓ ${tx.cancel}</span><span>✓ ${tx.localShort}</span></div>`);
    }

    qsa('.priceCard').forEach(card=>{
      const button=card.querySelector('.planBtn');const id=button?.dataset.plan;const plan=plans[id];if(!plan)return;
      card.dataset.plan=id;card.classList.toggle('featured',id==='pro');
      const oldPopular=card.querySelector('.popular');
      if(id==='pro'){
        if(oldPopular)oldPopular.textContent=tx.recommended;
        else card.insertAdjacentHTML('afterbegin',`<span class="popular">${tx.recommended}</span>`);
      }else if(oldPopular)oldPopular.remove();
      const name=card.querySelector('.planName');if(name)name.textContent=plan.name;
      const price=card.querySelector('.price b');if(price)price.textContent=plan.price;
      const creditP=card.querySelector('p');if(creditP)creditP.innerHTML=`<strong>${plan.credits}</strong> credits <small class="planFit">${plan.fit}</small>`;
      const unit=card.querySelector('.planUnit');if(unit)unit.textContent=plan.access;
      if(button)button.textContent=id==='pro'?'Get Pro':`Get ${plan.name}`;
      let benefits=card.querySelector('.planBenefits');
      if(!benefits){benefits=document.createElement('div');benefits.className='planBenefits';(unit||creditP)?.before(benefits);}
      benefits.innerHTML=`<span class="planOutputExample"><b>${plan.short15}</b><small>${plan.short30}</small></span><span>✓ ${plan.micro}</span><span>✓ ${plan.variants}</span><span>✓ ${plan.access.split(' · ')[0]}</span>`;
    });

    const guarantee=view.querySelector('.guarantee');
    if(guarantee){
      guarantee.classList.add('billingNote');
      guarantee.innerHTML=`<div class="guaranteeIcon">✓</div><div><b>${tx.simpleBilling}</b><p>${tx.simpleBillingText}</p></div>`;
    }
  }

  function addHowItWorks(){
    const view=$('faqView');const list=view?.querySelector('.faqList');if(!view||!list||$('howItWorks'))return;
    const block=document.createElement('section');block.id='howItWorks';block.className='howItWorks';
    block.innerHTML='<div class="howHead"><span class="eyebrow">HOW IT WORKS</span><h3>Upload once. Create multiple finished outputs.</h3><p>Video Uniquifier combines small visual, audio and technical adjustments automatically while keeping your workflow simple.</p></div><div class="howSteps"><article><b>1</b><strong>Upload</strong><span>Choose your source video and output settings.</span></article><article><b>2</b><strong>Choose a style</strong><span>Gentle, Balance or Dynamic depending on your plan.</span></article><article><b>3</b><strong>Download</strong><span>Each variation is generated and saved as its own output.</span></article></div>';
    view.insertBefore(block,list);
  }

  function updateFaq(){
    const list=$('faqView')?.querySelector('.faqList');if(!list)return;
    list.querySelectorAll('[data-product-faq]').forEach(el=>el.remove());
    list.querySelectorAll('details').forEach(item=>{
      const summary=item.querySelector('summary');const p=item.querySelector('p');if(!summary||!p)return;
      if(summary.textContent.includes('processing modes'))p.textContent='Essential includes Gentle. Pro includes Gentle and Balance. Business unlocks Gentle, Balance and Dynamic.';
      if(summary.textContent.includes('quality'))p.textContent='Essential outputs at 720p, Pro at 1080p and Business at 4K. Both 9:16 and 16:9 are supported.';
      if(summary.textContent.includes('credits work'))p.textContent='1 second of each generated output uses 1 credit. A 15-second source rendered into 2 variations uses about 30 credits because two 15-second outputs are created.';
    });
    const extras=[
      [tx.faq1q,tx.faq1a,'privacy'],
      [tx.faq2q,tx.faq2a,'plans'],
      ['What are micro-adjustments?','They are small technical changes across frame and timing, motion, color, audio and file structure. The plan number describes the size of the available adjustment library; each output uses its own combination rather than applying every option at once.','micro'],
      ['What is the difference between Essential, Pro and Business?','Essential provides up to 50 technical adjustment options and up to 5 variations. Pro expands the library to 100 options and up to 10 variations. Business provides the broadest library with up to 150 options and up to 15 variations.','plan_counts']
    ];
    extras.reverse().forEach(([title,text,key])=>{const d=document.createElement('details');d.className='card';d.dataset.productFaq=key;d.innerHTML=`<summary>${title}</summary><p>${text}</p>`;list.prepend(d);});
  }

  function makeTrialUpsell(){
    const workspace=document.querySelector('.workspace');if(!workspace||$('trialCompleteUpsell'))return;
    const box=document.createElement('section');box.id='trialCompleteUpsell';box.className='trialCompleteUpsell';box.hidden=true;
    box.innerHTML=`<span class="pill accent">${tx.trialDone}</span><h3>${tx.trialTitle}</h3><p>${tx.trialText}</p><div class="trialPlanGrid"></div><button type="button" class="ghostBtn trialCompareBtn">${tx.compare}</button>`;
    const grid=box.querySelector('.trialPlanGrid');
    ['basic','pro','business'].forEach(id=>{const p=plans[id];const b=document.createElement('button');b.type='button';b.className=`trialPlanMini${id==='pro'?' featured':''}`;b.dataset.plan=id;b.innerHTML=`${id==='pro'?`<em>${tx.recommended}</em>`:''}<strong>${p.name}</strong><span>${p.price} / mo</span><small>${p.micro.replace('Up to ','')} · ${p.variants}</small>`;b.addEventListener('click',()=>choosePlan(id,'trial_exhausted'));grid.appendChild(b);});
    box.querySelector('.trialCompareBtn')?.addEventListener('click',goPlans);
    workspace.appendChild(box);
  }

  function makeResultUpsell(){
    const card=$('resultsCard');if(!card||$('resultUpgrade'))return;
    const upgrade=document.createElement('div');upgrade.id='resultUpgrade';upgrade.className='resultUpgrade';
    upgrade.innerHTML=`<div><span class="eyebrow">NEXT STEP</span><b>${tx.resultTitle}</b><small>${tx.resultText}</small></div><button type="button" class="primaryBtn">${tx.resultCta}</button>`;
    upgrade.querySelector('button')?.addEventListener('click',()=>choosePlan('pro','result_success'));
    card.appendChild(upgrade);
  }

  function syncResultUpsell(){
    const up=$('resultUpgrade');if(!up)return;
    const plan=($('currentPlan')?.textContent||'').toLowerCase();
    up.hidden=plan.includes('pro')||plan.includes('business');
  }

  function makeMobileUpgrade(){
    if($('mobileUpgradeBar'))return;
    const bar=document.createElement('div');bar.id='mobileUpgradeBar';bar.className='mobileUpgradeBar';bar.hidden=true;
    bar.innerHTML='<div><b>Pro</b><small>$24/mo · 1080p · up to 10 variations</small></div><button type="button">Upgrade</button>';
    bar.querySelector('button')?.addEventListener('click',()=>choosePlan('pro','mobile_sticky'));
    document.body.appendChild(bar);
  }

  function syncMobileUpgrade(){
    const bar=$('mobileUpgradeBar'),result=$('resultsCard');if(!bar)return;
    const plan=($('currentPlan')?.textContent||'').toLowerCase();
    const paid=plan.includes('pro')||plan.includes('business');
    const successVisible=result&&!result.hidden;
    const remaining=Number(($('remainingCount')?.textContent||'').replace(/[^0-9.-]/g,''));
    const exhausted=Number.isFinite(remaining)&&remaining<=0&&(plan.includes('trial')||plan.includes('free'));
    bar.hidden=paid||(!successVisible&&!exhausted);
  }

  function syncTrialUpsell(){
    const workspace=document.querySelector('.workspace'),box=$('trialCompleteUpsell');if(!workspace||!box)return;
    const plan=($('currentPlan')?.textContent||'').toLowerCase();
    const remaining=Number(($('remainingCount')?.textContent||'').replace(/[^0-9.-]/g,''));
    const trial=plan.includes('trial')||plan.includes('free');
    const exhausted=trial&&Number.isFinite(remaining)&&remaining<=0;
    box.hidden=!exhausted;workspace.classList.toggle('trialComplete',exhausted);
    if(exhausted&&!box.dataset.tracked){box.dataset.tracked='1';track('trial_exhausted');}
    syncMobileUpgrade();syncTrialBalancePreview();
  }

  function installFunnelTracking(){
    if(sessionStorage.getItem('vu_open_tracked')!=='1'){sessionStorage.setItem('vu_open_tracked','1');track('app_open');}
    const params=new URLSearchParams(location.search);
    if(params.get('checkout')==='success'&&sessionStorage.getItem('vu_checkout_success')!=='1'){sessionStorage.setItem('vu_checkout_success','1');track('checkout_success');}
    if(params.get('checkout')==='cancel'&&sessionStorage.getItem('vu_checkout_cancel')!=='1'){sessionStorage.setItem('vu_checkout_cancel','1');track('checkout_cancel');}
    $('fileInput')?.addEventListener('change',e=>{if(e.target.files?.length){track('upload_selected',{source:String(e.target.files.length)});syncTrialBalancePreview();}});
    $('mode')?.addEventListener('change',e=>{if(e.target.value==='balanced'){const plan=($('currentPlan')?.textContent||'').toLowerCase();if(plan.includes('trial')||plan.includes('free'))track('trial_balance_preview_selected');}});
    $('startBtn')?.addEventListener('click',()=>track('processing_start'));
    qsa('.navBtn[data-view="plans"]').forEach(b=>b.addEventListener('click',()=>track('plans_view',{source:'nav'})));
    qsa('.planBtn').forEach(b=>b.addEventListener('click',()=>{const source=b.dataset.conversionSource||'pricing';const plan=b.dataset.plan||'';track('plan_click',{plan,source});track('checkout_open',{plan,source});}));
    const result=$('resultsCard');
    if(result)new MutationObserver(()=>{if(!result.hidden){track('processing_success');syncResultUpsell();syncMobileUpgrade();}}).observe(result,{attributes:true,attributeFilter:['hidden']});
    let attempts=0;const timer=setInterval(()=>{syncFunnelQueue();if(++attempts>=12)clearInterval(timer);},5000);
  }

  function observeDisplay(){
    ['currentPlan','profilePlan','planLabel','planAccessHint','remainingCount'].forEach(id=>{const el=$(id);if(!el)return;new MutationObserver(()=>{renameBasicDisplay();syncTrialUpsell();syncResultUpsell();syncTrialBalancePreview();}).observe(el,{childList:true,characterData:true,subtree:true});});
  }

  function init(){
    unifyBrand();upgradeHero();addValueProof();polishWorkspace();decoratePricing();addHowItWorks();updateFaq();makeTrialUpsell();makeResultUpsell();makeMobileUpgrade();renameBasicDisplay();syncTrialUpsell();syncResultUpsell();syncTrialBalancePreview();observeDisplay();installFunnelTracking();syncFunnelQueue();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
