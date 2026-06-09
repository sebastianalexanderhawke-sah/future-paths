import type { FutureSelf } from "@/types/database";
import type { FutureSelfStage } from "@/types/enums";

type FutureCardProps = {
  futureSelf: FutureSelf;
};

const STAGE_LABELS: Record<FutureSelfStage, string> = {
  possible: "Possible future",
  emerging: "Emerging future",
  future_self: "Future self",
};

export function FutureCard({ futureSelf }: FutureCardProps) {
  const isFaded = futureSelf.status === "faded";

  return (
    <article
      className={`rounded-lg border bg-white p-4 ${
        isFaded ? "border-zinc-200 opacity-70" : "border-zinc-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-400">{STAGE_LABELS[futureSelf.stage]}</p>
          <h3 className="mt-1 text-sm font-medium text-zinc-900">{futureSelf.name}</h3>
        </div>
        {!isFaded ? (
          <div className="text-right">
            <p className="text-xs text-zinc-400">Momentum</p>
            <p className="text-sm font-medium text-zinc-900">{futureSelf.momentum}</p>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Faded</p>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        {futureSelf.description}
      </p>

      {futureSelf.themes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {futureSelf.themes.map((theme) => (
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
