import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTrialEconomics} from '../scripts/trial-economics-preview.mjs';

// TEST FIXTURES ONLY: not verified Stripe USD settlement fees or live provider model costs.
const rate=(model,kind,credits,providerCostMicros)=>({model,provider:'FixtureProvider',kind,credits,providerCostMicros,currency:'usd'});
const scenario=overrides=>({
 salePriceCents:99,trialDays:3,oneTime:true,noAutoRenew:true,currency:'usd',
 processorFixedCents:25,processorBasisPoints:150,taxReserveCents:5,
 fxReserveCents:0,riskReserveCents:4,minimumProfitCents:10,feesVerifiedInSaleCurrency:true,
 eligibleRates:[rate('hypothetical-image','image',20,50000),rate('hypothetical-video','video',80,400000)],
 ...overrides
});
test('fail closed without real price and fee evidence, never an auto grant',()=>{
 assert.deepEqual(analyzeTrialEconomics(),{status:'BLOCKED',reason:'INVALID_INPUT',launchApproved:false,trialCreditCap:null});
 assert.equal(analyzeTrialEconomics(scenario({eligibleRates:[]})).reason,'NO_APPROVED_PROVIDER_RATES');
 assert.equal(analyzeTrialEconomics(scenario({processorFixedCents:undefined})).reason,'MISSING_VERIFIED_FEES_OR_RESERVES');
 assert.equal(analyzeTrialEconomics(scenario({feesVerifiedInSaleCurrency:false})).reason,'FX_OR_SETTLEMENT_FEES_UNVERIFIED');
 assert.equal(analyzeTrialEconomics(scenario({eligibleRates:[rate('wrong','image',20,50000).constructor]})).status,'BLOCKED');
 assert.equal(analyzeTrialEconomics(scenario({eligibleRates:[{...rate('foreign','image',20,50000),currency:'eur'}]})).reason,'PROVIDER_CURRENCY_MISMATCH');
});
test('price, fixed period and no-renewal are hard requirements',()=>{
 for(const change of [{salePriceCents:199},{trialDays:4},{oneTime:false},{noAutoRenew:false}])
  assert.equal(analyzeTrialEconomics(scenario(change)).reason,'TRIAL_TERMS_INVALID');
});
test('explicit trial scenario computes conservative cap across all trial-eligible models only',()=>{
 const result=analyzeTrialEconomics(scenario());
 assert.equal(result.status,'SCENARIO_ONLY');
 assert.equal(result.launchApproved,false);
 assert.equal(result.processingFeeCents,27);
 assert.equal(result.remainingProviderBudgetCents,53);
 assert.equal(result.trialCreditCap,106);
 assert.deepEqual(result.eligibleGenerations.map(x=>[x.kind,x.fullGenerationsAtCap]),[['image',5],['video',1]]);
 assert.ok(BigInt(result.worstCaseProviderCostMicros)<=530000n);
});
test('one expensive model limits all credits and may make trial commercially unworkable',()=>{
 const bad=analyzeTrialEconomics(scenario({eligibleRates:[rate('expensive','video',80,800000)]}));
 assert.equal(bad.reason,'NO_AFFORDABLE_FULL_GENERATION');
 assert.equal(bad.trialCreditCap,null);
 const highFees=analyzeTrialEconomics(scenario({processorFixedCents:95}));
 assert.equal(highFees.reason,'NOT_ENOUGH_REVENUE_AFTER_FEES');
});
test('missing currency, duplicate rates, garbage price and zero provider cost block launch',()=>{
 assert.equal(analyzeTrialEconomics(scenario({currency:'usd/usd'})).reason,'INVALID_CURRENCY');
 assert.equal(analyzeTrialEconomics(scenario({currency:'eur',eligibleRates:[{...rate('image-eur','image',10,50000),currency:'eur'}]})).reason,'TRIAL_CURRENCY_NOT_USD');
 assert.equal(analyzeTrialEconomics(scenario({eligibleRates:[rate('a','image',20,50000),rate('a','image',20,50000)]})).reason,'UNAPPROVED_MODEL_PRICES');
 assert.equal(analyzeTrialEconomics(scenario({eligibleRates:[rate('a','image',20,0)]})).reason,'UNAPPROVED_MODEL_PRICES');
 assert.equal(analyzeTrialEconomics(scenario({processorBasisPoints:11000})).reason,'MISSING_VERIFIED_FEES_OR_RESERVES');
});
