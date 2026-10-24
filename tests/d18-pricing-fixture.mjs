// No-network fixture helper: default only to the existing wallet currency.
// Customer revenue is deliberately absent; only verified Stripe settlement
// rows may prove the D18 margin at dispatch.
export const d18Rows=rows=>rows.map(row=>({...row,currency:row.currency||'usd'}));
export const d18PricingJson=rows=>JSON.stringify(d18Rows(rows));
