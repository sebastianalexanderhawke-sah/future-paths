-- Extend timeline_events for identity updates.

alter table public.timeline_events
  drop constraint if exists timeline_events_event_type_check;

alter table public.timeline_events
  add constraint timeline_events_event_type_check
  check (
    event_type in (
      'moment_created',
      'paths_generated',
      'path_chosen',
      'check_in_recorded',
      'identity_update'
    )
  );

alter table public.timeline_events
  drop constraint if exists timeline_events_reference_type_check;

alter table public.timeline_events
  add constraint timeline_events_reference_type_check
  check (reference_type in ('moment', 'path', 'check_in', 'identity_update'));
