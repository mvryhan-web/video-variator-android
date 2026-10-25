/* The existing per-account AI wallet, moved from legacy pricing to canonical Pricing.
 * Never store private balance/history outside the signed-in DOM.
 * All wallet responses are bound to the originating session and request epoch. */
import {validWalletAmount} from './ai-pricing-display.js';
const $=id=>document.getElementById(id);
const token=()=>{try{return localStorage.getItem('vv_token')||'';}catch{return '';}};
let currentToken=token(),epoch=0,suspended=false,refreshNeeded=false,loading=false;
const pending=new Set();
function clearPrivate(){
 $('walletSection').hidden=true;
 $('walletEntry').hidden=false;
 for(const id of ['walletSummary','walletHistory','walletStatus','welcomeStatus'])$(id).replaceChildren();
 $('welcomeCredits').hidden=true;
 $('welcomeTitle').textContent='Welcome AI credits';
 $('welcomeCopy').textContent='';
 $('claimWelcome').disabled=true;
 $('claimWelcome').onclick=null;
}
function invalidate(){
 epoch++;
 for(const controller of pending)controller.abort();
 pending.clear();
 clearPrivate();
}
function sync(){
 const next=token();
 if(next===currentToken)return false;
 currentToken=next;
 invalidate();refreshNeeded=true;
 return true;
}
function scope(){sync();return {token:currentToken,epoch};}
function active(s){sync();return !suspended&&!document.hidden&&!!s.token&&s.token===currentToken&&s.epoch===epoch;}
async function privateJson(path,options={},s=scope()){
 if(!active(s))throw Error('STALE_ACCOUNT');
 const controller=new AbortController();pending.add(controller);
 try{
  const response=await fetch(path,{...options,cache:'no-store',signal:controller.signal,headers:{...(options.body?{'Content-Type':'application/json'}:{}),Authorization:'Bearer '+s.token,...(options.headers||{})}});
  if(!active(s))throw Error('STALE_ACCOUNT');
  const result=await response.json().catch(()=>({}));
  if(!active(s))throw Error('STALE_ACCOUNT');
  if(!response.ok)throw Error(result.error||'WALLET_UNAVAILABLE');
  return result;
 }finally{pending.delete(controller);}
}
const labels={purchase:'Purchased credits',welcome_grant:'Welcome credits',reserve:'Reserved for generation',captured:'Generation charged',released:'Reservation released',refund:'Refund adjustment',owner_adjustment:'Owner adjustment'};
const signed=value=>{const n=Number(value||0);return (n>0?'+':'')+n.toLocaleString('en-US');};
function renderWallet(balance,history){
 const totals=[validWalletAmount(balance?.available),validWalletAmount(balance?.reserved),validWalletAmount(balance?.debt)];
 $('walletSection').hidden=false;$('walletEntry').hidden=true;
 $('walletSummary').replaceChildren();$('walletHistory').replaceChildren();
 if(totals.some(n=>n===null)){$('walletStatus').textContent='Current wallet amounts could not be verified. Refresh and try again.';return;}
 for(const [label,value,cls] of [['Available',totals[0],''],['Held',totals[1],''],['Debt',totals[2],totals[2]>0?'debt':'']){
  const card=document.createElement('article');card.className='price-wallet-stat '+cls;
  const name=document.createElement('span');name.textContent=label;
  const amount=document.createElement('strong');amount.textContent=value.toLocaleString('en-US');
  const unit=document.createElement('small');unit.textContent='AI credits';
  card.append(name,amount,unit);$('walletSummary').append(card);
 }
 const items=Array.isArray(history?.items)?history.items.slice(0,10):[];
 for(const item of items){
  const row=document.createElement('div');row.className='price-wallet-row';
  const left=document.createElement('div');const title=document.createElement('strong');title.textContent=labels[item.kind]||String(item.kind||'Wallet activity').replaceAll('_',' ');
  const date=document.createElement('small');const at=new Date(item.created_at);
  date.textContent=Number.isNaN(at.getTime())?'':new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(at);
  left.append(title,date);
  const delta=document.createElement('span');
  delta.textContent=[Number(item.available_delta)?signed(item.available_delta)+' available':'',Number(item.reserved_delta)?signed(item.reserved_delta)+' held':'',Number(item.debt_delta)?signed(item.debt_delta)+' debt':''].filter(Boolean).join(' · ')||'0';
  row.append(left,delta);$('walletHistory').append(row);
 }
 if(!items.length){const empty=document.createElement('p');empty.textContent='No AI wallet activity yet.';$('walletHistory').append(empty);}
 $('walletStatus').textContent='';
}
async function loadWelcome(s){
 try{
  const data=await privateJson('/api/ai-wallet/config',{},s);
  if(!active(s))return;
  if(!data?.welcomeEnabled||!Number.isSafeInteger(data.welcomeCredits)||data.welcomeCredits<=0){$('welcomeCredits').hidden=true;return;}
  $('welcomeCredits').hidden=false;
  $('welcomeTitle').textContent=data.welcomeCredits.toLocaleString('en-US')+' welcome AI credits';
  $('welcomeCopy').textContent='One claim per account. No Stripe payment is required.';
  const button=$('claimWelcome');button.disabled=false;button.textContent='Claim welcome credits';
  button.onclick=async()=>{
   if(!active(s)||button.disabled)return;
   button.disabled=true;$('welcomeStatus').textContent='Checking availability…';
   try{
    const response=await privateJson('/api/ai-wallet/welcome',{method:'POST',body:'{}'},s);
    if(!active(s))return;
    $('welcomeStatus').textContent=response.balance?.duplicate?'Welcome credits were already claimed on this account.':Number(response.credits||0).toLocaleString('en-US')+' welcome AI credits added.';
    button.disabled=true;
    await refresh();
   }catch(e){if(active(s)){$('welcomeStatus').textContent='Could not claim welcome credits.';button.disabled=false;}}
  };
 }catch(e){if(active(s))$('welcomeCredits').hidden=true;}
}
async function refresh(){
 sync();
 if(suspended||document.hidden)return;
 refreshNeeded=false;
 const s=scope();
 if(!s.token){clearPrivate();return;}
 loading=true;
 try{
  const [balance,history]=await Promise.all([
   privateJson('/api/ai-wallet/balance',{},s),privateJson('/api/ai-wallet/history',{},s)
  ]);
  if(!active(s))return;
  renderWallet(balance,history);
  void loadWelcome(s);
 }catch(e){
  if(!active(s))return;
  $('walletSection').hidden=false;$('walletEntry').hidden=true;
  $('walletSummary').replaceChildren();$('walletHistory').replaceChildren();
  $('walletStatus').textContent='Wallet information is temporarily unavailable.';
 }finally{if(active(s))loading=false;}
}
function check(){if(sync()||refreshNeeded)void refresh();}
$('walletSignIn').addEventListener('click',()=>document.dispatchEvent(new Event('deepsyq:open-pricing-auth')));
window.addEventListener('storage',e=>{if(e.key==='vv_token'||e.key===null)check();});
window.addEventListener('focus',check);
document.addEventListener('visibilitychange',()=>{if(document.hidden){invalidate();refreshNeeded=true;}else{sync();void refresh();}});
window.addEventListener('pagehide',()=>{suspended=true;invalidate();refreshNeeded=true;});
window.addEventListener('pageshow',()=>{suspended=false;sync();void refresh();});
setInterval(check,250);
void refresh();
