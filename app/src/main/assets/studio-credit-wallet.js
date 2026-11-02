import {validAiPack,validWalletAmount,aiCheckoutMode} from './ai-pricing-display.js';

/**
 * Free/promotional AI credits belong to the authenticated wallet, independently
 * of whether Stripe credit-pack checkout is live. Never invent balance zeros.
 */
export function studioCreditWalletState(config={},balance=null){
 const checkoutMode=aiCheckoutMode(config);
 const packs=checkoutMode&&Array.isArray(config?.packs)
   ? config.packs.filter(validAiPack):[];
 let totals=null;
 if(balance!==null&&balance!==undefined){
  const available=validWalletAmount(balance?.available),
    reserved=validWalletAmount(balance?.reserved),
    debt=validWalletAmount(balance?.debt);
  if([available,reserved,debt].every(n=>n!==null))
   totals={available,reserved,debt};
 }
 return {checkoutMode,packs,totals};
}
