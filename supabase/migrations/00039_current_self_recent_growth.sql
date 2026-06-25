-- Current self: separate stable core traits from recent growth direction.
-- observations stores short core trait bullets (4-6 items).
-- recent_growth stores what is currently shifting (exactly 3 items).

alter table public.current_self
add column recent_growth jsonb not null default '[]'::jsonb;
