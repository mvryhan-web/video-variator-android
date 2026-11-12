-- Bridge for the Pages Worker. The existing AI wallet schema must be installed.
CREATE OR REPLACE FUNCTION public.vv_grant_edge_credit_purchase(
  p_user text, p_session text, p_intent text, p_credits integer,
  p_amount integer, p_currency text, p_fee bigint, p_tax bigint,
  p_charge text, p_balance_transaction text, p_live boolean
) RETURNS boolean
LANGUAGE plpgsql SET search_path = pg_catalog, public
AS $function$
DECLARE
  purchase public.vv_ai_purchase%ROWTYPE;
  wallet public.vv_ai_wallet%ROWTYPE;
  paid_debt bigint;
BEGIN
  IF p_user IS NULL OR length(p_user) NOT BETWEEN 1 AND 200 OR p_live IS NULL
    OR p_session IS NULL OR p_session !~ (CASE WHEN p_live THEN '^cs_live_[A-Za-z0-9]+$' ELSE '^cs_test_[A-Za-z0-9]+$' END)
    OR p_intent IS NULL OR p_intent !~ '^pi_[A-Za-z0-9]+$'
    OR p_charge IS NULL OR p_charge !~ '^ch_[A-Za-z0-9]+$'
    OR p_balance_transaction IS NULL OR p_balance_transaction !~ '^txn_[A-Za-z0-9]+$'
    OR p_credits IS NULL OR p_credits NOT BETWEEN 1 AND 12000000
    OR p_currency IS NULL OR p_currency NOT IN ('usd','eur')
    OR p_amount IS NULL OR p_amount NOT BETWEEN 1 AND 100000000
    OR p_fee IS NULL OR p_fee < 0 OR p_tax IS NULL OR p_tax < 0
    OR p_fee >= p_amount OR p_tax >= p_amount - p_fee THEN
    RAISE EXCEPTION 'INVALID_CREDIT_SETTLEMENT';
  END IF;

  INSERT INTO public.vv_ai_wallet(user_id) VALUES (p_user) ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT wallet FROM public.vv_ai_wallet WHERE user_id = p_user FOR UPDATE;
  SELECT * INTO purchase FROM public.vv_ai_purchase WHERE session_id = p_session;
  IF FOUND THEN
    IF (purchase.user_id,purchase.payment_intent,purchase.credits,purchase.amount,purchase.currency)
      IS DISTINCT FROM (p_user,p_intent,p_credits,p_amount,p_currency) THEN
      RAISE EXCEPTION 'PURCHASE_CONFLICT';
    END IF;
    IF purchase.settlement_verified_at IS NOT NULL AND
       (purchase.processor_fee_amount,purchase.tax_amount,purchase.stripe_charge_id,
        purchase.stripe_balance_transaction_id,purchase.settlement_livemode)
       IS DISTINCT FROM (p_fee,p_tax,p_charge,p_balance_transaction,p_live) THEN
      RAISE EXCEPTION 'PURCHASE_SETTLEMENT_CONFLICT';
    END IF;
    RETURN false;
  END IF;

  INSERT INTO public.vv_ai_purchase
    (session_id,user_id,payment_intent,credits,amount,currency,processor_fee_amount,tax_amount,
     net_revenue_micros,settlement_verified_at,stripe_charge_id,stripe_balance_transaction_id,settlement_livemode)
  VALUES (p_session,p_user,p_intent,p_credits,p_amount,p_currency,p_fee,p_tax,
          (p_amount-p_fee-p_tax)*10000,now(),p_charge,p_balance_transaction,p_live);
  paid_debt := least(wallet.debt,p_credits);
  UPDATE public.vv_ai_wallet
    SET available = wallet.available + p_credits - paid_debt, debt = wallet.debt - paid_debt
    WHERE user_id = p_user;
  INSERT INTO public.vv_ai_ledger
    (user_id,reference,kind,available_delta,reserved_delta,debt_delta)
    VALUES (p_user,p_session,'purchase',p_credits-paid_debt,0,-paid_debt);
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vv_refund_edge_credit_purchase(
  p_event text, p_intent text, p_charge text, p_cumulative integer, p_live boolean
) RETURNS boolean
LANGUAGE plpgsql SET search_path = pg_catalog, public
AS $function$
DECLARE
  receipt public.vv_ai_purchase%ROWTYPE;
  wallet public.vv_ai_wallet%ROWTYPE;
  revocation bigint;
  debit bigint;
BEGIN
  IF p_event IS NULL OR p_event !~ '^evt_[A-Za-z0-9]+$'
    OR p_intent IS NULL OR p_intent !~ '^pi_[A-Za-z0-9]+$'
    OR p_charge IS NULL OR p_charge !~ '^ch_[A-Za-z0-9]+$'
    OR p_cumulative IS NULL OR p_cumulative <= 0 OR p_live IS NULL THEN
    RAISE EXCEPTION 'INVALID_REFUND_EVIDENCE';
  END IF;
  SELECT * INTO receipt FROM public.vv_ai_purchase WHERE payment_intent = p_intent;
  IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_NOT_FOUND'; END IF;
  SELECT * INTO STRICT wallet FROM public.vv_ai_wallet WHERE user_id = receipt.user_id FOR UPDATE;
  SELECT * INTO STRICT receipt FROM public.vv_ai_purchase WHERE payment_intent = p_intent FOR UPDATE;
  IF receipt.settlement_livemode IS DISTINCT FROM p_live
     OR receipt.stripe_charge_id IS DISTINCT FROM p_charge OR p_cumulative > receipt.amount THEN
    RAISE EXCEPTION 'REFUND_PURCHASE_MISMATCH';
  END IF;
  IF p_cumulative <= receipt.refunded_amount THEN RETURN false; END IF;
  INSERT INTO public.vv_ai_refund_event(event_id,payment_intent,stripe_charge_id,cumulative_amount,livemode)
  VALUES(p_event,p_intent,p_charge,p_cumulative,p_live)
  ON CONFLICT(event_id) DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;
  revocation := ceil(receipt.credits::numeric*p_cumulative/receipt.amount) -
                ceil(receipt.credits::numeric*receipt.refunded_amount/receipt.amount);
  debit := least(wallet.available,revocation);
  UPDATE public.vv_ai_purchase SET refunded_amount=p_cumulative WHERE session_id=receipt.session_id;
  UPDATE public.vv_ai_wallet SET available=wallet.available-debit, debt=wallet.debt+revocation-debit
    WHERE user_id=receipt.user_id;
  INSERT INTO public.vv_ai_ledger(user_id,reference,kind,available_delta,reserved_delta,debt_delta)
  VALUES(receipt.user_id,receipt.session_id,'payment_refund',-debit,0,revocation-debit);
  RETURN true;
END;
$function$;
