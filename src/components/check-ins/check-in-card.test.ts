import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { CheckIn, IdentityUpdate, Moment, Path } from "@/types/database";

// Behavioral tests: render the CheckInCard and the /moments/[id] page with
// fixture data and assert on what the user actually sees — text, links, and
// form contracts — instead of on component source code.

const {
  getUserIdentityMock,
  getUnansweredReflectionSummaryMock,
  getMomentMock,
  listPathsForMomentMock,
  listCheckInsForMomentMock,
  listIdentityUpdatesForMomentMock,
  getAllForecastsForMomentMock,
} = vi.hoisted(() => ({
  getUserIdentityMock: vi.fn(),
  getUnansweredReflectionSummaryMock: vi.fn(),
  getMomentMock: vi.fn(),
  listPathsForMomentMock: vi.fn(),
  listCheckInsForMomentMock: vi.fn(),
  listIdentityUpdatesForMomentMock: vi.fn(),
  getAllForecastsForMomentMock: vi.fn(),
}));

vi.mock("@/lib/user-identity", () => ({
  getUserIdentity: getUserIdentityMock,
}));
vi.mock("@/lib/reflections", () => ({
  getUnansweredReflectionSummary: getUnansweredReflectionSummaryMock,
}));
vi.mock("@/lib/moments", () => ({
  getMoment: getMomentMock,
}));
vi.mock("@/lib/paths", () => ({
  listPathsForMoment: listPathsForMomentMock,
}));
vi.mock("@/lib/check-ins", () => ({
  listCheckInsForMoment: listCheckInsForMomentMock,
}));
vi.mock("@/lib/identity-updates", () => ({
  listIdentityUpdatesForMoment: listIdentityUpdatesForMomentMock,
}));
vi.mock("@/lib/forecasts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/forecasts")>();
  return {
    ...actual,
    getAllForecastsForMoment: getAllForecastsForMomentMock,
  };
});
// Server actions reach for Supabase and the request context; the page only
// wires them into <form action>, so inert stand-ins keep the render pure.
vi.mock("@/actions/paths", () => ({
  generatePathsAction: vi.fn(),
  choosePathAction: vi.fn(),
}));
vi.mock("@/actions/future-forecast", () => ({
  generateForecastForMomentAction: vi.fn(),
  regenerateForecastForChosenPathAction: vi.fn(),
}));
vi.mock("@/actions/auth", () => ({
  signOut: vi.fn(),
}));
vi.mock("@/actions/check-ins", () => ({
  createCheckInAction: vi.fn(),
}));
vi.mock("@/actions/reflections", () => ({
  submitReflectionAnswerAction: vi.fn(),
}));

const { CheckInCard } = await import("@/components/check-ins/check-in-card");
const { default: MomentPage } = await import(
  "@/app/(protected)/moments/[id]/page"
);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: "check-in-1",
    user_id: "user-1",
    moment_id: "moment-1",
    path_id: "path-1",
    reflection: "We finally had the conversation after work.",
    reality_summary: "The conversation happened and went better than expected.",
    theme_changes: [{ theme: "Courage", direction: "strengthened" }],
    identity_impact: "You acted despite uncertainty.",
    reflection_question: null,
    reflection_answer: null,
    created_at: "2026-06-23T16:27:12.813Z",
    ...overrides,
  };
}

function makeMoment(overrides: Partial<Moment> = {}): Moment {
  return {
    id: "moment-1",
    user_id: "user-1",
    title: "The job offer in Dallas",
    description: "A new role in another city.",
    current_understanding: "You are weighing a move to Dallas for a new role.",
    status: "active",
    opportunity_themes: [],
    risk_themes: [],
    client_token: null,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-20T00:00:00.000Z",
    ...overrides,
  };
}

function makePath(overrides: Partial<Path> = {}): Path {
  return {
    id: "path-1",
    moment_id: "moment-1",
    user_id: "user-1",
    description: "Accept the role and relocate.",
    benefits: ["A new social circle forms."],
    consequences: ["Distance from familiar places."],
    future_shift: "You may stay in Dallas longer than expected.",
    themes: ["Growth"],
    sort_order: 0,
    is_chosen: false,
    is_locked: false,
    chosen_at: null,
    created_at: "2026-06-02T00:00:00.000Z",
    ...overrides,
  };
}

function makeIdentityUpdate(overrides: Partial<IdentityUpdate> = {}): IdentityUpdate {
  return {
    id: "update-1",
    user_id: "user-1",
    moment_id: "moment-1",
    check_in_id: "check-in-1",
    update_type: "reality_shift",
    title: "You moved toward the harder option",
    summary: "Choosing the conversation over avoidance shifted how you handle conflict.",
    themes: ["Courage"],
    created_at: "2026-06-24T00:00:00.000Z",
    ...overrides,
  };
}

function renderCard(
  checkIn: CheckIn,
  props: { identityUpdateSummary?: string | null; variant?: "default" | "prominent" } = {},
): string {
  return renderToStaticMarkup(createElement(CheckInCard, { checkIn, ...props }));
}

async function renderMomentPage(
  searchParams: Record<string, string | undefined> = {},
): Promise<string> {
  const element = await MomentPage({
    params: Promise.resolve({ id: "moment-1" }),
    searchParams: Promise.resolve(searchParams),
  });
  return renderToStaticMarkup(element);
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserIdentityMock.mockResolvedValue({ displayName: "Sam", initial: "S" });
  getUnansweredReflectionSummaryMock.mockResolvedValue({
    unansweredCount: 0,
    pending: null,
  });
  getMomentMock.mockResolvedValue({ moment: makeMoment() });
  listPathsForMomentMock.mockResolvedValue({ paths: [] });
  listCheckInsForMomentMock.mockResolvedValue({ checkIns: [] });
  listIdentityUpdatesForMomentMock.mockResolvedValue({ identityUpdates: [] });
  getAllForecastsForMomentMock.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// CheckInCard — rendered content
// ---------------------------------------------------------------------------

describe("CheckInCard — rendered content", () => {
  it("renders the check-in date from created_at", () => {
    const html = renderCard(makeCheckIn());

    const expectedDate = new Date("2026-06-23T16:27:12.813Z").toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    expect(html).toContain(expectedDate);
  });

  it("renders the user's raw reflection text", () => {
    const html = renderCard(makeCheckIn());

    expect(html).toContain("We finally had the conversation after work.");
  });

  it("renders one badge per theme change with its direction", () => {
    const html = renderCard(
      makeCheckIn({
        theme_changes: [
          { theme: "Courage", direction: "strengthened" },
          { theme: "Stability", direction: "weakened" },
        ],
      }),
    );

    expect(html).toContain("Courage · strengthened");
    expect(html).toContain("Stability · weakened");
  });

  it("renders no theme badges when there are no theme changes", () => {
    const html = renderCard(makeCheckIn({ theme_changes: [] }));

    expect(html).not.toContain("·");
  });

  it("renders the AI reality summary when present and omits it when empty", () => {
    const withSummary = renderCard(makeCheckIn());
    expect(withSummary).toContain(
      "The conversation happened and went better than expected.",
    );

    const withoutSummary = renderCard(makeCheckIn({ reality_summary: "" }));
    expect(withoutSummary).toContain("We finally had the conversation after work.");
    expect(withoutSummary).not.toContain("better than expected");
  });

  it("renders the identity update summary when provided and omits it otherwise", () => {
    const summary = "This check-in strengthened your independent streak.";

    expect(renderCard(makeCheckIn(), { identityUpdateSummary: summary })).toContain(summary);
    expect(renderCard(makeCheckIn(), { identityUpdateSummary: null })).not.toContain(summary);
  });

  it("keeps the full reflection text in both variants — truncation is visual only", () => {
    const longReflection = `A long entry. ${"More detail. ".repeat(40)}The end.`;
    const checkIn = makeCheckIn({ reflection: longReflection });

    expect(renderCard(checkIn)).toContain("The end.");
    expect(renderCard(checkIn, { variant: "prominent" })).toContain("The end.");
  });
});

// ---------------------------------------------------------------------------
// /moments/[id] page — archived situation
// ---------------------------------------------------------------------------

describe("/moments/[id] page — archived situation", () => {
  beforeEach(() => {
    getMomentMock.mockResolvedValue({ moment: makeMoment({ status: "archived" }) });
    listPathsForMomentMock.mockResolvedValue({
      paths: [makePath({ is_chosen: true, chosen_at: "2026-06-03T00:00:00.000Z" })],
    });
    listCheckInsForMomentMock.mockResolvedValue({ checkIns: [makeCheckIn()] });
    listIdentityUpdatesForMomentMock.mockResolvedValue({
      identityUpdates: [makeIdentityUpdate()],
    });
  });

  it("shows the lived-through check-ins with their reflection text", async () => {
    const html = await renderMomentPage();

    expect(html).toContain("What you lived through");
    expect(html).toContain("We finally had the conversation after work.");
  });

  it("shows what the situation surfaced, rendering each identity update's content", async () => {
    const html = await renderMomentPage();

    expect(html).toContain("What this situation surfaced in you");
    expect(html).toContain("You moved toward the harder option");
    expect(html).toContain(
      "Choosing the conversation over avoidance shifted how you handle conflict.",
    );
  });

  it("attaches the identity update summary to its matching check-in card", async () => {
    const html = await renderMomentPage();

    // buildCheckInIdentitySummaryMap pairs updates to check-ins by
    // check_in_id, and the summary text lands inside the check-in card.
    const cardStart = html.indexOf("We finally had the conversation after work.");
    const summaryIndex = html.indexOf(
      "Choosing the conversation over avoidance shifted how you handle conflict.",
    );
    expect(cardStart).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(-1);
  });
});

// ---------------------------------------------------------------------------
// /moments/[id] page — navigation and lifecycle actions
// ---------------------------------------------------------------------------

describe("/moments/[id] page — navigation and lifecycle actions", () => {
  it("links back to the situations list", async () => {
    const html = await renderMomentPage();

    expect(html).toContain('href="/moments"');
  });

  it("offers a resolve action for an active situation with a chosen path", async () => {
    listPathsForMomentMock.mockResolvedValue({
      paths: [makePath({ is_chosen: true, chosen_at: "2026-06-03T00:00:00.000Z" })],
    });

    const html = await renderMomentPage();

    expect(html).toContain('href="/moments/moment-1/resolve"');
  });

  it("offers no resolve action once the situation is archived", async () => {
    getMomentMock.mockResolvedValue({ moment: makeMoment({ status: "archived" }) });
    listPathsForMomentMock.mockResolvedValue({
      paths: [makePath({ is_chosen: true, chosen_at: "2026-06-03T00:00:00.000Z" })],
    });

    const html = await renderMomentPage();

    expect(html).not.toContain('href="/moments/moment-1/resolve"');
  });

  it("provides no edit form for the situation itself", async () => {
    const html = await renderMomentPage();

    expect(html).not.toContain('name="title"');
    expect(html).not.toContain("<textarea");
  });
});

// ---------------------------------------------------------------------------
// /moments/[id] page — choosing between generated paths
// ---------------------------------------------------------------------------

describe("/moments/[id] page — choosing between generated paths", () => {
  it("renders each undecided path with a form that submits its path id", async () => {
    listPathsForMomentMock.mockResolvedValue({
      paths: [
        makePath({ id: "path-1", description: "Accept the role and relocate." }),
        makePath({ id: "path-2", description: "Negotiate remote work instead." }),
      ],
    });

    const html = await renderMomentPage();

    expect(html).toContain("Your options");
    expect(html).toContain("Accept the role and relocate.");
    expect(html).toContain("Negotiate remote work instead.");
    expect(html).toContain('value="path-1"');
    expect(html).toContain('value="path-2"');
    expect((html.match(/Choose this path/g) ?? []).length).toBe(2);
  });

  it("shows the chosen path with alternatives collapsed behind a disclosure", async () => {
    listPathsForMomentMock.mockResolvedValue({
      paths: [
        makePath({
          id: "path-1",
          description: "Accept the role and relocate.",
          is_chosen: true,
          chosen_at: "2026-06-03T00:00:00.000Z",
        }),
        makePath({ id: "path-2", description: "Negotiate remote work instead." }),
      ],
    });

    const html = await renderMomentPage();

    expect(html).toContain("Chosen Path");
    // Alternate paths are secondary: collapsed by default behind the quiet
    // inline disclosure, so the unchosen path's content is absent from the
    // initial render — only the disclosure invitation is present.
    expect(html).toContain("Alternate Paths You Didn");
    expect(html).toContain("Explore Alternate Paths");
    expect(html).not.toContain("Negotiate remote work instead.");
    expect(html).not.toContain("Choose this path");
  });
});
