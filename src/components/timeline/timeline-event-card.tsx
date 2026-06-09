import type { TimelineEvent } from "@/types/database";

const EVENT_LABELS: Record<TimelineEvent["event_type"], string> = {
  moment_created: "Moment",
  paths_generated: "Paths",
  path_chosen: "Path chosen",
  check_in_recorded: "Check-in",
  identity_update: "Identity update",
};

type TimelineEventCardProps = {
  event: TimelineEvent;
};

export function TimelineEventCard({ event }: TimelineEventCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {EVENT_LABELS[event.event_type]}
        </p>
        <p className="text-xs text-zinc-400">
          {new Date(event.occurred_at).toLocaleDateString()}
        </p>
      </div>
      <h3 className="mt-2 text-sm font-medium text-zinc-900">{event.title}</h3>
      {event.summary ? (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-600">
          {event.summary}
        </p>
      ) : null}
    </article>
  );
}
