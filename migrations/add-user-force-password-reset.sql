-- Additive account security flag. Existing accounts retain their current login behavior.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.must_change_password IS
  'When true, the account may only access password change until the user chooses a new password.';
