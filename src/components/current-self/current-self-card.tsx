import type { ActivitySummary } from "@/lib/current-self";
import type { CurrentSelf } from "@/types/database";

type CurrentSelfCardProps = {
  currentSelf: CurrentSelf;
  activity?: ActivitySummary;
};

export function CurrentSelfCard({ currentSelf, activity }: CurrentSelfCardProps) {
  const paragraphs = currentSelf.summary.split(/\n\n+/).filter(Boolean).slice(0, 2);
  const recentGrowth = (currentSelf.recent_growth ?? []).slice(0, 3);

  return (
    <article className="flex flex-col gap-8">
      {/* Portrait */}
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold text-zinc-900 leading-tight">
          {currentSelf.title}
        </h2>
        <div className="flex flex-col gap-4">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-base leading-relaxed text-zinc-700">
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* What's changing — most dynamic, comes first */}
      {recentGrowth.length > 0 ? (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            What&apos;s changing
          </h3>
          <ul className="flex flex-col gap-2.5">
            {recentGrowth.map((item) => (
              <li key={item} className="flex items-baseline gap-2.5 text-sm text-zinc-700">
                <span className="shrink-0 text-zinc-400 text-xs font-medium leading-none mt-px">↑</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Core traits — timeless, comes after movement */}
      {currentSelf.observations.length > 0 ? (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            Core traits
          </h3>
          <ul className="flex flex-col gap-2">
            {currentSelf.observations.map((trait) => (
              <li key={trait} className="flex items-baseline gap-2.5 text-sm text-zinc-700">
                <span className="shrink-0 text-zinc-300 text-base leading-none">·</span>
                <span>{trait}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Metadata — quiet supporting context */}
      {activity ? (
        <div className="border-t border-zinc-100 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-1.5">
            Based on
          </p>
          <p className="text-xs text-zinc-400">
            {activity.checkInCount} check-in{activity.checkInCount !== 1 ? "s" : ""}{" "}
            &middot;{" "}
            {activity.reflectionCount} confirmed reflection{activity.reflectionCount !== 1 ? "s" : ""}{" "}
            &middot;{" "}
            {activity.monthsActive} month{activity.monthsActive !== 1 ? "s" : ""} of activity
          </p>
        </div>
      ) : null}
    </article>
  );
}
