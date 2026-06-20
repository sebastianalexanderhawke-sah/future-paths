-- Current self: rename headline to title (matches the generated field name),
-- and add observations — evidence-grounded statements about what appears
-- true right now, distinct from the narrative summary.

alter table public.current_self rename column headline to title;
alter table public.current_self add column observations jsonb not null default '[]'::jsonb;
