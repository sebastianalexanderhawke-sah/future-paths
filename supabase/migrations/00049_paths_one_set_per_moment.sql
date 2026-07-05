-- Prevent duplicate path generation for a situation.
--
-- Path generation was guarded only by a read-then-insert existence check in
-- application code, which two concurrent requests can both pass, producing two
-- full path sets for the same moment. A unique index on (moment_id, sort_order)
-- makes a second concurrent set impossible: the second request's sort_order=0
-- row collides and the whole insert fails atomically. This protects every
-- insert site (the generatePaths lib function and the decision-simulator
-- streaming route) uniformly.
--
-- Safety: paths rows are load-bearing user history. check_ins.path_id is
-- ON DELETE CASCADE (deleting a path silently deletes its check-ins and
-- reflections), forecasts.path_id is ON DELETE SET NULL (silently detaches
-- forecasts), timeline_events references paths without a foreign key
-- (reference_type = 'path' / metadata->>'path_id'), and a duplicate may be the
-- moment's chosen path. So duplicates are NEVER deleted blindly here:
--
--   1. detect duplicate (moment_id, sort_order) groups;
--   2. per group, keep the chosen row first, then a referenced row, then the
--      earliest-created row (ties broken by id);
--   3. delete a duplicate only if it is chosen by nothing and referenced by
--      nothing;
--   4. if any duplicate that would need deleting carries user data, abort the
--      whole migration with a per-row report — nothing is deleted, and the
--      listed rows must be reconciled manually before re-running.
--
-- On a healthy database this deletes nothing and just creates the index.

do $$
declare
  v_total_losers  integer;
  v_blocked_count integer;
  v_blocked_details text;
begin
  create temp table _paths_dup_losers on commit drop as
  with dup_groups as (
    select moment_id, sort_order
      from public.paths
     group by moment_id, sort_order
    having count(*) > 1
  ),
  flagged as (
    select
      p.id,
      p.moment_id,
      p.sort_order,
      p.is_chosen,
      p.created_at,
      exists (
        select 1 from public.check_ins c where c.path_id = p.id
      ) as has_check_ins,
      exists (
        select 1 from public.forecasts f where f.path_id = p.id
      ) as has_forecasts,
      exists (
        select 1
          from public.timeline_events te
         where (te.reference_type = 'path' and te.reference_id = p.id)
            or te.metadata ->> 'path_id' = p.id::text
      ) as has_timeline_events
    from public.paths p
    join dup_groups g
      on g.moment_id = p.moment_id
     and g.sort_order = p.sort_order
  ),
  ranked as (
    select
      f.*,
      row_number() over (
        partition by f.moment_id, f.sort_order
        order by
          f.is_chosen desc,
          (f.has_check_ins or f.has_forecasts or f.has_timeline_events) desc,
          f.created_at asc,
          f.id asc
      ) as rn
    from flagged f
  )
  select id, moment_id, sort_order, is_chosen,
         has_check_ins, has_forecasts, has_timeline_events
    from ranked
   where rn > 1;

  select count(*) into v_total_losers from _paths_dup_losers;

  if v_total_losers = 0 then
    raise notice 'migration 00049: no duplicate paths found; nothing to clean up.';
  else
    select count(*),
           string_agg(
             format(
               'path %s (moment %s, sort_order %s): %s',
               l.id, l.moment_id, l.sort_order,
               concat_ws(
                 ', ',
                 case when l.is_chosen then 'is the chosen path' end,
                 case when l.has_check_ins then 'referenced by check_ins (check-in / reflection history)' end,
                 case when l.has_forecasts then 'referenced by forecasts' end,
                 case when l.has_timeline_events then 'referenced by timeline_events' end
               )
             ),
             E'\n'
           )
      into v_blocked_count, v_blocked_details
      from _paths_dup_losers l
     where l.is_chosen
        or l.has_check_ins
        or l.has_forecasts
        or l.has_timeline_events;

    if v_blocked_count > 0 then
      raise exception using
        errcode = 'P0001',
        message = format(
          'migration 00049 aborted: %s duplicate path row(s) carry user data and cannot be deleted automatically.',
          v_blocked_count
        ),
        detail = v_blocked_details,
        hint = 'Nothing was deleted. For each listed path, either repoint its '
               'check_ins / forecasts / timeline_events references to the surviving '
               'duplicate with the same (moment_id, sort_order), or confirm the row '
               'is safe to remove; then delete the duplicates manually and re-run '
               'this migration.';
    end if;

    delete from public.paths p
     using _paths_dup_losers l
     where p.id = l.id;

    raise notice
      'migration 00049: deleted % unreferenced duplicate path row(s).',
      v_total_losers;
  end if;
end
$$;

create unique index if not exists paths_moment_id_sort_order_idx
  on public.paths (moment_id, sort_order);
