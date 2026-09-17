(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const lang=(navigator.languages?.[0]||navigator.language||'en').toLowerCase();
  const locale=lang.startsWith('fr')?'fr':lang.startsWith('ru')?'ru':lang.startsWith('uk')?'uk':'en';
  const copy={
    en:{
      hero:'One video. Many futures.',
      heroText:'Upload one original, choose ×3 or ×5, and create multiple distinct finished versions — each with its own combination of visual, audio and technical changes.',
      workspace:'Turn one original into multiple finished versions',
      workspaceSub:'Choose how many versions you want. Video Uniquifier handles the variation automatically.',
      futureTag:'Built for the next decade of content',
      pricing:'Choose how far one original can go',
      pricingSub:'Pick the level that matches your workflow. 1 second of each generated output uses 1 credit.',
      trial:'Your free videos are used. Choose a plan and keep creating multiple versions from every upload.',
      howTitle:'One original can become many finished versions',
      howText:'Your idea stays yours. Video Uniquifier gives each output its own combination of frame, motion, color, audio and technical processing.',
      step1:'Upload your original',step1Text:'Choose the video you own or have permission to use.',
      step2:'Choose ×1–×5',step2Text:'Create one or several separate versions from the same source.',
      step3:'Use each version',step3Text:'Publish the finished versions where they fit your content strategy.',
      faqFutureQ:'Why create multiple versions from one original?',
      faqFutureA:'Because one idea can support several publishing opportunities. Video Uniquifier creates separate finished outputs with different combinations of visual, audio and technical adjustments instead of making you edit every version by hand.',
      faq60Q:'Can I use videos longer than 60 seconds?',
      faq60A:'Yes. The workflow can be used with 60+ second videos as well as shorter videos. Processing time depends on video duration, output quality and the performance of your device.',
      faqChannelsQ:'Can I publish different versions across my content channels?',
      faqChannelsA:'Yes, when the source content is yours or you have the rights to use it. Each output is a separate finished version. Distribution, recommendations and monetization are still decided independently by each platform.'
    },
    fr:{
      hero:'Une vidéo. Plusieurs futurs.',
      heroText:'Importez un original, choisissez ×3 ou ×5 et créez plusieurs versions finales distinctes, chacune avec sa propre combinaison de changements visuels, audio et techniques.',
      workspace:'Transformez un original en plusieurs versions finales',workspaceSub:'Choisissez le nombre de versions. Video Uniquifier gère automatiquement la variation.',futureTag:'Conçu pour la prochaine décennie du contenu',pricing:'Faites aller plus loin chaque original',pricingSub:'Choisissez le niveau adapté à votre rythme. 1 seconde de chaque sortie générée utilise 1 crédit.',trial:'Vos vidéos gratuites sont utilisées. Choisissez une offre pour continuer à créer plusieurs versions de chaque import.',howTitle:'Un original peut devenir plusieurs versions finales',howText:'Votre idée reste la vôtre. Chaque sortie reçoit sa propre combinaison de cadre, mouvement, couleur, audio et traitement technique.',step1:'Importez votre original',step1Text:'Choisissez une vidéo que vous possédez ou êtes autorisé à utiliser.',step2:'Choisissez ×1–×5',step2Text:'Créez une ou plusieurs versions séparées à partir de la même source.',step3:'Utilisez chaque version',step3Text:'Publiez les versions finales là où elles correspondent à votre stratégie.',faqFutureQ:'Pourquoi créer plusieurs versions à partir d’un original ?',faqFutureA:'Une seule idée peut servir plusieurs opportunités de publication. Video Uniquifier crée des sorties finales séparées avec différentes combinaisons de réglages visuels, audio et techniques.',faq60Q:'Puis-je utiliser des vidéos de plus de 60 secondes ?',faq60A:'Oui. Le flux de travail fonctionne aussi avec des vidéos de 60 secondes ou plus. Le temps de traitement dépend de la durée, de la qualité de sortie et des performances de l’appareil.',faqChannelsQ:'Puis-je publier différentes versions sur mes différents canaux ?',faqChannelsA:'Oui, si le contenu source vous appartient ou si vous avez les droits nécessaires. Chaque sortie est une version finale séparée. La diffusion, les recommandations et la monétisation restent décidées par chaque plateforme.'
    },
    ru:{
      hero:'Одно видео. Много будущих версий.',
      heroText:'Загрузите один оригинал, выберите ×3 или ×5 и получите несколько отдельных готовых версий — каждая со своей комбинацией визуальных, аудио и технических изменений.',
      workspace:'Превратите один оригинал в несколько готовых версий',workspaceSub:'Выберите количество вариантов. Video Uniquifier автоматически выполнит вариативную обработку.',futureTag:'Создано для следующего десятилетия контента',pricing:'Решите, насколько далеко пойдёт один оригинал',pricingSub:'Выберите уровень под свой объём работы. 1 секунда каждого готового результата = 1 кредит.',trial:'Бесплатные видео использованы. Выберите тариф и продолжайте создавать несколько версий из каждой загрузки.',howTitle:'Один оригинал может стать несколькими готовыми версиями',howText:'Ваша идея остаётся вашей. Каждая версия получает собственную комбинацию кадра, движения, цвета, аудио и технической обработки.',step1:'Загрузите оригинал',step1Text:'Выберите видео, которое принадлежит вам или на которое у вас есть права.',step2:'Выберите ×1–×5',step2Text:'Создайте одну или несколько отдельных версий из одного исходника.',step3:'Используйте каждую версию',step3Text:'Публикуйте готовые версии там, где они подходят вашей контент-стратегии.',faqFutureQ:'Зачем создавать несколько версий одного оригинала?',faqFutureA:'Одна идея может дать несколько возможностей для публикации. Video Uniquifier создаёт отдельные готовые результаты с разными комбинациями визуальных, аудио и технических изменений, чтобы не монтировать каждый вариант вручную.',faq60Q:'Можно ли использовать видео длиннее 60 секунд?',faq60A:'Да. Рабочий процесс подходит и для видео 60+ секунд, и для более коротких роликов. Время обработки зависит от длительности, выбранного качества и мощности устройства.',faqChannelsQ:'Можно ли публиковать разные версии в разных каналах?',faqChannelsA:'Да, если исходный контент принадлежит вам или у вас есть права на его использование. Каждый результат — отдельная готовая версия. Распространение, рекомендации и монетизация всё равно определяются каждой платформой самостоятельно.'
    },
    uk:{
      hero:'Одне відео. Багато майбутніх версій.',
      heroText:'Завантажте один оригінал, оберіть ×3 або ×5 та отримайте кілька окремих готових версій — кожна зі своєю комбінацією візуальних, аудіо й технічних змін.',
      workspace:'Перетворіть один оригінал на кілька готових версій',workspaceSub:'Оберіть кількість варіантів. Video Uniquifier автоматично виконає варіативну обробку.',futureTag:'Створено для наступного десятиліття контенту',pricing:'Вирішіть, наскільки далеко піде один оригінал',pricingSub:'Оберіть рівень під свій обсяг роботи. 1 секунда кожного готового результату = 1 кредит.',trial:'Безкоштовні відео використано. Оберіть тариф і продовжуйте створювати кілька версій із кожного завантаження.',howTitle:'Один оригінал може стати кількома готовими версіями',howText:'Ваша ідея залишається вашою. Кожна версія отримує власну комбінацію кадру, руху, кольору, аудіо й технічної обробки.',step1:'Завантажте оригінал',step1Text:'Оберіть відео, яке належить вам або на яке ви маєте права.',step2:'Оберіть ×1–×5',step2Text:'Створіть одну або кілька окремих версій з одного джерела.',step3:'Використовуйте кожну версію',step3Text:'Публікуйте готові версії там, де вони відповідають вашій контент-стратегії.',faqFutureQ:'Навіщо створювати кілька версій одного оригіналу?',faqFutureA:'Одна ідея може дати кілька можливостей для публікації. Video Uniquifier створює окремі готові результати з різними комбінаціями візуальних, аудіо й технічних змін.',faq60Q:'Чи можна використовувати відео довше 60 секунд?',faq60A:'Так. Робочий процес підходить і для відео 60+ секунд, і для коротших роликів. Час обробки залежить від тривалості, якості та потужності пристрою.',faqChannelsQ:'Чи можна публікувати різні версії в різних каналах?',faqChannelsA:'Так, якщо вихідний контент належить вам або ви маєте права на його використання. Кожен результат — окрема готова версія. Поширення, рекомендації та монетизацію кожна платформа визначає самостійно.'
    }
  };
  const tx=copy[locale]||copy.en;
  const plans={
    basic:{name:'Essential',credits:'750',short15:'≈ 50 × 15-sec outputs',short30:'or 25 × 30-sec outputs',micro:'Up to 50 technical micro-adjustment options',variants:'Up to 5 variations',access:'Gentle · 720p · 9:16 / 16:9'},
    pro:{name:'Pro',credits:'2,250',short15:'≈ 150 × 15-sec outputs',short30:'or 75 × 30-sec outputs',micro:'Up to 100 advanced micro-adjustment options',variants:'Up to 10 variations',access:'Gentle + Balance · 1080p · 9:16 / 16:9'},
    business:{name:'Business',credits:'15,000',short15:'≈ 1,000 × 15-sec outputs',short30:'or 500 × 30-sec outputs',micro:'Up to 150 full-pipeline adjustment options',variants:'Up to 15 variations',access:'Gentle + Balance + Dynamic · 4K · 9:16 / 16:9'}
  };

  function goPlans(){
    if(window.VideoVariatorUI?.showView){window.VideoVariatorUI.showView('plans');return;}
    document.querySelector('.navBtn[data-view="plans"]')?.click();
  }

  function polishPositioning(){
    document.title='Video Uniquifier';
    const brand=document.querySelector('.brand');
    if(brand){const mark=brand.querySelector('.brandMark'),name=brand.querySelector('b');if(mark)mark.textContent='VU';if(name)name.textContent='Video Uniquifier';}
    document.querySelectorAll('.topTitle .eyebrow').forEach(el=>el.textContent='VIDEO UNIQUIFIER');
    const hero=$('dashboardView')?.querySelector('.hero');
    if(hero){
      const pill=hero.querySelector('.pill');if(pill)pill.textContent=tx.futureTag;
      const title=$('heroTitle');if(title)title.textContent=tx.hero;
      const p=title?.nextElementSibling;if(p)p.textContent=tx.heroText;
    }
    const section=$('dashboardView')?.querySelector('.workspace .sectionHead');
    if(section){const h3=section.querySelector('h3'),p=section.querySelector('p');if(h3)h3.textContent=tx.workspace;if(p)p.textContent=tx.workspaceSub;}
  }

  function renameBasicDisplay(){
    ['currentPlan','profilePlan','planLabel','planAccessHint'].forEach(id=>{
      const el=$(id);if(!el)return;
      if(el.textContent.includes('Basic'))el.textContent=el.textContent.replaceAll('Basic','Essential');
    });
    document.querySelectorAll('.variantLockNote').forEach(el=>{if(el.textContent.includes('Basic'))el.textContent=el.textContent.replaceAll('Basic','Essential');});
  }

  function decoratePricing(){
    const hero=document.querySelector('#plansView .pricingHero');
    if(hero){
      const offer=$('introOffer');if(offer)offer.hidden=true;
      const h2=hero.querySelector('h2');if(h2)h2.textContent=tx.pricing;
      const p=hero.querySelector('p');if(p)p.textContent=tx.pricingSub;
    }

    document.querySelectorAll('.priceCard').forEach(card=>{
      const button=card.querySelector('.planBtn');const id=button?.dataset.plan;const plan=plans[id];if(!plan)return;
      const name=card.querySelector('.planName');if(name)name.textContent=plan.name;
      const creditP=card.querySelector('p');if(creditP)creditP.innerHTML=`<strong>${plan.credits}</strong> credits`;
      const unit=card.querySelector('.planUnit');if(unit)unit.textContent=plan.access;
      if(button)button.textContent=`Choose ${plan.name}`;
      let benefits=card.querySelector('.planBenefits');
      if(!benefits){benefits=document.createElement('div');benefits.className='planBenefits';(unit||creditP)?.before(benefits);}
      benefits.innerHTML=`<span class="planOutputExample"><b>${plan.short15}</b><small>${plan.short30}</small></span><span>✓ ${plan.micro}</span><span>✓ ${plan.variants}</span>`;
    });

    const guarantee=document.querySelector('#plansView .guarantee');
    if(guarantee){
      guarantee.classList.add('billingNote');
      guarantee.innerHTML='<div class="guaranteeIcon">✓</div><div><b>Simple monthly billing</b><p>Credits are based on generated video duration. Manage your subscription from Profile & Settings.</p></div>';
    }
  }

  function addHowItWorks(){
    const view=$('faqView');const list=view?.querySelector('.faqList');if(!view||!list||$('howItWorks'))return;
    const block=document.createElement('section');block.id='howItWorks';block.className='howItWorks';
    block.innerHTML=`<div class="howHead"><span class="eyebrow">THE NEW WORKFLOW</span><h3>${tx.howTitle}</h3><p>${tx.howText}</p></div><div class="howSteps"><article><b>1</b><strong>${tx.step1}</strong><span>${tx.step1Text}</span></article><article><b>2</b><strong>${tx.step2}</strong><span>${tx.step2Text}</span></article><article><b>3</b><strong>${tx.step3}</strong><span>${tx.step3Text}</span></article></div>`;
    view.insertBefore(block,list);
  }

  function updateFaq(){
    const list=$('faqView')?.querySelector('.faqList');if(!list)return;
    list.querySelectorAll('details').forEach(item=>{
      const summary=item.querySelector('summary');const p=item.querySelector('p');if(!summary||!p)return;
      if(summary.textContent.includes('processing modes'))p.textContent='Essential includes Gentle. Pro includes Gentle and Balance. Business unlocks Gentle, Balance and Dynamic.';
      if(summary.textContent.includes('quality'))p.textContent='Essential outputs at 720p, Pro at 1080p and Business at 4K. Both 9:16 and 16:9 are supported.';
      if(summary.textContent.includes('credits work'))p.textContent='1 second of each generated output uses 1 credit. A 15-second source rendered into 2 variations uses about 30 credits because two 15-second outputs are created.';
    });
    if(list.querySelector('[data-product-faq="micro"]'))return;
    const extra=[
      ['future',tx.faqFutureQ,tx.faqFutureA],
      ['60plus',tx.faq60Q,tx.faq60A],
      ['channels',tx.faqChannelsQ,tx.faqChannelsA],
      ['micro','What are micro-adjustments?','They are small technical changes across frame and timing, motion, color, audio and file structure. The plan number describes the size of the available adjustment library; each output uses its own combination rather than applying every option at once.'],
      ['plans','What is the difference between Essential, Pro and Business?','Essential provides up to 50 technical adjustment options and up to 5 variations. Pro expands the library to 100 options and up to 10 variations. Business provides the broadest library with up to 150 options and up to 15 variations.'],
      ['examples','How many videos do my credits cover?','As an example, 750 credits is about 50 outputs of 15 seconds or 25 outputs of 30 seconds. 2,250 credits is about 150 outputs of 15 seconds or 75 outputs of 30 seconds. 15,000 credits is about 1,000 outputs of 15 seconds or 500 outputs of 30 seconds.']
    ];
    extra.forEach(([key,title,text])=>{const d=document.createElement('details');d.className='card';d.dataset.productFaq=key;d.innerHTML=`<summary>${title}</summary><p>${text}</p>`;list.prepend(d);});
  }

  function makeTrialUpsell(){
    const workspace=document.querySelector('.workspace');if(!workspace||$('trialCompleteUpsell'))return;
    const box=document.createElement('section');box.id='trialCompleteUpsell';box.className='trialCompleteUpsell';box.hidden=true;
    box.innerHTML=`<span class="pill accent">Free trial complete</span><h3>Choose a plan to keep creating</h3><p>${tx.trial}</p><div class="trialPlanGrid"></div><button type="button" class="ghostBtn trialCompareBtn">Compare all plan details</button>`;
    const grid=box.querySelector('.trialPlanGrid');
    ['basic','pro','business'].forEach(id=>{const p=plans[id];const b=document.createElement('button');b.type='button';b.className='trialPlanMini';b.dataset.plan=id;b.innerHTML=`<strong>${p.name}</strong><span>${id==='basic'?'$9':id==='pro'?'$24':'$99'} / mo</span><small>${p.micro.replace('Up to ','')}</small>`;b.addEventListener('click',goPlans);grid.appendChild(b);});
    box.querySelector('.trialCompareBtn').addEventListener('click',goPlans);
    workspace.appendChild(box);
  }

  function syncTrialUpsell(){
    const workspace=document.querySelector('.workspace'),box=$('trialCompleteUpsell');if(!workspace||!box)return;
    const plan=($('currentPlan')?.textContent||'').toLowerCase();
    const remaining=Number(($('remainingCount')?.textContent||'').replace(/[^0-9.-]/g,''));
    const trial=plan.includes('trial')||plan.includes('free');
    const exhausted=trial&&Number.isFinite(remaining)&&remaining<=0;
    box.hidden=!exhausted;
    workspace.classList.toggle('trialComplete',exhausted);
  }

  function observeDisplay(){
    ['currentPlan','profilePlan','planLabel','planAccessHint','remainingCount'].forEach(id=>{const el=$(id);if(!el)return;new MutationObserver(()=>{renameBasicDisplay();syncTrialUpsell();}).observe(el,{childList:true,characterData:true,subtree:true});});
  }

  function init(){
    polishPositioning();decoratePricing();addHowItWorks();updateFaq();makeTrialUpsell();renameBasicDisplay();syncTrialUpsell();observeDisplay();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
