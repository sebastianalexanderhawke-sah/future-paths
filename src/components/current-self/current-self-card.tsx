import type { CurrentSelf } from "@/types/database";

type CurrentSelfCardProps = {
  currentSelf: CurrentSelf;
};

export function CurrentSelfCard({ currentSelf }: CurrentSelfCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-400">
        Updated {new Date(currentSelf.updated_at).toLocaleDateString()}
      </p>
      <h3 className="mt-2 text-sm font-medium text-zinc-900">{currentSelf.headline}</h3>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">{currentSelf.summary}</p>

      {currentSelf.themes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {currentSelf.themes.map((theme) => (
            <span
              key={theme}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
            >
              {theme}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
