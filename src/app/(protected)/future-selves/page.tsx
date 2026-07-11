import { generateFutureSelvesAction } from "@/actions/future-selves";
import { FadedPathsSection } from "@/components/futures/faded-paths-section";
import { FutureSelvesExplorer } from "@/components/futures/future-selves-explorer";
import { AppShell } from "@/components/overview/app-shell";
import {
  listFutureSelves,
  loadFutureSelfEventsByFutureSelf,
} from "@/lib/future-selves";

type FutureSelvesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function FutureSelvesPage({ searchParams }: FutureSelvesPageProps) {
  const { error } = await searchParams;
  const [result, eventsByFutureSelf] = await Promise.all([
    listFutureSelves(),
    loadFutureSelfEventsByFutureSelf(),
  ]);

  if ("error" in result) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{result.error}</p>
      </div>
    );
  }

  return (
    <AppShell activeHref="/future-selves">
      {/* Page header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
            Future Selves
          </h1>
          <p className="text-[15px] text-[#999999]">
            The people you may be becoming, based on what you&apos;ve recorded.
          </p>
        </div>
        <form action={generateFutureSelvesAction}>
          <button
            type="submit"
            className="shrink-0 cursor-pointer rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
          >
            Refresh futures
          </button>
        </form>
      </div>

      {error ? (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-5 pb-16">
        {/* Card 1 — the visualization. The same white surface language as
            the overview's cards, but still: no hover lift, more air. This
            card is for lingering with the tree, not scanning a dashboard. */}
        {/* The hero: attention lands on the tree first, everything else
            supports it. Slim horizontal padding gives the map the full card
            width (the chart's aspect is canonical, so width is the lever
            that makes it bigger), and tall vertical padding gives it a
            stage rather than a slot. */}
        <section className="rounded-2xl border border-[#f0f0f2] bg-white px-3 py-14 shadow-[0_1px_2px_rgba(17,17,17,0.02),0_12px_32px_rgba(17,17,17,0.04)] sm:px-6 sm:py-16">
          <FutureSelvesExplorer futureSelves={result.futureSelves} />
        </section>

        {/* Then the faded paths: one section card with the page's single
            level of disclosure — expand it and every faded future appears
            immediately as a normal card in this same column. */}
        <FadedPathsSection
          futureSelves={result.futureSelves.filter((f) => f.status === "faded")}
          eventsByFutureSelf={eventsByFutureSelf}
        />
      </div>
    </AppShell>
  );
}
