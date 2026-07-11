import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  DEMO_PATHS,
  DEMO_SITUATION,
  WALKTHROUGH_STEP_COUNT,
  WALKTHROUGH_STEPS,
} from "@/components/walkthrough/walkthrough-content";

// Behavioral tests: render the walkthrough page at every step and assert on
// the visible teaching flow — progress, navigation, and the demonstration
// content. Deliberately NO data modules are mocked here: the walkthrough is
// demo-mode by construction, and these tests rendering without a single
// stubbed loader or Supabase client is the proof that it reads nothing from
// the user's account.
const { default: WalkthroughPage } = await import(
  "@/app/(protected)/settings/walkthrough/page"
);

async function renderStep(step: string | undefined): Promise<string> {
  return renderToStaticMarkup(
    await WalkthroughPage({
      searchParams: Promise.resolve(step === undefined ? {} : { step }),
    }),
  );
}

describe("walkthrough step definitions", () => {
  it("teaches all nine product stages in order", () => {
    expect(WALKTHROUGH_STEPS).toHaveLength(WALKTHROUGH_STEP_COUNT);
    expect(WALKTHROUGH_STEPS.map((s) => s.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    const kickers = WALKTHROUGH_STEPS.map((s) => s.kicker);
    expect(kickers).toEqual([
      "Welcome",
      "Situations",
      "Follow-up questions",
      "Possible paths",
      "Choosing",
      "Future Forecast",
      "Workspace",
      "Timeline",
      "Overview",
    ]);
  });

  it("auto-selects exactly one demonstration path", () => {
    expect(DEMO_PATHS.filter((p) => p.chosen)).toHaveLength(1);
  });
});

describe("walkthrough page", () => {
  it("renders every step with progress, skip, and forward navigation", async () => {
    for (const step of WALKTHROUGH_STEPS) {
      const html = await renderStep(String(step.number));
      expect(html).toContain(`Step ${step.number} of ${WALKTHROUGH_STEP_COUNT}`);
      expect(html).toContain(step.title);
      expect(html).toContain("Skip Walkthrough");
      expect(html).toContain('href="/settings"');
    }
  });

  it("opens on the welcome step with the demo scenario and the demo-only promise", async () => {
    const html = await renderStep(undefined);
    expect(html).toContain("Step 1 of 9");
    expect(html).toContain(DEMO_SITUATION.title);
    expect(html).toContain("example content");
    // First step has nowhere to go back to.
    expect(html).not.toContain("?step=0");
  });

  it("shows the situation editor filled in as the user would write it", async () => {
    const html = await renderStep("2");
    expect(html).toContain(DEMO_SITUATION.title);
    expect(html).toContain("What should we call this situation?");
    expect(html).toContain("Explore a decision");
    expect(html).toContain("The situation editor");
  });

  it("presents paths as different futures with themes, benefits, and trade-offs", async () => {
    const html = await renderStep("4");
    for (const path of DEMO_PATHS) {
      expect(html).toContain(path.title);
    }
    expect(html).toContain("Benefits");
    expect(html).toContain("Trade-offs");
    expect(html).toContain("Courage"); // theme chips render
    expect(html).toContain("possibilities, not predictions");
  });

  it("pre-selects the demonstration path and continues instead of asking for a decision", async () => {
    const html = await renderStep("5");
    expect(html).toContain("✓ Selected");
    expect(html).toContain("Continue →");
    expect(html).toContain("already selected");
  });

  it("highlights Current Self, Future Self, and Forecast on the forecast step", async () => {
    const html = await renderStep("6");
    expect(html).toContain("Current Self");
    expect(html).toContain("Future Self");
    expect(html).toContain("What might happen next?");
  });

  it("shows check-ins and reflections on the workspace step", async () => {
    const html = await renderStep("7");
    expect(html).toContain("Check-ins");
    expect(html).toContain("Reflections");
    expect(html).toContain("Check in on");
  });

  it("shows a completed chapter comparing who you were and who you became", async () => {
    const html = await renderStep("8");
    expect(html).toContain("Beginning of October");
    expect(html).toContain("End of October");
    expect(html).toContain("Identity Shifts");
    expect(html).toContain("+18%");
  });

  it("closes on the overview step with the full loop and a finish action", async () => {
    const html = await renderStep("9");
    for (const node of ["Current Self", "Future Selves", "Patterns", "Timeline", "Workspace"]) {
      expect(html).toContain(node);
    }
    expect(html).toContain("Finish walkthrough");
    // Finishing returns to Settings, never onward past the last step.
    expect(html).not.toContain("?step=10");
  });

  it("wires Back and Next as plain step links", async () => {
    const html = await renderStep("4");
    expect(html).toContain("?step=3");
    expect(html).toContain("?step=5");
  });

  it("clamps out-of-range and malformed step parameters", async () => {
    expect(await renderStep("17")).toContain("Step 9 of 9");
    expect(await renderStep("0")).toContain("Step 1 of 9");
    expect(await renderStep("abc")).toContain("Step 1 of 9");
  });
});
