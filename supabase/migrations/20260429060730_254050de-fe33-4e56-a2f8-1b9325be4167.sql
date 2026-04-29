
-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_all_own ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

CREATE TABLE public.wallet_link_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  address text NOT NULL,
  nonce text NOT NULL,
  message text NOT NULL,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_link_nonces ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallet_nonces_own ON public.wallet_link_nonces FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_wallets
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX user_wallets_address_unique ON public.user_wallets (lower(address));
CREATE UNIQUE INDEX user_wallets_one_default_per_user ON public.user_wallets (user_id) WHERE is_default = true;

ALTER TABLE public.profiles
  ADD COLUMN notify_swap_confirmed boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_swap_failed boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_schedule_run boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_prefs_changed boolean NOT NULL DEFAULT false,
  ADD COLUMN email_notifications boolean NOT NULL DEFAULT false;

ALTER PUBLICATION supabase_realtime ADD TABLE public.swaps;
ALTER TABLE public.swaps REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid, _type text, _title text, _body text DEFAULT NULL,
  _link text DEFAULT NULL, _metadata jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  prof public.profiles%ROWTYPE;
  send boolean := true;
BEGIN
  SELECT * INTO prof FROM public.profiles WHERE id = _user_id;
  IF prof.id IS NOT NULL THEN
    IF _type = 'swap.confirmed' AND NOT prof.notify_swap_confirmed THEN send := false; END IF;
    IF _type = 'swap.failed' AND NOT prof.notify_swap_failed THEN send := false; END IF;
    IF _type = 'schedule.run' AND NOT prof.notify_schedule_run THEN send := false; END IF;
    IF _type = 'prefs.updated' AND NOT prof.notify_prefs_changed THEN send := false; END IF;
  END IF;
  IF send THEN
    INSERT INTO public.notifications(user_id, type, title, body, link, metadata)
    VALUES (_user_id, _type, _title, _body, _link, _metadata);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.swaps_notify_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM public.notify_user(
        NEW.user_id, 'swap.confirmed',
        format('Swap confirmed: %s → %s', NEW.from_token, NEW.to_token),
        format('Received %s %s at rate %s', round(coalesce(NEW.amount_out,0)::numeric, 4), NEW.to_token, round(coalesce(NEW.rate,0)::numeric, 6)),
        '/account/history',
        jsonb_build_object('swap_id', NEW.id, 'tx_hash', NEW.tx_hash)
      );
    ELSIF NEW.status = 'failed' THEN
      PERFORM public.notify_user(
        NEW.user_id, 'swap.failed',
        format('Swap failed: %s → %s', NEW.from_token, NEW.to_token),
        coalesce(NEW.error_message, 'Swap could not be completed.'),
        '/account/history',
        jsonb_build_object('swap_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS swaps_notify ON public.swaps;
CREATE TRIGGER swaps_notify AFTER UPDATE ON public.swaps
FOR EACH ROW EXECUTE FUNCTION public.swaps_notify_trigger();

DROP TRIGGER IF EXISTS swaps_touch_updated_at ON public.swaps;
CREATE TRIGGER swaps_touch_updated_at BEFORE UPDATE ON public.swaps
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS routes_touch_updated_at ON public.saved_routes;
CREATE TRIGGER routes_touch_updated_at BEFORE UPDATE ON public.saved_routes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS schedules_touch_updated_at ON public.route_schedules;
CREATE TRIGGER schedules_touch_updated_at BEFORE UPDATE ON public.route_schedules
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
