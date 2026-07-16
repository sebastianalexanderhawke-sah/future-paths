import { generateIdentityPromptsAction } from "@/actions/identity-prompts";
import { IdentityPromptCard } from "@/components/identity-prompts/identity-prompt-card";
import { PageLoadError } from "@/components/ui/page-load-error";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { AppShell } from "@/components/overview/app-shell";
import { OverviewCard } from "@/components/overview/overview-card";
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
    return <PageLoadError retryHref="/identity-prompts" message={result.error} />;
  }

  const pendingPrompts = result.prompts.filter((prompt) => prompt.status === "pending");
  const answeredPrompts = result.prompts.filter(
    (prompt) => prompt.status === "answered",
  );

  return (
    <AppShell activeHref="/identity-prompts">
      {/* Page header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
            Identity Prompts
          </h1>
          <p className="text-[15px] text-[#707070]">
            Questions drawn from your current self, active futures, and recent
            shifts — always tentative, never absolute.
          </p>
        </div>
        <form action={generateIdentityPromptsAction}>
          <PendingSubmitButton
            spinner="onDark"
            className="shrink-0 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
          >
            Generate prompts
          </PendingSubmitButton>
        </form>
      </div>

      {error ? (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex max-w-2xl flex-col gap-8 pb-14">
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-[17px] font-bold text-[#111]">Pending</h2>
          </div>

          {pendingPrompts.length === 0 ? (
            <OverviewCard className="px-8 py-7">
              <p className="text-[13px] leading-relaxed text-[#6b6b6b]">
                No questions waiting. Prompts are drawn from the patterns in
                what you&apos;ve recorded — once your situations and check-ins
                give Reflection something to ask about, generating prompts
                will offer questions worth sitting with.
              </p>
            </OverviewCard>
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
              <h2 className="text-[17px] font-bold text-[#111]">Answered</h2>
              <p className="mt-[3px] text-[13px] text-[#6b6b6b]">
                Your recent answers
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {answeredPrompts.map((prompt) => (
                <IdentityPromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
