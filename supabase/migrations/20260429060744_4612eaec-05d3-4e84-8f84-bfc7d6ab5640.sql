
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.swaps_notify_trigger() FROM PUBLIC, anon, authenticated;
