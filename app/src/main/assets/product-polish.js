(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const plans={
    basic:{name:'Essential',credits:'750',short15:'≈ 50 × 15-sec outputs',short30:'or 25 × 30-sec outputs',micro:'Up to 50 technical micro-adjustment options',variants:'Up to 5 variations',access:'Gentle · 720p · 9:16 / 16:9'},
    pro:{name:'Pro',credits:'2,250',short15:'≈ 150 × 15-sec outputs',short30:'or 75 × 30-sec outputs',micro:'Up to 100 advanced micro-adjustment options',variants:'Up to 10 variations',access:'Gentle + Balance · 1080p · 9:16 / 16:9'},
    business:{name:'Business',credits:'15,000',short15:'≈ 1,000 × 15-sec outputs',short30:'or 500 × 30-sec outputs',micro:'Up to 150 full-pipeline adjustment options',variants:'Up to 15 variations',access:'Gentle + Balance + Dynamic · 4K · 9:16 / 16:9'}
  };

  function goPlans(){
    if(window.VideoVariatorUI?.showView){window.VideoVariatorUI.showView('plans');return;}
    document.querySelector('.navBtn[data-view="plans"]')?.click();
  }

  function renameBasicDisplay(){
    ['currentPlan','profilePlan','planLabel','planAccessHint'].forEach(id=>{
      const el=$(id);if(!el)return;
      if(el.textContent.includes('Basic'))el.textContent=el.textContent.replaceAll('Basic','Essential');
    });
  }

  function decoratePricing(){
    const hero=document.querySelector('#plansView .pricingHero');
    if(hero){
      const offer=$('introOffer');if(offer)offer.hidden=true;
      const h2=hero.querySelector('h2');if(h2)h2.textContent='Choose the level of variation that fits your workflow';
      const p=hero.querySelector('p');if(p)p.textContent='1 second of each generated output uses 1 credit. Every variation is billed by its final duration.';
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
    block.innerHTML='<div class="howHead"><span class="eyebrow">HOW IT WORKS</span><h3>Dozens of small technical changes, handled automatically</h3><p>Video Uniquifier rebuilds your output using small visual, audio and technical adjustments while keeping the original content recognizable to you.</p></div><div class="howSteps"><article><b>1</b><strong>Upload</strong><span>Choose your video and output settings.</span></article><article><b>2</b><strong>Technical variation</strong><span>The system combines frame, motion, color, audio and file-level adjustments.</span></article><article><b>3</b><strong>Download</strong><span>Each generated variation gets its own combination and is saved as a new output.</span></article></div>';
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
      ['micro','What are micro-adjustments?','They are small technical changes across frame and timing, motion, color, audio and file structure. The plan number describes the size of the available adjustment library; each output uses its own combination rather than applying every option at once.'],
      ['plans','What is the difference between Essential, Pro and Business?','Essential provides up to 50 technical adjustment options and up to 5 variations. Pro expands the library to 100 options and up to 10 variations. Business provides the broadest library with up to 150 options and up to 15 variations.'],
      ['examples','How many videos do my credits cover?','As an example, 750 credits is about 50 outputs of 15 seconds or 25 outputs of 30 seconds. 2,250 credits is about 150 outputs of 15 seconds or 75 outputs of 30 seconds. 15,000 credits is about 1,000 outputs of 15 seconds or 500 outputs of 30 seconds.']
    ];
    extra.forEach(([key,title,text])=>{const d=document.createElement('details');d.className='card';d.dataset.productFaq=key;d.innerHTML=`<summary>${title}</summary><p>${text}</p>`;list.prepend(d);});
  }

  function makeTrialUpsell(){
    const workspace=document.querySelector('.workspace');if(!workspace||$('trialCompleteUpsell'))return;
    const box=document.createElement('section');box.id='trialCompleteUpsell';box.className='trialCompleteUpsell';box.hidden=true;
    box.innerHTML='<span class="pill accent">Free trial complete</span><h3>Choose a plan to keep creating</h3><p>Your two free source videos are used. Pick a plan below to see the full comparison.</p><div class="trialPlanGrid"></div><button type="button" class="ghostBtn trialCompareBtn">Compare all plan details</button>';
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
    decoratePricing();addHowItWorks();updateFaq();makeTrialUpsell();renameBasicDisplay();syncTrialUpsell();observeDisplay();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
