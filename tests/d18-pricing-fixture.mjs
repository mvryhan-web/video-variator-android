// No-network fixture helper. This records an explicit same-currency net
// customer-revenue allocation at the exact D18 2:1 floor for approved rows.
// Negative tests should construct rows without this helper on purpose.
export const d18Rows=rows=>rows.map(row=>({
  ...row,
  currency:row.currency||'usd',
  netRevenueCurrency:row.netRevenueCurrency||row.currency||'usd',
  netRevenueMicros:row.netRevenueMicros??row.providerCostMicros*2,
}));
export const d18PricingJson=rows=>JSON.stringify(d18Rows(rows));
