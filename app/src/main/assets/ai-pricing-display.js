/**
 * Presentation-only checks for the BASE pricing page.
 * Never derive catalog prices or credit amounts from defaults.
 * Server-side catalog, entitlement, wallet and Stripe checks remain authoritative.
 */
const numberValue = value =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export function validPlanPrice(plan) {
  const n = numberValue(plan?.price);
  return n !== null && n >= 0 ? n : null;
}

export function validToolLimit(plan) {
  const n = numberValue(plan?.limit);
  return n !== null && Number.isSafeInteger(n) && n >= 0 ? n : null;
}

export function validLifetimeCurrency(plan) {
  const currency = typeof plan?.currency === 'string' ? plan.currency.toUpperCase() : '';
  return currency === 'EUR' || currency === 'USD' ? currency : null;
}

export function validAiPack(pack) {
  if (!pack || typeof pack !== 'object') return false;
  if (typeof pack.sku !== 'string' || !/^[a-z0-9_-]{1,40}$/.test(pack.sku)) return false;
  const credits = numberValue(pack.credits);
  const amount = numberValue(pack.amount);
  return Number.isSafeInteger(credits) && credits > 0 &&
    Number.isSafeInteger(amount) && amount > 0 &&
    ['eur', 'usd'].includes(pack.currency);
}

export function validWalletAmount(amount) {
  const n = numberValue(amount);
  return n !== null && Number.isSafeInteger(n) && n >= 0 ? n : null;
}

// Server sends an opt-in price-free map only after explicit approval.
// A missing allocation means NO verified AI credits for this subscription.
export function approvedSubscriptionCredits(config,plan){
 if(!['basic','pro','business'].includes(plan))return null;
 const amount=config?.subscriptionCredits?.[plan];
 return Number.isSafeInteger(amount)&&amount>0&&amount<=10_000_000?amount:null;
}

export function aiCheckoutMode(config) {
  // An unknown or absent mode is NOT presumed to mean test or live.
  if (!config?.enabled) return null;
  return config.mode === 'live' || config.mode === 'test' ? config.mode : null;
}

/**
 * A rejected Checkout request does not prove that no payment occurred.
 * Retry/recovery copy must stay accurate even after an uncertain network reply.
 */
export function checkoutErrorMessage(code) {
  if (code === 'CHECKOUT_SESSION_NOT_REUSABLE') {
    return 'This checkout is no longer open. Check your AI wallet and payment history before starting a new checkout.';
  }
  if (code === 'CHECKOUT_REQUEST_CONFLICT') {
    return 'Your selected credit pack or price changed. Refresh this page before creating a new checkout.';
  }
  if (code === 'AI_CHECKOUT_UNAVAILABLE' || code === 'PAYMENTS_NOT_ACTIVATED') {
    return 'Stripe Checkout is temporarily unavailable. Check your AI wallet or payment history if you already attempted to pay.';
  }
  return 'Checkout could not be confirmed. Check your AI wallet or payment history before trying again.';
}

// Marketing estimates are alternative ways to spend a fixed amount of AI credits,
// never a combined allocation or guarantee for higher quality/model options.
// Only server-approved base credit rates are eligible. No guessed defaults.
export function approvedGenerationEstimates(config,credits){
 if(!Number.isSafeInteger(credits)||credits<=0||credits>10_000_000||!Array.isArray(config?.rates))return [];
 const allowed=['image','video'],result=[];
 for(const kind of allowed){
  const matches=config.rates.filter(rate=>rate?.kind===kind);
  if(matches.length!==1)continue; // duplicate/missing rates are not trustworthy
  const rate=matches[0]?.credits;
  if(!Number.isSafeInteger(rate)||rate<=0||rate>10_000_000)continue;
  const count=Math.floor(credits/rate);
  if(count>0)result.push({kind,count});
 }
 return result;
}
