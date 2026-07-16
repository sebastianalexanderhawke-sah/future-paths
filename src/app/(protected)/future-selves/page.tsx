import { generateFutureSelvesAction } from "@/actions/future-selves";
import { TrackView } from "@/components/analytics/track-view";
import { FadedPathsSection } from "@/components/futures/faded-paths-section";
import { RefreshFuturesButton } from "@/components/futures/refresh-futures-button";
import { FutureSelvesExplorer } from "@/components/futures/future-selves-explorer";
import { AppShell } from "@/components/overview/app-shell";
import { PageLoadError } from "@/components/ui/page-load-error";
import {
  listFutureSelves,
  loadFutureSelfEventsByFutureSelf,
} from "@/lib/future-selves";

type FutureSelvesPageProps = {
  searchParams: Promise<{ error?: string; selected?: string }>;
};

export default async function FutureSelvesPage({ searchParams }: FutureSelvesPageProps) {
  // `selected` deep-links from the Overview map: the named future's card
  // opens immediately instead of asking for a second click.
  const { error, selected } = await searchParams;
  const [result, eventsByFutureSelf] = await Promise.all([
    listFutureSelves(),
    loadFutureSelfEventsByFutureSelf(),
  ]);

  if ("error" in result) {
    return <PageLoadError retryHref="/future-selves" message={result.error} />;
  }

  return (
    <AppShell activeHref="/future-selves">
      <TrackView event="future_selves_viewed" />
      {/* Page header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
            Future Selves
          </h1>
          <p className="text-[15px] text-[#707070]">
            The people you may be becoming, based on what you&apos;ve recorded.
          </p>
        </div>
        <form action={generateFutureSelvesAction}>
          <RefreshFuturesButton />
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
            supports it. Horizontal padding matches the 36px the label
            contract lets signposts spill past the chart edge (X_GRACE in
            stage-territory.test.ts) so a long label never crosses the card
            surface; vertical padding stays generous — a stage, not a slot —
            without outweighing the map itself. Mobile keeps slim padding
            for map width (narrow-width label clipping is accepted there,
            same as the landing rendering). */}
        <section className="rounded-2xl border border-[#f0f0f2] bg-white px-3 py-10 shadow-[0_1px_2px_rgba(17,17,17,0.02),0_12px_32px_rgba(17,17,17,0.04)] sm:px-9 sm:py-12">
          <FutureSelvesExplorer
            futureSelves={result.futureSelves}
            initialOpenId={selected ?? null}
          />
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
