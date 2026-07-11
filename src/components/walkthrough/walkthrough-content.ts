import type { ThemeName } from "@/types/enums";

/**
 * Everything the Interactive Walkthrough shows lives in this file: nine
 * teaching steps plus one carefully designed demonstration scenario
 * ("Should I move to another city?"). The walkthrough never reads or
 * writes user data — these constants are its entire world.
 */

export type WalkthroughStep = {
  /** 1-based position, also the ?step= URL value. */
  number: number;
  /** Small uppercase kicker naming the product area being taught. */
  kicker: string;
  /** CSS variable carrying the feature family's accent color. */
  accentVar: string;
  title: string;
  /** Teaching copy: short paragraphs rendered above the demo panel. */
  paragraphs: string[];
  /** Label on the primary nav action (defaults to "Next →"). */
  nextLabel?: string;
};

export const WALKTHROUGH_STEP_COUNT = 9;

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    number: 1,
    kicker: "Welcome",
    accentVar: "--accent-system",
    title: "See how Reflection works, start to finish",
    paragraphs: [
      "Reflection helps you think through meaningful decisions — and shows you, over time, who you are becoming. In the next few minutes you'll follow one situation through the whole product: from writing it down to seeing it change your Timeline.",
      "Everything ahead is example content. Nothing here reads or touches your own situations, and leaving the walkthrough changes nothing in your account.",
    ],
  },
  {
    number: 2,
    kicker: "Situations",
    accentVar: "--accent-moments",
    title: "Every journey begins with a situation",
    paragraphs: [
      "A situation is a real decision or crossroads you're facing, written in your own words. You give it a short title, describe what's going on, and say what kind of help you want.",
      "This is the situation editor. The example below is already filled in the way you might write it.",
    ],
  },
  {
    number: 3,
    kicker: "Follow-up questions",
    accentVar: "--accent-moments",
    title: "Reflection asks before it answers",
    paragraphs: [
      "Before generating anything, Reflection reads your situation and asks a few questions only you can answer. Richer context creates better futures — the more it understands what actually matters to you, the more personal your paths become.",
    ],
  },
  {
    number: 4,
    kicker: "Possible paths",
    accentVar: "--accent-futures",
    title: "Your situation becomes possible futures",
    paragraphs: [
      "Each path is a fundamentally different life one year out — not a pros-and-cons list. They are possibilities, not predictions: ways this could go, each with its own themes, benefits, and trade-offs.",
      "Open a path to see what that future asks of you and what it gives back.",
    ],
  },
  {
    number: 5,
    kicker: "Choosing",
    accentVar: "--accent-futures",
    title: "Choosing a path moves you forward",
    paragraphs: [
      "When a path feels right, you choose it — and the product immediately points forward. For this walkthrough one path is already selected, so you don't have to make a real decision.",
    ],
    nextLabel: "Continue →",
  },
  {
    number: 6,
    kicker: "Future Forecast",
    accentVar: "--accent-futures",
    title: "See what life could become",
    paragraphs: [
      "The Future Forecast explores what could happen if this direction continues: who you are today, who this path grows you into, and the concrete turns the next year could take — including what might go wrong.",
    ],
  },
  {
    number: 7,
    kicker: "Workspace",
    accentVar: "--accent-growth",
    title: "The Workspace keeps situations alive",
    paragraphs: [
      "A decision isn't the end of the story. Check-ins record what actually happened, so forecasts stay honest. Reflections are short questions that help Reflection understand how you're growing — both feed everything else you've seen.",
    ],
  },
  {
    number: 8,
    kicker: "Timeline",
    accentVar: "--accent-growth",
    title: "Each month becomes a chapter",
    paragraphs: [
      "The Timeline compares who you were entering a month with who you became leaving it — and ties the change to what actually happened in your life. Chapters are written from your own check-ins and reflections, never invented.",
    ],
  },
  {
    number: 9,
    kicker: "Overview",
    accentVar: "--accent-self",
    title: "Everything connects",
    paragraphs: [
      "The Overview is where it all comes together. Your situations shape your Current Self; your choices shape your Future Selves; patterns emerge across them; the Timeline records the change; and the Workspace keeps it moving.",
      "That's the whole loop. Your first real situation is the best way to start.",
    ],
    nextLabel: "Finish walkthrough",
  },
];

/* ── The demonstration scenario ─────────────────────────────────────────── */

export const DEMO_SITUATION = {
  title: "Should I move to another city?",
  description:
    "I've been offered a role in Denver. I like my life here — friends, my sister nearby, a routine that works — but I've felt restless for a year. The offer is real, the city is unknown, and I keep going back and forth.",
  goal: "decision" as const,
};

export const DEMO_QUESTIONS = [
  {
    question: "What's pulling you toward the new city?",
    answer:
      "The work is closer to what I actually want to do. And honestly, I want to know who I am somewhere no one knows me yet.",
  },
  {
    question: "What would be hardest to leave behind?",
    answer:
      "Sunday dinners with my sister. I'm afraid the distance would slowly turn us into people who only text.",
  },
];

export type DemoPath = {
  title: string;
  themes: ThemeName[];
  summary: string;
  benefits: string[];
  tradeOffs: string[];
  futureYou: string;
  chosen: boolean;
};

export const DEMO_PATHS: DemoPath[] = [
  {
    title: "The year you go",
    themes: ["Courage", "Independence"],
    summary:
      "You take the offer, and a year from now Denver is simply where your life happens.",
    benefits: [
      "Work that finally matches your ambitions",
      "A version of you built by your own choices, not habit",
      "Distance that makes visits home intentional, not automatic",
    ],
    tradeOffs: [
      "The first months are genuinely lonely",
      "Sunday dinners become a plane ticket",
      "Your old routine is gone even if you come back",
    ],
    futureYou:
      "A year in, you're the person who found out — whichever way it went.",
    chosen: true,
  },
  {
    title: "The year you build here",
    themes: ["Stability", "Belonging"],
    summary:
      "You decline, and put the restlessness to work on the life you already have.",
    benefits: [
      "The relationships you'd protect keep compounding",
      "Restlessness becomes a renovation project, not an escape",
      "No what-if about what you gave up — you chose it",
    ],
    tradeOffs: [
      "The question returns the next time an offer comes",
      "Comfort can quietly become the reason for everything",
      "The career door in Denver may not reopen",
    ],
    futureYou:
      "A year in, staying was a decision you made — not one that happened to you.",
    chosen: false,
  },
  {
    title: "The year you test it",
    themes: ["Curiosity", "Reflection"],
    summary:
      "You negotiate three months remote in Denver before deciding anything permanent.",
    benefits: [
      "Real information instead of imagined versions of the city",
      "Your sister gets a say in the experiment",
      "A reversible step where both futures stay open",
    ],
    tradeOffs: [
      "Three months in limbo, half-unpacked",
      "The employer may not wait on a maybe",
      "Testing can become a way of never choosing",
    ],
    futureYou:
      "A year in, you decided with evidence — and you know the difference.",
    chosen: false,
  },
];

export const DEMO_CHOSEN_PATH = DEMO_PATHS.find((path) => path.chosen)!;

export const DEMO_FORECAST = {
  currentSelf:
    "You value closeness and momentum at the same time — and lately momentum has been losing. Restlessness in your writing has grown for three straight months.",
  futureSelf:
    "The Self-Made Navigator: someone who treats unfamiliar places as material, not threat. Emerging in your entries; this path feeds it directly.",
  timeline: [
    { window: "Likely within weeks", text: "The logistics wave: notice, lease, goodbyes. Energy high, doubt low." },
    { window: "Likely within months", text: "The first real dip — a Sunday with no dinner to go to. This is where check-ins matter." },
    { window: "Watch for", text: "Filling the loneliness with work until Denver is just a desk in a different state." },
    { window: "Alternative turn", text: "Your sister starts a monthly visit ritual, and distance makes you closer, not further." },
  ],
};

export const DEMO_WORKSPACE = {
  checkIn: {
    label: "Continue",
    title: "Check in on “Should I move to another city?”",
    detail: "How did the first week in Denver actually feel?",
  },
  reflection: {
    label: "Next up",
    title: "A question from Reflection",
    detail: "You predicted the loneliness would peak around week six. Did it?",
  },
};

export const DEMO_TIMELINE_CHAPTER = {
  month: "October",
  headline: "The month you chose motion over certainty",
  beginning: [
    "You waited for the decision to make itself.",
    "Restlessness read as a problem to manage.",
  ],
  end: [
    "You signed the lease before you felt ready.",
    "Restlessness turned out to be direction, unlabeled.",
  ],
  shifts: [
    { theme: "Courage" as ThemeName, change: "+18%" },
    { theme: "Stability" as ThemeName, change: "−6%" },
  ],
  closing:
    "The move didn't settle the question of home — it proved you can carry it with you.",
};

export const DEMO_OVERVIEW_CHAIN = [
  {
    name: "Current Self",
    note: "Who you are right now, drawn from everything you've recorded.",
  },
  {
    name: "Future Selves",
    note: "The people your choices are growing — strengthened or faded by each decision.",
  },
  {
    name: "Patterns",
    note: "What keeps showing up across situations, before you'd name it yourself.",
  },
  {
    name: "Timeline",
    note: "The monthly chapters of how you actually changed.",
  },
  {
    name: "Workspace",
    note: "The check-ins and reflections that keep all of it honest.",
  },
];
