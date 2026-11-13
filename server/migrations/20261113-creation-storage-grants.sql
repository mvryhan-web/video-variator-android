-- Called by the storage integration only after Stripe payment and ownership verification.
CREATE TABLE IF NOT EXISTS public.vv_creation_storage_payments (
  payment_reference text PRIMARY KEY,
  user_id text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('trial','basic','pro','business','lifetime')),
  paid_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at > paid_at)
);

CREATE OR REPLACE FUNCTION public.vv_record_creation_storage_payment(
  p_user text, p_reference text, p_plan text, p_paid_at timestamptz, p_paid_through timestamptz
) RETURNS text LANGUAGE plpgsql SET search_path = pg_catalog, public AS $fn$
DECLARE
  expiry timestamptz;
  prior public.vv_creation_storage_payments%ROWTYPE;
BEGIN
  IF coalesce(length(p_user),0) NOT BETWEEN 1 AND 200 OR
     coalesce(length(p_reference),0) NOT BETWEEN 1 AND 200 OR
     p_plan IS NULL OR p_plan NOT IN ('trial','basic','pro','business','lifetime') OR
     p_paid_at IS NULL OR NOT isfinite(p_paid_at) OR p_paid_at > now() THEN
    RAISE EXCEPTION 'INVALID_CREATION_STORAGE_PAYMENT';
  END IF;
  expiry := CASE p_plan
    WHEN 'trial' THEN p_paid_at + interval '72 hours'
    WHEN 'lifetime' THEN ((p_paid_at AT TIME ZONE 'UTC') + interval '12 months') AT TIME ZONE 'UTC'
    ELSE p_paid_through END;
  IF expiry IS NULL OR NOT isfinite(expiry) OR expiry <= p_paid_at THEN
    RAISE EXCEPTION 'INVALID_CREATION_STORAGE_PERIOD';
  END IF;
  INSERT INTO public.vv_creation_storage_payments(payment_reference,user_id,plan,paid_at,expires_at)
    VALUES (p_reference,p_user,p_plan,p_paid_at,expiry)
    ON CONFLICT (payment_reference) DO NOTHING;
  IF NOT FOUND THEN
    SELECT * INTO prior FROM public.vv_creation_storage_payments WHERE payment_reference=p_reference;
    IF (prior.user_id,prior.plan,prior.paid_at,prior.expires_at)
      IS DISTINCT FROM (p_user,p_plan,p_paid_at,expiry) THEN
      RAISE EXCEPTION 'CREATION_STORAGE_PAYMENT_CONFLICT';
    END IF;
    RETURN 'duplicate';
  END IF;
  INSERT INTO public.vv_creation_storage_grants AS grants(user_id,payment_reference,plan,paid_at,expires_at)
    VALUES (p_user,p_reference,p_plan,p_paid_at,expiry)
    ON CONFLICT (user_id) DO UPDATE
      SET payment_reference=excluded.payment_reference,plan=excluded.plan,
          paid_at=excluded.paid_at,expires_at=excluded.expires_at
    WHERE excluded.paid_at>grants.paid_at AND
      (grants.expires_at<=excluded.paid_at OR
       (excluded.plan<>'trial' AND (grants.plan<>'lifetime' OR excluded.plan='lifetime')));
  IF FOUND THEN RETURN 'recorded'; END IF;
  RETURN 'historical';
END;
$fn$;
