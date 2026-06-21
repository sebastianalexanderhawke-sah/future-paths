-- Future selves: replace the stage/momentum model with a relative-likelihood
-- model. Each generation run produces 2-4 future selves whose percentages
-- sum to 100, each carrying its own evidence strength, summary, benefits,
-- consequences, and prediction rather than an abstract stage/momentum score.

alter table public.future_selves drop column stage;
alter table public.future_selves rename column momentum to percentage;
alter table public.future_selves rename column description to summary;

alter table public.future_selves add column evidence_strength text not null default 'Emerging' check (
  evidence_strength in ('Emerging', 'Moderate', 'Strong')
);
alter table public.future_selves add column benefits jsonb not null default '[]'::jsonb;
alter table public.future_selves add column consequences jsonb not null default '[]'::jsonb;
alter table public.future_selves add column prediction text not null default '';

drop index if exists future_selves_user_status_momentum_idx;
create index future_selves_user_status_percentage_idx
  on public.future_selves (user_id, status, percentage desc);

alter table public.future_self_events rename column momentum_before to percentage_before;
alter table public.future_self_events rename column momentum_after to percentage_after;
