import Link from "next/link";

import { ReflectionAnswerForm } from "@/components/reflections/reflection-answer-form";
import { OverviewSection } from "@/components/overview/overview-section";
import type { ReflectionCheckIn } from "@/lib/reflections";

type ReflectionWaitingHomeSectionProps = {
  unansweredCount: number;
  pending: ReflectionCheckIn;
};

export function ReflectionWaitingHomeSection({
  unansweredCount,
  pending,
}: ReflectionWaitingHomeSectionProps) {
  return (
    <OverviewSection
      label="Reflection"
      title={
        <>
          Reflection Waiting
          <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-[var(--state-emerging)]/15 px-2 py-0.5 text-label text-[var(--state-emerging)]">
            {unansweredCount}
          </span>
        </>
      }
      description="A question about what your latest check-in revealed"
      viewAllHref="/reflections"
      viewAllLabel="View all reflections"
    >
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <p className="text-body-small text-ink-secondary">{pending.moment.title}</p>
        <p className="mt-3 text-body text-ink-primary">{pending.reflection_question}</p>
        <div className="mt-4">
          <ReflectionAnswerForm checkInId={pending.id} submitLabel="Submit answer" />
        </div>
        <Link
          href="/reflections"
          className="mt-4 inline-block text-body-small text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
        >
          View all reflections
        </Link>
      </div>
    </OverviewSection>
  );
}
