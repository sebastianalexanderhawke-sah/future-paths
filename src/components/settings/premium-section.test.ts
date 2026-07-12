import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { derivePlanStatus, type PlanStatus } from "@/lib/plan";

// Behavioral tests for Settings → Reflection Premium: what each plan state
// reads as, that the purchase actions appear only where they belong, and
// that the section stays calm — no comparison grids, no urgency language.

vi.mock("@/actions/billing", () => ({
  startPremiumCheckout: vi.fn(),
  buySituationTokens: vi.fn(),
  manageSubscription: vi.fn(),
}));

const { PremiumSection } = await import(
  "@/components/settings/premium-section"
);

function makePlan(overrides: Partial<PlanStatus> = {}): PlanStatus {
  return {
    plan: "free",
    renewsAt: null,
    situationTokens: 0,
    situationsUsed: 1,
    freeSituationAllowance: 1,
    ...overrides,
  };
}

function render(plan: PlanStatus, showBillingNotice = false): string {
  return renderToStaticMarkup(
    createElement(PremiumSection, { plan, showBillingNotice }),
  );
}

describe("PremiumSection — free plan", () => {
  it("states the plan and its included usage", () => {
    const html = render(makePlan());
    expect(html).toContain("Reflection Premium");
    expect(html).toContain("Your plan and available usage.");
    expect(html).toContain("Free Plan");
    expect(html).toContain("1 / 1 Situations Used");
    expect(html).toContain("Unlimited Check-ins");
    expect(html).toContain("Unlimited Current Self updates");
    expect(html).toContain("Unlimited Future Forecast updates");
    expect(html).toContain("Unlimited Timeline");
  });

  it("offers both paths as equal options with the token explainer", () => {
    const html = render(makePlan());
    expect(html).toContain("Upgrade to Premium — $9.99/month");
    expect(html).toContain("Buy 6 Situation Tokens — $9.99");
    expect(html).toContain("Tokens permanently unlock 6 additional situations");
    expect(html).toContain("no subscription required");
  });

  it("shows the token balance section only when tokens are owned", () => {
    expect(render(makePlan())).not.toContain("Situation Tokens</p>");

    const html = render(makePlan({ situationTokens: 4 }));
    expect(html).toContain("Situation Tokens");
    expect(html).toContain("Remaining: 4");
    expect(html).toContain("Each new situation uses one token.");
  });

  it("stays calm — no comparison grids or urgency", () => {
    const html = render(makePlan());
    for (const word of ["Best value", "Most popular", "Limited", "Save ", "%"]) {
      expect(html).not.toContain(word);
    }
  });
});

describe("PremiumSection — premium plan", () => {
  const premium = makePlan({
    plan: "premium",
    renewsAt: "2026-08-12T00:00:00.000Z",
    situationTokens: 2,
  });

  it("states the plan, unlimited usage, and the renewal date", () => {
    const html = render(premium);
    expect(html).toContain("Premium");
    expect(html).toContain("✓");
    expect(html).toContain("Unlimited Situations");
    expect(html).toContain("Unlimited Reflections");
    expect(html).toContain("Renews on August 12, 2026.");
    expect(html).toContain("Manage Subscription");
  });

  it("never shows purchase buttons to a premium account", () => {
    const html = render(premium);
    expect(html).not.toContain("Upgrade to Premium");
    expect(html).not.toContain("Buy 6 Situation Tokens");
  });

  it("still shows an owned token balance", () => {
    const html = render(premium);
    expect(html).toContain("Remaining: 2");
  });
});

describe("PremiumSection — billing notice", () => {
  it("responds honestly when checkout isn't open yet", () => {
    const html = render(makePlan(), true);
    expect(html).toContain("Checkout isn&#x27;t open during the beta yet");
    expect(html).toContain("nothing has been charged");
  });

  it("shows no notice by default", () => {
    expect(render(makePlan())).not.toContain("Checkout isn");
  });
});

describe("derivePlanStatus", () => {
  it("defaults to the free plan with zero tokens", () => {
    expect(derivePlanStatus(null, 0)).toEqual({
      plan: "free",
      renewsAt: null,
      situationTokens: 0,
      situationsUsed: 0,
      freeSituationAllowance: 1,
    });
  });

  it("reads premium entitlements from app_metadata", () => {
    const status = derivePlanStatus(
      {
        plan: "premium",
        premium_renews_at: "2026-08-12T00:00:00.000Z",
        situation_tokens: 3,
      },
      12,
    );
    expect(status.plan).toBe("premium");
    expect(status.renewsAt).toBe("2026-08-12T00:00:00.000Z");
    expect(status.situationTokens).toBe(3);
  });

  it("caps displayed situation usage at the free allowance", () => {
    expect(derivePlanStatus(null, 12).situationsUsed).toBe(1);
    expect(derivePlanStatus(null, 0).situationsUsed).toBe(0);
  });

  it("ignores malformed metadata instead of trusting it", () => {
    const status = derivePlanStatus(
      {
        plan: "PREMIUM", // wrong case — not an entitlement
        premium_renews_at: "not-a-date",
        situation_tokens: -5,
      },
      1,
    );
    expect(status.plan).toBe("free");
    expect(status.renewsAt).toBeNull();
    expect(status.situationTokens).toBe(0);
  });

  it("never surfaces a renewal date on the free plan", () => {
    const status = derivePlanStatus(
      { premium_renews_at: "2026-08-12T00:00:00.000Z" },
      1,
    );
    expect(status.renewsAt).toBeNull();
  });
});
