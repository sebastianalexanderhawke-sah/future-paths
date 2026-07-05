-- Lived-experience evidence sources for the behavior ledger.
--
-- Until now the ledger only ever received one extraction per situation
-- (source_type 'situation_complete'), captured at decision time. Check-ins and
-- reflection answers triggered Future Selves regeneration but contributed no
-- observations, so recognition recomputed identical scores from unchanged
-- evidence — lived experience never became evidence.
--
-- Each check-in and each answered reflection now produces its own extraction.
-- check_in_id records which check-in carried the evidence, and the
-- (check_in_id, source_type) index lets the application guarantee exactly one
-- extraction per (check-in, source) with a cheap existence check — no ledger
-- row is ever updated or deleted, so the ledger stays append-only. Deleting a
-- check-in (directly or via its moment's cascade) removes the evidence derived
-- from it, consistent with the existing moment_id cascade.

alter table public.behavior_observations
  add column if not exists check_in_id uuid references public.check_ins (id) on delete cascade;

create index if not exists behavior_observations_check_in_source_idx
  on public.behavior_observations (check_in_id, source_type);

-- Every row written to date used the default 'situation_complete', so this
-- constraint is safe on existing data and locks the source vocabulary.
alter table public.behavior_observations
  add constraint behavior_observations_source_type_check
  check (source_type in ('situation_complete', 'check_in', 'reflection_answer'));
