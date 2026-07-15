import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { EmergingSituationSuggestion } from "@/types/database";

// The dismiss action is a server action ("use server" + next/cache); the
// static render only needs the form to reference it.
vi.mock("@/actions/emerging-situations", () => ({
  dismissEmergingSituationAction: vi.fn(),
}));

const { EmergingSituationCallout } = await import(
  "@/components/moments/emerging-situation-callout"
);

function makeSuggestion(
  overrides: Partial<EmergingSituationSuggestion> = {},
): EmergingSituationSuggestion {
  return {
    title: "Caring for Dad after his diagnosis",
    description: "My dad was diagnosed last month and I've become his main support.",
    detected_at: "2026-07-15T00:00:00.000Z",
    source_check_in_id: null,
    ...overrides,
  };
}

function render(suggestion = makeSuggestion()): string {
  return renderToStaticMarkup(
    createElement(EmergingSituationCallout, {
      momentId: "moment-1",
      suggestion,
    }),
  );
}

describe("EmergingSituationCallout", () => {
  it("uses the exact callout copy", () => {
    const html = render();
    expect(html).toContain("Reflection noticed a new story emerging.");
    expect(html).toContain(
      "Your recent entries seem to be about a different chapter than this situation originally began with.",
    );
    expect(html).toContain("Start new situation");
    expect(html).toContain("Dismiss");
  });

  it("links Start new situation to the creation flow with the suggestion prefilled", () => {
    const html = render(
      makeSuggestion({ title: "A new chapter", description: "What is going on now." }),
    );

    expect(html).toContain(
      `href="/moments/new?title=${encodeURIComponent("A new chapter")}&amp;context=${encodeURIComponent("What is going on now.")}"`,
    );
  });

  it("dismisses via a form carrying the moment id", () => {
    const html = render();
    expect(html).toContain('name="momentId"');
    expect(html).toContain('value="moment-1"');
  });

  it("suggests, never insists — no urgency or automation language", () => {
    const html = render();
    for (const phrase of ["automatically", "must", "now!", "Don&#x27;t miss"]) {
      expect(html).not.toContain(phrase);
    }
  });
});
