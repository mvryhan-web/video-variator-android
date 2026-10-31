import {validAiPack} from './ai-pricing-display.js';
const root=document.getElementById('homeCreditPacks'),status=document.getElementById('homeCreditStatus');
if(root){
 try{
 const r=await fetch('/api/ai-billing/config');if(!r.ok)throw Error();const c=await r.json();
 const packs=Array.isArray(c.packs)?c.packs.filter(validAiPack):[];
 for(const p of packs){const card=document.createElement('article');card.className='credit-pack';const h=document.createElement('h3');h.textContent='✦ '+p.credits.toLocaleString('en-US');const panel=document.createElement('div');panel.className='credit-panel';const label=document.createElement('strong');label.textContent='AI generation credits';const copy=document.createElement('p');copy.textContent='Added to your AI wallet after confirmed payment.';panel.append(label,copy);const foot=document.createElement('div');foot.className='credit-pack-footer';const price=document.createElement('strong');price.textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:p.currency.toUpperCase()}).format(p.amount/100);const link=document.createElement('a');link.href='pricing.html#credits';link.textContent='View pack ↗';foot.append(price,link);card.append(h,panel,foot);root.append(card);}
 if(!packs.length)renderUnavailable();else status.textContent=c.enabled?'Choose a pack to review its availability and checkout.':'Credit packs are listed; checkout is not activated.';
 }catch(_){renderUnavailable();}
}
function renderUnavailable(){
 const proposals=[[1000,200,10],[10000,3333,100],[100000,20000,1000],[1000000,200000,10000],[10000000,2000000,100000]];
 for(const [credits,bonus,amount] of proposals){
 const card=document.createElement('article');card.className='credit-pack proposed-pack';
 const h=document.createElement('h3');h.textContent='✦ '+credits.toLocaleString('en-US');
 const panel=document.createElement('div');panel.className='credit-panel';
 const tag=document.createElement('span');tag.className='credit-bonus-label';tag.textContent='✧ Bonus credits · proposed';
 const label=document.createElement('strong');label.textContent='General AI credits';
 const value=document.createElement('b');value.className='credit-bonus-value';value.textContent='+ '+bonus.toLocaleString('en-US');
 const copy=document.createElement('p');copy.textContent='One-time top-up · added to your AI wallet after payment';
 panel.append(tag,label,value,copy);
 const foot=document.createElement('div');foot.className='credit-pack-footer';
 const price=document.createElement('strong');price.textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(amount);
 const button=document.createElement('button');button.type='button';button.disabled=true;button.textContent='Purchase · soon';button.setAttribute('aria-label','Purchase '+credits.toLocaleString('en-US')+' credits — not available yet');
 foot.append(price,button);card.append(h,panel,foot);root.append(card);
 }
 status.textContent='Proposed pack prices and bonuses — preview only, not an active offer. Purchases are disabled until the catalog and generation costs are approved.';
}
