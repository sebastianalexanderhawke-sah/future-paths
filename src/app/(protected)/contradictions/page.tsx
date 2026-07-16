import { detectContradictionsAction } from "@/actions/contradictions";
import { ContradictionCard } from "@/components/contradictions/contradiction-card";
import { PageLoadError } from "@/components/ui/page-load-error";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { AppShell } from "@/components/overview/app-shell";
import { OverviewCard } from "@/components/overview/overview-card";
import { listContradictions } from "@/lib/contradictions";

type ContradictionsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ContradictionsPage({
  searchParams,
}: ContradictionsPageProps) {
  const { error } = await searchParams;
  const result = await listContradictions();

  if ("error" in result) {
    return <PageLoadError retryHref="/contradictions" message={result.error} />;
  }

  const activeContradictions = result.contradictions.filter(
    (contradiction) => contradiction.status === "active",
  );
  const inactiveContradictions = result.contradictions.filter(
    (contradiction) => contradiction.status !== "active",
  );

  return (
    <AppShell activeHref="/contradictions">
      {/* Page header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
            Contradictions
          </h1>
          <p className="text-[15px] text-[#707070]">
            Identity tensions surfaced from your current self, futures, and
            check-ins — tentative, never judgmental.
          </p>
        </div>
        <form action={detectContradictionsAction}>
          <PendingSubmitButton
            spinner="onDark"
            className="shrink-0 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
          >
            Detect contradictions
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
            <h2 className="text-[17px] font-bold text-[#111]">Active tensions</h2>
          </div>

          {activeContradictions.length === 0 ? (
            <OverviewCard className="px-8 py-7">
              <p className="text-[13px] leading-relaxed text-[#6b6b6b]">
                No tensions found yet. As your check-ins accumulate, Reflection
                can notice where what you say you value and what you actually
                choose pull in different directions — run a detection any time
                to look.
              </p>
            </OverviewCard>
          ) : (
            <div className="flex flex-col gap-3">
              {activeContradictions.map((contradiction) => (
                <ContradictionCard key={contradiction.id} contradiction={contradiction} />
              ))}
            </div>
          )}
        </section>

        {inactiveContradictions.length > 0 ? (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-[17px] font-bold text-[#111]">Resolved or faded</h2>
              <p className="mt-[3px] text-[13px] text-[#6b6b6b]">
                Tensions that no longer appear in the latest detection pass
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {inactiveContradictions.map((contradiction) => (
                <ContradictionCard key={contradiction.id} contradiction={contradiction} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
