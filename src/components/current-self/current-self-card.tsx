import type { CurrentSelf } from "@/types/database";

type CurrentSelfCardProps = {
  currentSelf: CurrentSelf;
};

export function CurrentSelfCard({ currentSelf }: CurrentSelfCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      {/* Identity */}
      <h3 className="text-sm font-medium text-zinc-900">{currentSelf.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">{currentSelf.summary}</p>

      {/* Core traits */}
      {currentSelf.observations.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Core traits</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {currentSelf.observations.map((trait) => (
              <li key={trait} className="flex gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-400">·</span>
                <span>{trait}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* What's changing */}
      {currentSelf.recent_growth.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            What&apos;s changing
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {currentSelf.recent_growth.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-400">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Themes */}
      {currentSelf.themes.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Themes</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {currentSelf.themes.map((theme) => (
              <span
                key={theme}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-zinc-400">
        Updated {new Date(currentSelf.updated_at).toLocaleDateString()}
      </p>
    </article>
  );
}
