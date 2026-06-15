import { describe, expect, it } from "vitest";

import {
  buildRealityForecastSections,
  formatForecastTitle,
  isAbstractCategoryFuture,
  isPhotographableFuture,
  isReflectiveForecast,
  processGeneratedForecastSections,
  scoreForecastSpecificity,
  withRealityForecastFallbacks,
} from "@/components/home/forecast-reality";

describe("forecast reality", () => {
  it("rejects reflective coaching language", () => {
    expect(isReflectiveForecast("Gain clarity")).toBe(true);
    expect(isReflectiveForecast("Observe more")).toBe(true);
    expect(isReflectiveForecast("You may uncover patterns in the situation")).toBe(true);
    expect(isReflectiveForecast("Strong Social Circle Forms")).toBe(false);
  });

  it("requires photographable futures", () => {
    expect(isPhotographableFuture("She Starts Texting You Outside Work")).toBe(true);
    expect(isPhotographableFuture("Gain clarity")).toBe(false);
    expect(isPhotographableFuture("You may develop understanding over time")).toBe(false);
    expect(isAbstractCategoryFuture("Slow-Build Relationship")).toBe(true);
    expect(isAbstractCategoryFuture("She Starts Texting You Outside Work")).toBe(false);
  });

  it("prefers scene-level futures over abstract categories", () => {
    expect(scoreForecastSpecificity("She Starts Texting You Outside Work")).toBeGreaterThan(
      scoreForecastSpecificity("Slow-Build Relationship"),
    );
    expect(formatForecastTitle("Career growth")).toBe("You Receive A Promotion Within The First Year");
  });

  it("formats outcome-oriented forecast titles", () => {
    expect(formatForecastTitle("slow-build relationship")).toBe("She Starts Texting You Outside Work");
    expect(formatForecastTitle("The Independent Explorer")).toBe("");
  });

  it("does not treat multi-word forecast titles as archetype names", () => {
    // Short archetype names (1-2 words after "The") should still be suppressed
    expect(formatForecastTitle("The Explorer")).toBe("");
    expect(formatForecastTitle("The Stable Professional")).toBe("");

    // Full sentence-style titles (3+ words after "The") must survive
    const friendship = formatForecastTitle("The Friendship Deepens First");
    expect(friendship.length).toBeGreaterThan(0);

    const job = formatForecastTitle("The Job Becomes The Reason To Wait");
    expect(job.length).toBeGreaterThan(0);
  });

  it("grounds relocation futures in the situation instead of inventing hobbies", () => {
    const sections = buildRealityForecastSections(
      [
        {
          description: "Accept the role in Dallas",
          benefits: ["Build a new social circle", "Gain clarity"],
          consequences: ["Temporary loneliness", "Distance from familiar places"],
          future_shift: "You may stay in Dallas longer than expected.",
          themes: ["Growth"],
        },
      ],
      [],
      "I might get a job in Dallas",
    );

    expect(
      sections.activeFutures.every(
        (future) => !/run club|fitness|gym|athletic/i.test(future.title),
      ),
    ).toBe(true);
    expect(sections.activeFutures.length).toBeGreaterThanOrEqual(4);
    expect(sections.hiddenFutures.length).toBeGreaterThanOrEqual(3);
    expect(sections.blindSpotFutures.length).toBeGreaterThanOrEqual(3);
  });

  it("builds specific blind spot futures from selected path context", () => {
    const sections = buildRealityForecastSections(
      [],
      [],
      "I like a girl at work",
      {
        description: "Keep things friendly at work.",
        benefits: ["The friendship grows stronger"],
        consequences: ["She may assume you are not interested"],
        future_shift: "The friendship becomes the primary relationship.",
        themes: ["Connection"],
      },
      "Friendship First",
      "How often does she initiate conversations?\nDaily\n\nHave you spent time together one-on-one?\nNot yet",
    );

    expect(
      sections.blindSpotFutures.some((future) => future.title === "She Assumes You're Not Interested"),
    ).toBe(true);
    expect(
      sections.blindSpotFutures.every(
        (future) => !/clarity|reflect|understanding|patterns|insight/i.test(future.title),
      ),
    ).toBe(true);
  });

  it("uses relationship fallbacks for sparse reflective output", () => {
    const sections = withRealityForecastFallbacks(
      { activeFutures: [], hiddenFutures: [], blindSpotFutures: [] },
      "I like a girl at work",
    );

    expect(sections.activeFutures.length).toBeGreaterThan(0);
    expect(
      sections.activeFutures.some(
        (future) => future.title === "You Keep Talking Every Week But Nothing Changes",
      ),
    ).toBe(true);
    expect(sections.activeFutures[0]?.sourceTrace).toContain("Situation:");
  });

  it("processes dedicated forecast generation through safeguards", () => {
    const sections = processGeneratedForecastSections(
      {
        active: [
          {
            title: "She Says Yes To Coffee",
            why: "A direct ask after daily rapport can lead to plans quickly.",
            impact: "You meet outside work within the week.",
          },
          {
            title: "She Says No But Stays Friendly",
            why: "A clear question can end uncertainty without ending contact.",
            impact: "Daily work stays workable even if the crush fades.",
          },
          {
            title: "Coworkers Learn About The Ask",
            why: "Workplace moments rarely stay fully private.",
            impact: "Small talk feels strained for a few weeks.",
          },
          {
            title: "The Friendship Deepens First",
            why: "More time together can build comfort before romance.",
            impact: "You talk every week but nothing romantic happens yet.",
          },
        ],
        hidden: [
          {
            title: "She Leaves The Company",
            why: "Job changes can remove the situation entirely.",
            impact: "The crush fades because daily contact disappears.",
          },
          {
            title: "The Timing Never Aligns",
            why: "Busy schedules can keep things polite but static.",
            impact: "Months pass without a clear moment to act.",
          },
          {
            title: "You Receive Mixed Signals",
            why: "Friendly behavior can be hard to read over time.",
            impact: "You hesitate longer than planned.",
          },
        ],
        blind_spots: [
          {
            title: "She Assumes You're Not Interested",
            why: "Platonic behavior can read as disinterest when she initiates often.",
            impact: "She stops looking for signs because the friendship feels settled.",
          },
          {
            title: "A Mutual Friend Changes The Dynamic",
            why: "Shared social ties can shift how you both act at work.",
            impact: "Group plans replace one-on-one contact.",
          },
          {
            title: "A One-On-One Opportunity Appears Naturally",
            why: "Shared projects or social plans can create private time.",
            impact: "You finally talk outside the usual work routine.",
          },
        ],
      },
      "I like a girl at work",
      "How often does she initiate conversations?\nDaily",
      "Ask Her Out",
      ["Ask her out directly after work."],
    );

    expect(sections.activeFutures.length).toBeGreaterThanOrEqual(4);
    expect(sections.hiddenFutures.length).toBeGreaterThanOrEqual(3);
    expect(sections.blindSpotFutures.length).toBeGreaterThanOrEqual(3);
    expect(
      sections.activeFutures.every((future) => !isReflectiveForecast(future.title)),
    ).toBe(true);
  });

  it("uses Claude-supplied signals directly when present on the draft", () => {
    const claudeSignals = [
      "Pay jumps from $12 to $20",
      "Notice period at current job",
      "Moving logistics begin",
    ];

    const sections = processGeneratedForecastSections(
      {
        active: [
          {
            title: "She Says Yes To Coffee",
            why: "A direct ask after daily rapport can lead to plans quickly.",
            impact: "You meet outside work within the week.",
            signals: claudeSignals,
          },
          {
            title: "She Says No But Stays Friendly",
            why: "A clear question can end uncertainty without ending contact.",
            impact: "Daily work stays workable even if the crush fades.",
            signals: ["Clear refusal given", "Work stays polite", "Crush fades quietly"],
          },
          {
            title: "Coworkers Learn About The Ask",
            why: "Workplace moments rarely stay fully private.",
            impact: "Small talk feels strained for a few weeks.",
            signals: ["Colleague overheard the ask", "Lunch table goes quiet", "Glances exchanged at work"],
          },
          {
            title: "The Friendship Deepens First",
            why: "More time together can build comfort before romance.",
            impact: "You talk every week but nothing romantic happens yet.",
            signals: ["Lunch plans happen weekly", "Personal topics come up", "Weekend plans suggested"],
          },
        ],
        hidden: [
          {
            title: "She Leaves The Company",
            why: "Job changes can remove the situation entirely.",
            impact: "The crush fades because daily contact disappears.",
            signals: ["LinkedIn update noticed", "Farewell email arrives", "Desk cleared out"],
          },
          {
            title: "The Timing Never Aligns",
            why: "Busy schedules can keep things polite but static.",
            impact: "Months pass without a clear moment to act.",
            signals: ["Schedules keep conflicting", "Good moment never comes", "Weeks pass unmarked"],
          },
          {
            title: "You Receive Mixed Signals",
            why: "Friendly behavior can be hard to read over time.",
            impact: "You hesitate longer than planned.",
            signals: ["Warm then distant again", "Eye contact then avoided", "Reply comes then stops"],
          },
        ],
        blind_spots: [
          {
            title: "She Assumes You're Not Interested",
            why: "Platonic behavior can read as disinterest when she initiates often.",
            impact: "She stops looking for signs because the friendship feels settled.",
            signals: ["She stops initiating", "Tone becomes purely friendly", "Social plans dry up"],
          },
          {
            title: "A Mutual Friend Changes The Dynamic",
            why: "Shared social ties can shift how you both act at work.",
            impact: "Group plans replace one-on-one contact.",
            signals: ["Mutual friend makes plans", "Group chat created", "One-on-one time stops"],
          },
          {
            title: "A One-On-One Opportunity Appears Naturally",
            why: "Shared projects or social plans can create private time.",
            impact: "You finally talk outside the usual work routine.",
            signals: ["Project assigned together", "After-work errand overlap", "Quiet moment found"],
          },
        ],
      },
      "I like a girl at work",
      "How often does she initiate conversations?\nDaily",
      "Ask Her Out",
      ["Ask her out directly after work."],
    );

    const future = sections.activeFutures.find((f) => f.title === "She Says Yes To Coffee");
    expect(future).toBeDefined();
    // Signals come directly from Claude's output, title-cased.
    expect(future?.signals).toEqual([
      "Pay Jumps From $12 To $20",
      "Notice Period At Current Job",
      "Moving Logistics Begin",
    ]);
  });

  it("falls back to title/why truncation when draft has no signals", () => {
    const sections = processGeneratedForecastSections(
      {
        active: [
          {
            title: "She Says Yes To Coffee",
            why: "A direct ask after daily rapport can lead to plans quickly.",
            impact: "You meet outside work within the week.",
            // signals intentionally omitted — exercises fallback path
          },
          {
            title: "She Says No But Stays Friendly",
            why: "A clear question can end uncertainty without ending contact.",
            impact: "Daily work stays workable even if the crush fades.",
          },
          {
            title: "Coworkers Learn About The Ask",
            why: "Workplace moments rarely stay fully private.",
            impact: "Small talk feels strained for a few weeks.",
          },
          {
            title: "The Friendship Deepens First",
            why: "More time together can build comfort before romance.",
            impact: "You talk every week but nothing romantic happens yet.",
          },
        ],
        hidden: [
          {
            title: "She Leaves The Company",
            why: "Job changes can remove the situation entirely.",
            impact: "The crush fades because daily contact disappears.",
          },
          {
            title: "The Timing Never Aligns",
            why: "Busy schedules can keep things polite but static.",
            impact: "Months pass without a clear moment to act.",
          },
          {
            title: "You Receive Mixed Signals",
            why: "Friendly behavior can be hard to read over time.",
            impact: "You hesitate longer than planned.",
          },
        ],
        blind_spots: [
          {
            title: "She Assumes You're Not Interested",
            why: "Platonic behavior can read as disinterest when she initiates often.",
            impact: "She stops looking for signs because the friendship feels settled.",
          },
          {
            title: "A Mutual Friend Changes The Dynamic",
            why: "Shared social ties can shift how you both act at work.",
            impact: "Group plans replace one-on-one contact.",
          },
          {
            title: "A One-On-One Opportunity Appears Naturally",
            why: "Shared projects or social plans can create private time.",
            impact: "You finally talk outside the usual work routine.",
          },
        ],
      },
      "I like a girl at work",
      "How often does she initiate conversations?\nDaily",
      "Ask Her Out",
      ["Ask her out directly after work."],
    );

    const future = sections.activeFutures.find((f) => f.title === "She Says Yes To Coffee");
    expect(future).toBeDefined();
    // Without Claude signals the fallback derives from title/why/impact — not empty.
    expect(future?.signals.length).toBeGreaterThan(0);
    // The title itself is one of the truncation candidates.
    expect(future?.signals.some((s) => s.toLowerCase().includes("she says yes"))).toBe(true);
    // Must not match the Claude-specific signals from the other test.
    expect(future?.signals).not.toContain("Pay Jumps From $12 To $20");
  });

  it("preserves Claude forecast explanations instead of rebuilding source-trace templates", () => {
    const workInitiationWhy =
      "She initiates conversation every time you are both at work, which may signal she enjoys your company and welcomes more of it.";
    const personalityWhy =
      "Being extremely nice at work may reflect her general personality rather than specific romantic interest, making a friendly refusal a realistic outcome.";

    const sections = processGeneratedForecastSections(
      {
        active: [
          {
            title: "She Welcomes More Contact",
            why: workInitiationWhy,
            impact: "You talk more often outside routine work moments.",
          },
          {
            title: "She Says No But Stays Friendly",
            why: personalityWhy,
            impact: "Daily work stays workable even if the crush fades.",
          },
          {
            title: "Coworkers Learn About The Ask",
            why: "Workplace moments rarely stay fully private.",
            impact: "Small talk feels strained for a few weeks.",
          },
          {
            title: "The Friendship Deepens First",
            why: "More time together can build comfort before romance.",
            impact: "You talk every week but nothing romantic happens yet.",
          },
        ],
        hidden: [
          {
            title: "She Leaves The Company",
            why: "Job changes can remove the situation entirely.",
            impact: "The crush fades because daily contact disappears.",
          },
          {
            title: "The Timing Never Aligns",
            why: "Busy schedules can keep things polite but static.",
            impact: "Months pass without a clear moment to act.",
          },
          {
            title: "You Receive Mixed Signals",
            why: "Friendly behavior can be hard to read over time.",
            impact: "You hesitate longer than planned.",
          },
        ],
        blind_spots: [
          {
            title: "She Assumes You're Not Interested",
            why: "Platonic behavior can read as disinterest when she initiates often.",
            impact: "She stops looking for signs because the friendship feels settled.",
          },
          {
            title: "A Mutual Friend Changes The Dynamic",
            why: "Shared social ties can shift how you both act at work.",
            impact: "Group plans replace one-on-one contact.",
          },
          {
            title: "A One-On-One Opportunity Appears Naturally",
            why: "Shared projects or social plans can create private time.",
            impact: "You finally talk outside the usual work routine.",
          },
        ],
      },
      "there a girl i like at work",
      "How often does she initiate conversations?\nDaily",
      "Ask Her Out",
      ["Ask her out directly after work."],
    );

    const preservedWork = sections.activeFutures.find(
      (future) => future.explanationPreservation?.status === "preserved" && future.whyItMightHappen.includes("initiates conversation"),
    );
    const preservedPersonality = sections.activeFutures.find((future) =>
      future.whyItMightHappen.includes("extremely nice at work"),
    );

    expect(preservedWork?.whyItMightHappen).toBe(workInitiationWhy);
    expect(preservedPersonality?.whyItMightHappen).toBe(personalityWhy);
    expect(preservedWork?.explanationPreservation?.status).toBe("preserved");
    expect(preservedPersonality?.explanationPreservation?.status).toBe("preserved");
  });

  it("passes timeframe from draft through to ScannableFuture", () => {
    const sections = processGeneratedForecastSections(
      {
        active: [
          {
            title: "She Says Yes To Coffee",
            why: "A direct ask after daily rapport can lead to plans quickly.",
            impact: "You meet outside work within the week.",
            signals: ["Direct ask made after work", "Daily rapport established", "Plans set within the week"],
            timeframe: "weeks",
          },
          {
            title: "She Says No But Stays Friendly",
            why: "A clear question can end uncertainty without ending contact.",
            impact: "Daily work stays workable even if the crush fades.",
            signals: ["Clear refusal given", "Work stays polite", "Crush fades quietly"],
            timeframe: "days",
          },
          {
            title: "Coworkers Learn About The Ask",
            why: "Workplace moments rarely stay fully private.",
            impact: "Small talk feels strained for a few weeks.",
            signals: ["Colleague overheard the ask", "Lunch table goes quiet", "Glances exchanged at work"],
            timeframe: "weeks",
          },
          {
            title: "The Friendship Deepens First",
            why: "More time together can build comfort before romance.",
            impact: "You talk every week but nothing romantic happens yet.",
            signals: ["Lunch plans happen weekly", "Personal topics come up", "Weekend plans suggested"],
            timeframe: "months",
          },
        ],
        hidden: [
          {
            title: "She Leaves The Company",
            why: "Job changes can remove the situation entirely.",
            impact: "The crush fades because daily contact disappears.",
            signals: ["LinkedIn update noticed", "Farewell email arrives", "Desk cleared out"],
            timeframe: "longer_term",
          },
          {
            title: "The Timing Never Aligns",
            why: "Busy schedules can keep things polite but static.",
            impact: "Months pass without a clear moment to act.",
            signals: ["Schedules keep conflicting", "Good moment never comes", "Weeks pass unmarked"],
            timeframe: "months",
          },
          {
            title: "You Receive Mixed Signals",
            why: "Friendly behavior can be hard to read over time.",
            impact: "You hesitate longer than planned.",
            signals: ["Warm then distant again", "Eye contact then avoided", "Reply comes then stops"],
            timeframe: "weeks",
          },
        ],
        blind_spots: [
          {
            title: "She Assumes You're Not Interested",
            why: "Platonic behavior can read as disinterest when she initiates often.",
            impact: "She stops looking for signs because the friendship feels settled.",
            signals: ["She stops initiating", "Tone becomes purely friendly", "Social plans dry up"],
            timeframe: "weeks",
          },
          {
            title: "A Mutual Friend Changes The Dynamic",
            why: "Shared social ties can shift how you both act at work.",
            impact: "Group plans replace one-on-one contact.",
            signals: ["Mutual friend makes plans", "Group chat created", "One-on-one time stops"],
            timeframe: "months",
          },
          {
            title: "A One-On-One Opportunity Appears Naturally",
            why: "Shared projects or social plans can create private time.",
            impact: "You finally talk outside the usual work routine.",
            signals: ["Project assigned together", "After-work errand overlap", "Quiet moment found"],
            timeframe: "months",
          },
        ],
      },
      "I like a girl at work",
      "How often does she initiate conversations?\nDaily",
      "Ask Her Out",
      ["Ask her out directly after work."],
    );

    // Timeframe should flow from draft through to ScannableFuture.
    const coffeeFuture = sections.activeFutures.find((f) => f.title === "She Says Yes To Coffee");
    expect(coffeeFuture?.timeframe).toBe("weeks");

    const leaveFuture = sections.hiddenFutures.find((f) => f.title === "She Leaves The Company");
    expect(leaveFuture?.timeframe).toBe("longer_term");

    // Fallback-generated futures (source: "fallback") will have undefined timeframe.
    const allFutures = [
      ...sections.activeFutures,
      ...sections.hiddenFutures,
      ...sections.blindSpotFutures,
    ];
    const fallbackFutures = allFutures.filter((f) => f.source === "fallback");
    expect(fallbackFutures.every((f) => f.timeframe === undefined)).toBe(true);
  });
});
