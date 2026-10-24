import {validPlanPrice,validToolLimit,validLifetimeCurrency,validAiPack,validWalletAmount,aiCheckoutMode,checkoutErrorMessage,approvedSubscriptionCredits,approvedGenerationEstimates} from './ai-pricing-display.js';
const $=id=>document.getElementById(id);
const token=()=>{try{return localStorage.getItem('vv_token')||'';}catch(_){return '';}};
let accountToken=token(),accountEpoch=0,pageSuspended=false,checkoutPending=null,needsRefresh=false;
const privateRequests=new Set(),checkoutRequests=new Map();
function clearPrivatePricing(){
 $('walletSection').hidden=true;
 for(const id of ['walletSummary','walletHistory'])$(id).replaceChildren();
 for(const id of ['walletStatus','welcomeStatus','aiStatus'])$(id).textContent='';
 $('welcomeCredits').hidden=true;$('welcomeTitle').textContent='Welcome AI credits';$('welcomeCopy').textContent='';
 $('claimWelcome').onclick=null;$('claimWelcome').disabled=true;
}
function invalidateAccount(rotated=false){
 accountEpoch++;for(const controller of privateRequests)controller.abort();privateRequests.clear();
 if(rotated)checkoutRequests.clear();checkoutPending=null;clearPrivatePricing();
}
function syncAccount(){const next=token();if(next===accountToken)return false;accountToken=next;invalidateAccount(true);needsRefresh=true;return true;}
function accountScope(){syncAccount();return {token:accountToken,epoch:accountEpoch};}
function currentAccount(scope){syncAccount();return !pageSuspended&&!document.hidden&&scope.token===accountToken&&scope.epoch===accountEpoch;}
function staleAccount(){return Error('STALE_PRICING_ACCOUNT');}
async function json(path,options={}){
 const privateCall=/\/api\/ai-wallet\/(balance|history|welcome)$/.test(path)||path==='/api/ai-billing/checkout';
 const scope=accountScope(),controller=privateCall?new AbortController():null;
 if(privateCall&&(!scope.token||!currentAccount(scope)))throw staleAccount();
 if(controller)privateRequests.add(controller);
 try{
  const r=await fetch(path,{...options,cache:'no-store',...(controller?{signal:controller.signal}:{}),headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(scope.token?{Authorization:'Bearer '+scope.token}:{})}});
  if(privateCall&&!currentAccount(scope))throw staleAccount();
  const d=await r.json().catch(()=>({}));if(privateCall&&!currentAccount(scope))throw staleAccount();
  if(!r.ok)throw Error(d.error||'REQUEST_FAILED');return d;
 }finally{if(controller)privateRequests.delete(controller);}
}
function refreshPrivatePricing(){if(pageSuspended||document.hidden)return;needsRefresh=false;void Promise.all([loadWallet(),loadWelcomeCredits()]);}
function checkAccount(){syncAccount();if(needsRefresh)refreshPrivatePricing();}
window.addEventListener('storage',event=>{if(event.key==='vv_token'||event.key===null)checkAccount();});
window.addEventListener('focus',checkAccount);
document.addEventListener('visibilitychange',()=>{if(document.hidden){invalidateAccount();needsRefresh=true;}else{syncAccount();refreshPrivatePricing();}});
window.addEventListener('pagehide',()=>{pageSuspended=true;invalidateAccount();needsRefresh=true;});
window.addEventListener('pageshow',event=>{pageSuspended=false;syncAccount();if(event.persisted||needsRefresh)refreshPrivatePricing();});
setInterval(checkAccount,250);
function money(amount,currency='USD'){return new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:Number.isInteger(amount)?0:2}).format(amount);}
function minor(amount,currency){return new Intl.NumberFormat('en-US',{style:'currency',currency:String(currency||'usd').toUpperCase()}).format(Number(amount||0)/100);}
function generationEstimateCopy(config,credits){const items=approvedGenerationEstimates(config,credits);if(!items.length)return '';return ' Approximate if spent entirely on one type at the current base rate: '+items.map(x=>x.count.toLocaleString()+' '+(x.kind==='image'?'image':'video')+' generation'+(x.count===1?'':'s')).join(' or ')+'. Model, quality, duration and output quantity can change credit usage.';}
function card(title,price,description,buttonText,onClick,{disabled=false,className=''}={}){const a=document.createElement('article');a.className='price-card '+className;const h=document.createElement('h3');h.textContent=title;const p=document.createElement('div');p.className='price';p.textContent=price;const d=document.createElement('p');d.textContent=description;const b=document.createElement('button');b.type='button';b.textContent=buttonText;b.disabled=disabled;b.onclick=onClick||(()=>{});a.append(h,p,d,b);return a;}
async function loadToolPlans(){
 try{
  const c=await json('/api/config'),subscriptionConfig=await json('/api/ai-billing/config').catch(()=>({})),root=$('toolPlans');
  root.replaceChildren();$('toolStatus').textContent='';
  for(const key of ['basic','pro','business']){
   const plan=c.plans?.[key];if(!plan)continue;
   const price=validPlanPrice(plan),limit=validToolLimit(plan);
   const toolDescription=limit===null?'Monthly allowance unavailable. Check your current plan details in your account.'
     :limit.toLocaleString()+' existing video-tool credits per month.';
   const monthlyAiCredits=approvedSubscriptionCredits(subscriptionConfig,key);
   const description=toolDescription+(monthlyAiCredits===null?'':
     ' + '+monthlyAiCredits.toLocaleString()+' AI-creation credits after each paid subscription invoice.'+generationEstimateCopy(subscriptionConfig,monthlyAiCredits));
   root.append(card(key[0].toUpperCase()+key.slice(1),
     price===null?'Price unavailable':money(price,'USD')+' / month',
     description,'View account',()=>location.assign('index.html#profile')));
  }
  const lifetime=c.plans?.lifetime;
  if(lifetime){
   const price=validPlanPrice(lifetime),currency=validLifetimeCurrency(lifetime);
   root.append(card('Lifetime',
     price===null||!currency?'Price unavailable':money(price,currency)+' once',
     'Permanent access to the existing tools covered by the Lifetime plan. This does not include unlimited AI-generation credits.',
     'View account',()=>location.assign('index.html#profile'),{className:'lifetime'}));
  }
  if(!root.children.length)$('toolStatus').textContent='Existing tool plan data is unavailable.';
 }catch(_){$('toolStatus').textContent='Existing tool plan data is unavailable.';}
}


function ledgerLabel(kind){return ({purchase:'Purchased credits',welcome_grant:'Welcome credits',reserve:'Reserved for generation',captured:'Generation charged',released:'Reservation released',refund:'Refund adjustment',owner_adjustment:'Owner adjustment'})[kind]||String(kind||'Wallet activity').replaceAll('_',' ');}
function signed(n){const x=Number(n||0);return x>0?'+'+x.toLocaleString():x.toLocaleString();}
async function loadWallet(){
 const scope=accountScope(),section=$('walletSection');if(!scope.token||pageSuspended||document.hidden){clearPrivatePricing();return;}
 try{
  const [balance,history]=await Promise.all([json('/api/ai-wallet/balance'),json('/api/ai-wallet/history')]);if(!currentAccount(scope))return;section.hidden=false;
  const totals=[validWalletAmount(balance.available),validWalletAmount(balance.reserved),validWalletAmount(balance.debt)];
  const root=$('walletSummary');root.replaceChildren();$('walletHistory').replaceChildren();
  if(totals.some(n=>n===null)){$('walletStatus').textContent='Current wallet totals could not be verified. Refresh or try again later.';return;}
  for(const [label,value,cls] of [['Available',totals[0],''],['Held',totals[1],''],['Debt',totals[2],totals[2]>0?'debt':'']]){const card=document.createElement('article');card.className='wallet-stat '+cls;const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value.toLocaleString();const u=document.createElement('small');u.textContent='AI credits';card.append(l,v,u);root.append(card);}
  const list=$('walletHistory');list.replaceChildren();for(const item of (history.items||[]).slice(0,10)){const row=document.createElement('div');row.className='wallet-row';const left=document.createElement('div');const title=document.createElement('strong');title.textContent=ledgerLabel(item.kind);const date=document.createElement('small');date.textContent=new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.created_at));left.append(title,date);const delta=document.createElement('span');delta.textContent=[Number(item.available_delta)?signed(item.available_delta)+' available':'',Number(item.reserved_delta)?signed(item.reserved_delta)+' held':'',Number(item.debt_delta)?signed(item.debt_delta)+' debt':''].filter(Boolean).join(' · ')||'0';row.append(left,delta);list.append(row);}if(!(history.items||[]).length){const p=document.createElement('p');p.className='empty-wallet';p.textContent='No AI wallet activity yet.';list.append(p);}$('walletStatus').textContent='';
 }catch(e){if(!currentAccount(scope))return;section.hidden=false;$('walletSummary').replaceChildren();$('walletHistory').replaceChildren();$('walletStatus').textContent='Wallet information is temporarily unavailable.';}
}

async function loadWelcomeCredits(){
 const scope=accountScope(),box=$('welcomeCredits');
 try{
  const c=await json('/api/ai-wallet/config');if(!currentAccount(scope))return;
  if(!c.welcomeEnabled||!Number.isSafeInteger(c.welcomeCredits)||c.welcomeCredits<=0){box.hidden=true;return;}
  box.hidden=false;$('welcomeTitle').textContent=c.welcomeCredits.toLocaleString()+' welcome AI credits';
  $('welcomeCopy').textContent='One claim per account. No Stripe payment is required.';
  const button=$('claimWelcome');button.disabled=false;button.textContent=scope.token?'Claim welcome credits':'Sign in to claim';
  button.onclick=async()=>{
   if(!currentAccount(scope))return;
   if(!scope.token){location.assign('deepsyq.html');return;}
   if(button.disabled)return;button.disabled=true;$('welcomeStatus').textContent='Checking your wallet…';
   try{
    const d=await json('/api/ai-wallet/welcome',{method:'POST',body:'{}'});if(!currentAccount(scope))return;
    $('welcomeStatus').textContent=d.balance?.duplicate?'Welcome credits were already claimed on this account.':Number(d.credits).toLocaleString()+' welcome AI credits added.';
    button.disabled=true;await loadWallet();
   }catch(e){if(!currentAccount(scope))return;$('welcomeStatus').textContent=e.message==='AI_WELCOME_CREDITS_NOT_ENABLED'?'Welcome credits are not available right now.':'Could not claim welcome credits.';button.disabled=false;}
  };
 }catch(_){if(currentAccount(scope))box.hidden=true;}
}

async function loadAiPacks(){
 try{
  const c=await json('/api/ai-billing/config'),root=$('aiPacks');
  root.replaceChildren();
  const offered=Array.isArray(c.packs)?c.packs:[];
  const valid=offered.filter(validAiPack);
  if(!valid.length){
   $('aiStatus').textContent=offered.length?'AI pack data is incomplete. Checkout is unavailable.':'No AI credit packs are configured yet.';
   return;
  }
  const mode=aiCheckoutMode(c);
  for(const p of valid){
   root.append(card(p.credits.toLocaleString()+' AI credits',
     minor(p.amount,p.currency),'Prepaid AI-generation wallet credits.'+generationEstimateCopy(c,p.credits),
     mode==='live'?'Continue to Stripe':mode==='test'?'Open Stripe test checkout':'Not available yet',
     ()=>void checkout(p),{disabled:mode===null,className:'credit-pack'}));
  }
  $('aiStatus').textContent=mode==='live'
   ?'Live AI credit checkout is enabled. Stripe confirms payment before credits are granted.'
   :mode==='test'
   ?'Stripe TEST mode: test checkout only; no real payment is made.'
   :'AI credit packs are prepared but checkout is not activated.';
 }catch(_){$('aiPacks').replaceChildren();$('aiStatus').textContent='AI credit pack configuration is unavailable. Checkout is not available.';}
}
async function checkout(pack){
 const scope=accountScope();if(pageSuspended||document.hidden)return;
 if(!validAiPack(pack)){$('aiStatus').textContent='Invalid AI credit pack; checkout is unavailable.';return;}
 if(!scope.token){location.assign('deepsyq.html');return;}
 if(checkoutPending)return;
 // Preserve IDs across lifecycle suspension for uncertain same-account retries.
 const key=JSON.stringify([pack.sku,pack.credits,pack.amount,pack.currency]);
 if(!checkoutRequests.has(key))checkoutRequests.set(key,crypto.randomUUID());
 const pending={scope};checkoutPending=pending;$('aiStatus').textContent='Opening secure checkout…';
 try{
  const d=await json('/api/ai-billing/checkout',{method:'POST',body:JSON.stringify({requestId:checkoutRequests.get(key),sku:pack.sku})});
  if(!currentAccount(scope))return;
  const u=new URL(d.url);if(u.protocol!=='https:'||u.hostname!=='checkout.stripe.com'||u.port||u.username||u.password)throw Error('UNSAFE_CHECKOUT_URL');
  location.assign(u.href);
 }catch(e){if(currentAccount(scope))$('aiStatus').textContent=checkoutErrorMessage(e.message);}
 finally{if(checkoutPending===pending)checkoutPending=null;}
}

await Promise.all([loadToolPlans(),loadAiPacks(),loadWelcomeCredits(),loadWallet()]);