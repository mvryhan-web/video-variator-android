/* New Pricing page — owner-approved visual placement, server-authoritative prices and purchases.
 * Never use proposed marketing credits or bonus amounts in any checkout payload. */
import {validPlanPrice,validToolLimit,validLifetimeCurrency,validAiPack,aiCheckoutMode,checkoutErrorMessage} from './ai-pricing-display.js';
const cdn='media/pricing/';
// Owner D23 2026-11-03: owner EXPLICITLY reapproved these original twelve image URLs.
// New approval supersedes the earlier six-asset removal. Do not substitute images.
const originalOwnerCdn='https://d2ol7oe51mr4n9.cloudfront.net/user_3DohHzQ92OwE6TBQr5M2fYm2CwS/';
const approvedArtVersion='owner-original-cdn-20261103-v6';
const approvedPath=key=>cdn+art[key]+'?v='+approvedArtVersion;
const art={
 trial:'d72f2da8-9e73-4110-abc5-c743032631fd.png',
 basic:'56338ba4-aba2-4b0d-bbb7-a2f537294937.png',
 pro:'e6d706ae-d1a0-4db9-9a42-1e3d15cdc4ee.png',
 business:'82c0702f-67cc-4d93-acdb-68a45937a454.png',
 lifetime:'a3417cc0-5586-4f67-a98d-4019a6524dff.png',
 hero:'fa2c9a57-3fe7-4a2c-8123-7da568cabe10.png',
 credit1000:'d5b13a37-38fb-4c49-9d52-e63e86f69bd4.png',
 credit10000:'45c92ba3-9198-499a-b718-96670193cdf9.png',
 credit100000:'529567d2-78ae-4a59-a9a5-6758390f1957.png',
 credit1000000:'77fcf2c1-e659-4ca6-98d3-74d13a275c04.png',
 credit10000000:'bb87cfda-d36e-4aee-8177-e0b6903e9dfe.png',
 creditHero:'e5506ef4-b0a2-412d-a8b7-6e3108f80761.png'
};
Object.freeze(art);
const root=document.documentElement;
// Local copies avoid the old remote-CDN image loss. If a specific local file
// fails, only the ORIGINAL owner-approved CDN file with the SAME identifier
// may be tried. No replacement images and no silent art swaps.
for (const [key, cssVar] of [['hero','--price-hero-art'],['creditHero','--price-credit-hero-art']]) {
 const local=approvedPath(key);
 root.style.setProperty(cssVar,'url("'+local+'")');
 const probe=new Image();
 probe.onerror=()=>root.style.setProperty(cssVar,'url("'+originalOwnerCdn+art[key]+'")');
 probe.src=local;
}
const byId=id=>document.getElementById(id);
const numeral=new Intl.NumberFormat('en-US');
const money=(value,currency='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:Number.isInteger(value)?0:2}).format(value);
const node=(tag,cls,copy)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(copy!==undefined)el.textContent=copy;return el;};
const img=key=>{const i=node('img','price-art');
 i.src=approvedPath(key);i.alt='';i.loading='lazy';i.decoding='async';
 let fallbackTried=false;
 i.onerror=()=>{
  if(fallbackTried){i.onerror=null;return;}
  fallbackTried=true;
  i.src=originalOwnerCdn+art[key]; // same ORIGINAL image, never a substitute
 };
 return i;
};
const message=(id,copy)=>{byId(id).textContent=copy;};
const token=()=>{try{return localStorage.getItem('vv_token')||'';}catch{return '';}};
const isValidCheckoutURL=u=>{try{const x=new URL(u);return x.protocol==='https:'&&!x.port&&!x.username&&!x.password&&['checkout.stripe.com','buy.stripe.com'].includes(x.hostname);}catch{return false;}};
async function api(path,options={}){
 const response=await fetch(path,{...options,cache:'no-store',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(token()?{Authorization:'Bearer '+token()}:{}),...(options.headers||{})}});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body.error||'PRICING_UNAVAILABLE');
 return body;
}
const verifiedQuality={
 basic:[['▣','750 tool credits / month'],['⊞','Up to 5 variants'],['⚙','Gentle mode'],['▣','720p quality'],['✓','Included Basic tools']],
 pro:[['▣','2,250 tool credits / month'],['⊞','Up to 10 variants'],['⚙','Gentle + Balance modes'],['▣','1080p quality'],['✓','Included Pro tools']],
 business:[['▣','15,000 tool credits / month'],['⊞','Up to 15 variants'],['⚙','Gentle, Balance + Dynamic'],['▣','4K quality'],['✓','Included Business tools']],
 lifetime:[['▣','Tool credits: see current terms'],['⊞','Up to 15 variants'],['⚙','Gentle, Balance + Dynamic'],['▣','Up to 4K quality'],['✓','Included Lifetime Tools']]
};
const sharedAccess=[
 ['✓','Video Uniquifier and tools included in this plan'],
 ['✓','Canvas workspace; AI generation requires paid credits'],
 ['✓','Explore the AI model catalog (availability varies)'],
 ['✓','Watermark-free Video Uniquifier exports'],
 ['✓','One account for your plan, credits and history'],
 ['✓','AI wallet and prepaid packages are separate']
];
const monthlyDetails=[['✓','Monthly subscription; manage in your account']];
const planned=[
 {key:'trial',name:'Trial',suffix:'one time',label:'Start Trial',summary:'3-day trial pass for DeepSyQ tools',
  benefits:[['✓','3-day trial pass for DeepSyQ tools'],['✓','100 tool processing credits included'],['✓','One-time payment: no automatic renewal'],['✓','Explore the Canvas workspace; paid AI requires credits'],['✓','Watermark-free exports during trial'],['✓','One account for your plan, credits and history']],proposed:false},
 {key:'basic',name:'Basic',suffix:'/ month',label:'Choose Basic',summary:'For everyday video variations and essential tools',
  benefits:[...verifiedQuality.basic,...sharedAccess,...monthlyDetails]},
 {key:'pro',name:'Pro',suffix:'/ month',label:'Choose Pro',summary:'For regular creators needing higher quality and more variants',
  benefits:[...verifiedQuality.pro,...sharedAccess,...monthlyDetails]},
 {key:'business',name:'Business',suffix:'/ month',label:'Choose Business',summary:'For larger video workloads and all supported variation modes',
  benefits:[...verifiedQuality.business,...sharedAccess,...monthlyDetails]},
 {key:'lifetime',name:'Lifetime',suffix:'one time',label:'Choose Lifetime',summary:'One-time access to the included tools',
  benefits:[...verifiedQuality.lifetime,...sharedAccess,['✓','One-time purchase: no monthly plan renewal']]}
];
let planCheckoutPending=false,creditCheckoutPending=false;
let toolBillingConfigured=false,googleAuthClientId='',googleInitialized=false,authReturnFocus=null;
let billingPeriod='monthly',latestPlanConfig=null;
const annualPlanKeys=new Set(['basic','pro','business']);
const annualQuote=amount=>{
 // Display estimate only; there is NO server-authorized annual checkout route.
 const monthlyCents=Math.round(amount*100);
 const equivalentCents=Math.round(monthlyCents*0.8);
 return {monthly:equivalentCents/100,yearly:equivalentCents*12/100};
};
const annualMoney=amount=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(amount);
function syncBillingPeriod(){
 const monthly=byId('priceBillingMonthly'),yearly=byId('priceBillingYearly'),promo=byId('priceBillingPromo');
 const isMonthly=billingPeriod==='monthly';
 monthly.classList.toggle('is-active',isMonthly);
 yearly.classList.toggle('is-active',!isMonthly);
 monthly.setAttribute('aria-pressed',String(isMonthly));
 yearly.setAttribute('aria-pressed',String(!isMonthly));
 promo.replaceChildren();
 promo.append(node('strong','',isMonthly?'AI Credits Sold Separately':'Save 20%'));
 promo.append(node('small','',isMonthly?'Optional AI credit packs are separate from tool plan credits':'Yearly prices are estimates; annual checkout is not enabled'));
}
for(const [id,period] of [['priceBillingMonthly','monthly'],['priceBillingYearly','yearly']]){
 byId(id).addEventListener('click',()=>{
  if(billingPeriod===period)return;
  billingPeriod=period;
  syncBillingPeriod();
  renderPlans(latestPlanConfig);
 });
}

const creditRequestIds=new Map();
let accountEpoch=0;
window.addEventListener('storage',event=>{if(event.key==='vv_token'||event.key===null){accountEpoch++;creditRequestIds.clear();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){accountEpoch++;}});
window.addEventListener('pagehide',()=>{accountEpoch++;});
const paymentScope=()=>({token:token(),epoch:accountEpoch});
const current=scope=>scope.token===token()&&scope.epoch===accountEpoch&&!document.hidden;
/* Minimal mobile carousel; monthly/yearly selection retains the current card. */
const planTrack=byId('planCards');
const planPrev=byId('pricePlanPrev'),planNext=byId('pricePlanNext'),planPosition=byId('pricePlanPosition');
function planCarouselIndex(){
 const cards=Array.from(planTrack.children);
 if(!cards.length)return 0;
 const left=planTrack.getBoundingClientRect().left;
 let index=0,closest=Infinity;
 cards.forEach((card,i)=>{
  const delta=Math.abs(card.getBoundingClientRect().left-left);
  if(delta<closest){closest=delta;index=i;}
 });
 return index;
}
function refreshPlanCarousel(){
 const count=planTrack.children.length,index=planCarouselIndex();
 planPrev.disabled=index===0;
 planNext.disabled=index>=count-1;
 planPosition.textContent=count?(index+1)+' / '+count:'0 / 0';
}
function movePlanCarousel(direction){
 const cards=Array.from(planTrack.children);
 if(!cards.length)return;
 const index=Math.max(0,Math.min(cards.length-1,planCarouselIndex()+direction));
 const target=cards[index];
 const left=planTrack.scrollLeft+target.getBoundingClientRect().left-planTrack.getBoundingClientRect().left;
 planTrack.scrollTo({left,behavior:'smooth'});
}
planPrev.addEventListener('click',()=>movePlanCarousel(-1));
planNext.addEventListener('click',()=>movePlanCarousel(1));
planTrack.addEventListener('scroll',()=>requestAnimationFrame(refreshPlanCarousel),{passive:true});
window.addEventListener('resize',()=>requestAnimationFrame(refreshPlanCarousel));
function renderPlans(config){
 latestPlanConfig=config;
 toolBillingConfigured=config?.billingConfigured===true;
 googleAuthClientId=typeof config?.googleClientId==='string'?config.googleClientId:'';
 const host=byId('planCards');const previousPlan=planCarouselIndex();host.replaceChildren();
 for(const p of planned){
  const item=node('article','price-plan price-'+p.key);
  const picture=node('div','price-plan-picture');picture.append(img(p.key)); // exact original approved artwork
  if(p.key==='lifetime')picture.append(node('span','price-best','♛ BEST VALUE'));
  const body=node('div','price-plan-body');
  const heading=node('h3','price-plan-name',p.name);heading.id='plan-'+p.key;
  const price=node('div','price-plan-price');
  const currentPlan=config?.plans?.[p.key];
  const amount=validPlanPrice(currentPlan);
  const currency=p.key==='lifetime'?validLifetimeCurrency(currentPlan):'USD';
  const verified=!p.proposed&&amount!==null&&!!currency;
  const annualPreview=billingPeriod==='yearly'&&annualPlanKeys.has(p.key)&&verified;
  const yearly=annualPreview?annualQuote(amount):null;
  price.append(node('strong','',p.proposed?'$0.99':verified?(annualPreview?annualMoney(yearly.monthly):money(amount,currency)):'Price unavailable'));
  price.append(node('small','',p.proposed?'proposed · one time':annualPreview?'/ month · billed yearly':p.suffix));
  const annualNote=annualPreview?node('p','price-annual-note',annualMoney(yearly.yearly)+' / year · estimate only; yearly checkout not available'):null;
  const summary=node('p','price-plan-summary',p.summary);
  const button=node('button','price-plan-action',p.proposed?'Check Trial availability':p.label);
  // The user can choose a configured plan to sign in even on a no-billing preview.
  // Trial remains disabled until owner-approved terms are actually configured.
  button.type='button';button.disabled=!p.proposed&&!verified;
  if(!p.proposed&&!verified)button.textContent='Price unavailable';
  button.addEventListener('click',()=>void checkoutPlan(p.key));
  const facts=node('div','price-plan-facts');
  const verifiedLimit=validToolLimit(currentPlan);
  facts.append(node('strong','',p.proposed?'Proposed introduction':p.key==='lifetime'?'Included lifetime tools':verifiedLimit===null?'Tool allowance not verified':numeral.format(verifiedLimit)+' tool credits / month'));
  facts.append(node('span','',p.proposed?'Credit quantity, duration and checkout still require approval.':'AI generation is billed separately through the verified AI wallet.'));
  const caption=node('p','price-feature-caption','Plan features');
  const list=node('ul','price-features');
  const benefitRows=p.proposed?p.benefits:p.benefits.map(([icon,copy],index)=>{
   if(index!==0)return[icon,copy];
   const limit=validToolLimit(currentPlan);
   if(p.key==='lifetime')return[icon,'Tool credits: see current terms'];
   return[icon,limit===null?'Tool allowance unavailable':numeral.format(limit)+' tool credits / month'];
  });
  for(const [icon,copy] of benefitRows){
   const li=node('li');
   const sym=node('span','price-feature-icon'+(icon==='✓'?' is-included':icon==='✕'?' is-excluded':icon==='ⓘ'?' is-info':''),icon);sym.setAttribute('aria-hidden','true');
   li.append(sym,node('span','',copy));list.append(li);
  }
  const note=node('p','price-plan-note',p.proposed?'$0.99 Trial: price and included credits are NOT active yet.':p.key==='lifetime'?'ⓘ Lifetime does not include unlimited paid AI generation; purchase AI credits separately.':!verified?'The server has not supplied a verified price.':'');
  body.append(heading,price);
  if(annualNote)body.append(annualNote);
  body.append(summary,button,facts,caption,list,note);
  item.setAttribute('aria-labelledby',heading.id);
  item.append(picture,body);host.append(item);
 }
 // Keep the selected tariff in view when switching Monthly / Yearly.
 if(window.matchMedia('(max-width:700px)').matches){
  requestAnimationFrame(()=>{
   const selected=host.children[Math.min(previousPlan,host.children.length-1)];
   if(selected)host.scrollLeft=selected.offsetLeft-host.firstElementChild.offsetLeft;
   refreshPlanCarousel();
  });
 }else refreshPlanCarousel();
 // No technical/preview banner above the cards; status appears only after a user action.
 message('pricingStatus','');
}
async function checkoutPlan(plan){
 if(!['trial','basic','pro','business','lifetime'].includes(plan)||planCheckoutPending)return;
 if(billingPeriod==='yearly'&&annualPlanKeys.has(plan)){
  // A displayed annual discount must never silently buy a monthly subscription.
  if(!token())openAuth();
  else message('pricingStatus','Yearly plans are a pricing preview only; annual checkout is not available. No payment was taken.');
  return;
 }
 
 const scope=paymentScope();
 if(!scope.token){openAuth();return;}
 if(!toolBillingConfigured){message('pricingStatus','Checkout is not yet available. No payment was taken.');return;}
 planCheckoutPending=true;message('pricingStatus','Opening secure checkout…');
 try{
  const d=await api('/api/billing/checkout',{method:'POST',body:JSON.stringify({plan})});
  if(!current(scope))return;
  if(!isValidCheckoutURL(d.url))throw new Error('UNSAFE_CHECKOUT_URL');
  location.assign(d.url);
 }catch(e){if(current(scope))message('pricingStatus','Checkout could not be confirmed. Check your account and try again. No payment is confirmed by this page.');}
 finally{planCheckoutPending=false;}
}
const creditOptions=[
 {credits:1000,bonus:200,price:10,image:'credit1000'},
 {credits:10000,bonus:3333,price:100,image:'credit10000'},
 {credits:100000,bonus:20000,price:1000,image:'credit100000'},
 {credits:1000000,bonus:200000,price:10000,image:'credit1000000'},
 {credits:10000000,bonus:2000000,price:100000,image:'credit10000000'}
];
function renderCredits(config){
 const host=byId('creditCards');host.replaceChildren();
 const serverPacks=Array.isArray(config?.packs)?config.packs.filter(validAiPack):[];
 const checkoutMode=aiCheckoutMode(config);
 // One readable section-wide disclosure replaces the repeated text inside each card.
 // The bonus values are illustrative; Stripe wallet settlement still grants pack.credits.
 let notice=byId('priceCreditDisclosure');
 if(!notice){
  notice=node('p','price-credit-disclosure',
   'Bonus and total figures are proposed, not active or included in checkout. Only verified base credits are granted after payment.');
  notice.id='priceCreditDisclosure';
  notice.setAttribute('role','note');
  host.before(notice);
 }
 for(const p of creditOptions){
  const serverPack=serverPacks.find(x=>x.credits===p.credits);
  const amount=serverPack?money(serverPack.amount/100,serverPack.currency.toUpperCase()):money(p.price);
  const valid=!!serverPack&&!!checkoutMode;
  const card=node('article','price-credit-card');
  card.append(img(p.image));
  const content=node('div','price-credit-content');
  card.setAttribute('aria-describedby','priceCreditDisclosure');
  // The existing card artwork stays visible above and below the centered metrics.
  // The base amount appears ONCE in its original top-left corner, above the inset.
  const info=node('div','price-credit-bonus price-credit-breakdown');
  for(const [label,number] of [
   ['Base',numeral.format(p.credits)],
   ['Bonus','+ '+numeral.format(p.bonus)],
   ['Total',numeral.format(p.credits+p.bonus)]
  ]){
   const segment=node('div','price-credit-segment');
   segment.append(node('span','price-credit-segment-label',label),
                  node('strong','price-credit-segment-value',number));
   info.append(segment);
  }
  const foot=node('div','price-credit-bottom');
  const badge=node('h3','price-credit-badge');
  badge.append(node('span','price-credit-badge-sparkle','✦'),
   node('span','price-credit-badge-count',numeral.format(p.credits)));
  const cost=node('strong','price-credit-price',amount);
  // Every visible AI-credit card opens the *existing* Deepsyq sign-in when logged out.
  // Availability and real checkout remain strictly server-authoritative.
  const button=node('button','price-credit-purchase',valid?(checkoutMode==='test'?'Stripe TEST checkout':'Purchase'):'Check availability');
  button.type='button';
  button.addEventListener('click',()=>{
   if(!token()){openAuth();return;}
   if(!valid){
    message('creditStatus',numeral.format(p.credits)+' AI credits are not available for checkout yet. No payment was taken.');
    return;
   }
   void checkoutCredit(serverPack);
  });
  foot.append(cost,button);
  // The upper-left badge restores the original credit count position.
  // Keep the approved background art, card colors and checkout behavior intact.
  content.append(badge,info,foot);
  card.append(content);host.append(card);
 }
}
async function checkoutCredit(pack){
 if(!validAiPack(pack)||creditCheckoutPending)return;
 const scope=paymentScope();
 if(!scope.token){openAuth();return;}
 const key=JSON.stringify([pack.sku,pack.credits,pack.amount,pack.currency]);
 if(!creditRequestIds.has(key))creditRequestIds.set(key,crypto.randomUUID());
 creditCheckoutPending=true;message('creditStatus','Opening secure Stripe checkout…');
 try{
  const d=await api('/api/ai-billing/checkout',{method:'POST',body:JSON.stringify({sku:pack.sku,requestId:creditRequestIds.get(key)})});
  if(!current(scope))return;
  if(!isValidCheckoutURL(d.url))throw new Error('UNSAFE_CHECKOUT_URL');
  location.assign(d.url);
 }catch(e){if(current(scope))message('creditStatus',checkoutErrorMessage(e.message));}
 finally{creditCheckoutPending=false;}
}

/* The same markup, localized auth-email.js form, and Google endpoint as Deepsyq Home.
   Pricing does not create a second identity system or store credentials. */
const authModal=byId('authModal');
function closeAuth(){
 if(authModal.hidden)return;
 authModal.hidden=true;
 authReturnFocus?.focus?.();
}
function openAuth(){
 if(!authModal)return;
 authReturnFocus=document.activeElement;
 authModal.hidden=false;
 requestAnimationFrame(()=>byId('emailAuthEmail')?.focus());
 initGoogle();
}
document.addEventListener('deepsyq:open-pricing-auth',openAuth);
document.querySelectorAll('[data-close-auth]').forEach(el=>el.addEventListener('click',closeAuth));
document.addEventListener('keydown',event=>{
 if(authModal.hidden)return;
 if(event.key==='Escape'){event.preventDefault();closeAuth();return;}
 if(event.key!=='Tab')return;
 const focusables=[...authModal.querySelectorAll('button:not(:disabled),input:not(:disabled)')]
  .filter(el=>el.getClientRects().length>0&&!el.hidden);
 if(!focusables.length)return;
 const first=focusables[0],last=focusables.at(-1);
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
function initGoogle(){
 if(googleInitialized)return;
 if(!googleAuthClientId){
  const fallback=byId('googleFallback');
  if(fallback)fallback.textContent='Google sign-in is unavailable here. Use email below.';
  return;
 }
 if(!window.google?.accounts?.id){
  const fallback=byId('googleFallback');
  if(fallback)fallback.textContent='Google is still loading. You can use email below.';
  return;
 }
 googleInitialized=true;
 window.google.accounts.id.initialize({client_id:googleAuthClientId,callback:async({credential})=>{
  try{
   const data=await api('/api/auth/google',{method:'POST',body:JSON.stringify({credential})});
   if(typeof data.token!=='string'||!data.token)throw Error('INVALID_SESSION');
   localStorage.setItem('vv_token',data.token);
   if(data.newAccount===true)localStorage.setItem('deepsyq_onboarding_pending','1');
   location.reload();
  }catch{
   message('pricingStatus','Google sign-in could not complete. Please try again.');
  }
 }});
 const target=byId('googleButton');target.replaceChildren();
 window.google.accounts.id.renderButton(target,{theme:'outline',size:'large',width:280,text:'continue_with'});
}
window.addEventListener('load',()=>{if(!authModal.hidden)initGoogle();});

const fallbackPlanConfig={
 billingConfigured:false,googleClientId:'',
 plans:{
  basic:{price:9,limit:750},pro:{price:24,limit:2250},
  business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}
 }
};
async function initialize(){
 let planConfig=null,creditConfig=null;
 try{planConfig=await api('/api/config');}catch{planConfig=fallbackPlanConfig;}
 renderPlans(planConfig);
 try{creditConfig=await api('/api/ai-billing/config');}catch{ /* Preview-only server or unavailable endpoint */ }
 renderCredits(creditConfig);
}
void initialize();
