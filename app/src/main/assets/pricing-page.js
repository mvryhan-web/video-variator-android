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
const planned=[
 {key:'trial',name:'Trial',suffix:'one time',label:'Start Trial',summary:'Introductory offer — not yet available',benefits:[['▣','Included credits: to be confirmed'],['⊞','Variants: to be confirmed'],['⚙','Modes: to be confirmed'],['▣','Quality: to be confirmed'],['◇','Terms and eligibility pending'],['♧','No checkout available']],proposed:true},
 {key:'basic',name:'Basic',suffix:'/ month',label:'Choose Basic',benefits:[...verifiedQuality.basic,['♧','Personal tools access'],['✉','Support: see terms']]},
 {key:'pro',name:'Pro',suffix:'/ month',label:'Choose Pro',benefits:[...verifiedQuality.pro,['♧','Commercial terms apply'],['✉','Support: see terms']]},
 {key:'business',name:'Business',suffix:'/ month',label:'Choose Business',benefits:[...verifiedQuality.business,['♧','Team usage: see terms'],['✉','Support: see terms']]},
 {key:'lifetime',name:'Lifetime',suffix:'one time',label:'Choose Lifetime',benefits:[...verifiedQuality.lifetime,['♧','Permanent included tools'],['∞','AI generation credits sold separately']]}
];
let planCheckoutPending=false,creditCheckoutPending=false;
const creditRequestIds=new Map();
let accountEpoch=0;
window.addEventListener('storage',event=>{if(event.key==='vv_token'||event.key===null){accountEpoch++;creditRequestIds.clear();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){accountEpoch++;}});
window.addEventListener('pagehide',()=>{accountEpoch++;});
const paymentScope=()=>({token:token(),epoch:accountEpoch});
const current=scope=>scope.token===token()&&scope.epoch===accountEpoch&&!document.hidden;
function renderPlans(config){
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
  const button=node('button','price-plan-action',p.proposed?'Not available yet':p.label);
  button.type='button';button.disabled=p.proposed||!config?.billingConfigured||!verified;
  if(button.disabled&&!p.proposed)button.textContent='Checkout unavailable';
  button.addEventListener('click',()=>void checkoutPlan(p.key));
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
  body.append(heading,price,button,list,note);
  item.setAttribute('aria-labelledby',heading.id);
  item.append(picture,body);host.append(item);
 }
 message('pricingStatus',config?.billingConfigured?'Tool prices verified from current configuration.':'Design preview: tool checkout is not activated. Prices shown are server-configured; Trial is only proposed.');
}
async function checkoutPlan(plan){
 if(!['basic','pro','business','lifetime'].includes(plan)||planCheckoutPending)return;
 const scope=paymentScope();
 if(!scope.token){message('pricingStatus','Sign in on Deepsyq Home to choose a paid tool plan.');return;}
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
 if(!scope.token){message('creditStatus','Please sign in first on Deepsyq Home, then return to purchase credits.');return;}
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
async function initialize(){
 let planConfig=null,creditConfig=null;
 try{planConfig=await api('/api/config');}catch{ /* Fail closed */ }
 renderPlans(planConfig);
 try{creditConfig=await api('/api/ai-billing/config');}catch{ /* Preview-only server or unavailable endpoint */ }
 renderCredits(creditConfig);
}
void initialize();
