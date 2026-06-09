import Link from "next/link";

import type { Contradiction } from "@/types/database";

const TYPE_LABELS: Record<Contradiction["contradiction_type"], string> = {
  current_vs_future: "Current vs future",
  dual_future: "Dual future",
  stated_vs_lived: "Stated vs lived",
};

type ContradictionCardProps = {
  contradiction: Contradiction;
};

export function ContradictionCard({ contradiction }: ContradictionCardProps) {
  return (
    <Link
      href={`/contradictions/${contradiction.id}`}
      className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-400">
          {TYPE_LABELS[contradiction.contradiction_type]}
        </p>
        <p className="text-xs text-zinc-400">Intensity {contradiction.intensity}</p>
      </div>
      <h3 className="mt-2 text-sm font-medium text-zinc-900">{contradiction.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{contradiction.summary}</p>

      {contradiction.themes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {contradiction.themes.map((theme) => (
            <span
              key={theme}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
            >
              {theme}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
