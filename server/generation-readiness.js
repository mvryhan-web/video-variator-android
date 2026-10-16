import {pricingCatalog} from './generation-pricing.js';
import {billingCatalog,generationBillingRuntime,stripeWebhookConfigured} from './generation-billing.js';
import {generationEntitlements} from './generation-entitlements.js';
import {generationPolicy} from './generation-policy.js';
import {generationFeatureSwitches} from './generation-feature-flags.js';
import {objectStorageConfig} from './generation-storage.js';
import {bytePlusDownloadsConfigured} from './generation-byteplus.js';

export function generationReadiness(env={}){
 const pricing=pricingCatalog(env),pricingCurrenciesExplicit=pricing.configured&&pricing.entries.every(e=>!!e.currency),billing=billingCatalog(env),billingRuntime=generationBillingRuntime(env),entitlements=generationEntitlements(env),storage=objectStorageConfig(env),policy=generationPolicy(env);
 const featureSwitches=generationFeatureSwitches(env);
 const gates=[
  {id:'database',label:'PostgreSQL',ready:!!env.DATABASE_URL,required:true},
  {id:'jwt',label:'Server JWT signing key',ready:!!env.APP_JWT_SECRET,required:true},
  {id:'provider',label:'At least one AI provider key',ready:!!(env.GEMINI_API_KEY||env.BYTEPLUS_API_KEY),required:true},
  {id:'byteplusMedia',label:'BytePlus approved media hosts',ready:!env.BYTEPLUS_API_KEY||bytePlusDownloadsConfigured(env.BYTEPLUS_MEDIA_HOSTS),required:!!env.BYTEPLUS_API_KEY},
  {id:'pricing',label:'Approved model pricing + currency',ready:pricingCurrenciesExplicit,required:true},
  {id:'studioEnabled',label:'Generation Studio enabled',ready:env.AI_STUDIO_ENABLED==='true',required:true},
  {id:'wallet',label:'AI wallet generation gate',ready:env.AI_STUDIO_WALLET_ENABLED==='true',required:true},
  {id:'creditPacks',label:'AI credit packs + rates',ready:billing.packs.length>0&&billing.rates.length>0,required:true},
  {id:'stripeMode',label:'Stripe AI billing mode/key',ready:billingRuntime.keyMatches,required:true},
  {id:'liveBillingApproval',label:'Live AI billing approval',ready:billingRuntime.livePaymentsEnabled,required:true},
  {id:'stripeWebhook',label:'Signed Stripe webhook configured',ready:stripeWebhookConfigured(env),required:billingRuntime.livePaymentsEnabled},
  {id:'storage',label:'Permanent object storage',ready:storage.configured,required:true},
  {id:'worker',label:'Background generation worker flag',ready:env.AI_STUDIO_BACKGROUND_POLLING==='true',required:true},
  {id:'publicJobPolicy',label:'Enabled bounded public job spend-rate limits',ready:policy.enabled&&policy.maxConcurrentPerUser>0&&policy.maxJobsPerHourPerUser>0,required:env.AI_PUBLIC_GENERATION_ENABLED==='true'},
  {id:'entitlements',label:'Public plan entitlements',ready:entitlements.configured,required:true},
  {id:'publicFlag',label:'Public AI generation flag',ready:env.AI_PUBLIC_GENERATION_ENABLED==='true',required:true},
  {id:'imageVideo',label:'Image and Video generation switches',ready:featureSwitches.image&&featureSwitches.video,required:true}
 ];
 const blockers=gates.filter(g=>g.required&&!g.ready).map(g=>g.id);
 return {
  launchReady:blockers.length===0,
  blockers,
  gates,
  providers:{googleConfigured:!!env.GEMINI_API_KEY,bytePlusConfigured:!!env.BYTEPLUS_API_KEY},
  billing:{mode:billingRuntime.mode,liveAiPaymentsImplemented:true,liveAiPaymentsEnabled:billingRuntime.livePaymentsEnabled&&stripeWebhookConfigured(env),creditPackCount:billing.packs.length,rateCount:billing.rates.length},
  pricing:{configured:pricing.configured,currenciesExplicit:pricingCurrenciesExplicit},
  storage:{configured:storage.configured},
  entitlements:{configured:entitlements.configured,planCount:entitlements.plans.length}
 };
}
