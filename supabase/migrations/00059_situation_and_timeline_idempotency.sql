-- Situation and timeline idempotency.
--
-- 1. moments.client_token: the same client-token idempotency pattern already
--    used by check_ins (00048). Situation creation happens at the start of AI
--    generation requests; if the browser disconnects after the server created
--    the moment but before the client receives success, a retry carrying the
--    same token recovers the existing situation instead of creating a
--    duplicate. Nullable: server-initiated creations without a token behave
--    exactly as before.
--
-- 2. timeline_events uniqueness: every writer records exactly one event per
--    (event_type, reference) — moment_created per moment, paths_generated per
--    moment (one set per moment since 00049), path_chosen per path,
--    check_in_recorded per check-in, identity_update per identity_update row.
--    Duplicates can only come from retried partial-failure recovery, so a
--    unique index makes those retries idempotent without changing any
--    legitimate write. Existing duplicates are removed first (keeping the
--    earliest event, which is the one the original request recorded).

alter table public.moments
  add column if not exists client_token uuid;

create unique index if not exists moments_user_id_client_token_key
  on public.moments (user_id, client_token)
  where client_token is not null;

-- ---------------------------------------------------------------------------
-- create_moment_with_event: add optional p_client_token. Body is otherwise
-- identical to 00050. The old 2-arg signature is dropped so there is exactly
-- one definition.
-- ---------------------------------------------------------------------------
drop function if exists public.create_moment_with_event(text, text);

create or replace function public.create_moment_with_event(
  p_title text,
  p_description text,
  p_client_token uuid default null
)
returns public.moments
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_moment public.moments;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_title is null or btrim(p_title) = '' then
    raise exception 'title_required';
  end if;

  insert into public.moments (user_id, title, description, client_token)
  values (v_uid, p_title, p_description, p_client_token)
  returning * into v_moment;

  insert into public.timeline_events (
    user_id, event_type, reference_type, reference_id, title, summary, metadata
  )
  values (
    v_uid, 'moment_created', 'moment', v_moment.id, 'Captured a moment', p_description,
    jsonb_build_object('moment_id', v_moment.id, 'moment_title', p_title)
  );

  return v_moment;
end;
$$;

revoke execute on function public.create_moment_with_event(text, text, uuid) from public, anon;
grant execute on function public.create_moment_with_event(text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Timeline idempotency: remove historical duplicates (keep the earliest
-- event per reference), then enforce uniqueness. Writers inside transactional
-- RPCs roll back atomically on conflict; the application-side writers treat
-- 23505 as already-recorded.
-- ---------------------------------------------------------------------------
delete from public.timeline_events a
using public.timeline_events b
where a.user_id = b.user_id
  and a.event_type = b.event_type
  and a.reference_type = b.reference_type
  and a.reference_id = b.reference_id
  and (
    a.created_at > b.created_at
    or (a.created_at = b.created_at and a.id > b.id)
  );

create unique index if not exists timeline_events_user_event_reference_key
  on public.timeline_events (user_id, event_type, reference_type, reference_id);
