import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/overview/app-shell";
import { PromptResponseForm } from "@/components/identity-prompts/prompt-response-form";
import { getIdentityPrompt } from "@/lib/identity-prompts";

type IdentityPromptDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function IdentityPromptDetailPage({
  params,
}: IdentityPromptDetailPageProps) {
  const { id } = await params;
  const result = await getIdentityPrompt(id);

  if ("error" in result) {
    if (result.error === "Identity prompt not found.") {
      notFound();
    }

    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{result.error}</p>
      </div>
    );
  }

  const { prompt, response } = result;

  return (
    <AppShell activeHref="/identity-prompts">
      {/* Page header */}
      <div className="mb-10">
        <Link
          href="/identity-prompts"
          className="text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#4f46e5]"
        >
          ← Identity Prompts
        </Link>
        <h1 className="mb-1.5 mt-3 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
          Reflect
        </h1>
        <p className="text-[15px] text-[#999999]">
          A question to sit with, in your own words.
        </p>
      </div>

      <div className="flex max-w-2xl flex-col gap-8 pb-14">
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-400">
            {new Date(prompt.created_at).toLocaleDateString()}
          </p>
          <h2 className="mt-2 text-sm font-medium text-zinc-900">{prompt.question}</h2>

          {prompt.context ? (
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">{prompt.context}</p>
          ) : null}

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
        </article>

        {response ? (
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-zinc-900">Your response</h3>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">
                {response.response}
              </p>
              <p className="mt-3 text-xs text-zinc-400">
                Recorded {new Date(response.created_at).toLocaleDateString()}
              </p>
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-zinc-900">Your answer</h3>
            <PromptResponseForm promptId={prompt.id} />
          </section>
        )}
      </div>
    </AppShell>
  );
}
