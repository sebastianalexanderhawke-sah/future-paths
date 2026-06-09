import Link from "next/link";
import { notFound } from "next/navigation";

import { signOut } from "@/actions/auth";
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
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const { prompt, response } = result;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <Link
            href="/identity-prompts"
            className="text-sm text-zinc-500 hover:text-zinc-700"
          >
            Identity Prompts
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">Reflect</h1>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
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
            <h3 className="text-sm font-medium text-zinc-900">Your reflection</h3>
            <PromptResponseForm promptId={prompt.id} />
          </section>
        )}
      </main>
    </div>
  );
}
