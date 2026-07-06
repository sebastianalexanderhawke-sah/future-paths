import { detectContradictionsAction } from "@/actions/contradictions";
import { ContradictionCard } from "@/components/contradictions/contradiction-card";
import { AppShell } from "@/components/overview/app-shell";
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
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{result.error}</p>
      </div>
    );
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
          <p className="text-[15px] text-[#999999]">
            Identity tensions surfaced from your current self, futures, and
            check-ins — tentative, never judgmental.
          </p>
        </div>
        <form action={detectContradictionsAction}>
          <button
            type="submit"
            className="shrink-0 cursor-pointer rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
          >
            Detect contradictions
          </button>
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
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center text-sm text-zinc-600">
              No active contradictions yet. Check in on your situations, then
              detect tensions.
            </div>
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
              <p className="mt-[3px] text-[13px] text-[#999999]">
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
