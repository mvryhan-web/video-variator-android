import {retrieveStripeNetRevenue,stripeCheckoutTaxAmount} from './generation-stripe-net-revenue.js';

function stripeReader(key,fetcher){
  const get=async(resource,id,expand=[])=>{
    const url=new URL('https://api.stripe.com/v1/'+resource+'/'+encodeURIComponent(id));
    for(const field of expand)url.searchParams.append('expand[]',field);
    const response=await fetcher(url,{headers:{Authorization:'Bearer '+key},redirect:'manual'});
    if(!response.ok)throw Error('STRIPE_READ_FAILED');
    return response.json();
  };
  return {
    checkout:{sessions:{retrieve:(id,opts)=>get('checkout/sessions',id,opts.expand)}},
    paymentIntents:{retrieve:(id,opts)=>get('payment_intents',id,opts.expand)},
    charges:{retrieve:(id,opts)=>get('charges',id,opts.expand)},
    balanceTransactions:{retrieve:id=>get('balance_transactions',id)}
  };
}

export function createEdgeCreditFulfillment({databaseUrl,stripeKey,packs,fetcher=(...args)=>fetch(...args)}){
  const live=/^(sk|rk)_live_/.test(stripeKey||'');
  if(!live&&!/^(sk|rk)_test_/.test(stripeKey||''))throw Error('STRIPE_KEY_NOT_CONFIGURED');
  let db;
  try{db=new URL(databaseUrl);}catch{throw Error('WALLET_DATABASE_URL_INVALID');}
  if(!['postgres:','postgresql:'].includes(db.protocol)||!db.hostname.endsWith('.neon.tech'))throw Error('NEON_DATABASE_REQUIRED');
  const endpoint='https://'+db.hostname.replace('-pooler.','.')+'/sql';
  const stripe=stripeReader(stripeKey,fetcher);

  async function sql(query,params){
    let response;
    try{response=await fetcher(endpoint,{
      method:'POST',redirect:'manual',
      headers:{'Content-Type':'application/json','Neon-Connection-String':databaseUrl,'Neon-Raw-Text-Output':'true','Neon-Array-Mode':'false'},
      body:JSON.stringify({query,params:params.map(value=>String(value))})
    });
    }catch{throw Error('WALLET_DATABASE_FETCH_FAILED');}
    if(!response.ok)throw Error('WALLET_DATABASE_UNAVAILABLE');
    return (await response.json()).rows;
  }

  async function grant(event){
    const object=event.data?.object;
    if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)||object?.metadata?.aiWallet!=='v1')return false;
    if(event.livemode!==live||!new RegExp('^cs_'+(live?'live':'test')+'_[A-Za-z0-9]+$').test(object.id))throw Error('CHECKOUT_MODE_MISMATCH');
    if(object.payment_status!=='paid')return true;
    const session=await stripe.checkout.sessions.retrieve(object.id,{expand:['line_items']});
    const userId=session.client_reference_id;
    const pack=packs.find(item=>item.sku===session.metadata?.sku);
    const lines=session.line_items?.data||[];
    if(session.id!==object.id||session.livemode!==live||session.mode!=='payment'||session.payment_status!=='paid'||
       session.metadata?.aiWallet!=='v1'||!pack||!userId||userId.startsWith('guest_')||session.metadata.userId!==userId||
       session.amount_subtotal!==pack.amount||session.currency!==pack.currency||session.line_items?.has_more||
       lines.length!==1||lines[0].price?.id!==pack.priceId||lines[0].quantity!==1)throw Error('CHECKOUT_PURCHASE_MISMATCH');
    const paymentIntentId=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;
    const settlement=await retrieveStripeNetRevenue({
      stripe,paymentIntentId,expectedAmount:session.amount_total,expectedCurrency:pack.currency,
      taxAmount:stripeCheckoutTaxAmount(session),expectedLivemode:live
    });
    await sql('SELECT public.vv_grant_edge_credit_purchase($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[
      userId,session.id,paymentIntentId,pack.credits,session.amount_total,pack.currency,
      settlement.processorFeeAmount,settlement.taxAmount,settlement.stripeChargeId,settlement.stripeBalanceTransactionId,live
    ]);
    return true;
  }

  async function refund(event){
    const object=event.data?.object;
    if(event.type!=='charge.refunded'||object?.metadata?.aiWallet!=='v1')return false;
    if(event.livemode!==live||!/^ch_[A-Za-z0-9]+$/.test(object.id))throw Error('REFUND_MODE_MISMATCH');
    const charge=await stripe.charges.retrieve(object.id,{expand:[]});
    if(charge.id!==object.id||charge.livemode!==live||charge.metadata?.aiWallet!=='v1'||
       charge.paid!==true||charge.captured!==true||!Number.isSafeInteger(charge.amount_refunded)||charge.amount_refunded<1)
      throw Error('REFUND_EVIDENCE_MISMATCH');
    const intent=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;
    await sql('SELECT public.vv_refund_edge_credit_purchase($1,$2,$3,$4,$5)',[
      event.id,intent,charge.id,charge.amount_refunded,live
    ]);
    return true;
  }

  async function balance(userId){
    const [row]=await sql('SELECT available,reserved,debt FROM public.vv_ai_wallet WHERE user_id=$1',[userId]);
    return {available:Number(row?.available||0),reserved:Number(row?.reserved||0),debt:Number(row?.debt||0)};
  }

  async function history(userId){
    const rows=await sql(`SELECT id,kind,available_delta,reserved_delta,debt_delta,created_at
      FROM public.vv_ai_ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 50`,[userId]);
    return rows.map(row=>({id:row.id,kind:row.kind,availableDelta:Number(row.available_delta),
      reservedDelta:Number(row.reserved_delta),debtDelta:Number(row.debt_delta),createdAt:row.created_at}));
  }

  async function assertReady(){
    const [row]=await sql(`SELECT (
      to_regprocedure('public.vv_grant_edge_credit_purchase(text,text,text,integer,integer,text,bigint,bigint,text,text,boolean)') IS NOT NULL
      AND to_regprocedure('public.vv_refund_edge_credit_purchase(text,text,text,integer,boolean)') IS NOT NULL
      AND to_regclass('public.vv_ai_wallet') IS NOT NULL
      AND to_regclass('public.vv_ai_ledger') IS NOT NULL
    )::int AS ready`,[]);
    if(Number(row?.ready)!==1)throw Error('WALLET_MIGRATION_REQUIRED');
  }

  return {grant,refund,balance,history,assertReady};
}
