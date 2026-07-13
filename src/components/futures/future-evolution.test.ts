import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { FutureSelf, FutureSelfEvent } from "@/types/database";

// BranchMap calls useRouter at render time; outside a running Next app there
// is no router context, so provide an inert one.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
  };
});

const { FutureSelvesExplorer } = await import("@/components/futures/future-selves-explorer");
const { FadedPathsSection } = await import("@/components/futures/faded-paths-section");
const { FadedFutureCard } = await import("@/components/futures/faded-future-card");
const { FutureCard } = await import("@/components/futures/future-card");
const { asLastActive } = await import("@/lib/future-self-story");

function makeFuture(overrides: Partial<FutureSelf>): FutureSelf {
  return {
    id: "fs-1",
    user_id: "u-1",
    name: "The Steady Builder",
    summary: "Builds durable things slowly.",
    percentage: 24,
    previous_percentage: 18,
    evidence_strength: "emerging" as FutureSelf["evidence_strength"],
    core_behaviors: ["Ships weekly"],
    behavioral_evidence: ["Finished the migration"],
    growth_opportunities: [],
    blind_spots: [],
    likely_evolution: "Becomes someone who finishes.",
    themes: [],
    why_emerging: "Recent consistency",
    status: "active" as FutureSelf["status"],
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-07-02T00:00:00Z",
    identity_id: "the-guardian",
    confidence: 0.6,
    dimension_breakdown: null,
    supporting_observations: null,
    supporting_situations: null,
    opposing_observations: null,
    narrative_source: "ai",
    narrative_evidence_strength: null,
    ...overrides,
  };
}

const active = makeFuture({
  id: "a",
  identity_id: "the-guardian",
  name: "The Steady Builder",
});

const fadedExplorer = makeFuture({
  id: "b",
  identity_id: "the-explorer",
  name: "The Explorer",
  status: "faded" as FutureSelf["status"],
  percentage: 0,
  previous_percentage: 18,
  opposing_observations: [
    { observationText: "Repeated preference for familiar routines" },
  ],
});

const explorerEvents: FutureSelfEvent[] = [
  {
    id: "e1",
    user_id: "u-1",
    future_self_id: "b",
    event_type: "emerged",
    percentage_before: null,
    percentage_after: 12,
    summary: "",
    created_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "e2",
    user_id: "u-1",
    future_self_id: "b",
    event_type: "faded",
    percentage_before: 18,
    percentage_after: 0,
    summary: "",
    created_at: "2026-07-02T00:00:00Z",
  },
] as FutureSelfEvent[];

describe("Future Selves page structure", () => {
  it("keeps the visualization card free of faded content — faded paths are separate cards", () => {
    const explorerHtml = renderToString(
      createElement(FutureSelvesExplorer, {
        futureSelves: [active, fadedExplorer],
      }),
    );
    expect(explorerHtml).not.toContain("A path that faded");
    expect(explorerHtml).not.toContain("The Explorer");
  });
});

describe("Faded paths section", () => {
  it("collapses to a quiet summary card by default — one level of disclosure", () => {
    const html = renderToString(
      createElement(FadedPathsSection, {
        futureSelves: [fadedExplorer],
        eventsByFutureSelf: { b: explorerEvents },
      }),
    );
    expect(html).toContain("Paths That Have Faded");
    expect(html).toContain("One path has faded over time.");
    expect(html).toContain("Show faded paths");
    // Nothing else is visible until the user expands the section.
    expect(html).not.toContain("The Explorer");
    expect(html).not.toContain("Why this path faded");
  });

  it("renders nothing at all when no path has faded", () => {
    expect(
      renderToString(createElement(FadedPathsSection, { futureSelves: [] })),
    ).toBe("");
  });
});

describe("Faded future card", () => {
  const html = renderToString(
    createElement(FadedFutureCard, {
      futureSelf: fadedExplorer,
      events: explorerEvents,
    }),
  );

  it("is an independent section card in the platform's language — no accordion chrome", () => {
    expect(html).toContain("The Explorer");
    expect(html).toContain("A path that faded");
    expect(html).toContain("held 18%");
    // Section-based layout, not an accordion: no <details>/<summary> at all.
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<summary");
  });

  it("tells the fade's story in the open: arc, why, and evidence", () => {
    expect(html).toContain("12% → 18% → faded");
    expect(html).toContain("Why this path faded");
    expect(html).toContain("What pushed against it");
    expect(html).toContain("Repeated preference for familiar routines");
  });

  it("keeps the original identity behind the quiet inline disclosure, closed at first", () => {
    expect(html).toContain("View original Future Self");
    // The original card renders only on request — the fade story leads.
    expect(html).not.toContain("What This Usually Becomes");
  });
});

describe("The preserved original Future Self", () => {
  it("re-presents the identity exactly as it last stood while active", () => {
    const html = renderToString(
      createElement(FutureCard, { futureSelf: asLastActive(fadedExplorer) }),
    );
    // The identity card is intact…
    expect(html).toContain("What This Usually Becomes");
    expect(html).toContain("Becomes someone who finishes.");
    // …with its likelihood restored to the last active strength…
    expect(html).toContain("18 percent likely");
    // …and the fade kept out of the identity's own presentation: no trend
    // arrow or movement section leaks into the original card.
    expect(html).not.toContain("since your last update");
    expect(html).not.toContain("View supporting evidence");
  });
});

describe("Active future card hierarchy", () => {
  it("falls back to the archetype name and identity statement when a row carries no dimension breakdown", () => {
    const html = renderToString(
      createElement(FutureCard, { futureSelf: makeFuture({}) }),
    );
    // No dimension_breakdown → no derivable trait: the stored name heads the
    // card and the-guardian's hand-written statement quotes under it.
    expect(html).toContain("The Steady Builder");
    expect(html).toContain(
      "One day everything and everyone you were trusted with will still be standing",
    );
  });

  it("reads as a strengthening trait — trait headline and quote, becomes, gains, tradeoffs, collapsed evidence — never behavior vectors (Phase 4)", () => {
    const html = renderToString(
      createElement(FutureCard, {
        futureSelf: makeFuture({
          dimension_breakdown: [
            { dimension: "Consistency", identityWeight: 1, userScore: 6, contribution: 6 },
            { dimension: "Initiative", identityWeight: 0.4, userScore: 4, contribution: 1.6 },
          ],
          why_emerging:
            "You repeatedly choose ownership over certainty.\nYou keep returning to difficult work after setbacks.\nYour recent decisions favor long-term meaning over comfort.",
          growth_opportunities: [
            "Making decisions without waiting for permission.",
            "A reputation for finishing what you take on.",
            "Staying steady when plans fall through.",
          ],
          blind_spots: [
            "Asking for help gets harder the more capable you become.",
            "People stop offering input because you seem to have it handled.",
            "Rest starts to feel like a failure of discipline.",
          ],
          likely_evolution:
            "You become the person who has already started while others are still discussing it.",
        }),
      }),
    );

    // The trait heads the card — everyday label + hand-written quote — and
    // the archetype name is gone…
    expect(html).toContain("Discipline");
    expect(html).toContain("You keep showing up after the excitement wears off.");
    expect(html).not.toContain("The Steady Builder");
    // …the plain "usually becomes" prose renders…
    expect(html).toContain("What This Usually Becomes");
    expect(html).toContain(
      "You become the person who has already started while others are still discussing it.",
    );
    // …three gains and three tradeoffs, as bullets…
    expect(html).toContain("What This Strengthens");
    expect(html).toContain("Making decisions without waiting for permission.");
    expect(html).toContain("Staying steady when plans fall through.");
    expect(html).toContain("Tradeoffs");
    expect(html).toContain("Asking for help gets harder the more capable you become.");
    expect(html).toContain("Rest starts to feel like a failure of discipline.");
    // …the evidence closes the card collapsed: header and subtitle visible,
    // the checklist itself only on request. The first why_emerging bullet
    // legitimately appears as the movement lead, so the collapsed state is
    // proven by the second and third bullets.
    expect(html).toContain("Why Reflection Believes This");
    expect(html).toContain("The moments that led Reflection here.");
    expect(html).not.toContain("You keep returning to difficult work after setbacks.");
    expect(html).not.toContain("Your recent decisions favor long-term meaning over comfort.");
    // …reading top to bottom in the Phase 4 order.
    const order = [
      "What This Usually Becomes",
      "What This Strengthens",
      "Tradeoffs",
      "Why Reflection Believes This",
    ].map((label) => html.indexOf(label));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // …and retired sections and implementation details never leak.
    expect(html).not.toContain("Notice It When...");
    expect(html).not.toContain("Who You Become");
    expect(html).not.toContain("What You Leave Behind");
    expect(html).not.toContain("Core behaviors");
    expect(html).not.toContain("Ships weekly");
    expect(html).not.toContain("What You Risk");
  });

  it("renders only the portrait line of a not-yet-regenerated pre-v8 row — retired closings never leak", () => {
    const html = renderToString(
      createElement(FutureCard, {
        futureSelf: makeFuture({
          // A v7-encoded row: portrait + three notice signals.
          likely_evolution: [
            "You slowly become the person others plan around.",
            "You start projects before you feel completely ready.",
            "Finishing becomes more satisfying than planning.",
            "People begin relying on you because you consistently follow through.",
          ].join("\n"),
        }),
      }),
    );

    expect(html).toContain("You slowly become the person others plan around.");
    expect(html).not.toContain("You start projects before you feel completely ready.");
    expect(html).not.toContain("Notice It When...");
  });

  it("explains an increase with a grounded sentence, receipts behind a quiet action", () => {
    const html = renderToString(
      createElement(FutureCard, {
        futureSelf: makeFuture({
          percentage: 30,
          previous_percentage: 18,
          supporting_observations: [
            { observationText: "Finished the migration ahead of schedule" },
          ],
          supporting_situations: [{ momentTitle: "The database rewrite" }],
        }),
      }),
    );

    expect(html).toContain("+12% since your last update");
    // The one-sentence explanation cites real data…
    expect(html).toContain("The database rewrite");
    // …but the evidence list itself stays hidden until asked for.
    expect(html).toContain("View supporting evidence");
    expect(html).not.toContain("Finished the migration ahead of schedule");
  });

  it("explains a decrease the same way — sentence visible, evidence on demand", () => {
    const html = renderToString(
      createElement(FutureCard, {
        futureSelf: makeFuture({
          percentage: 12,
          previous_percentage: 20,
          opposing_observations: [
            { observationText: "Dropped the weekly shipping habit" },
          ],
        }),
      }),
    );

    expect(html).toContain("-8% since your last update");
    expect(html).toContain("pushed against this path");
    expect(html).toContain("View supporting evidence");
    expect(html).not.toContain("Dropped the weekly shipping habit");
  });

  it("shows no movement section when nothing changed", () => {
    const html = renderToString(
      createElement(FutureCard, {
        futureSelf: makeFuture({ percentage: 20, previous_percentage: 20 }),
      }),
    );
    expect(html).not.toContain("since your last update");
    expect(html).not.toContain("View supporting evidence");
  });
});
