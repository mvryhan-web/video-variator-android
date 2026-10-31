/**
 * Read-only AI Stripe webhook *configuration* audit.
 * Reuses the existing billing runtime/catalog; does not add another webhook,
 * call Stripe, read payment events, or prove a webhook was delivered.
 */
import {billingCatalog,generationBillingRuntime} from '../generation-billing.js';

export function webhookConfigObserverEnabled(env={}){
  return env.PRODUCT_WATCHER_ENABLED==='true' &&
    env.PRODUCT_WATCHER_WEBHOOK_CONFIG_ENABLED==='true';
}

export function checkWebhookConfiguration(env={}){
  if(!webhookConfigObserverEnabled(env))return{
    status:'healthy',code:'AI_WEBHOOK_CONFIG_OBSERVER_DISABLED',scope:'disabled',
    webhookDeliveryVerified:false,stripeApiChecked:false,configurationOnly:true
  };
  const runtime=generationBillingRuntime(env);
  if(!runtime.activationRequested)return{
    status:'healthy',code:'AI_BILLING_NOT_ACTIVATED',scope:'ai_credits_only',
    webhookDeliveryVerified:false,stripeApiChecked:false,configurationOnly:true,
    messages:['AI credit billing is disabled. Legacy subscription billing is not assessed here.'],
    blockers:[]
  };
  const issues=[];
  const add=(code,severity)=>issues.push({code,severity});
  const key=String(env.STRIPE_SECRET_KEY||'').trim();
  const webhookSecret=String(env.STRIPE_WEBHOOK_SECRET||'').trim();
  const dbReady=!!String(env.DATABASE_URL||'').trim();
  const jwtReady=!!String(env.APP_JWT_SECRET||'').trim();
  const catalog=billingCatalog(env);
  if(!runtime.keyMatches)add('AI_STRIPE_KEY_MODE_MISMATCH','critical');
  if(!webhookSecret)add('AI_STRIPE_WEBHOOK_SECRET_MISSING','critical');
  else if(!/^whsec_[A-Za-z0-9]+$/.test(webhookSecret))add('AI_STRIPE_WEBHOOK_SECRET_FORMAT_REVIEW','warning');
  if(!dbReady)add('AI_STRIPE_DATABASE_NOT_CONFIGURED','critical');
  if(!jwtReady)add('AI_STRIPE_QUOTE_SECRET_MISSING','critical');
  if(runtime.livemode&&!runtime.liveApproved)add('AI_LIVE_BILLING_NOT_APPROVED','critical');
  if(!catalog.packs.length)add('AI_PRICE_PACK_CATALOG_NOT_READY','warning');
  const critical=issues.some(x=>x.severity==='critical');
  return {
    status:critical?'critical':issues.length?'warning':'healthy',
    code:critical?'AI_STRIPE_CONFIG_BLOCKED':issues.length?'AI_STRIPE_CONFIG_REVIEW':'AI_STRIPE_CONFIG_READY_UNVERIFIED',
    scope:'ai_credits_only',
    billingMode:runtime.mode,
    webhookDeliveryVerified:false,
    stripeApiChecked:false,
    configurationOnly:true,
    // Boolean presence checks and codes only, never key, secret, host, URL, price or IDs.
    checks:{
      billingRequested:runtime.activationRequested,
      modeKeyMatches:runtime.keyMatches,
      webhookSecretPresent:!!webhookSecret,
      databaseConfigured:dbReady,
      quoteSecretPresent:jwtReady,
      liveOwnerApprovalRequired:runtime.livemode,
      liveApproved:runtime.liveApproved,
      approvedPackCount:catalog.packs.length
    },
    blockers:issues,
    messages:[
      'Configuration checks do not establish actual signed webhook receipt or successful credit settlement.',
      'No Stripe network request, refund, price change or customer credit operation was performed.'
    ]
  };
}
