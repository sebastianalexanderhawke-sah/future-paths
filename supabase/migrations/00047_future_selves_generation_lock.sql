-- Cross-instance serialization for Future Selves generation.
--
-- Replaces the correctness role of the in-process Map that previously
-- serialized generateFutureSelves() per user (which only worked within a
-- single Node process). This lease-based advisory lock serializes generation
-- across every application instance. The in-process promise chain is retained
-- purely as an intra-instance fast path; this lock is the authoritative
-- cross-instance guarantee.
--
-- A lock is a single row per user with a holder token and an expiry. A dead
-- holder (crashed instance) is automatically reclaimable once its lease
-- expires, so a crash can never deadlock a user's generation permanently.
-- Acquisition is re-entrant for the current holder: re-calling acquire with
-- the same holder token extends the lease, which lets the application
-- heartbeat during a long generation so mutual exclusion cannot lapse mid-run.

create table if not exists public.future_selves_generation_locks (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  holder     uuid not null,
  expires_at timestamptz not null
);

alter table public.future_selves_generation_locks enable row level security;

-- No RLS policies: this table is only ever touched by the SECURITY DEFINER
-- functions below, which derive the user from auth.uid(). Direct client access
-- is therefore denied by default (RLS on, no policy = no rows), and table
-- privileges are revoked outright as a second layer.
revoke all on public.future_selves_generation_locks from public, anon, authenticated;

-- Acquire the current user's lock. Returns true only if, after this call, the
-- caller holds the lock. Succeeds when the lock row is absent, when the
-- existing lease has expired (takeover from a dead holder), or when the caller
-- already holds it (renewal — extends the lease by the full TTL).
create or replace function public.acquire_future_selves_lock(
  p_holder uuid,
  p_ttl_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_acquired boolean;
begin
  if v_uid is null or p_holder is null then
    return false;
  end if;

  -- This function is executable by any authenticated user, so lease bounds
  -- cannot be trusted to the application: a zero or negative TTL would create
  -- an instantly-expired (useless) lock, and an oversized one would let a
  -- crashed holder wedge the user's generation for hours.
  if p_ttl_seconds is null or p_ttl_seconds < 1 or p_ttl_seconds > 600 then
    raise exception 'p_ttl_seconds must be between 1 and 600';
  end if;

  insert into public.future_selves_generation_locks as l (user_id, holder, expires_at)
  values (v_uid, p_holder, v_now + make_interval(secs => p_ttl_seconds))
  on conflict (user_id) do update
    set holder = excluded.holder,
        expires_at = excluded.expires_at
    where l.expires_at < v_now
       or l.holder = excluded.holder;

  select (l.holder = p_holder)
    into v_acquired
    from public.future_selves_generation_locks l
   where l.user_id = v_uid;

  return coalesce(v_acquired, false);
end;
$$;

-- Release the current user's lock, but only if this caller still holds it.
create or replace function public.release_future_selves_lock(p_holder uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_holder is null then
    return;
  end if;

  delete from public.future_selves_generation_locks
   where user_id = v_uid
     and holder = p_holder;
end;
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default; revoke it so only
-- authenticated users (and service_role, which bypasses RLS anyway) can call
-- these.
revoke execute on function public.acquire_future_selves_lock(uuid, integer) from public, anon;
revoke execute on function public.release_future_selves_lock(uuid) from public, anon;

grant execute on function public.acquire_future_selves_lock(uuid, integer) to authenticated;
grant execute on function public.release_future_selves_lock(uuid) to authenticated;
