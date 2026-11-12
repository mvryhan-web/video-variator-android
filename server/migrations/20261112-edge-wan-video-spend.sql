CREATE OR REPLACE FUNCTION public.vv_edge_generation_credit(
  p_user text,p_job text,p_fingerprint text,p_action text
) RETURNS text LANGUAGE plpgsql SET search_path = pg_catalog, public AS $fn$
DECLARE
  w public.vv_ai_wallet%ROWTYPE;
  r public.vv_ai_reservation%ROWTYPE;
  v_debt bigint;
  v_return bigint;
  v_status text;
  v_price integer;
BEGIN
  IF p_user IS NULL OR length(p_user) NOT BETWEEN 1 AND 200 OR
     p_job !~ '^job_(image|video)_wan_[0-9a-f]{32}$' OR
     p_action NOT IN ('reserve','capture','release') OR
     (p_action='reserve' AND p_fingerprint !~ '^[0-9a-f]{64}$') THEN
    RAISE EXCEPTION 'INVALID_GENERATION_CREDIT_OPERATION';
  END IF;
  v_price:=CASE WHEN p_job LIKE 'job_video_wan_%' THEN 20 ELSE 5 END;
  SELECT * INTO w FROM public.vv_ai_wallet WHERE user_id=p_user FOR UPDATE;
  IF NOT FOUND THEN RETURN 'insufficient'; END IF;
  FOR r IN SELECT * FROM public.vv_ai_reservation
    WHERE user_id=p_user AND status='held' AND edge_expires_at<=now()
  LOOP
    v_debt:=least(w.debt,r.credits);
    UPDATE public.vv_ai_reservation SET status='released' WHERE job_id=r.job_id;
    UPDATE public.vv_ai_wallet SET available=available+r.credits-v_debt,
      reserved=reserved-r.credits,debt=debt-v_debt WHERE user_id=p_user RETURNING * INTO w;
    INSERT INTO public.vv_ai_ledger(user_id,reference,kind,available_delta,reserved_delta,debt_delta)
      VALUES(p_user,r.job_id,'released',r.credits-v_debt,-r.credits,-v_debt);
  END LOOP;
  SELECT * INTO r FROM public.vv_ai_reservation WHERE job_id=p_job AND user_id=p_user;
  IF p_action='reserve' THEN
    IF FOUND THEN
      IF r.fingerprint<>p_fingerprint THEN RETURN 'conflict'; END IF;
      RETURN r.status;
    END IF;
    IF w.available<v_price OR w.debt>0 THEN RETURN 'insufficient'; END IF;
    INSERT INTO public.vv_ai_reservation(job_id,user_id,credits,fingerprint,status,edge_expires_at)
      VALUES(p_job,p_user,v_price,p_fingerprint,'held',now()+interval '24 hours');
    UPDATE public.vv_ai_wallet SET available=available-v_price,reserved=reserved+v_price WHERE user_id=p_user;
    INSERT INTO public.vv_ai_ledger(user_id,reference,kind,available_delta,reserved_delta,debt_delta)
      VALUES(p_user,p_job,'reserve',-v_price,v_price,0);
    RETURN 'new';
  END IF;
  IF NOT FOUND OR r.edge_expires_at IS NULL THEN RETURN 'missing'; END IF;
  IF r.status<>'held' THEN RETURN r.status; END IF;
  v_return:=CASE WHEN p_action='release' THEN r.credits ELSE 0 END;
  v_debt:=least(w.debt,v_return);
  v_status:=CASE WHEN p_action='release' THEN 'released' ELSE 'captured' END;
  UPDATE public.vv_ai_reservation SET status=v_status WHERE job_id=p_job;
  UPDATE public.vv_ai_wallet SET available=available+v_return-v_debt,
    reserved=reserved-r.credits,debt=debt-v_debt WHERE user_id=p_user;
  INSERT INTO public.vv_ai_ledger(user_id,reference,kind,available_delta,reserved_delta,debt_delta)
    VALUES(p_user,p_job,v_status,v_return-v_debt,-r.credits,-v_debt);
  RETURN v_status;
END;
$fn$;
