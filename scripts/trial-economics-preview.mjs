// OFFLINE what-if calculator only. NO billing/wallet/provider calls. NOT an entitlement grant.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {pricingCatalog} from '../server/generation-pricing.js';
const validInt=(x,max=1e9)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const blocked=reason=>({status:'BLOCKED',reason,launchApproved:false,trialCreditCap:null});
const ceil=(a,b)=>(a+b-1n)/b;
export function analyzeTrialEconomics(c){
 if(!c||typeof c!=='object'||Array.isArray(c))return blocked('INVALID_INPUT');
 const {salePriceCents,trialDays,oneTime,noAutoRenew,currency,processorFixedCents,processorBasisPoints,taxReserveCents,fxReserveCents,riskReserveCents,minimumProfitCents,feesVerifiedInSaleCurrency,eligibleRates}=c;
 if(salePriceCents!==99||trialDays!==3||oneTime!==true||noAutoRenew!==true)return blocked('TRIAL_TERMS_INVALID');
 if(typeof currency!=='string'||!/^[a-z]{3}$/.test(currency))return blocked('INVALID_CURRENCY');
 if(currency!=='usd')return blocked('TRIAL_CURRENCY_NOT_USD');
 if(![processorFixedCents,taxReserveCents,fxReserveCents,riskReserveCents,minimumProfitCents].every(x=>validInt(x))||!validInt(processorBasisPoints,10000))return blocked('MISSING_VERIFIED_FEES_OR_RESERVES');
 if(feesVerifiedInSaleCurrency!==true)return blocked('FX_OR_SETTLEMENT_FEES_UNVERIFIED');
 if(!Array.isArray(eligibleRates)||!eligibleRates.length||eligibleRates.length>100)return blocked('NO_APPROVED_PROVIDER_RATES');
 const catalog=pricingCatalog({AI_MODEL_PRICING_JSON:JSON.stringify(eligibleRates)});
 if(!catalog.configured||catalog.entries.length!==eligibleRates.length)return blocked('UNAPPROVED_MODEL_PRICES');
 if(catalog.entries.some(r=>r.currency!==currency))return blocked('PROVIDER_CURRENCY_MISMATCH');
 const fee=processorFixedCents+Number(ceil(BigInt(salePriceCents)*BigInt(processorBasisPoints),10000n));
 const reserved=fee+taxReserveCents+fxReserveCents+riskReserveCents+minimumProfitCents;
 if(reserved>=salePriceCents)return blocked('NOT_ENOUGH_REVENUE_AFTER_FEES');
 const budget=BigInt(salePriceCents-reserved)*10000n;
 let cap=10000000n; // Matches the existing single-wallet grant limit; no unlimited trial allowance.
 for(const r of catalog.entries){
  const estimate=budget*BigInt(r.credits)/BigInt(r.providerCostMicros);
  if(estimate<cap)cap=estimate;
 }
 if(cap<=0n)return blocked('NO_AFFORDABLE_CREDITS');
 const usable=catalog.entries.filter(r=>BigInt(r.credits)<=cap);
 if(!usable.length)return blocked('NO_AFFORDABLE_FULL_GENERATION');
 const spendCeiling=catalog.entries.reduce((m,r)=>{
  const bound=ceil(cap*BigInt(r.providerCostMicros),BigInt(r.credits));
  return bound>m?bound:m;
 },0n);
 if(spendCeiling>budget)return blocked('MATH_SAFETY_GUARD');
 return {status:'SCENARIO_ONLY',launchApproved:false,currency,trialDays,oneTime,noAutoRenew,priceCents:salePriceCents,
  processingFeeCents:fee,remainingProviderBudgetCents:salePriceCents-reserved,
  taxReserveCents,fxReserveCents,riskReserveCents,minimumProfitCents,
  trialCreditCap:Number(cap),worstCaseProviderCostMicros:String(spendCeiling),
  eligibleGenerations:usable.map(r=>({kind:r.kind,model:r.model,provider:r.provider,credits:r.credits,
   fullGenerationsAtCap:Math.floor(Number(cap)/r.credits)})),
  warning:'THIS IS NOT A LAUNCH APPROVAL OR A CUSTOMER CREDIT GRANT. Verify actual model rate, Stripe/FX/tax and owner budget.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const p=process.argv[2];
 if(!p){console.log(JSON.stringify(blocked('EXPLICIT_JSON_INPUT_REQUIRED')));process.exitCode=2;}
 else {try{const result=analyzeTrialEconomics(JSON.parse(await readFile(p,'utf8')));console.log(JSON.stringify(result,null,2));if(result.status!=='SCENARIO_ONLY')process.exitCode=2;}
 catch{console.log(JSON.stringify(blocked('INVALID_OR_UNREADABLE_SCENARIO')));process.exitCode=2;}}
}
