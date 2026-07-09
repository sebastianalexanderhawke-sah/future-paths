import type { IdentityDimension } from "@/types/behavior";

export type IdentityDimensionWeights = Partial<Record<IdentityDimension, number>>;

export type IdentityProfile = {
  id: string;
  canonical_name: string;
  /**
   * One memorable sentence that paints the future person — hand-written,
   * never AI-generated, identical every time this future identity appears.
   * Shown quoted under the name on the Future Self card. Written in the
   * "one day you'll…" register: a picture of the life, never a trait.
   */
  identity_statement: string;
  short_description: string;
  /**
   * Names this identity displayed under in earlier library versions. Legacy
   * future_selves rows without an identity_id are matched by name, so a
   * rename must keep the old names here or those rows fade instead of
   * carrying forward (see generateFutureSelves step 6).
   */
  legacy_names?: string[];
  dimension_weights: IdentityDimensionWeights;
  typical_behaviors: string[];
};

/**
 * The future identity library — v3 "possible lives".
 *
 * Each entry is a genuinely different DIRECTION a life can take (building,
 * exploring, teaching, mastering, protecting, connecting, competing,
 * reforming, understanding, creating) — never a personality cluster. The
 * design test: if all of these sat around one table, they would read as
 * completely different people leading visibly different lives.
 *
 * The recognition engine grounds each life in evidence through
 * dimension_weights (scored against the user's observed behavior) and
 * typical_behaviors (context for the narrative AI). Weights are chosen so
 * no two identities exceed ~0.66 pairwise cosine similarity — overlap is
 * removed at design time, not patched at runtime. This library was built
 * from scratch for v3; the pre-v3 identities were retired, so their rows
 * fade naturally and the new lives emerge from the same evidence.
 */
export const IDENTITY_LIBRARY: readonly IdentityProfile[] = [
  {
    id: "the-builder",
    canonical_name: "The Builder",
    identity_statement:
      "One day you'll look around at a life that exists because you refused to wait for permission to build it.",
    short_description:
      "The version of you who turned restlessness into things that exist — ventures started, systems stood up, rooms wired, lives constructed — because waiting for someone else to build it never felt like an option.",
    dimension_weights: {
      Initiative: 1.0,
      Independence: 0.7,
      Consistency: 0.4,
      "Risk Tolerance": 0.3,
      Connection: -0.3,
      Reflection: -0.2,
    },
    typical_behaviors: [
      "Starts the project, venture, or change without waiting for permission or a plan from someone else",
      "Turns problems into things that get made — a system, a structure, a business, a home",
      "Keeps ownership of the important pieces rather than handing them to someone else to run",
      "Accepts real risk when it's the price of making something exist",
      "Moves from idea to first concrete step faster than the people around them",
    ],
  },
  {
    id: "the-explorer",
    canonical_name: "The Explorer",
    identity_statement:
      "One day your life will read like a map of places most people only wonder about.",
    short_description:
      "The version of you whose life kept getting wider — new places, new domains, new selves — because whatever was interesting always outranked whatever was settled.",
    dimension_weights: {
      Adaptability: 1.0,
      Curiosity: 0.9,
      "Risk Tolerance": 0.4,
      Independence: 0.3,
      Consistency: -0.6,
    },
    typical_behaviors: [
      "Chooses the unfamiliar option over the comfortable one when both are available",
      "Enters new domains, places, or communities before fully mastering the current one",
      "Changes direction when new information makes a different path more interesting",
      "Adapts quickly to upheaval that would destabilize most people",
      "Leaves finished chapters behind without needing ceremony or closure",
    ],
  },
  {
    id: "the-mentor",
    canonical_name: "The Mentor",
    identity_statement:
      "One day you'll be measured by a roomful of people who became themselves under your attention.",
    short_description:
      "The version of you people grew up around — the one who kept showing up in other people's turning points, telling the truth about your own mistakes so theirs would cost less.",
    dimension_weights: {
      Connection: 0.7,
      Vulnerability: 0.7,
      Reflection: 0.6,
      Consistency: 0.5,
      Independence: -0.2,
    },
    typical_behaviors: [
      "Invests time in someone else's growth with nothing owed back",
      "Shares their own failures openly so someone else can skip the same mistake",
      "Stays present through another person's hard season instead of stepping back",
      "Turns their own experience into lessons rather than just stories",
      "Notices what someone is becoming before that person can see it themselves",
    ],
  },
  {
    id: "the-craftsman",
    canonical_name: "The Craftsman",
    identity_statement:
      "One day people will hand you the work that has to be done right, because your name has come to mean exactly that.",
    short_description:
      "The version of you who chose one discipline and went all the way down — decades of quiet hours compounding into work almost no one else can do.",
    dimension_weights: {
      Consistency: 0.9,
      Reflection: 0.7,
      Independence: 0.6,
      Curiosity: 0.3,
      Connection: -0.4,
      Adaptability: -0.3,
    },
    typical_behaviors: [
      "Returns to the same discipline season after season instead of sampling new ones",
      "Practices past the point where others call it finished",
      "Studies their own work to find what's still wrong with it",
      "Protects long uninterrupted stretches for the work, even at social cost",
      "Refuses shortcuts that would compromise the standard, even under pressure",
    ],
  },
  {
    id: "the-guardian",
    canonical_name: "The Guardian",
    identity_statement:
      "One day everything and everyone you were trusted with will still be standing — because you were.",
    short_description:
      "The version of you who kept things safe — the people, the home, the promises — a life built like a wall other people get to relax behind.",
    dimension_weights: {
      Consistency: 0.9,
      Connection: 0.5,
      "Risk Tolerance": -0.7,
      Adaptability: -0.4,
      Initiative: -0.2,
    },
    typical_behaviors: [
      "Protects what's already good — the home, the routine, the people — before chasing what might be better",
      "Keeps promises intact through disruption, whatever the workaround costs",
      "Declines opportunities that would put what others depend on at risk",
      "Becomes the person others quietly assume will still be there",
      "Waits for certainty before changing anything that someone else relies on",
    ],
  },
  {
    id: "the-connector",
    canonical_name: "The Connector",
    identity_statement:
      "One day you'll realize half the friendships in the room exist because you introduced the two people in them.",
    short_description:
      "The version of you who became the reason people know each other — the introducer, the host, the one who noticed who was missing and went to get them.",
    dimension_weights: {
      Connection: 1.0,
      Initiative: 0.5,
      "Conflict Tolerance": 0.5,
      Vulnerability: 0.5,
      Independence: -0.5,
    },
    typical_behaviors: [
      "Introduces people who should know each other and gets out of the way",
      "Organizes the gathering nobody else would have called",
      "Stays in relationships through conflict rather than letting them quietly lapse",
      "Notices who's drifting to the edge of the group and pulls them back in",
      "Shares their own difficulty so others feel safe sharing theirs",
    ],
  },
  {
    id: "the-competitor",
    canonical_name: "The Competitor",
    identity_statement:
      "One day you'll know exactly how good you are, because you never stopped finding out.",
    short_description:
      "The version of you who kept score honestly and played anyway — a life of arenas entered, standards raised, and a self measured against real opposition rather than imagination.",
    dimension_weights: {
      Initiative: 0.7,
      "Risk Tolerance": 0.6,
      "Conflict Tolerance": 0.4,
      Consistency: 0.4,
      Vulnerability: -0.4,
      Reflection: -0.2,
    },
    typical_behaviors: [
      "Seeks out arenas where the outcome is measured and public",
      "Chooses the harder opponent or standard over the comfortable win",
      "Returns quickly after losses instead of retreating to safer ground",
      "Tracks their own performance honestly, without inflating it",
      "Raises their standard as soon as the current one stops being hard",
    ],
  },
  {
    id: "the-reformer",
    canonical_name: "The Reformer",
    identity_statement:
      "One day the things you couldn't leave broken will be the things everyone else gets to take for granted.",
    short_description:
      "The version of you who couldn't walk past what was broken — who named uncomfortable things out loud, took the friction, and left every system better than you found it.",
    dimension_weights: {
      "Conflict Tolerance": 1.0,
      Initiative: 0.6,
      Vulnerability: 0.3,
      Curiosity: 0.2,
    },
    typical_behaviors: [
      "Names the problem everyone else has agreed not to mention",
      "Challenges how things are done when the current way quietly costs people",
      "Stays in the uncomfortable conversation until something actually changes",
      "Takes the friction personally directed at them as the price of the fix",
      "Pushes to change the system rather than just surviving it",
    ],
  },
  {
    id: "the-scholar",
    canonical_name: "The Scholar",
    identity_statement:
      "One day you'll understand things so deeply that people will bring you their hardest questions just to watch you take them apart.",
    short_description:
      "The version of you who followed questions further than anyone around you cared to — a life of understanding built slowly, alone with the problem, until the problem gave in.",
    dimension_weights: {
      Reflection: 1.0,
      Curiosity: 0.8,
      Independence: 0.4,
      "Risk Tolerance": -0.3,
      "Conflict Tolerance": -0.2,
    },
    typical_behaviors: [
      "Follows a question long after the practical need for an answer has passed",
      "Reads, researches, or investigates before forming a position",
      "Returns to open questions rather than letting them close unresolved",
      "Examines their own past decisions to extract what was really going on",
      "Prefers understanding something completely to using it quickly",
    ],
  },
  {
    id: "the-creator",
    canonical_name: "The Creator",
    identity_statement:
      "One day there will be work in the world that could only have come from you — and everyone who sees it will know.",
    short_description:
      "The version of you with a body of work — original things carried from private notebooks into public view, each one costing a little exposure and paying back a voice.",
    dimension_weights: {
      Curiosity: 0.7,
      Vulnerability: 0.6,
      Independence: 0.5,
      Initiative: 0.5,
      Adaptability: 0.3,
      Consistency: -0.3,
    },
    // Identity Engine v2: these behaviors are written as observable acts the
    // extractor can tag (creates_original_work, shares_original_work,
    // sets_own_terms, explores_new_topic). The last one deliberately says
    // "begins the next piece" rather than "keeps going" — continuing-through-
    // indifference expressed as a commitment maps to Consistency, which this
    // identity weights negatively; expressed as the next act of creation it
    // maps to the dimensions that actually define a creator.
    typical_behaviors: [
      "Makes original things instead of only consuming or optimizing what exists",
      "Puts their own work in front of people who could judge it, despite the exposure",
      "Chooses the path that allows self-expression over the conventional one",
      "Starts new work from their own obsessions rather than external briefs",
      "Begins the next piece whether or not the last one was applauded — the body of work keeps growing",
    ],
  },
];

export function getIdentityById(id: string): IdentityProfile | undefined {
  return IDENTITY_LIBRARY.find((identity) => identity.id === id);
}

export function getIdentityByName(name: string): IdentityProfile | undefined {
  return IDENTITY_LIBRARY.find(
    (identity) =>
      identity.canonical_name === name || identity.legacy_names?.includes(name),
  );
}
