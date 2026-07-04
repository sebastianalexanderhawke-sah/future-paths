-- Prevent duplicate path generation for a situation.
--
-- Path generation was guarded only by a read-then-insert existence check in
-- application code, which two concurrent requests can both pass, producing two
-- full path sets for the same moment. A unique index on (moment_id, sort_order)
-- makes a second concurrent set impossible: the second request's sort_order=0
-- row collides and the whole insert fails atomically. This protects every
-- insert site (the generatePaths lib function and the decision-simulator
-- streaming route) uniformly.

-- Defensive de-duplication so the unique index can be created on databases that
-- already accumulated duplicate sets from a past race. Keeps the
-- earliest-created row for each (moment_id, sort_order); ties broken by id.
-- On a healthy database this deletes nothing.
delete from public.paths p
using public.paths keep
where p.moment_id = keep.moment_id
  and p.sort_order = keep.sort_order
  and (
    p.created_at > keep.created_at
    or (p.created_at = keep.created_at and p.id > keep.id)
  );

create unique index if not exists paths_moment_id_sort_order_idx
  on public.paths (moment_id, sort_order);
