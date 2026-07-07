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
    identity_id: "steady-foundation-builder",
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
  identity_id: "steady-foundation-builder",
  name: "The Steady Builder",
});

const fadedExplorer = makeFuture({
  id: "b",
  identity_id: "adaptive-explorer",
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
    expect(html).not.toContain("Where this is heading");
  });
});

describe("The preserved original Future Self", () => {
  it("re-presents the identity exactly as it last stood while active", () => {
    const html = renderToString(
      createElement(FutureCard, { futureSelf: asLastActive(fadedExplorer) }),
    );
    // The identity card is intact…
    expect(html).toContain("Where this is heading");
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
  it("answers who this person is with the archetype's timeless identity statement", () => {
    const html = renderToString(
      createElement(FutureCard, { futureSelf: makeFuture({}) }),
    );
    // steady-foundation-builder's hand-written statement from the library —
    // never AI-generated, identical on every render.
    expect(html).toContain("Protects what has been patiently built.");
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
