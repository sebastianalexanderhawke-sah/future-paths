-- Paths: widen sort_order upper bound from 4 to 6.
-- The original constraint (sort_order <= 4) was written when generation
-- produced exactly five paths (0-indexed: 0–4). The crossroad prompt now
-- generates five to seven paths, so sort_order values 5 and 6 are valid.

alter table public.paths drop constraint paths_sort_order_check;

alter table public.paths add constraint paths_sort_order_check
  check (sort_order >= 0 and sort_order <= 6);
