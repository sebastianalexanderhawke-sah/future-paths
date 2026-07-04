-- Idempotency key for check-in creation.
--
-- A client supplies a stable per-submission token. The partial unique index
-- guarantees that repeated requests carrying the same token can never create
-- more than one check-in for a user, even under truly concurrent submission
-- (the second insert fails with a unique violation, which the application
-- resolves to the already-created check-in). Legacy rows and any request
-- without a token keep client_token NULL and are unaffected.

alter table public.check_ins
  add column if not exists client_token uuid;

create unique index if not exists check_ins_user_client_token_idx
  on public.check_ins (user_id, client_token)
  where client_token is not null;
