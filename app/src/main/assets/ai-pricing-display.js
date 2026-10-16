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

export function aiCheckoutMode(config) {
  // An unknown or absent mode is NOT presumed to mean test or live.
  if (!config?.enabled) return null;
  return config.mode === 'live' || config.mode === 'test' ? config.mode : null;
}
