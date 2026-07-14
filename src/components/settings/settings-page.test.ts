import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

// Behavioral tests: render the Settings page with fixture identity data and
// assert on what a user actually sees — the Appearance choices, the
// walkthrough launcher, and the concise Privacy section that replaced the
// long explanatory paragraphs.

vi.mock("@/lib/user-identity", () => ({
  getUserIdentity: vi.fn(async () => ({
    displayName: "Sam",
    initial: "S",
  })),
}));
vi.mock("@/lib/reflections", () => ({
  getUnansweredReflectionSummary: vi.fn(async () => ({
    pending: [],
    unansweredCount: 0,
  })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: { email: "sam@example.com" } } }),
    },
  })),
}));
vi.mock("@/actions/auth", () => ({
  signOut: vi.fn(),
  updatePassword: vi.fn(),
}));
vi.mock("@/actions/settings", () => ({
  updateDisplayName: vi.fn(),
  requestEmailChange: vi.fn(),
}));
vi.mock("@/actions/billing", () => ({
  startPremiumCheckout: vi.fn(),
  buySituationTokens: vi.fn(),
  manageSubscription: vi.fn(),
}));
// The Reflection Activity card's read is user-level and ungated, so the
// page always calls it; a quiet fixture keeps these tests about settings.
vi.mock("@/lib/recent-activity", () => ({
  ACTIVITY_FEED_LIMIT: 3,
  ACTIVITY_FEED_POOL: 8,
  getEngagementActivity: vi.fn(async () => ({
    consistency: {
      weekDays: [false, false, false, false, false, false, false],
      activeDaysThisWeek: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
    weeklyCounts: { reflections: 0, checkIns: 0, pathsChosen: 0 },
    items: [],
  })),
}));
vi.mock("@/lib/plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/plan")>();
  return {
    ...actual,
    getPlanStatus: vi.fn(async () => ({
      plan: "free",
      renewsAt: null,
      situationTokens: 0,
      situationsUsed: 1,
      freeSituationAllowance: 1,
    })),
  };
});

const { default: SettingsPage } = await import("@/app/(protected)/settings/page");
const { AppearanceControl } = await import(
  "@/components/settings/appearance-control"
);

async function renderPage(): Promise<string> {
  return renderToStaticMarkup(
    await SettingsPage({ searchParams: Promise.resolve({}) }),
  );
}

describe("settings appearance section", () => {
  it("offers light, dark, and system themes and states persistence", async () => {
    const html = await renderPage();
    expect(html).toContain("Appearance");
    for (const option of ["Light", "Dark", "System"]) {
      expect(html).toContain(option);
    }
    expect(html).toContain("remembered between sessions");
  });

  it("renders the three choices as one radio group", () => {
    const html = renderToStaticMarkup(createElement(AppearanceControl));
    const radios = html.match(/name="appearance-theme"/g) ?? [];
    expect(radios).toHaveLength(3);
    // Before hydration nothing is guessed as selected — no flicker.
    expect(html).not.toMatch(/<input[^>]*\schecked/);
  });
});

describe("settings premium section placement", () => {
  it("sits directly below Account with the plan snapshot", async () => {
    const html = await renderPage();
    const account = html.indexOf(">Account<");
    const premium = html.indexOf("Reflection Premium");
    const security = html.indexOf(">Security<");
    expect(account).toBeGreaterThan(-1);
    expect(premium).toBeGreaterThan(account);
    expect(security).toBeGreaterThan(premium);
    expect(html).toContain("Your plan and available usage.");
    expect(html).toContain("Free Plan");
  });
});

describe("settings walkthrough launcher", () => {
  it("launches the interactive walkthrough with an estimated time", async () => {
    const html = await renderPage();
    expect(html).toContain("Interactive Walkthrough");
    expect(html).toContain('href="/settings/walkthrough"');
    expect(html).toContain("Start Walkthrough →");
    expect(html).toContain("2–3 minutes");
  });
});

describe("settings privacy section", () => {
  it("replaces the long privacy paragraphs with the concise statement", async () => {
    const html = await renderPage();
    expect(html).toContain("Your writing is private");
    expect(html).toContain(
      "situations, check-ins, and reflections you choose to record",
    );
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/terms"');
    // The old explanatory paragraphs are gone.
    expect(html).not.toContain("We never invent experiences");
    expect(html).not.toContain("what the AI processes");
  });

  it("keeps the honest deletion-by-request note", async () => {
    const html = await renderPage();
    expect(html).toContain("Reply to your beta invite email");
  });
});
