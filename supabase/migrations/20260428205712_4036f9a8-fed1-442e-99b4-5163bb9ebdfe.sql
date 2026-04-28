-- Add preferences to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_chain text NOT NULL DEFAULT 'arc-testnet',
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'dark';

-- Wallets linked to a user account
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  address text NOT NULL,
  chain text NOT NULL DEFAULT 'arc-testnet',
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, address)
);

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY wallets_all_own ON public.user_wallets
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_wallets_user_id_idx ON public.user_wallets(user_id);

-- Auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger on profiles
DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();