import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Behavioral tests: render the Overview page with event-derived change rows
// and assert what the What's Changed card actually shows — netted movement
// with bare signed points, and lifecycle rows (Faded / Returned / New)
// without any movement value. Row assembly itself is unit-tested in
// lib/future-self-changes.test.ts; these tests pin the page wiring and the
// rendered result.

const { changesMock } = vi.hoisted(() => ({
  changesMock: vi.fn(async () => [] as unknown[]),
}));

vi.mock("@/lib/user-identity", () => ({
  getUserIdentity: vi.fn(async () => ({ displayName: "Sam", initial: "S" })),
}));
vi.mock("@/lib/moments", () => ({
  listMoments: vi.fn(async () => ({ moments: [] })),
}));
vi.mock("@/lib/future-selves", () => ({
  listActiveFutureSelves: vi.fn(async () => ({ futureSelves: [] })),
  getRecentFutureSelfChanges: changesMock,
}));
vi.mock("@/lib/reflections", () => ({
  getUnansweredReflectionSummary: vi.fn(async () => ({
    pending: null,
    unansweredCount: 0,
  })),
}));
vi.mock("@/lib/identity-updates", () => ({
  listIdentityUpdates: vi.fn(async () => ({ identityUpdates: [] })),
}));
vi.mock("@/lib/paths", () => ({
  getChosenPathsForMoments: vi.fn(async () => ({})),
}));
vi.mock("@/lib/check-ins", () => ({
  getLastCheckInsForMoments: vi.fn(async () => ({})),
}));
vi.mock("@/components/analytics/track-view", () => ({
  TrackView: () => null,
}));
// BranchMap (rendered by the page's Future Paths card) calls useRouter.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const { default: OverviewPage } = await import("@/app/(protected)/overview/page");

async function renderPage(): Promise<string> {
  return renderToStaticMarkup(await OverviewPage());
}

/** The card's slice of the page: from its heading to its footer link. */
function whatsChangedCard(html: string): string {
  return html.slice(html.indexOf("What&#x27;s Changed"), html.indexOf("View all changes"));
}

describe("What's Changed event-based rows", () => {
  it("renders strengthened and weakened rows with bare signed point deltas", async () => {
    changesMock.mockResolvedValue([
      { key: "fs-up", name: "Steady Builder", detail: "Strengthened", delta: 5, kind: "up" },
      { key: "fs-down", name: "Quiet Craftsman", detail: "Weakened", delta: -4, kind: "down" },
    ]);

    const card = whatsChangedCard(await renderPage());
    expect(card).toContain("Steady Builder");
    expect(card).toContain("Strengthened");
    expect(card).toContain(">+5<");
    expect(card).toContain("Quiet Craftsman");
    expect(card).toContain("Weakened");
    expect(card).toContain(">-4<");
  });

  it("renders Faded, Returned, and New lifecycle rows without movement values", async () => {
    changesMock.mockResolvedValue([
      { key: "fs-faded", name: "Bold Competitor", detail: "Faded", delta: null, kind: "down" },
      { key: "fs-returned", name: "Open Connector", detail: "Returned", delta: null, kind: "up" },
      { key: "fs-new", name: "Grounded Anchor", detail: "New", delta: null, kind: "added" },
    ]);

    const card = whatsChangedCard(await renderPage());
    expect(card).toContain("Bold Competitor");
    expect(card).toContain("Faded");
    expect(card).toContain("Open Connector");
    expect(card).toContain("Returned");
    expect(card).toContain("Grounded Anchor");
    expect(card).toContain("New");
    // No lifecycle row carries a delta span.
    expect(card).not.toContain("tabular-nums");
  });

  it("keeps the three-row cap", async () => {
    changesMock.mockResolvedValue([
      { key: "a", name: "Steady Builder", detail: "Strengthened", delta: 9, kind: "up" },
      { key: "b", name: "Quiet Craftsman", detail: "Weakened", delta: -6, kind: "down" },
      { key: "c", name: "Bold Competitor", detail: "Faded", delta: null, kind: "down" },
      { key: "d", name: "Grounded Anchor", detail: "New", delta: null, kind: "added" },
    ]);

    const card = whatsChangedCard(await renderPage());
    expect(card).toContain("Steady Builder");
    expect(card).toContain("Quiet Craftsman");
    expect(card).toContain("Bold Competitor");
    expect(card).not.toContain("Grounded Anchor");
  });
});
