import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  parseReflectionQuestionResult,
  reflectionQuestionOutputSchema,
} from "@/lib/reflection-question";
import { validateReflectionAnswerLength } from "@/lib/reflections-validation";
import type { ReflectionCheckIn } from "@/lib/reflections";

// Module mocks so the Overview page (an async server component) can be
// rendered with fixture data in the reflection-surfacing tests below.
const {
  getUserIdentityMock,
  getUnansweredReflectionSummaryMock,
  listMomentsMock,
  listActiveFutureSelvesMock,
  listIdentityUpdatesMock,
  getChosenPathsForMomentsMock,
  getLastCheckInsForMomentsMock,
  getCurrentSelfMock,
  getLatestSettledChapterMock,
} = vi.hoisted(() => ({
  getUserIdentityMock: vi.fn(),
  getUnansweredReflectionSummaryMock: vi.fn(),
  listMomentsMock: vi.fn(),
  listActiveFutureSelvesMock: vi.fn(),
  listIdentityUpdatesMock: vi.fn(),
  getChosenPathsForMomentsMock: vi.fn(),
  getLastCheckInsForMomentsMock: vi.fn(),
  getCurrentSelfMock: vi.fn(),
  getLatestSettledChapterMock: vi.fn(),
}));

vi.mock("@/lib/user-identity", () => ({
  getUserIdentity: getUserIdentityMock,
}));
vi.mock("@/lib/reflections", () => ({
  getUnansweredReflectionSummary: getUnansweredReflectionSummaryMock,
}));
vi.mock("@/lib/moments", () => ({
  listMoments: listMomentsMock,
}));
vi.mock("@/lib/future-selves", () => ({
  listActiveFutureSelves: listActiveFutureSelvesMock,
}));
vi.mock("@/lib/identity-updates", () => ({
  listIdentityUpdates: listIdentityUpdatesMock,
}));
vi.mock("@/lib/paths", () => ({
  getChosenPathsForMoments: getChosenPathsForMomentsMock,
}));
vi.mock("@/lib/check-ins", () => ({
  getLastCheckInsForMoments: getLastCheckInsForMomentsMock,
}));
vi.mock("@/lib/current-self", () => ({
  getCurrentSelf: getCurrentSelfMock,
}));
vi.mock("@/lib/monthly-identity-narrative", () => ({
  getLatestSettledChapter: getLatestSettledChapterMock,
}));
vi.mock("@/actions/auth", () => ({
  signOut: vi.fn(),
}));
// FuturePathsCard calls useRouter at render time; outside a running Next app
// there is no router context, so provide an inert one.
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

const { ReflectionWaitingHomeSection } = await import(
  "@/components/home/reflection-waiting-home-section"
);
const { default: OverviewPage } = await import("@/app/(protected)/overview/page");

function makePendingReflection(): ReflectionCheckIn {
  return {
    id: "check-in-1",
    user_id: "user-1",
    moment_id: "moment-1",
    path_id: "path-1",
    reflection: "We finally talked about the move.",
    reality_summary: "The conversation happened.",
    theme_changes: [],
    identity_impact: "",
    reflection_question: "What surprised you most about her response?",
    reflection_answer: null,
    created_at: "2026-06-23T16:27:12.813Z",
    moment: {
      title: "The job offer in Dallas",
      description: "A new role in another city.",
      current_understanding: null,
    },
  };
}

describe("CheckIn reflection fields", () => {
  const DB_SOURCE = readFileSync(resolve(__dirname, "../types/database.ts"), "utf-8");

  it("includes reflection_question and reflection_answer on CheckIn type", () => {
    expect(DB_SOURCE).toContain("reflection_question");
    expect(DB_SOURCE).toContain("reflection_answer");
  });
});

describe("parseReflectionQuestionResult", () => {
  it("returns should_reflect false for routine check-ins", () => {
    expect(
      parseReflectionQuestionResult({
        should_reflect: false,
        question: null,
      }),
    ).toEqual({ should_reflect: false, question: null });
  });

  it("returns should_reflect true and a question for meaningful check-ins", () => {
    expect(
      parseReflectionQuestionResult({
        should_reflect: true,
        question: "What surprised you most about her response?",
      }),
    ).toEqual({
      should_reflect: true,
      question: "What surprised you most about her response?",
    });
  });

  it("rejects should_reflect true without a question", () => {
    expect(() =>
      parseReflectionQuestionResult({
        should_reflect: true,
        question: null,
      }),
    ).toThrow();
  });
});

describe("reflection question generation in createCheckIn", () => {
  const CHECK_INS_SOURCE = readFileSync(resolve(__dirname, "check-ins.ts"), "utf-8");

  it("calls evaluateReflectionQuestion after forecast regeneration", () => {
    expect(CHECK_INS_SOURCE).toContain("evaluateReflectionQuestion");
    expect(CHECK_INS_SOURCE).toContain("reflection_question");
  });
});

describe("submitReflectionAnswer validation", () => {
  it("rejects answers over 2000 chars", () => {
    expect(validateReflectionAnswerLength("x".repeat(2001))).toBe(
      "Answer must be 2000 characters or fewer.",
    );
  });

  it("accepts answers up to 2000 chars", () => {
    expect(validateReflectionAnswerLength("x".repeat(2000))).toBeNull();
  });
});

describe("submitReflectionAnswer pipeline", () => {
  const REFLECTIONS_SOURCE = readFileSync(resolve(__dirname, "reflections.ts"), "utf-8");
  const ACTIONS_SOURCE = readFileSync(resolve(__dirname, "../actions/reflections.ts"), "utf-8");
  const CURRENT_SELF_SOURCE = readFileSync(resolve(__dirname, "current-self.ts"), "utf-8");

  it("updates reflection_answer on the check-in row", () => {
    expect(REFLECTIONS_SOURCE).toContain("reflection_answer");
    expect(REFLECTIONS_SOURCE).toContain('.eq("id", checkInId)');
    expect(REFLECTIONS_SOURCE).toContain('.eq("user_id", auth.userId)');
  });

  it("triggers Current Self update after storing the answer", () => {
    expect(REFLECTIONS_SOURCE).toContain("requestCurrentSelfRegeneration");
    expect(REFLECTIONS_SOURCE).toContain("checkInReflection");
  });

  it("exports submitReflectionAnswerAction server action", () => {
    expect(ACTIONS_SOURCE).toContain("submitReflectionAnswerAction");
    expect(ACTIONS_SOURCE).toContain("submitReflectionAnswerLib");
  });

  it("passes reflection QA context to Current Self generation", () => {
    expect(CURRENT_SELF_SOURCE).toContain("reflectionQA");
  });
});

describe("/reflections page", () => {
  const PAGE_SOURCE = readFileSync(
    resolve(__dirname, "../app/(protected)/reflections/page.tsx"),
    "utf-8",
  );

  it("renders waiting section, completed reflections list, and prediction card", () => {
    expect(PAGE_SOURCE).toContain("Waiting");
    expect(PAGE_SOURCE).toContain("CompletedReflectionsList");
    expect(PAGE_SOURCE).toContain("ReflectionPredictionCard");
  });
});

describe("overview surfaces the waiting reflection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserIdentityMock.mockResolvedValue({ displayName: "Sam", initial: "S" });
    getUnansweredReflectionSummaryMock.mockResolvedValue({
      unansweredCount: 0,
      pending: null,
    });
    listMomentsMock.mockResolvedValue({ moments: [] });
    listActiveFutureSelvesMock.mockResolvedValue({ futureSelves: [] });
    listIdentityUpdatesMock.mockResolvedValue({ identityUpdates: [] });
    getChosenPathsForMomentsMock.mockResolvedValue({});
    getLastCheckInsForMomentsMock.mockResolvedValue({});
    getCurrentSelfMock.mockResolvedValue({ currentSelf: null });
    getLatestSettledChapterMock.mockResolvedValue(null);
  });

  async function renderOverviewPage(): Promise<string> {
    return renderToStaticMarkup(await OverviewPage());
  }

  it("lists a pending reflection under Needs Attention, linking to /reflections", async () => {
    getUnansweredReflectionSummaryMock.mockResolvedValue({
      unansweredCount: 1,
      pending: makePendingReflection(),
    });

    const html = await renderOverviewPage();

    expect(html).toContain("Reflection available");
    expect(html).toContain("The job offer in Dallas");
    expect(html).toContain('href="/reflections"');
  });

  it("shows no reflection attention row when nothing is waiting", async () => {
    const html = await renderOverviewPage();

    expect(html).not.toContain("Reflection available");
  });
});

describe("ReflectionWaitingHomeSection", () => {
  it("shows the pending question with its situation and links to /reflections", () => {
    const html = renderToStaticMarkup(
      createElement(ReflectionWaitingHomeSection, {
        pending: makePendingReflection(),
      }),
    );

    expect(html).toContain("What surprised you most about her response?");
    expect(html).toContain("The job offer in Dallas");
    expect(html).toContain('href="/reflections"');
  });

  it("renders nothing when no reflection is pending", () => {
    const html = renderToStaticMarkup(
      createElement(ReflectionWaitingHomeSection, { pending: null }),
    );

    expect(html).toBe("");
  });
});

describe("reflectionQuestionOutputSchema examples", () => {
  it("models a nothing-changed check-in response", () => {
    const parsed = reflectionQuestionOutputSchema.parse({
      should_reflect: false,
      question: null,
    });
    expect(parsed.should_reflect).toBe(false);
  });

  it("models a meaningful check-in response", () => {
    const parsed = reflectionQuestionOutputSchema.parse({
      should_reflect: true,
      question: "What did this reveal about what you value?",
    });
    expect(parsed.should_reflect).toBe(true);
    expect(parsed.question).toBeTruthy();
  });
});
