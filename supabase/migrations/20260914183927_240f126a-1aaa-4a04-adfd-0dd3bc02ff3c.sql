REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_allowed() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_allowed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_access() TO authenticated;