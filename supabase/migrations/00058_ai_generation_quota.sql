-- Per-user daily AI generation quota.
--
-- Beta abuse protection: every Claude generation consumes one unit from the
-- caller's daily counter before the provider is called, so a scripted client
-- or a runaway retry loop is capped at the configured limit per user per UTC
-- day instead of spending unbounded AI budget. One row per (user, day); rows
-- for past days are dead weight of a few bytes and need no cleanup job at
-- beta scale.
--
-- The counter is cross-instance by construction (it lives in Postgres), which
-- is what makes it the authoritative cap — the in-process rate limiter in the
-- app is only a per-instance burst brake.
create table if not exists public.ai_usage_counters (
  user_id          uuid not null references auth.users (id) on delete cascade,
  day              date not null,
  generation_count integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage_counters enable row level security;

-- No RLS policies: this table is only ever touched by the SECURITY DEFINER
-- function below, which derives the user from auth.uid(). Direct client
-- access is denied by default (RLS on, no policy = no rows), and table
-- privileges are revoked outright as a second layer — a client must not be
-- able to reset or inflate its own counter.
revoke all on public.ai_usage_counters from public, anon, authenticated;

-- Atomically consume one generation from today's quota. Returns true when the
-- caller was under the limit (and the counter was incremented), false when the
-- quota is exhausted (counter unchanged). The check and the increment are a
-- single statement, so concurrent generations cannot both slip past the limit.
--
-- p_limit is supplied by the application (env-configurable) but clamped here:
-- this function is executable by any authenticated user, so the limit bounds
-- must hold even against a hand-crafted call.
create or replace function public.consume_ai_generation_quota(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 1), 1), 100000);
  v_day date := (now() at time zone 'utc')::date;
  v_consumed boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- First generation of the day inserts at 1 (v_limit >= 1 always allows it);
  -- subsequent ones increment only while under the limit. When the WHERE
  -- clause rejects the update, nothing is returned and nothing is written.
  insert into public.ai_usage_counters as c (user_id, day, generation_count)
  values (v_uid, v_day, 1)
  on conflict (user_id, day) do update
    set generation_count = c.generation_count + 1
    where c.generation_count < v_limit
  returning true into v_consumed;

  return coalesce(v_consumed, false);
end;
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default; revoke it so only
-- authenticated users can call this (service_role bypasses RLS regardless).
revoke execute on function public.consume_ai_generation_quota(integer) from public, anon;
grant execute on function public.consume_ai_generation_quota(integer) to authenticated;
