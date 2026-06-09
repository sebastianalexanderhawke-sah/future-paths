"use client";

import type { LifeChapterEvidence } from "@/types/database";
import type { LifeChapterEvidenceType } from "@/types/enums";

const EVIDENCE_LABELS: Record<LifeChapterEvidenceType, string> = {
  moment: "Moment",
  path: "Chosen path",
  check_in: "Check-in",
  identity_update: "Identity update",
  future_self: "Future self",
  contradiction: "Contradiction",
  alternate_self: "Alternate self",
};

type ChapterEvidenceProps = {
  evidence: LifeChapterEvidence[];
};

export function ChapterEvidence({ evidence }: ChapterEvidenceProps) {
  if (evidence.length === 0) {
    return null;
  }

  return (
    <details className="rounded-lg border border-zinc-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-900">
        Supporting evidence ({evidence.length})
      </summary>
      <ul className="border-t border-zinc-100 px-4 py-3">
        {evidence.map((item) => (
          <li
            key={item.id}
            className="border-b border-zinc-100 py-3 last:border-b-0 last:pb-0 first:pt-0"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {EVIDENCE_LABELS[item.evidence_type]}
              </p>
              <p className="text-xs text-zinc-400">
                {new Date(item.occurred_at).toLocaleDateString()}
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.label}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
