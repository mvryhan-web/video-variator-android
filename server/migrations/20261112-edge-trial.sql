CREATE TABLE IF NOT EXISTS public.vv_edge_trial (
  user_id text NOT NULL,
  livemode boolean NOT NULL,
  session_id text PRIMARY KEY,
  payment_intent text NOT NULL UNIQUE,
  paid_at timestamptz NOT NULL,
  UNIQUE (user_id, livemode)
);
