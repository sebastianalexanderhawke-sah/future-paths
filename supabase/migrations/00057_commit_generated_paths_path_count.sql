-- Fix commit_generated_paths rejecting valid 6- and 7-path sets.
--
-- The path-count guard in migration 00050 capped p_paths at 5, with a comment
-- claiming "sort_order is constrained to 0..4". That was the pre-00043 world:
-- migration 00043 widened paths_sort_order_check to 0..6 because the crossroad
-- prompt generates five to seven paths, and crossroadOutputSchema requires
-- 5-7 paths. Any real generation of 6 or 7 paths therefore raised
-- invalid_paths_payload. (The mock generator emits exactly 5, which is why
-- this never surfaced outside production AI output.)
--
-- This replaces the function with the upper bound corrected to 7 — the bound
-- the paths table itself enforces. Every other check (shape validation,
-- ownership via auth.uid(), atomicity, the (moment_id, sort_order) unique
-- index) is unchanged.
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

  -- A path set is 1–7 paths; sort_order is constrained to 0..6 (see migration
  -- 00043) and the unique index allows one row per (moment_id, sort_order), so
  -- anything outside this shape is a malformed call, rejected before any write.
  if p_paths is null
     or jsonb_typeof(p_paths) <> 'array'
     or jsonb_array_length(p_paths) < 1
     or jsonb_array_length(p_paths) > 7 then
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

-- create or replace preserves the privileges set in 00050 (execute revoked
-- from public/anon, granted to authenticated); restated here so this file
-- stands on its own if the function is ever recreated from scratch.
revoke execute on function public.commit_generated_paths(uuid, text, jsonb, jsonb, jsonb, text, jsonb) from public, anon;
grant execute on function public.commit_generated_paths(uuid, text, jsonb, jsonb, jsonb, text, jsonb) to authenticated;
