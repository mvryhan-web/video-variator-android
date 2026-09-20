// Called only after Stripe webhook signature verification.
export function isPaidLifetimeSession(session,{paymentLinkId='' }={}){
 if(session.metadata?.plan!=='lifetime'||session.mode!=='payment'||session.payment_status!=='paid')return false;
 if(session.currency!=='eur'||!Number.isSafeInteger(session.amount_total)||session.amount_total<299900)return false;
 if(session.payment_link&&(!paymentLinkId||session.payment_link!==paymentLinkId))return false;
 return true;
}
