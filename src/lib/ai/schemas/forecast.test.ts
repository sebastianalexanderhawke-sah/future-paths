import { describe, expect, it } from "vitest";

import { forecastOutputSchema, parseForecastOutput } from "@/lib/ai/schemas/forecast";

const VALID_ITEM_A = {
  title: "She Says Yes To Coffee",
  why: "A direct ask after daily rapport can lead to plans quickly.",
  impact: "You meet outside work within the week.",
  signals: ["Direct ask made after work", "Daily rapport established", "Plans set within the week"],
  timeframe: "weeks",
};

const VALID_ITEM_B = {
  title: "The Message Goes Unanswered",
  why: "Timing or interest may not align when you reach out.",
  impact: "You stop expecting a reply after several days.",
  signals: ["Message sent without reply", "Several days have passed", "Expectation of reply fades"],
  timeframe: "days",
};

const VALID_ITEM_C = {
  title: "A Coworker Makes A Move First",
  why: "Shared shifts put others in the same position.",
  impact: "She starts spending breaks with someone else.",
  signals: ["Shared shift patterns overlap", "Break time spent together", "Coworker showing interest"],
  timeframe: "months",
};

const VALID_ITEM_D = {
  title: "A Mutual Friend Mentions It",
  why: "Shared social circles often surface information indirectly.",
  impact: "The topic comes up without you bringing it up.",
  signals: ["Mutual friend brings it up", "Conversation shifts unexpectedly", "New context becomes available"],
  timeframe: "weeks",
};

const VALID_ITEM_E = {
  title: "Plans Get Rescheduled Twice",
  why: "Conflicting schedules can delay even agreed plans.",
  impact: "The meetup happens later than first planned.",
  signals: ["First date gets pushed back", "Second reschedule happens", "New date finally holds"],
  timeframe: "weeks",
};

const VALID_ITEM_F = {
  title: "A Schedule Conflict Appears",
  why: "Overlapping commitments can surface once plans firm up.",
  impact: "One of you has to adjust existing plans.",
  signals: ["Existing commitment surfaces", "Calendars get compared", "One plan gets moved"],
  timeframe: "days",
};

const VALID_ITEM_G = {
  title: "A Third Person Gets Involved",
  why: "Group dynamics often pull in people beyond the original two.",
  impact: "The interaction is no longer just between the two of you.",
  signals: ["Third person joins the thread", "Group dynamic shifts", "Original plan adjusts"],
  timeframe: "weeks",
};

const VALID_WILD_CARD = {
  title: "An Old Connection Resurfaces Unexpectedly",
  why: "Past social ties can re-enter the picture without warning.",
  impact: "A past relationship becomes newly relevant to the current situation.",
  signals: ["Unexpected message arrives", "Old context resurfaces", "New decision point appears"],
  timeframe: "months",
};

const VALID_WILD_CARD_2 = {
  title: "A Better Opportunity Appears",
  why: "Being in motion attracts options that never find people still deciding.",
  impact: "A choice you had not weighed becomes realistic.",
  signals: ["Recruiter message arrives", "Friend mentions an opening", "Interview gets scheduled"],
  timeframe: "months",
};

const V3_RISK = (title: string) => ({
  title,
  what_could_happen: ["Something concrete happens first", "A second concrete thing follows"],
  why_this: ["You described this exact constraint", "This dynamic is well documented"],
  what_you_can_do: ["Take one concrete step this week", "Watch for the early sign"],
  confidence: 60,
  timeframe: "months",
});

const V3_OPPORTUNITY = {
  title: "A Better Opportunity Appears",
  what_could_happen: ["An option you had not weighed becomes realistic", "Someone brings you an opening"],
  why_this: ["Being in motion attracts options", "Your new context widens what finds you"],
  what_you_can_do: ["Tell people what you are working toward", "Leave room to say yes"],
  confidence: 30,
  timeframe: "longer_term",
};

describe("forecast schema", () => {
  it("parses v3 card sections onto the transport keys with newline-joined bullets", () => {
    const parsed = parseForecastOutput({
      risks: [
        V3_RISK("Risk One Appears"),
        V3_RISK("Risk Two Appears"),
        V3_RISK("Risk Three Appears"),
        V3_RISK("Risk Four Appears"),
        V3_RISK("Risk Five Appears"),
      ],
      opportunities: [V3_OPPORTUNITY],
    });

    expect(parsed.active).toHaveLength(0);
    expect(parsed.hidden).toHaveLength(5);
    expect(parsed.blind_spots).toHaveLength(0);
    expect(parsed.wild_card).toHaveLength(1);

    // Bullets are newline-encoded onto the legacy string fields so the
    // stored sections_json shape stays identical to previous versions.
    expect(parsed.hidden[0]?.impact).toBe(
      "Something concrete happens first\nA second concrete thing follows",
    );
    expect(parsed.hidden[0]?.why).toBe(
      "You described this exact constraint\nThis dynamic is well documented",
    );
    expect(parsed.hidden[0]?.actions).toEqual([
      "Take one concrete step this week",
      "Watch for the early sign",
    ]);
    expect(parsed.hidden[0]?.confidence).toBe(60);
    expect(parsed.hidden[0]?.timeframe).toBe("months");

    expect(forecastOutputSchema.safeParse(parsed).success).toBe(true);
  });

  it("rejects a generation with too few risks or missing opportunities", () => {
    const fourRisks = parseForecastOutput({
      risks: [
        V3_RISK("Risk One Appears"),
        V3_RISK("Risk Two Appears"),
        V3_RISK("Risk Three Appears"),
        V3_RISK("Risk Four Appears"),
      ],
      opportunities: [V3_OPPORTUNITY],
    });
    expect(forecastOutputSchema.safeParse(fourRisks).success).toBe(false);

    const noOpportunities = parseForecastOutput({
      risks: [
        V3_RISK("Risk One Appears"),
        V3_RISK("Risk Two Appears"),
        V3_RISK("Risk Three Appears"),
        V3_RISK("Risk Four Appears"),
        V3_RISK("Risk Five Appears"),
      ],
      opportunities: [],
    });
    expect(forecastOutputSchema.safeParse(noOpportunities).success).toBe(false);
  });

  it("parses v2 section names onto the transport keys (legacy payloads)", () => {
    const parsed = parseForecastOutput({
      likely_developments: [VALID_ITEM_A, VALID_ITEM_D, VALID_ITEM_E],
      failure_modes: [VALID_ITEM_B, VALID_ITEM_G, VALID_ITEM_F],
      alternative_outcomes: [VALID_WILD_CARD, VALID_WILD_CARD_2],
    });

    expect(parsed.active).toHaveLength(3);
    expect(parsed.active[0]?.title).toBe("She Says Yes To Coffee");
    expect(parsed.hidden).toHaveLength(3);
    expect(parsed.blind_spots).toHaveLength(0);
    expect(parsed.wild_card).toHaveLength(2);
    // v2 counts no longer validate as a FRESH generation (v3 requires 5-6
    // risks and 1-2 opportunities with an empty active section) — but the
    // payload still parses, which is what keeps stored rows rendering.
    expect(forecastOutputSchema.safeParse(parsed).success).toBe(false);
  });

  it("still parses legacy transport keys from cached payloads", () => {
    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A, VALID_ITEM_D, VALID_ITEM_E, VALID_ITEM_F],
      hidden: [VALID_ITEM_B, VALID_ITEM_G],
      blind_spots: [VALID_ITEM_C, VALID_ITEM_D],
      wild_card: [VALID_WILD_CARD],
    });

    // Legacy shapes parse (rendering old rows) even though a fresh v2
    // generation would fail schema validation at these counts.
    expect(parsed.active).toHaveLength(4);
    expect(parsed.blind_spots).toHaveLength(2);
  });

  it("parsed forecast item includes a signals array of length 3", () => {
    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    });

    expect(parsed.active[0]?.signals).toBeDefined();
    expect(parsed.active[0]?.signals).toHaveLength(3);
    expect(parsed.active[0]?.signals?.[0]).toBe("Direct ask made after work");
  });

  it("parsed forecast item includes a valid timeframe enum value", () => {
    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    });

    expect(parsed.active[0]?.timeframe).toBe("weeks");
    expect(parsed.hidden[0]?.timeframe).toBe("days");
    expect(parsed.blind_spots[0]?.timeframe).toBe("months");
  });

  it("keeps items with missing signals (derived later from title/why/impact)", () => {
    // signals is optional on forecastFutureSchema: the prompt only
    // guarantees title/why/impact, so an item missing signals must survive
    // here — buildSignalsFromGeneratedFuture derives them downstream
    // instead of the item being dropped.
    const noSignals = {
      title: "She Leaves The Team",
      why: "Job changes happen without warning.",
      impact: "Daily contact ends.",
      timeframe: "months",
    };

    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A, noSignals],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    });

    expect(parsed.active).toHaveLength(2);
    expect(parsed.active[1]?.title).toBe("She Leaves The Team");
    expect(parsed.active[1]?.signals).toBeUndefined();
  });

  it("drops items with wrong-length signals (not exactly 3)", () => {
    const oneSignal = {
      title: "She Texts First",
      why: "Initiative often comes from genuine interest.",
      impact: "Plans follow quickly.",
      signals: ["Only one signal"],
      timeframe: "days",
    };
    const fiveSignals = {
      title: "She Accepts The Invite",
      why: "A clear ask makes it easy to say yes.",
      impact: "You spend time together outside work.",
      signals: ["Signal one", "Signal two", "Signal three", "Signal four", "Signal five"],
      timeframe: "weeks",
    };

    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A, oneSignal, fiveSignals],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    });

    expect(parsed.active).toHaveLength(1);
    expect(parsed.active[0]?.title).toBe("She Says Yes To Coffee");
  });

  it("keeps items with missing timeframe (optional field)", () => {
    const noTimeframe = {
      title: "She Leaves The Team",
      why: "Job changes happen without warning.",
      impact: "Daily contact ends.",
      signals: ["Job posting noticed online", "Resignation handed in", "Last day approaches"],
    };

    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A, noTimeframe],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    });

    expect(parsed.active).toHaveLength(2);
    expect(parsed.active[1]?.title).toBe("She Leaves The Team");
    expect(parsed.active[1]?.timeframe).toBeUndefined();
  });

  it("drops items with invalid timeframe value", () => {
    const badTimeframe = {
      title: "She Texts Tomorrow",
      why: "Interest often expresses itself quickly.",
      impact: "Plans appear within a day.",
      signals: ["Message arrives tonight", "Reply comes fast", "Plans set right away"],
      timeframe: "soon",
    };

    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A, badTimeframe],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    });

    expect(parsed.active).toHaveLength(1);
    expect(parsed.active[0]?.title).toBe("She Says Yes To Coffee");
  });

  it("sanitizes directive language in items without dropping them", () => {
    const withBannedWhy = {
      title: "Talk It Over",
      why: "You should talk to her about how you feel.",
      impact: "You meet outside work within the week.",
      signals: ["Honest conversation scheduled", "Feelings expressed directly", "Outcome becomes clear"],
      timeframe: "weeks",
    };

    const parsed = parseForecastOutput({
      likely_developments: [
        VALID_ITEM_A,
        {
          title: "She Leaves The Team",
          why: "Job changes happen.",
          impact: "Daily contact ends.",
          signals: ["Job posting noticed online", "Resignation handed in", "Last day approaches"],
          timeframe: "months",
        },
        withBannedWhy,
      ],
      failure_modes: [VALID_ITEM_B, VALID_ITEM_G, VALID_ITEM_F],
      alternative_outcomes: [VALID_WILD_CARD, VALID_WILD_CARD_2],
    });

    // Item is sanitized and kept — all 3 survive.
    expect(parsed.active).toHaveLength(3);
    // Banned phrase removed; sentence re-capitalised at the start.
    expect(parsed.active[2]?.why).toBe("Talk to her about how you feel.");
    expect(parsed.active.every((item) => !item.why.toLowerCase().includes("you should"))).toBe(true);
  });

  it("sanitizes directive language across all items in a section", () => {
    const parsed = parseForecastOutput({
      likely_developments: [VALID_ITEM_A, VALID_ITEM_D, VALID_ITEM_E],
      failure_modes: [
        {
          title: "First Hidden",
          why: "You must act now.",
          impact: "Something shifts.",
          signals: ["Deadline arrives soon", "Window closing fast", "Decision point reached"],
          timeframe: "days",
        },
        {
          title: "Second Hidden",
          why: "You need to tell her.",
          impact: "Things become clear.",
          signals: ["Unsaid feelings build", "Natural moment appears", "Clarity needed soon"],
          timeframe: "weeks",
        },
        {
          title: "Third Hidden",
          why: "You have to decide.",
          impact: "The moment passes.",
          signals: ["Decision point arrives", "Options become fewer", "Moment of choice here"],
          timeframe: "weeks",
        },
      ],
      alternative_outcomes: [VALID_WILD_CARD, VALID_WILD_CARD_2],
    });

    // All three items are sanitized and preserved — the section is no longer empty.
    expect(parsed.hidden).toHaveLength(3);
    expect(parsed.hidden[0]?.why).toBe("Act now.");
    expect(parsed.hidden[1]?.why).toBe("Tell her.");
    expect(parsed.hidden[2]?.why).toBe("Decide.");
  });

  it("parses a fully valid v2 forecast payload without regression", () => {
    const input = {
      likely_developments: [
        VALID_ITEM_A,
        {
          title: "She Leaves The Team",
          why: "Job changes happen without warning.",
          impact: "Daily contact ends.",
          signals: ["Job posting noticed online", "Resignation handed in", "Last day approaches"],
          timeframe: "months",
        },
        VALID_ITEM_D,
      ],
      failure_modes: [VALID_ITEM_B, VALID_ITEM_G, VALID_ITEM_C],
      alternative_outcomes: [VALID_WILD_CARD, VALID_WILD_CARD_2],
    };

    const parsed = parseForecastOutput(input);

    expect(parsed.active).toHaveLength(3);
    expect(parsed.hidden).toHaveLength(3);
    expect(parsed.blind_spots).toHaveLength(0);
    expect(parsed.wild_card).toHaveLength(2);
    expect(parsed.active[0]?.title).toBe("She Says Yes To Coffee");
  });
});
