import type { FutureSelf, FutureSelfEvent } from "@/types/database";

/**
 * Event-based assembly for the Overview's What's Changed card: one row per
 * Future Self, composed from the future_self_events recorded inside the
 * card's recency window — the single source of truth for movement, so a
 * change stays visible for the whole window instead of only until the next
 * generation run re-snapshots the trend pair.
 *
 * Rules (mirroring what the engine's writes already mean):
 *   - Lifecycle outranks movement: a future that emerged, returned, or
 *     completed its fade inside the window is told as that event, with NO
 *     movement number — lifecycle transitions are not evidence-driven
 *     score changes.
 *   - Movement rows net every grew/weakened event in the window
 *     (last.after − first.before) and render the bare signed points.
 *   - Fade DECAY steps (faded events that leave the row active,
 *     percentage_after > 0) are lifecycle bookkeeping and count nowhere —
 *     the same "decay never renders as a delta" rule the engine encodes in
 *     the snapshot pair.
 *   - Remap runs record no events at all, so epoch migrations are already
 *     filtered at the source.
 */

export type FutureSelfChangeEvent = Pick<
  FutureSelfEvent,
  "future_self_id" | "event_type" | "percentage_before" | "percentage_after" | "created_at"
>;

export type FutureSelfChangeSource = Pick<FutureSelf, "id" | "name" | "status">;

export type FutureSelfChangeRow = {
  key: string;
  name: string;
  /** One-word qualifier: Strengthened / Weakened / Faded / Returned / New. */
  detail: string;
  /** Signed point movement; null for lifecycle rows (no movement value). */
  delta: number | null;
  kind: "up" | "down" | "added";
};

type LifecycleQualifier = Pick<FutureSelfChangeRow, "detail" | "delta" | "kind">;

/**
 * The latest lifecycle event that is consistent with the row's CURRENT
 * status decides the qualifier: a returned row shows "Returned" even if it
 * also faded earlier in the window, and a faded event only tells the story
 * while the row is still faded. Terminal fades additionally require the
 * path to have held some strength — a row that never established itself
 * fading out is not news.
 */
function lifecycleQualifier(
  events: FutureSelfChangeEvent[],
  status: FutureSelf["status"],
): LifecycleQualifier | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.event_type === "emerged" && status === "active") {
      return { detail: "New", delta: null, kind: "added" };
    }
    if (event.event_type === "returned" && status === "active") {
      return { detail: "Returned", delta: null, kind: "up" };
    }
    if (
      event.event_type === "faded" &&
      event.percentage_after === 0 &&
      status === "faded" &&
      (event.percentage_before ?? 0) > 0
    ) {
      return { detail: "Faded", delta: null, kind: "down" };
    }
  }
  return null;
}

/**
 * Composes What's Changed rows from window-filtered events (ascending by
 * created_at) and the futures they belong to. Events whose future self is
 * unknown (legacy rows the product never surfaces) are ignored. Movement
 * rows lead, sorted by absolute net change; lifecycle rows follow in
 * recency order (most recent transition first).
 */
export function composeFutureSelfChangeRows(
  events: FutureSelfChangeEvent[],
  sources: FutureSelfChangeSource[],
): FutureSelfChangeRow[] {
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  const grouped = new Map<string, FutureSelfChangeEvent[]>();
  for (const event of events) {
    if (!sourceById.has(event.future_self_id)) continue;
    const group = grouped.get(event.future_self_id);
    if (group) group.push(event);
    else grouped.set(event.future_self_id, [event]);
  }

  const movementRows: (FutureSelfChangeRow & { magnitude: number })[] = [];
  const lifecycleRows: (FutureSelfChangeRow & { at: string })[] = [];

  for (const [futureSelfId, group] of grouped) {
    const source = sourceById.get(futureSelfId)!;

    const lifecycle = lifecycleQualifier(group, source.status);
    if (lifecycle) {
      lifecycleRows.push({
        key: futureSelfId,
        name: source.name,
        ...lifecycle,
        at: group[group.length - 1].created_at,
      });
      continue;
    }

    // Net movement over the window's evidence-driven events only.
    const moves = group.filter(
      (event) => event.event_type === "grew" || event.event_type === "weakened",
    );
    if (moves.length === 0) continue;
    const net =
      moves[moves.length - 1].percentage_after - (moves[0].percentage_before ?? 0);
    if (net === 0) continue;

    movementRows.push({
      key: futureSelfId,
      name: source.name,
      detail: net > 0 ? "Strengthened" : "Weakened",
      delta: net,
      kind: net > 0 ? "up" : "down",
      magnitude: Math.abs(net),
    });
  }

  movementRows.sort((a, b) => b.magnitude - a.magnitude);
  lifecycleRows.sort((a, b) => b.at.localeCompare(a.at));

  return [
    ...movementRows.map(({ magnitude: _magnitude, ...row }) => row),
    ...lifecycleRows.map(({ at: _at, ...row }) => row),
  ];
}
