-- Private storage index. Grants must be issued from verified payment records.
CREATE TABLE IF NOT EXISTS public.vv_creation_storage_grants (
  user_id text PRIMARY KEY,
  payment_reference text NOT NULL UNIQUE,
  plan text NOT NULL CHECK (plan IN ('trial','basic','pro','business','lifetime')),
  paid_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at > paid_at)
);

CREATE TABLE IF NOT EXISTS public.vv_creation_storage_objects (
  user_id text NOT NULL REFERENCES public.vv_creation_storage_grants(user_id),
  job_id text NOT NULL,
  object_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('image','video','audio')),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

CREATE OR REPLACE FUNCTION public.vv_reserve_creation_storage(
  p_user text, p_job text, p_key text, p_kind text, p_bytes bigint
) RETURNS text LANGUAGE plpgsql SET search_path = pg_catalog, public AS $fn$
DECLARE
  grant_row public.vv_creation_storage_grants%ROWTYPE;
  existing public.vv_creation_storage_objects%ROWTYPE;
  quota bigint;
  used numeric;
BEGIN
  IF coalesce(length(p_user),0) NOT BETWEEN 1 AND 200 OR
     coalesce(length(p_job),0) NOT BETWEEN 1 AND 200 OR
     coalesce(length(p_key),0) NOT BETWEEN 1 AND 512 OR
     p_kind IS NULL OR p_kind NOT IN ('image','video','audio') OR
     p_bytes IS NULL OR p_bytes <= 0 THEN
    RAISE EXCEPTION 'INVALID_CREATION_STORAGE_REQUEST';
  END IF;
  SELECT * INTO grant_row FROM public.vv_creation_storage_grants
    WHERE user_id=p_user FOR UPDATE;
  IF NOT FOUND OR now()<grant_row.paid_at OR now()>=grant_row.expires_at THEN
    RETURN 'inactive';
  END IF;
  SELECT * INTO existing FROM public.vv_creation_storage_objects
    WHERE user_id=p_user AND job_id=p_job;
  IF FOUND THEN
    IF existing.object_key<>p_key OR existing.kind<>p_kind OR existing.size_bytes<>p_bytes THEN
      RETURN 'conflict';
    END IF;
    RETURN CASE WHEN existing.ready THEN 'ready' ELSE 'pending' END;
  END IF;
  quota:=CASE grant_row.plan
    WHEN 'trial' THEN 500000000 WHEN 'basic' THEN 2000000000
    WHEN 'pro' THEN 10000000000 WHEN 'business' THEN 50000000000
    WHEN 'lifetime' THEN 1000000000000 END;
  SELECT coalesce(sum(size_bytes),0) INTO used
    FROM public.vv_creation_storage_objects WHERE user_id=p_user;
  IF p_bytes>quota-used THEN RETURN 'quota_exceeded'; END IF;
  INSERT INTO public.vv_creation_storage_objects(user_id,job_id,object_key,kind,size_bytes)
    VALUES (p_user,p_job,p_key,p_kind,p_bytes);
  RETURN 'reserved';
END;
$fn$;
