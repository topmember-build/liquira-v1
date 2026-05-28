-- Create tables for private beta invites, users, and sessions.

CREATE TABLE IF NOT EXISTS public.beta_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  unlimited_uses boolean NOT NULL DEFAULT false,
  uses_remaining integer,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by text,
  notes text,
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_beta_access_codes_code ON public.beta_access_codes(code);

CREATE TABLE IF NOT EXISTS public.beta_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  wallet_address text,
  invite_code text,
  access_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_users_email ON public.beta_users(email);
CREATE INDEX IF NOT EXISTS idx_beta_users_wallet_address ON public.beta_users(wallet_address);

CREATE TABLE IF NOT EXISTS public.beta_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  session_token text NOT NULL UNIQUE,
  invite_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_beta_sessions_token ON public.beta_sessions(session_token);
