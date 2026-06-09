import Link from "next/link";

import { generateIdentityPromptsAction } from "@/actions/identity-prompts";
import { signOut } from "@/actions/auth";
import { IdentityPromptCard } from "@/components/identity-prompts/identity-prompt-card";
import { listIdentityPrompts } from "@/lib/identity-prompts";

type IdentityPromptsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function IdentityPromptsPage({
  searchParams,
}: IdentityPromptsPageProps) {
  const { error } = await searchParams;
  const result = await listIdentityPrompts();

  if ("error" in result) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const pendingPrompts = result.prompts.filter((prompt) => prompt.status === "pending");
  const answeredPrompts = result.prompts.filter(
    (prompt) => prompt.status === "answered",
  );

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <Link href="/overview" className="text-sm text-zinc-500 hover:text-zinc-700">
            Future Paths
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">Identity Prompts</h1>
        </div>
        <div className="flex items-center gap-3">
          <form action={generateIdentityPromptsAction}>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Generate prompts
            </button>
          </form>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-900">Pending</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Questions drawn from your current self, active futures, recent shifts,
              and theme signals — always tentative, never absolute.
            </p>
          </div>

          {pendingPrompts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center text-sm text-zinc-600">
              No pending prompts. Capture a moment, check in, then generate new
              reflection questions.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingPrompts.map((prompt) => (
                <IdentityPromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
          )}
        </section>

        {answeredPrompts.length > 0 ? (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-medium text-zinc-900">Answered</h2>
              <p className="mt-1 text-sm text-zinc-500">Your recent reflections</p>
            </div>

            <div className="flex flex-col gap-3">
              {answeredPrompts.map((prompt) => (
                <IdentityPromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
