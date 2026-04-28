
-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  default_slippage_bps INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger: auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- SAVED ROUTES
-- ============================================================
CREATE TABLE public.saved_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  from_token TEXT NOT NULL,
  to_token TEXT NOT NULL,
  from_chain TEXT NOT NULL DEFAULT 'base',
  to_chain TEXT NOT NULL DEFAULT 'base',
  amount NUMERIC,
  slippage_bps INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routes_all_own" ON public.saved_routes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER saved_routes_touch BEFORE UPDATE ON public.saved_routes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_saved_routes_user ON public.saved_routes(user_id, created_at DESC);

-- ============================================================
-- ROUTE SCHEDULES
-- ============================================================
CREATE TABLE public.route_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.saved_routes(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  -- Cadence: 'manual' | 'interval' | 'daily' | 'weekly'
  cadence TEXT NOT NULL DEFAULT 'daily',
  interval_minutes INT, -- used when cadence = 'interval'
  run_at_utc TIME, -- used when cadence = 'daily' or 'weekly'
  weekday SMALLINT, -- 0=Sun..6=Sat, used when cadence='weekly'
  -- Threshold condition: only execute if rate satisfies operator/value
  -- operator: 'none' | 'gte' | 'lte'
  threshold_operator TEXT NOT NULL DEFAULT 'none',
  threshold_value NUMERIC, -- e.g. swap only if rate >= 1.085
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.route_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedules_all_own" ON public.route_schedules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER route_schedules_touch BEFORE UPDATE ON public.route_schedules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_schedules_due ON public.route_schedules(enabled, next_run_at);

-- ============================================================
-- SWAPS
-- ============================================================
CREATE TABLE public.swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES public.saved_routes(id) ON DELETE SET NULL,
  from_token TEXT NOT NULL,
  to_token TEXT NOT NULL,
  from_chain TEXT NOT NULL,
  to_chain TEXT NOT NULL,
  amount_in NUMERIC NOT NULL,
  amount_out NUMERIC,
  min_received NUMERIC,
  rate NUMERIC,
  price_impact_bps INT,
  slippage_bps INT NOT NULL,
  gas_estimate_usd NUMERIC,
  route_legs JSONB,
  quote_id TEXT,
  -- 'quoting' | 'awaiting_approval' | 'approving' | 'awaiting_signature' | 'pending' | 'confirmed' | 'failed' | 'expired'
  status TEXT NOT NULL DEFAULT 'quoting',
  tx_hash TEXT,
  explorer_url TEXT,
  error_message TEXT,
  wallet_address TEXT,
  source TEXT NOT NULL DEFAULT 'web', -- 'web' | 'api' | 'schedule'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swaps_all_own" ON public.swaps FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER swaps_touch BEFORE UPDATE ON public.swaps FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_swaps_user ON public.swaps(user_id, created_at DESC);

-- ============================================================
-- SCHEDULE RUNS
-- ============================================================
CREATE TABLE public.schedule_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.route_schedules(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.saved_routes(id) ON DELETE SET NULL,
  swap_id UUID REFERENCES public.swaps(id) ON DELETE SET NULL,
  -- 'success' | 'skipped_threshold' | 'skipped_disabled' | 'failed'
  outcome TEXT NOT NULL,
  trigger TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'cron'
  rate NUMERIC,
  threshold_operator TEXT,
  threshold_value NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs_all_own" ON public.schedule_runs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_runs_user ON public.schedule_runs(user_id, created_at DESC);
CREATE INDEX idx_runs_schedule ON public.schedule_runs(schedule_id, created_at DESC);

-- ============================================================
-- API KEYS
-- ============================================================
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- sha256 of raw key
  key_last4 TEXT NOT NULL,
  key_prefix TEXT NOT NULL DEFAULT 'lq_live',
  scopes TEXT[] NOT NULL DEFAULT ARRAY['quote','swap'],
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_all_own" ON public.api_keys FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- API USAGE
-- ============================================================
CREATE TABLE public.api_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  status_code INT NOT NULL,
  latency_ms INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_select_own" ON public.api_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usage_insert_own" ON public.api_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_usage_user_time ON public.api_usage(user_id, created_at DESC);

-- ============================================================
-- WEBHOOKS
-- ============================================================
CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  events TEXT[] NOT NULL DEFAULT ARRAY['swap.confirmed','swap.failed','schedule.run'],
  secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhooks_all_own" ON public.webhooks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.webhook_deliveries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INT,
  response_body TEXT,
  error_message TEXT,
  attempt INT NOT NULL DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries_select_own" ON public.webhook_deliveries FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX idx_deliveries_webhook ON public.webhook_deliveries(webhook_id, created_at DESC);
