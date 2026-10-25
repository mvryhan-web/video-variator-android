/* New Pricing page — owner-approved visual placement, server-authoritative prices and purchases.
 * Never use proposed marketing credits or bonus amounts in any checkout payload. */
import {validPlanPrice,validToolLimit,validLifetimeCurrency,validAiPack,aiCheckoutMode,checkoutErrorMessage} from './ai-pricing-display.js';
const cdn='https://d2ol7oe51mr4n9.cloudfront.net/user_3DohHzQ92OwE6TBQr5M2fYm2CwS/';
const art={
 trial:'d72f2da8-9e73-4110-abc5-c743032631fd.png',
 basic:'56338ba4-aba2-4b0d-bbb7-a2f537294937.png',
 pro:'e6d706ae-d1a0-4db9-9a42-1e3d15cdc4ee.png',
 business:'82c0702f-67cc-4d93-acdb-68a45937a454.png',
 lifetime:'a3417cc0-5586-4f67-a98d-4019a6524dff.png',
 credit1000:'d5b13a37-38fb-4c49-9d52-e63e86f69bd4.png',
 credit10000:'45c92ba3-9198-499a-b718-96670193cdf9.png',
 credit100000:'529567d2-78ae-4a59-a9a5-6758390f1957.png',
 credit1000000:'77fcf2c1-e659-4ca6-98d3-74d13a275c04.png',
 credit10000000:'bb87cfda-d36e-4aee-8177-e0b6903e9dfe.png',
 hero:'fa2c9a57-3fe7-4a2c-8123-7da568cabe10.png',
 creditHero:'e5506ef4-b0a2-412d-a8b7-6e3108f80761.png'
};
const root=document.documentElement;
root.style.setProperty('--price-hero-art','url("'+cdn+art.hero+'")');
root.style.setProperty('--price-credit-hero-art','url("'+cdn+art.creditHero+'")');
const byId=id=>document.getElementById(id);
const numeral=new Intl.NumberFormat('en-US');
const money=(value,currency='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:Number.isInteger(value)?0:2}).format(value);
const node=(tag,cls,copy)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(copy!==undefined)el.textContent=copy;return el;};
const img=key=>{const i=node('img','price-art');i.src=cdn+art[key];i.alt='';i.loading='lazy';i.decoding='async';i.onerror=()=>i.classList.add('price-art-unavailable');return i;};
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
 basic:[['▣','750 tool credits / month'],['⊞','Up to 5 variants'],['⚙','Gentle mode'],['▣','720p quality'],['◇','Included Basic tools']],
 pro:[['▣','2,250 tool credits / month'],['⊞','Up to 10 variants'],['⚙','Gentle + Balance modes'],['▣','1080p quality'],['◇','Included Pro tools']],
 business:[['▣','15,000 tool credits / month'],['⊞','Up to 15 variants'],['⚙','Gentle, Balance + Dynamic'],['▣','4K quality'],['◇','Included Business tools']],
 lifetime:[['▣','Tool credits: see current terms'],['⊞','Up to 15 variants'],['⚙','Gentle, Balance + Dynamic'],['▣','Up to 4K quality'],['◇','Included Lifetime tools']]
};
const sharedAccess=[
 ['✓','Video Uniquifier and tools included in this plan'],
 ['✓','Canvas workspace; AI generation requires paid credits'],
 ['✓','Explore the AI model catalog (availability varies)'],
 ['◇','Watermark removal: check the relevant tool terms'],
 ['✓','One account for your plan, credits and history'],
 ['✓','AI wallet and prepaid packages are separate']
];
const monthlyDetails=[['✓','Monthly subscription; manage in your account']];
const planned=[
 {key:'trial',name:'Trial',suffix:'one time',label:'Start Trial',summary:'Introductory offer for new accounts — not yet active',
  benefits:[['◇','New-account eligibility: pending approval'],['◇','Credits and included access: to be confirmed'],['◇','Watermark removal: terms not approved'],['✓','Explore the Canvas workspace; paid AI requires credits'],['◇','Duration and renewal terms: not approved'],['◇','Trial checkout is not available']],proposed:true},
 {key:'basic',name:'Basic',suffix:'/ month',label:'Choose Basic',summary:'For everyday video variations and essential tools',
  benefits:[...verifiedQuality.basic,...sharedAccess,...monthlyDetails]},
 {key:'pro',name:'Pro',suffix:'/ month',label:'Choose Pro',summary:'For regular creators needing higher quality and more variants',
  benefits:[...verifiedQuality.pro,...sharedAccess,...monthlyDetails]},
 {key:'business',name:'Business',suffix:'/ month',label:'Choose Business',summary:'For larger video workloads and all supported variation modes',
  benefits:[...verifiedQuality.business,...sharedAccess,...monthlyDetails]},
 {key:'lifetime',name:'Lifetime',suffix:'one time',label:'Choose Lifetime',summary:'One-time access to the included tools',
  benefits:[...verifiedQuality.lifetime,...sharedAccess,['✓','One-time purchase: no monthly plan renewal'],['◇','Lifetime does not include unlimited paid AI generation']]}
];
let planCheckoutPending=false,creditCheckoutPending=false;
let toolBillingConfigured=false,googleAuthClientId='',googleInitialized=false,authReturnFocus=null;
const creditRequestIds=new Map();
let accountEpoch=0;
window.addEventListener('storage',event=>{if(event.key==='vv_token'||event.key===null){accountEpoch++;creditRequestIds.clear();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){accountEpoch++;}});
window.addEventListener('pagehide',()=>{accountEpoch++;});
const paymentScope=()=>({token:token(),epoch:accountEpoch});
const current=scope=>scope.token===token()&&scope.epoch===accountEpoch&&!document.hidden;
function renderPlans(config){
 toolBillingConfigured=config?.billingConfigured===true;
 googleAuthClientId=typeof config?.googleClientId==='string'?config.googleClientId:'';
 const host=byId('planCards');host.replaceChildren();
 for(const p of planned){
  const item=node('article','price-plan price-'+p.key);
  const picture=node('div','price-plan-picture');picture.append(img(p.key));
  if(p.key==='lifetime')picture.append(node('span','price-best','♛ BEST VALUE'));
  const body=node('div','price-plan-body');
  const heading=node('h3','price-plan-name',p.name);heading.id='plan-'+p.key;
  const price=node('div','price-plan-price');
  const currentPlan=config?.plans?.[p.key];
  const amount=validPlanPrice(currentPlan);
  const currency=p.key==='lifetime'?validLifetimeCurrency(currentPlan):'USD';
  const verified=!p.proposed&&amount!==null&&!!currency;
  price.append(node('strong','',p.proposed?'$0.99':verified?money(amount,currency):'Price unavailable'));
  price.append(node('small','',p.proposed?'proposed · one time':p.suffix));
  const summary=node('p','price-plan-summary',p.summary);
  const button=node('button','price-plan-action',p.proposed?'Not available yet':p.label);
  // The user can choose a configured plan to sign in even on a no-billing preview.
  // Trial remains disabled until owner-approved terms are actually configured.
  button.type='button';button.disabled=p.proposed||!verified;
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
   const sym=node('span','price-feature-icon',icon);sym.setAttribute('aria-hidden','true');
   li.append(sym,node('span','',copy));list.append(li);
  }
  const note=node('p','price-plan-note',p.proposed?'$0.99 Trial: price and included credits are NOT active yet.':!verified?'The server has not supplied a verified price.':'');
  body.append(heading,price,summary,button,facts,caption,list,note);
  item.setAttribute('aria-labelledby',heading.id);
  item.append(picture,body);host.append(item);
 }
 message('pricingStatus',config?.billingConfigured?'Tool prices verified from current configuration.':'Design preview: tool checkout is not activated. Prices shown are server-configured; Trial is only proposed.');
}
async function checkoutPlan(plan){
 if(!['basic','pro','business','lifetime'].includes(plan)||planCheckoutPending)return;
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
 for(const p of creditOptions){
  const serverPack=serverPacks.find(x=>x.credits===p.credits);
  const amount=serverPack?money(serverPack.amount/100,serverPack.currency.toUpperCase()):money(p.price);
  const valid=!!serverPack&&!!checkoutMode;
  const card=node('article','price-credit-card');
  card.append(img(p.image));
  const content=node('div','price-credit-content');
  const title=node('h3','price-credit-number','✦ '+numeral.format(p.credits));
  const info=node('div','price-credit-bonus');
  info.append(node('small','price-bonus-status','✦ Bonus credits · proposed, not included'));
  info.append(node('strong','price-bonus-title','General AI credits'));
  info.append(node('b','price-bonus-count','+ '+numeral.format(p.bonus)));
  info.append(node('small','price-bonus-desc','One-time top-up · added only after Stripe confirms payment'));
  const foot=node('div','price-credit-bottom');
  const cost=node('strong','price-credit-price',amount);
  const button=node('button','price-credit-purchase',valid?(checkoutMode==='test'?'Stripe TEST checkout':'Purchase'):'Purchase · soon');
  button.type='button';button.disabled=!valid;
  button.addEventListener('click',()=>{if(valid)void checkoutCredit(serverPack);});
  foot.append(cost,button);
  const disclosure=node('p','price-credit-note',serverPack?'Base package verified; bonus is not included.':'Package and price shown for design approval, not a live offer.');
  content.append(title,info,foot,disclosure);
  card.append(content);host.append(card);
 }
 message('creditStatus',checkoutMode?'Verified server packages are purchasable below. Proposed bonuses are not included.':'AI pack checkout is not available in this preview. All pictured pack prices and bonuses are proposals.');
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
 if(googleInitialized||!googleAuthClientId)return;
 if(!window.google?.accounts?.id)return;
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

async function initialize(){
 let planConfig=null,creditConfig=null;
 try{planConfig=await api('/api/config');}catch{ /* Fail closed */ }
 renderPlans(planConfig);
 try{creditConfig=await api('/api/ai-billing/config');}catch{ /* Preview-only server or unavailable endpoint */ }
 renderCredits(creditConfig);
}
void initialize();
