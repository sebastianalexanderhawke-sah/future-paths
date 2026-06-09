import Link from "next/link";

import type { IdentityPrompt } from "@/types/database";

const PROMPT_TYPE_LABELS: Record<IdentityPrompt["prompt_type"], string> = {
  theme_reflection: "Theme reflection",
  future_alignment: "Future alignment",
  pattern_probe: "Pattern probe",
};

type IdentityPromptCardProps = {
  prompt: IdentityPrompt;
};

export function IdentityPromptCard({ prompt }: IdentityPromptCardProps) {
  return (
    <Link
      href={`/identity-prompts/${prompt.id}`}
      className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
    >
      <p className="text-xs text-zinc-400">
        {PROMPT_TYPE_LABELS[prompt.prompt_type]}
      </p>
      <h3 className="mt-2 text-sm font-medium text-zinc-900">{prompt.question}</h3>
      {prompt.themes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {prompt.themes.map((theme) => (
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
