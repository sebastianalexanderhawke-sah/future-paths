-- Atomic multi-step write operations.
--
-- These workflows previously performed several separate writes from the
-- application and unwound partial failures with hand-rolled rollback chains
-- (delete-the-moment, revert-is_chosen, delete-the-paths). Each is now a single
-- database function that runs in one implicit transaction, so either every
-- write lands or none does — no partial state, no compensation logic.
--
-- All functions are SECURITY INVOKER: they run as the calling user, so the
-- existing Row Level Security policies still apply to every statement and
-- ownership enforcement is unchanged. user_id is always derived from auth.uid()
-- inside the function, never trusted from the caller. Each function also
-- verifies auth.uid() explicitly and validates its parameters so a bad call
-- fails with a clear error instead of a downstream constraint violation.

-- ---------------------------------------------------------------------------
-- createMoment: insert the moment and its "moment_created" timeline event.
-- ---------------------------------------------------------------------------
create or replace function public.create_moment_with_event(
  p_title text,
  p_description text
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

  insert into public.moments (user_id, title, description)
  values (v_uid, p_title, p_description)
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

-- ---------------------------------------------------------------------------
-- choosePath: mark the path chosen and record the "path_chosen" timeline event.
-- Ownership / already-chosen / lock guards remain in application code; this
-- function performs only the atomic commit of the two coupled writes. The
-- update is additionally bound to (user_id, moment_id) so a path can never be
-- committed against a moment it does not belong to.
-- ---------------------------------------------------------------------------
create or replace function public.commit_path_choice(
  p_path_id uuid,
  p_moment_id uuid,
  p_chosen_at timestamptz,
  p_summary text,
  p_themes jsonb
)
returns public.paths
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_path public.paths;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_path_id is null or p_moment_id is null or p_chosen_at is null then
    raise exception 'invalid_parameters';
  end if;

  update public.paths
     set is_chosen = true,
         chosen_at = p_chosen_at
   where id = p_path_id
     and moment_id = p_moment_id
     and user_id = v_uid
  returning * into v_path;

  if v_path.id is null then
    raise exception 'path_not_updatable';
  end if;

  insert into public.timeline_events (
    user_id, event_type, reference_type, reference_id, title, summary, metadata
  )
  values (
    v_uid, 'path_chosen', 'path', p_path_id, 'Path chosen', p_summary,
    jsonb_build_object(
      'moment_id', p_moment_id,
      'path_id', p_path_id,
      'path_description', p_summary,
      'themes', p_themes
    )
  );

  return v_path;
end;
$$;

-- ---------------------------------------------------------------------------
-- generatePaths: update the moment's understanding/themes, insert the full
-- generated path set, and record the "paths_generated" timeline event. The
-- unique index paths_moment_id_sort_order_idx guarantees that two concurrent
-- generations cannot both commit — the loser's insert raises a unique
-- violation and this whole function rolls back.
--
-- Ownership: the paths RLS insert policy only checks user_id, so it alone
-- would allow attaching path rows (and a timeline event) to another user's
-- moment_id. The moment update below is therefore required to match a row
-- owned by the caller, and the function aborts if it does not.
-- ---------------------------------------------------------------------------
create or replace function public.commit_generated_paths(
  p_moment_id uuid,
  p_current_understanding text,
  p_opportunity_themes jsonb,
  p_risk_themes jsonb,
  p_paths jsonb,
  p_timeline_summary text,
  p_timeline_metadata jsonb
)
returns setof public.paths
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_moment_id is null then
    raise exception 'invalid_parameters';
  end if;

  -- A path set is 1–5 paths; sort_order is constrained to 0..4 and the unique
  -- index allows one row per (moment_id, sort_order), so anything outside this
  -- shape is a malformed call, rejected before any write.
  if p_paths is null
     or jsonb_typeof(p_paths) <> 'array'
     or jsonb_array_length(p_paths) < 1
     or jsonb_array_length(p_paths) > 5 then
    raise exception 'invalid_paths_payload';
  end if;

  update public.moments
     set current_understanding = p_current_understanding,
         opportunity_themes = p_opportunity_themes,
         risk_themes = p_risk_themes
   where id = p_moment_id
     and user_id = v_uid;

  if not found then
    raise exception 'moment_not_found';
  end if;

  insert into public.paths (
    moment_id, user_id, description, benefits, consequences,
    future_shift, themes, sort_order
  )
  select
    p_moment_id,
    v_uid,
    (elem ->> 'description'),
    coalesce(elem -> 'benefits', '[]'::jsonb),
    coalesce(elem -> 'consequences', '[]'::jsonb),
    (elem ->> 'future_shift'),
    coalesce(elem -> 'themes', '[]'::jsonb),
    (elem ->> 'sort_order')::smallint
  from jsonb_array_elements(p_paths) as elem;

  insert into public.timeline_events (
    user_id, event_type, reference_type, reference_id, title, summary, metadata
  )
  values (
    v_uid, 'paths_generated', 'moment', p_moment_id, 'Paths explored',
    p_timeline_summary, p_timeline_metadata
  );

  return query
    select *
      from public.paths
     where moment_id = p_moment_id
       and user_id = v_uid
     order by sort_order asc;
end;
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default; revoke it so only
-- authenticated users can call these (service_role bypasses RLS regardless).
revoke execute on function public.create_moment_with_event(text, text) from public, anon;
revoke execute on function public.commit_path_choice(uuid, uuid, timestamptz, text, jsonb) from public, anon;
revoke execute on function public.commit_generated_paths(uuid, text, jsonb, jsonb, jsonb, text, jsonb) from public, anon;

grant execute on function public.create_moment_with_event(text, text) to authenticated;
grant execute on function public.commit_path_choice(uuid, uuid, timestamptz, text, jsonb) to authenticated;
grant execute on function public.commit_generated_paths(uuid, text, jsonb, jsonb, jsonb, text, jsonb) to authenticated;
