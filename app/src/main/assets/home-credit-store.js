import {validAiPack} from './ai-pricing-display.js';
const root=document.getElementById('homeCreditPacks'),status=document.getElementById('homeCreditStatus');
if(root){
 try{
 const r=await fetch('/api/ai-billing/config');if(!r.ok)throw Error();const c=await r.json();
 const packs=Array.isArray(c.packs)?c.packs.filter(validAiPack):[];
 for(const p of packs){const card=document.createElement('article');card.className='credit-pack';const h=document.createElement('h3');h.textContent='✦ '+p.credits.toLocaleString('en-US');const panel=document.createElement('div');panel.className='credit-panel';const label=document.createElement('strong');label.textContent='AI generation credits';const copy=document.createElement('p');copy.textContent='Added to your AI wallet after confirmed payment.';panel.append(label,copy);const foot=document.createElement('div');foot.className='credit-pack-footer';const price=document.createElement('strong');price.textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:p.currency.toUpperCase()}).format(p.amount/100);const link=document.createElement('a');link.href='ai-pricing.html#aiCreditSection';link.textContent='View pack ↗';foot.append(price,link);card.append(h,panel,foot);root.append(card);}
 if(!packs.length)renderUnavailable();else status.textContent=c.enabled?'Choose a pack to review its availability and checkout.':'Credit packs are listed; checkout is not activated.';
 }catch(_){renderUnavailable();}
}
function renderUnavailable(){
 for(const [name,copy] of [['Image projects','Explore looks, portraits and original effects.'],['Video projects','Give your ideas motion in Video Studio.'],['More creation','Keep creating with a separate AI wallet.']]){const card=document.createElement('article');card.className='credit-pack pending-pack';const h=document.createElement('h3');h.textContent='✦ '+name;const panel=document.createElement('div');panel.className='credit-panel';const label=document.createElement('strong');label.textContent='AI credits';const p=document.createElement('p');p.textContent=copy;panel.append(label,p);const foot=document.createElement('div');foot.className='credit-pack-footer';const note=document.createElement('span');note.textContent='Packs coming soon';const button=document.createElement('button');button.type='button';button.disabled=true;button.textContent='Not available yet';foot.append(note,button);card.append(h,panel,foot);root.append(card);}
 status.textContent='Pack amounts and prices have not been published yet. Purchases will appear here when configured.';
}
