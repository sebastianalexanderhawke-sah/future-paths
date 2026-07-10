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
          title: "Take The Job",
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
    // Forecasts v2: 3 likely developments, 3 failure modes, no blind spots.
    expect(sections.activeFutures.length).toBe(3);
    expect(sections.hiddenFutures.length).toBe(3);
    expect(sections.blindSpotFutures.length).toBe(0);
  });

  it("surfaces path-context insights as failure modes (v2: blind spots retired)", () => {
    const sections = buildRealityForecastSections(
      [],
      [],
      "I like a girl at work",
      {
        title: "Friendship First",
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
      sections.hiddenFutures.some((future) => future.title === "She Assumes You're Not Interested"),
    ).toBe(true);
    expect(sections.blindSpotFutures).toHaveLength(0);
    expect(
      sections.hiddenFutures.every(
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
            title: "You Start Spending Time Together Outside Work",
            why: "One plan tends to lead to another once the first invitation lands.",
            impact: "Weekends start including her instead of just workdays.",
          },
          {
            title: "Coworkers Learn About The Ask",
            why: "Workplace moments rarely stay fully private.",
            impact: "Small talk feels strained for a few weeks.",
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
            title: "She Assumes You're Not Interested",
            why: "Platonic behavior can read as disinterest when she initiates often.",
            impact: "She stops looking for signs because the friendship feels settled.",
          },
        ],
        blind_spots: [],
        wild_card: [
          {
            title: "A Mutual Friend Changes The Dynamic",
            why: "Shared social ties can shift how you both act at work.",
            impact: "Group plans replace one-on-one contact.",
          },
          {
            title: "She Transfers To Another Team",
            why: "Internal moves change daily proximity without ending contact.",
            impact: "You have to choose to stay in touch deliberately.",
          },
        ],
      },
      "I like a girl at work",
      "How often does she initiate conversations?\nDaily",
      "Ask Her Out",
      ["Ask her out directly after work."],
    );

    // Forecasts v2: 3 likely developments, 3 failure modes, 2 alternatives.
    expect(sections.activeFutures.length).toBe(3);
    expect(sections.hiddenFutures.length).toBe(3);
    expect(sections.blindSpotFutures.length).toBe(0);
    expect(sections.wildCardFutures.length).toBe(2);
    expect(
      sections.activeFutures.every((future) => !isReflectiveForecast(future.title)),
    ).toBe(true);
  });

  it("v2.1: keeps AI futures whose prose uses vocabulary v1 banned", () => {
    // "think about", "insight", "patterns", "reflect" are legitimate v2
    // lived-moment language. The structural filter must not remove them.
    const sections = processGeneratedForecastSections(
      {
        active: [
          {
            title: "You Finally Have Time To Think About Growth",
            why: "With tech handled, your attention shifts from firefighting to direction — you start thinking about where the site should go next instead of what broke today.",
            impact: "Watching user replies gives you insight into what actually helps people who overthink.",
          },
          {
            title: "AI Content Drafts Start Sounding Like You",
            why: "After prompt iteration the drafts arrive closer to publishable.",
            impact: "The bottleneck shifts from writing to reviewing.",
          },
          {
            title: "The Site Starts Running Without Your Daily Attention",
            why: "You notice patterns in which posts resonate, and that changes what you write.",
            impact: "The work starts to reflect what your readers actually need.",
          },
        ],
        hidden: [
          {
            title: "You Become The Bottleneck Between Two Systems",
            why: "Both threads route back through you for context.",
            impact: "You spend time managing handoffs.",
          },
          {
            title: "The Site's Voice Slowly Becomes Unrecognizable",
            why: "Reliance makes the writing more generic without recalibration.",
            impact: "Content publishes on schedule while losing quality.",
          },
          {
            title: "You Stop Asking For Help",
            why: "Working solo makes self-reliance the habit.",
            impact: "Problems others solved months ago eat your weekends.",
          },
        ],
        blind_spots: [],
        wild_card: [
          {
            title: "The Content Process Reveals A New Revenue Direction",
            why: "Systematic production surfaces what people actually pay attention to.",
            impact: "A format becomes a product.",
          },
          {
            title: "The Contractor Spots A Bigger Opportunity",
            why: "Outside pattern recognition notices what you're too close to see.",
            impact: "You redirect where you focus next.",
          },
        ],
      },
      "managing my business",
      "i want to find a better way to manage my business, i have a website that helps people with overthinking; content and tech take the most time",
      "Separate Content From Tech",
      ["Treat content and tech as two distinct problems."],
    );

    // Exactly 8 survive — nothing removed for narrative vocabulary.
    expect(sections.activeFutures).toHaveLength(3);
    expect(sections.hiddenFutures).toHaveLength(3);
    expect(sections.wildCardFutures).toHaveLength(2);
    // Titles preserved verbatim — no title-case mangling ("AI" stays "AI"),
    // no scene-title substitution.
    expect(sections.activeFutures.map((f) => f.title)).toEqual([
      "You Finally Have Time To Think About Growth",
      "AI Content Drafts Start Sounding Like You",
      "The Site Starts Running Without Your Daily Attention",
    ]);
    // Impact text is the model's own writing, untouched.
    expect(sections.activeFutures[0]?.futureImpact).toBe(
      "Watching user replies gives you insight into what actually helps people who overthink.",
    );
  });

  it("v2.2: preserves long descriptions verbatim instead of templating them", () => {
    // 462 chars — over the old 400-char cap that used to trigger the
    // "Because you described…" replacement. The model's paragraph must now
    // reach the user exactly as written.
    const longWhy =
      "Once the tech side is handled and content production becomes more systematic, you may find that the content itself — not the site infrastructure — is where the real leverage lives. A post that resonates with people who overthink could reach far beyond your current audience through sharing, newsletters, or other formats. Separating content from tech may reveal that content deserves more investment, not less, and that the site is just one distribution channel.";

    const sections = processGeneratedForecastSections(
      {
        active: [
          {
            title: "You Realize Content Is The Real Business",
            why: longWhy,
            impact: "You shift investment toward content formats and distribution.",
            signals: ["A Post Outperforms Everything Else", "Newsletter Signups Accelerate", "AI Output Needs Less Editing"],
          },
          {
            title: "AI Content Drafts Start Sounding Like You",
            why: "After prompt iteration the drafts arrive closer to publishable.",
            impact: "The bottleneck shifts from writing to reviewing.",
          },
          {
            title: "A Freelancer Takes The Tech Off Your Plate",
            why: "Handing off a real problem shifts the mental load.",
            impact: "A site error gets fixed without your hours.",
          },
        ],
        hidden: [
          {
            title: "You Become The Bottleneck",
            why: "Both threads route back through you.",
            impact: "You manage handoffs.",
          },
          {
            title: "The Freelancer Misreads The Audience",
            why: "A quickly-briefed contractor treats it as generic web work.",
            impact: "Small decisions undermine the experience.",
          },
          {
            title: "Content Volume Rises But Connection Drops",
            why: "Scale without recalibration flattens the voice.",
            impact: "Readers notice before you do.",
          },
        ],
        blind_spots: [],
        wild_card: [
          {
            title: "The Contractor Spots A Bigger Opportunity",
            why: "Outside eyes see what you're too close to see.",
            impact: "You redirect focus.",
          },
          {
            title: "A Reader Becomes A Collaborator",
            why: "Shipping consistently makes strangers offer more than feedback.",
            impact: "You stop building alone.",
          },
        ],
      },
      "managing my business",
      "i have a website that helps people with overthinking; content and tech take the most time",
      "Separate Content From Tech",
      [],
    );

    // The 462-char paragraph survives verbatim — no "Because you described…".
    expect(sections.activeFutures[0]?.whyItMightHappen).toBe(longWhy);
    expect(
      [...sections.activeFutures, ...sections.hiddenFutures, ...sections.wildCardFutures].every(
        (f) => !/^because you described/i.test(f.whyItMightHappen),
      ),
    ).toBe(true);
    // Model-supplied signals keep their exact casing ("AI" is not mangled).
    expect(sections.activeFutures[0]?.signals).toContain("AI Output Needs Less Editing");
  });

  it("v2.1: anti-fabrication still removes futures about invented topics", () => {
    const sections = processGeneratedForecastSections(
      {
        active: [
          {
            title: "Your Dallas Office Opens",
            why: "Expansion could follow growth.",
            impact: "The business gets a second base.",
          },
          {
            title: "AI Content Drafts Start Sounding Like You",
            why: "After prompt iteration the drafts arrive closer to publishable.",
            impact: "The bottleneck shifts from writing to reviewing.",
          },
          {
            title: "A Freelancer Takes The Tech Off Your Plate",
            why: "Handing off a real problem shifts the mental load.",
            impact: "A site error gets fixed without your hours.",
          },
        ],
        hidden: [
          {
            title: "You Become The Bottleneck",
            why: "Both threads route back through you.",
            impact: "You manage handoffs.",
          },
          {
            title: "The Freelancer Misreads The Audience",
            why: "A quickly-briefed contractor treats it as generic web work.",
            impact: "Small decisions undermine the experience.",
          },
          {
            title: "Content Volume Rises But Connection Drops",
            why: "Scale without recalibration flattens the voice.",
            impact: "Readers notice before you do.",
          },
        ],
        blind_spots: [],
        wild_card: [
          {
            title: "The Contractor Spots A Bigger Opportunity",
            why: "Outside eyes see what you're too close to see.",
            impact: "You redirect focus.",
          },
          {
            title: "A Reader Becomes A Collaborator",
            why: "Shipping consistently is what makes strangers offer more than feedback.",
            impact: "You stop building alone.",
          },
        ],
      },
      "managing my business",
      "i have a website that helps people with overthinking; content and tech take the most time",
      "Separate Content From Tech",
      [],
    );

    // "Dallas" is a fabricated topic for this situation — still removed.
    expect(
      sections.activeFutures.some((future) => /dallas/i.test(future.title)),
    ).toBe(false);
    expect(sections.hiddenFutures).toHaveLength(3);
  });

  it("uses Claude-supplied signals directly when present on the draft", () => {
    const claudeSignals = [
      "Pay jumps from $12 to $20",
      "Notice period at current job",
      "Moving logistics begin",
    ];

    const sections = processGeneratedForecastSections(
      {
        wild_card: [],
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
    // v2.2: signals come directly from Claude's output, verbatim — no
    // title-casing pass (it mangled acronyms like "AI").
    expect(future?.signals).toEqual([
      "Pay jumps from $12 to $20",
      "Notice period at current job",
      "Moving logistics begin",
    ]);
  });

  it("falls back to title/why truncation when draft has no signals", () => {
    const sections = processGeneratedForecastSections(
      {
        wild_card: [],
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
        wild_card: [],
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
        wild_card: [],
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
