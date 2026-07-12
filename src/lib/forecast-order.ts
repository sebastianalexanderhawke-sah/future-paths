import type { ScannableFuture } from "@/components/home/output-refinement";

/**
 * Orders forecast cards highest-confidence first for display. Futures
 * without a confidence estimate (pre-v3 rows, fallback fills) keep their
 * stored relative order and sort after every scored card — for a pre-v3
 * forecast, where nothing carries confidence, the list is unchanged.
 * Ordering is display-only: stored sections_json is never reordered, so
 * diffing and check-in recognition see the same rows as before.
 */
export function orderForecastFuturesByConfidence(
  futures: ScannableFuture[],
): ScannableFuture[] {
  return [...futures].sort(
    (left, right) => (right.confidence ?? -1) - (left.confidence ?? -1),
  );
}

/**
 * True when a forecast renders as Phase 3 structured cards — v3 rows carry
 * "What you can do" action bullets; pre-v3 rows never do and keep the
 * legacy ungrouped presentation.
 */
export function isStructuredForecastList(futures: ScannableFuture[]): boolean {
  return futures.some((future) => (future.actions?.length ?? 0) > 0);
}

export type GroupedForecastFutures = {
  /** "Things to Watch For" — everything that isn't an opportunity. */
  risks: ScannableFuture[];
  /** "Unexpected Opportunities" — the wild_card (opportunities) rows. */
  opportunities: ScannableFuture[];
};

/**
 * Splits an already-assembled forecast list into the two Phase 3 display
 * groups, each ordered highest-confidence first. Opportunities are
 * identified by title membership in the stored wild_card section — the
 * same signal both render surfaces already use for the wildcard card
 * variant — so grouping stays display-only.
 */
export function groupForecastFutures(
  futures: ScannableFuture[],
  opportunityTitles: Set<string>,
): GroupedForecastFutures {
  const risks: ScannableFuture[] = [];
  const opportunities: ScannableFuture[] = [];

  for (const future of futures) {
    (opportunityTitles.has(future.title) ? opportunities : risks).push(future);
  }

  return {
    risks: orderForecastFuturesByConfidence(risks),
    opportunities: orderForecastFuturesByConfidence(opportunities),
  };
}
