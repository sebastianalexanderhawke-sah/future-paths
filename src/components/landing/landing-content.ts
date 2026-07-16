import type { CurrentFutureRendering } from "@/lib/forecast-simplification-experiment";
import type { FutureSelf } from "@/types/database";
import type { ThemeName } from "@/types/enums";
import { illustrativeFutureSelf } from "@/components/onboarding/future-selves-preview";

/**
 * Fixtures for the public landing page: one demonstration scenario
 * ("Should I ask her out?") followed from first words to who it makes you.
 * The page owns its scenario outright — deliberately more personal and
 * immediate than the in-app walkthrough's Denver decision — because a
 * visitor deciding whether to care is won by recognition, not relocation
 * logistics. Everything here is openly illustrative: never persisted,
 * never mixed with user data.
 *
 * Voice rules the copy follows:
 * - The situation reads the way a real person would type it — hedged,
 *   circular, unpolished.
 * - Paths are genuinely different decisions (ask / wait / let it go), each
 *   presented even-handedly — possibilities, not a right answer.
 * - Forecast entries are grounded observations with visible reasoning,
 *   never fortune telling.
 * - The Future Self is psychologically believable, named for a pattern of
 *   decisions rather than a destiny.
 */

/* ── The situation ──────────────────────────────────────────────────────── */

export const LANDING_SITUATION = {
  title: "Should I ask her out?",
  paragraphs: [
    "There's a girl I've been talking to at the gym for a few weeks. We always end up chatting after our workouts, and I keep wondering if she's interested or if I'm just reading too much into it.",
    "I've thought about asking her to get coffee, but I don't want to make things awkward if she says no. I keep going back and forth.",
  ],
};

/* ── Three possible years ───────────────────────────────────────────────── */

export type LandingPath = {
  title: string;
  themes: ThemeName[];
  summary: string;
  chosen: boolean;
};

export const LANDING_PATHS: LandingPath[] = [
  {
    title: "The year you asked",
    themes: ["Courage", "Connection"],
    summary:
      "You ask her to get coffee after a workout. Whatever she says, the wondering ends that day — and a year from now the story went somewhere real instead of around in circles.",
    chosen: true,
  },
  {
    title: "The year you waited",
    themes: ["Reflection", "Stability"],
    summary:
      "You keep the conversations going and wait for a sign that feels unmistakable. Nothing is risked and nothing is lost — but the question stays open, and you keep paying its rent in attention.",
    chosen: false,
  },
  {
    title: "The year you stayed friends",
    themes: ["Belonging", "Stability"],
    summary:
      "You decide the easy company is the point, and quietly retire the question on purpose. The gym stays uncomplicated — and you find out whether that was wisdom or a story you told yourself.",
    chosen: false,
  },
];

/* ── The forecast for the chosen path ───────────────────────────────────── */

/** Semantic flavor of a forecast observation — drives the entry's marker
 *  glyph and accent on the landing page (presentation only). */
export type LandingForecastKind = "likely" | "watch" | "unexpected";

export const LANDING_FORECAST_TIMELINE: {
  window: string;
  text: string;
  kind: LandingForecastKind;
}[] = [
  {
    window: "Likely within days",
    kind: "likely",
    text: "Relief arrives before her answer does. The asking itself takes a minute; the deciding-to-ask is the part that took weeks.",
  },
  {
    window: "Likely within weeks",
    kind: "likely",
    text: "If it's a no, expect a stretch of extra-polite nods before the post-workout chats find their old rhythm. Awkwardness fades faster than the dread of it predicted.",
  },
  {
    window: "Watch for",
    kind: "watch",
    text: "Overthinking the quiet — a slow reply or a missed gym day turning into a story about what it means.",
  },
  {
    window: "Unexpected turn",
    kind: "unexpected",
    text: "Asking once tends to travel. The next direct question — at work, with friends — costs less than this one did.",
  },
];

/* ── The future self this decision feeds ────────────────────────────────── */

export const LANDING_FUTURE_SELF = {
  name: "Confident Connector",
  line: "Someone who asks the direct question instead of waiting for certainty.",
  whyEmerging:
    "This self isn't about one coffee. It grows a little every time you choose a clear question over a safe silence — and your entries show this is the third time in two months you've circled that same choice. Whichever way you decide, you're practicing being someone.",
};

/* ── Reflection follows up ──────────────────────────────────────────────── */

export const LANDING_WORKSPACE = {
  intro: "A week later, Sibyl checks in",
  checkIn: {
    title: "Check in on “Should I ask her out?”",
    detail: "Did reality match what you imagined before asking?",
  },
  outro:
    "Your answer takes a minute to write — and it sharpens the forecast, moves your Future Selves, and shapes the next question Sibyl asks. The longer you use it, the better it knows who you're becoming.",
};

/* ── Hero: the input→output demonstration ───────────────────────────────── */

/** Forecasts v3 structured card (actions present selects the structured
 *  layout — see forecast-simplification-cards.tsx). Bullets follow the
 *  product's events-not-emotions rule. */
export const LANDING_HERO_FORECAST: CurrentFutureRendering = {
  title: "The question gets answered",
  timeframe: "weeks",
  signals: [],
  whyItMightHappen:
    "The conversations already run long after every workout — the ask is the only part of this still unwritten.",
  futureImpact:
    "One short, nervous question ends weeks of back-and-forth — whatever the answer.\nThe post-workout chats stop being an audition and become whatever they actually are.",
  actions: [
    "Ask after a workout that ends in one of those long chats",
    "Keep it small and specific — coffee this weekend, not a speech",
  ],
};

/* ── Over time: the map one year of decisions draws ─────────────────────── */

/** The landing map's cast continues the page's one story: the future self
 *  the worked example strengthened now leads, among quieter possibilities —
 *  the full grammar of the stage (leader, rival, fading maybes). */
export const LANDING_FUTURE_SELVES: FutureSelf[] = [
  illustrativeFutureSelf({
    id: "landing-connector",
    name: "Confident Connector",
    summary: "Asks the direct question instead of waiting for certainty.",
    percentage: 54,
    themes: ["Courage", "Connection"],
  }),
  illustrativeFutureSelf({
    id: "landing-anchor",
    name: "Reliable Anchor",
    summary: "Shows up for the same people, again and again.",
    percentage: 38,
    themes: ["Stability", "Belonging"],
  }),
  illustrativeFutureSelf({
    id: "landing-explorer",
    name: "Curious Explorer",
    summary: "Trades comfort for the next unfamiliar room.",
    percentage: 23,
    themes: ["Curiosity", "Growth"],
  }),
  illustrativeFutureSelf({
    id: "landing-mentor",
    name: "Thoughtful Mentor",
    summary: "Ends up being the person others think out loud with.",
    percentage: 12,
    themes: ["Reflection", "Leadership"],
  }),
];
