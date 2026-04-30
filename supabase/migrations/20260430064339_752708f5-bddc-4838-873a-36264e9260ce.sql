ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_currency text NOT NULL DEFAULT 'USD';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_currency_check
  CHECK (display_currency IN ('USD','NGN','EUR','GBP'));