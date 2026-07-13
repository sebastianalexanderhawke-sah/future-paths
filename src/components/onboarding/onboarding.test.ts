import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// The panels wire finishOnboardingAction into <form action>, and the flow
// embeds the live situation-entry flow; inert stand-ins keep renders pure
// and keep this test about the onboarding chrome, not the journey itself.
vi.mock("@/actions/onboarding", () => ({
  finishOnboardingAction: vi.fn(),
}));
vi.mock("@/components/home/situation-entry-flow", () => ({
  SituationEntryFlow: () =>
    createElement("div", { "data-testid": "entry-flow" }, "ENTRY_FLOW"),
}));
// The Future Selves preview renders the real BranchMap, which calls
// useRouter at render time; outside a running Next app there is no router
// context, so provide an inert one.
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

const { onboardingStep, ONBOARDING_STEP_COUNT } = await import(
  "@/components/onboarding/onboarding-journey"
);
const { ClosingPanel, FoundationsPanel, FutureSelvesPanel, WelcomePanel } =
  await import("@/components/onboarding/onboarding-panels");
const { OnboardingFlow } = await import(
  "@/components/onboarding/onboarding-flow"
);

// Behavioral tests for Launch Phase 2.2 onboarding: eight steps around one
// real situation — welcome, the four live flow stages, then Future Selves,
// Current Self & Timeline, and the hand-over.

describe("onboarding step model", () => {
  it("books eight steps end to end", () => {
    expect(ONBOARDING_STEP_COUNT).toBe(8);
    expect(onboardingStep("welcome", "describe").number).toBe(1);
    expect(onboardingStep("journey", "describe").number).toBe(2);
    expect(onboardingStep("journey", "questions").number).toBe(3);
    expect(onboardingStep("journey", "paths").number).toBe(4);
    expect(onboardingStep("journey", "forecast").number).toBe(5);
    expect(onboardingStep("future-selves", "forecast").number).toBe(6);
    expect(onboardingStep("foundations", "forecast").number).toBe(7);
    expect(onboardingStep("closing", "forecast").number).toBe(8);
  });

  it("introduces each feature only at the step where it appears", () => {
    // The panel steps carry their own framing — no chrome caption.
    expect(onboardingStep("welcome", "describe").caption).toBeNull();
    expect(onboardingStep("future-selves", "forecast").caption).toBeNull();
    expect(onboardingStep("foundations", "forecast").caption).toBeNull();
    expect(onboardingStep("closing", "forecast").caption).toBeNull();

    // Future Paths are named when the paths appear; forecasts when theirs does.
    expect(onboardingStep("journey", "describe").caption).not.toContain("Future Path");
    expect(onboardingStep("journey", "paths").caption).toContain("Future Path");
    expect(onboardingStep("journey", "forecast").caption).toContain("Future Forecast");
  });

  it("frames the forecast as path-dependent — the wow is that choices change futures", () => {
    expect(onboardingStep("journey", "forecast").caption).toContain(
      "A different path would have produced different ones",
    );
  });
});

describe("WelcomePanel", () => {
  const html = renderToStaticMarkup(
    createElement(WelcomePanel, { onBegin: () => {} }),
  );

  it("leads with the one understanding onboarding teaches", () => {
    expect(html).toContain("Every decision shapes two things");
    expect(html).toContain("futures you might live");
    expect(html).toContain("becoming");
  });

  it("promises the three-minute journey and one way to begin", () => {
    expect(html).toContain("three minutes");
    expect(html).toContain("Write your first situation");
  });
});

describe("FutureSelvesPanel", () => {
  const html = renderToStaticMarkup(
    createElement(FutureSelvesPanel, { onContinue: () => {} }),
  );

  it("frames Future Selves as identity, connecting back to the forecast just read", () => {
    expect(html).toContain("people you could");
    expect(html).toContain("The forecast you just read");
    expect(html).toContain("growing stronger or fading");
  });

  it("shows the branching map with openly illustrative identities", () => {
    // The canonical map's center marker plus fixture branches.
    expect(html).toContain("You");
    expect(html).toContain("The Self-Reliant Builder");
    expect(html).toContain("The Quiet Mentor");
    // Honesty line: this is a picture, not the user's data.
    expect(html).toContain("An illustration, not your data");
  });
});

describe("FoundationsPanel", () => {
  const html = renderToStaticMarkup(
    createElement(FoundationsPanel, { onContinue: () => {} }),
  );

  it("introduces Current Self and Timeline briefly", () => {
    const currentSelf = html.indexOf("Current Self");
    const timeline = html.indexOf("Timeline");
    expect(currentSelf).toBeGreaterThan(-1);
    expect(timeline).toBeGreaterThan(currentSelf);
  });

  it("frames growth as confidence, never as unlocking, and teaches the check-in loop", () => {
    expect(html).toContain("Nothing here waits to be unlocked");
    expect(html).toContain("more confident");
    expect(html).toContain("check-in is how everything above learns");
  });
});

describe("ClosingPanel", () => {
  it("closes on the takeaway and opens the app", () => {
    const html = renderToStaticMarkup(
      createElement(ClosingPanel, { momentId: "moment-1" }),
    );
    expect(html).toContain(
      "Every decision shapes both the futures you might live and the",
    );
    expect(html).toContain("Enter Reflection");
  });

  it("links back to the created situation only when one exists", () => {
    const withMoment = renderToStaticMarkup(
      createElement(ClosingPanel, { momentId: "moment-1" }),
    );
    expect(withMoment).toContain("/moments/moment-1");

    const withoutMoment = renderToStaticMarkup(
      createElement(ClosingPanel, { momentId: null }),
    );
    expect(withoutMoment).not.toContain("revisit your first situation");
  });
});

describe("OnboardingFlow", () => {
  const html = renderToStaticMarkup(createElement(OnboardingFlow));

  it("opens on the welcome step with progress and an always-available skip", () => {
    expect(html).toContain("Step 1 of 8");
    expect(html).toContain("Skip for now");
    expect(html).toContain("Welcome to Reflection");
  });

  it("does not start the journey before the user chooses to begin", () => {
    expect(html).not.toContain("ENTRY_FLOW");
  });
});
