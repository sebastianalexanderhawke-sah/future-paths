-- Adds the "weakened" Future Self event: recorded when an active future's
-- likelihood decreases on a generation run (the decline counterpart of
-- "grew"). Until now decreases wrote no event at all, so the event stream
-- could not tell the weakening side of the story — the Overview's
-- What's Changed card now reads entirely from future_self_events.

alter table public.future_self_events
  drop constraint future_self_events_event_type_check;

alter table public.future_self_events
  add constraint future_self_events_event_type_check check (
    event_type in ('emerged', 'grew', 'weakened', 'faded', 'returned')
  );
