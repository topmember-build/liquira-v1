-- ============================================================
-- FX TRANSACTIONS (Arc settlement lifecycle)
-- ============================================================
CREATE TABLE public.fx_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL DEFAULT 'treasury',
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  from_amount NUMERIC NOT NULL,
  to_amount NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  fee NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'success' | 'failed'
  arc_tx_hash TEXT,
  circle_transfer_id TEXT,
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fx_transactions ENABLE ROW LEVEL SECURITY;

-- Allow read/write for service role and authenticated users (treasury)
CREATE POLICY "fx_tx_all" ON public.fx_transactions FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER fx_transactions_touch BEFORE UPDATE ON public.fx_transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Indexes for polling and user queries
CREATE INDEX idx_fx_transactions_id ON public.fx_transactions(transaction_id);
CREATE INDEX idx_fx_transactions_user ON public.fx_transactions(user_id, created_at DESC);
CREATE INDEX idx_fx_transactions_status ON public.fx_transactions(status, updated_at DESC);
