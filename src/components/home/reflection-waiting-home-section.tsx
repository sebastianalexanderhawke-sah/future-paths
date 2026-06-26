import Link from "next/link";

import { OverviewSection } from "@/components/overview/overview-section";
import type { ReflectionCheckIn } from "@/lib/reflections";

type ReflectionWaitingHomeSectionProps = {
  pending: ReflectionCheckIn | null;
};

export function ReflectionWaitingHomeSection({ pending }: ReflectionWaitingHomeSectionProps) {
  if (!pending) {
    return (
      <OverviewSection label="Reflection" title="You're up to date.">
        <p className="text-body-small text-ink-secondary">
          No reflections are waiting right now.
        </p>
        <Link
          href="/reflections"
          className="text-body-small text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
        >
          View all reflections →
        </Link>
      </OverviewSection>
    );
  }

  return (
    <OverviewSection label="Reflection" title="1 reflection waiting">
      <Link
        href="/reflections"
        className="block rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300"
      >
        <p className="text-body-small text-ink-secondary">{pending.moment.title}</p>
        <p className="mt-3 text-body text-ink-primary">{pending.reflection_question}</p>
        <p className="mt-4 text-body-small text-ink-secondary">Reflect →</p>
      </Link>
      <Link
        href="/reflections"
        className="text-body-small text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
      >
        View all reflections →
      </Link>
    </OverviewSection>
  );
}
