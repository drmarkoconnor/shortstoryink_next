-- v1.2 follow-up compatibility hardening.
-- The existing application grants anonymous SELECT on submissions and relies on
-- RLS to return zero rows. The sharing helper must therefore be executable by
-- studio_anon as well; it returns false for a missing request user.

grant execute on function private.can_read_shared_submission(uuid,uuid)
  to studio_anon;
