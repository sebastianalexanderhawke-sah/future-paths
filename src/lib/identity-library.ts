import type { IdentityDimension } from "@/types/behavior";

export type IdentityDimensionWeights = Partial<Record<IdentityDimension, number>>;

/**
 * Phase 5.1: the permanent, hand-written card content for a curated
 * identity. Everything here is fixed editorial copy — identical for every
 * user, every generation run, forever — so Future Selves read as identities
 * Reflection RECOGNIZES, not identities the AI reinvents each time. The
 * card and the persistence pipeline both treat the library as the source of
 * truth for these sections; the AI's only remaining job for a curated
 * identity is the personalized "why now" sentence and the "Why Reflection
 * Believes This" evidence bullets.
 *
 * Writing contract (pinned by identity-library.test.ts): becomes is exactly
 * three short paragraphs (1–2 plain sentences each, everyday behaviors, no
 * percentages / dimensions / psychology vocabulary); strengthens and
 * tradeoffs are exactly three short observable bullets each. Sentence
 * shapes must vary across identities — no shared template.
 *
 * Phase 7 becomes voice: written directly to the user ("you"), plain
 * conversational English, no metaphor or imagery, no generic transitions
 * ("Over time", "Eventually", "Someone like this", "Year after year",
 * "Quietly"). Paragraph 1 = who you become, paragraph 2 = how you approach
 * life differently, paragraph 3 = how other people begin to experience you.
 * The test: after reading, the user can immediately finish "I become
 * someone who...".
 *
 * Phase 8 (2026-07-14): all quote/becomes/strengthens/tradeoffs copy is
 * canonical editorial content supplied by the product owner. Edits are
 * editorial revisions applied verbatim — never AI-written, never
 * "improved". A few strengthens/tradeoffs bullets intentionally repeat
 * across archetypes; only becomes paragraphs are unique library-wide.
 */
export type CuratedNarrative = {
  becomes: readonly [string, string, string];
  strengthens: readonly [string, string, string];
  tradeoffs: readonly [string, string, string];
};

export type IdentityProfile = {
  id: string;
  /**
   * The one dominant human trait this Future Self is built around — everyday
   * vocabulary ("Discipline", "Guardedness"), never engine vocabulary. Every
   * trait is neutral by design: the library carries Burnout and Avoidance
   * with exactly the same voice as Courage and Wisdom. Unique across the
   * library (identity-library.test.ts pins it).
   */
  trait: string;
  /**
   * The dimension this identity's dominant trait lives on — the axis the
   * recognition engine can actually measure. Selection never displays two
   * Future Selves sharing a dominant_dimension (variations of one trait read
   * as duplicates of one identity); the highest-scoring one wins. Must be
   * the dimension with the largest absolute weight in dimension_weights
   * (negative-dominant is legal: Comfort Seeking IS low Adaptability).
   */
  dominant_dimension: IdentityDimension;
  canonical_name: string;
  /**
   * One memorable sentence — hand-written, never AI-generated, identical
   * every time this future identity appears. Shown quoted under the name on
   * the Future Self card. Plain, everyday register addressed to "you": what
   * living with this trait looks like, never a horoscope.
   */
  identity_statement: string;
  short_description: string;
  /**
   * Names this identity displayed under in earlier library versions. Legacy
   * future_selves rows without an identity_id are matched by name, so a
   * rename must keep the old names here or those rows fade instead of
   * carrying forward (see generateFutureSelves step 6). These names also
   * stay suppressed in forecast surfaces (see forecast-reality.ts).
   */
  legacy_names?: string[];
  /**
   * Identity ids this identity previously lived under in retired library
   * epochs. Continuity matching checks these after the exact id, so a row
   * persisted under an old epoch's id is carried forward (renamed and
   * re-keyed to the current id) instead of fading — a library update must
   * never read as an identity suddenly disappearing. Each legacy id may
   * appear in at most ONE profile, and never as a live id
   * (identity-library.test.ts pins both).
   */
  legacy_ids?: string[];
  dimension_weights: IdentityDimensionWeights;
  typical_behaviors: string[];
  /**
   * The permanent card content — required (Phase 6): a new archetype cannot
   * ship without its editorial pass. The AI never writes any of this; it
   * only personalizes the "why now" sentence and the evidence bullets.
   */
  curated_narrative: CuratedNarrative;
};

/**
 * The future identity library — v4 "strengthening traits" (Future Selves
 * Phase 4).
 *
 * Thirty Future Selves, each built around ONE dominant human trait
 * (Independence → Independent Builder, Burnout → Tireless Worker). The page
 * answers "what kind of person am I becoming if these patterns continue?",
 * so each entry is a different dimension of a person — never a variation of
 * another entry. Traits are neutral: the uncomfortable ones (Isolation,
 * People-Pleasing, Overthinking, Comfort Seeking) get the same honest
 * becomes/strengthens/tradeoffs treatment as the flattering ones, because
 * every trait has both.
 *
 * Where the pre-Phase-4 library removed overlap at design time (10 lives,
 * pairwise-distant weight vectors), this one embraces overlap and removes it
 * at SELECTION time: several identities share a dominant_dimension (they are
 * deliberate variations — Independent Builder / Independent Loner / Quiet
 * Confident are three ways Independence can grow), and the recognition
 * engine surfaces at most one per dominant dimension, keeping the
 * highest-scoring (see recognizeIdentities). Weights are tuned so every
 * identity still ranks #1 on its own canonical evidence
 * (identity-self-recognition.test.ts pins the geometry).
 *
 * Retired v3 ids with a clear successor here live on in that successor's
 * legacy_ids so their rows carry forward across the epoch instead of
 * mass-fading — the 2026-07-09 library swap faded five active futures to 0%
 * in one run, which read as the identity model collapsing. Retired ids with
 * no clear successor stay unmapped and fade gradually (see the fade step in
 * generateFutureSelves). Carried-forward rows regenerate their narrative
 * once via the "identity_renamed" trigger (every v3 name was retired).
 *
 * Phase 4 naming: 2–3 words, human and memorable, never "The ...", no
 * fantasy or personality-test vocabulary. Forecast surfaces suppress these
 * names by exact match against the library (isFutureIdentityName in
 * forecast-reality.ts) — a rename here is automatically suppressed there.
 */
export const IDENTITY_LIBRARY: readonly IdentityProfile[] = [
  // -------------------------------------------------------------------------
  // Independence-dominant
  // -------------------------------------------------------------------------
  {
    id: "independent-builder",
    trait: "Independence",
    dominant_dimension: "Independence",
    canonical_name: "Independent Builder",
    identity_statement:
      "You build your own opportunities instead of waiting for someone to give you one.",
    short_description:
      "Someone whose independence keeps turning into things that exist — projects started without permission, owned end to end, with risk accepted as the ordinary price of ownership.",
    legacy_names: [
      "The Self-Reliant Builder",
      "The Builder",
      "The Independent Operator",
    ],
    // v3 "The Self-Reliant Builder" and its pre-v3 ancestor: same lineage.
    legacy_ids: ["the-builder", "self-reliant-builder"],
    dimension_weights: {
      Independence: 0.8,
      Initiative: 0.7,
      "Risk Tolerance": 0.4,
      Connection: -0.3,
    },
    typical_behaviors: [
      "Takes the solo route on the work that matters most to them",
      "Starts the project without waiting for permission or backing",
      "Sets their own terms instead of accepting the default offer",
      "Accepts real risk as the price of owning the outcome",
      "Moves from idea to first concrete step on their own",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who creates instead of waits.",
        "When something matters, your first instinct is to build it yourself rather than hope someone else solves it. You trust your own judgment more with each decision you make.",
        "People begin to know you as someone who gets things done. They stop asking if you'll do it and start asking what you're building next.",
      ],
      strengthens: [
        "Starting before everything feels ready.",
        "Trusting your own judgment.",
        "Turning ideas into real things.",
      ],
      tradeoffs: [
        "Asking for help becomes harder.",
        "Collaboration can feel slower than doing it yourself.",
        "Carrying everything alone becomes normal.",
      ],
    },
  },
  {
    id: "quiet-confident",
    trait: "Confidence",
    dominant_dimension: "Independence",
    canonical_name: "Quiet Confident",
    identity_statement: "You stop needing other people to tell you you're capable.",
    short_description:
      "Someone whose confidence shows in what they don't do — no polling the room, no waiting for reassurance — just decisions made calmly on their own read of the situation.",
    dimension_weights: {
      Independence: 0.9,
      "Risk Tolerance": 0.5,
      "Conflict Tolerance": 0.4,
      Vulnerability: -0.3,
    },
    typical_behaviors: [
      "Makes the call without polling the room for reassurance",
      "Works alone without needing the group's approval",
      "Holds their position when someone pushes back",
      "Acts on their own read while the outcome is still uncertain",
      "Defines the conditions rather than asking what's allowed",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who trusts yourself.",
        "You stop looking for constant reassurance because your confidence comes from experience instead of approval.",
        "People notice that you stay calm under pressure. They trust your judgment because you rarely need to prove yourself.",
      ],
      strengthens: [
        "Making decisions without second-guessing yourself.",
        "Staying calm under pressure.",
        "Trusting your own abilities.",
      ],
      tradeoffs: [
        "Feedback becomes easier to ignore.",
        "Independence can look like distance.",
        "People may assume you don't need support.",
      ],
    },
  },
  {
    id: "independent-loner",
    trait: "Isolation",
    dominant_dimension: "Independence",
    canonical_name: "Independent Loner",
    identity_statement:
      "Depending on yourself starts to feel safer than depending on other people.",
    short_description:
      "Someone who keeps choosing to go it alone — solitude as the default working condition, self-reliance so complete that bringing others in starts to feel like overhead.",
    dimension_weights: {
      Independence: 1.0,
      Connection: -0.8,
      Vulnerability: -0.4,
    },
    typical_behaviors: [
      "Chooses the solo route even when company is offered",
      "Works through hard stretches without bringing anyone in",
      "Keeps their own counsel and sets their own terms",
      "Handles the whole thing alone, start to finish",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who handles life alone.",
        "Relying on yourself feels easier than risking disappointment from other people. Independence slowly becomes your comfort zone.",
        "People admire how self-sufficient you are, but they also find it harder to get close to you.",
      ],
      strengthens: [
        "Solving problems on your own.",
        "Staying steady during difficult times.",
        "Becoming emotionally independent.",
      ],
      tradeoffs: [
        "Letting people in becomes harder.",
        "Asking for help feels uncomfortable.",
        "Loneliness becomes easier to accept than vulnerability.",
      ],
    },
  },
  {
    id: "careful-protector",
    trait: "Guardedness",
    dominant_dimension: "Independence",
    canonical_name: "Careful Protector",
    identity_statement: "You learn to protect your peace before anything else.",
    short_description:
      "Someone who guards what they're responsible for — plans, feelings, people — by controlling exposure: fewer bets, fewer surprises, nothing important handed to chance or strangers.",
    dimension_weights: {
      Independence: 0.7,
      Vulnerability: -0.6,
      "Risk Tolerance": -0.6,
      Adaptability: -0.3,
      Connection: -0.3,
    },
    typical_behaviors: [
      "Turns down opportunities that would expose what they're responsible for",
      "Says no to the enticing bet when the downside lands on them",
      "Sticks with the proven approach over the untested one",
      "Keeps plans and problems close, handled alone",
      "Controls the conditions before agreeing to anything",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who thinks carefully before trusting people.",
        "Your boundaries become stronger because you've learned that not everyone deserves access to your time or energy.",
        "People experience you as thoughtful and dependable, but it takes longer for them to truly know you.",
      ],
      strengthens: [
        "Setting healthy boundaries.",
        "Protecting your emotional energy.",
        "Thinking before you trust.",
      ],
      tradeoffs: [
        "Good people can be kept at a distance.",
        "Vulnerability takes longer.",
        "New relationships grow more slowly.",
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Connection-dominant
  // -------------------------------------------------------------------------
  {
    id: "trusted-companion",
    trait: "Connection",
    dominant_dimension: "Connection",
    canonical_name: "Trusted Companion",
    identity_statement: "People know they can count on you.",
    short_description:
      "Someone people stop worrying about losing — the friend who keeps showing up, keeps their promises, and treats relationships as things you maintain rather than consume.",
    legacy_names: ["The Bridge Builder", "The Connector"],
    // v3 "The Bridge Builder" and its pre-v3 ancestor "Community Weaver".
    legacy_ids: ["the-connector", "community-weaver"],
    dimension_weights: {
      Connection: 1.0,
      Vulnerability: 0.3,
      Consistency: 0.2,
    },
    typical_behaviors: [
      "Shows up for the same people, again and again",
      "Chooses time with their people over the solo win",
      "Keeps promises to people through busy seasons",
      "Pulls others in rather than going alone",
      "Stays part of things — gatherings, group plans, shared work",
    ],
    curated_narrative: {
      becomes: [
        "You become someone others naturally rely on.",
        "When people are struggling, they know you'll show up. Being dependable becomes part of your identity.",
        "Friends and family begin trusting you with the things that matter most because you've consistently been there when it counted.",
      ],
      strengthens: [
        "Building lasting relationships.",
        "Being emotionally present.",
        "Earning people's trust.",
      ],
      tradeoffs: [
        "Other people's needs can come before your own.",
        "Saying no becomes harder.",
        "You carry more emotional weight than people realize.",
      ],
    },
  },
  {
    id: "steady-caregiver",
    trait: "Compassion",
    dominant_dimension: "Connection",
    canonical_name: "Steady Caregiver",
    identity_statement:
      "Helping people becomes one of the ways you care for the world.",
    short_description:
      "Someone whose attention goes to other people's hard stretches — checking in, helping without being asked, sharing their own struggles so nobody has to pretend.",
    dimension_weights: {
      Connection: 1.0,
      Vulnerability: 0.6,
      Reflection: 0.3,
      Independence: -0.3,
    },
    typical_behaviors: [
      "Checks in on people during their hard stretches",
      "Helps someone grow without being asked or repaid",
      "Shares their own struggles so others feel less alone",
      "Asks for and offers help without keeping score",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who notices when people need support.",
        "Looking after others becomes natural, even when nobody asks you to.",
        "People feel safe around you because they know you'll listen without judging them.",
      ],
      strengthens: [
        "Caring for people consistently.",
        "Making others feel understood.",
        "Staying patient during difficult moments.",
      ],
      tradeoffs: [
        "Your own needs become easier to ignore.",
        "You can feel responsible for problems that aren't yours.",
        "Rest starts feeling selfish.",
      ],
    },
  },
  {
    id: "peace-keeper",
    trait: "People-Pleasing",
    dominant_dimension: "Connection",
    canonical_name: "Peace Keeper",
    identity_statement:
      "Keeping the peace starts to matter more than winning the argument.",
    short_description:
      "Someone who keeps the group comfortable — smoothing friction, deferring on the contested calls, absorbing small costs so nobody else has to feel them.",
    dimension_weights: {
      Connection: 0.8,
      "Conflict Tolerance": -0.7,
      Independence: -0.6,
    },
    typical_behaviors: [
      "Lets others make the call to keep things smooth",
      "Steps around disagreements rather than into them",
      "Puts the group's comfort ahead of their own preference",
      "Keeps everyone included and talking",
      "Absorbs friction rather than voicing it",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who brings calm into difficult situations.",
        "You naturally look for common ground instead of making conflict bigger than it needs to be.",
        "People trust you to keep conversations respectful, even when emotions are high.",
      ],
      strengthens: [
        "Helping people find common ground.",
        "Staying calm during disagreements.",
        "Building harmony in relationships.",
      ],
      tradeoffs: [
        "Difficult conversations get postponed.",
        "Your own opinions stay unspoken.",
        "Keeping everyone happy becomes exhausting.",
      ],
    },
  },
  {
    id: "thoughtful-mentor",
    trait: "Wisdom",
    dominant_dimension: "Connection",
    canonical_name: "Thoughtful Mentor",
    identity_statement:
      "Your experience becomes something other people can learn from.",
    short_description:
      "Someone whose experience keeps turning into other people's shortcuts — lessons drawn from their own mistakes, offered honestly, to people they expect nothing back from.",
    legacy_names: ["The Trusted Guide", "The Mentor"],
    legacy_ids: ["the-mentor"],
    dimension_weights: {
      Connection: 0.8,
      Reflection: 0.7,
      Vulnerability: 0.5,
    },
    typical_behaviors: [
      "Invests in someone else's growth with nothing owed back",
      "Notices what someone is becoming before they can see it",
      "Turns their own experience into lessons worth passing on",
      "Tells the truth about their own mistakes so others can skip them",
      "Stays present through another person's hard season",
    ],
    curated_narrative: {
      becomes: [
        "You become someone people ask for advice.",
        "Your mistakes become lessons instead of regrets because you're able to help others avoid them.",
        "People trust you because your guidance comes from real experience, not just good intentions.",
      ],
      strengthens: [
        "Giving honest advice.",
        "Helping people grow.",
        "Seeing the bigger picture.",
      ],
      tradeoffs: [
        "You spend more time helping than asking for help.",
        "Other people's problems become your responsibility.",
        "It becomes harder to simply listen without trying to fix things.",
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Initiative-dominant
  // -------------------------------------------------------------------------
  {
    id: "purposeful-achiever",
    trait: "Ambition",
    dominant_dimension: "Initiative",
    canonical_name: "Purposeful Achiever",
    identity_statement:
      "You stop chasing progress and start building a meaningful life.",
    short_description:
      "Someone organized around goals — starting before being told, choosing the harder standard, measuring progress honestly, and opening the next challenge as soon as one closes.",
    legacy_names: ["The Relentless Contender", "The Competitor"],
    // v3 "The Relentless Contender" and its pre-v3 ancestor.
    legacy_ids: ["the-competitor", "relentless-grower"],
    dimension_weights: {
      Initiative: 1.0,
      Consistency: 0.4,
      "Risk Tolerance": 0.4,
    },
    typical_behaviors: [
      "Starts toward the goal without being told to",
      "Opens the next challenge as soon as one closes",
      "Chooses the harder standard when an easier one is available",
      "Keeps working the plan when it stops being fun",
      "Measures their own progress honestly",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who moves with purpose.",
        "Instead of drifting from one goal to the next, you focus your energy on work that feels important to you.",
        "People see you as someone who follows through because your actions match your priorities.",
      ],
      strengthens: [
        "Staying focused on long-term goals.",
        "Working with intention.",
        "Building momentum over time.",
      ],
      tradeoffs: [
        "Work can become your identity.",
        "Slowing down feels uncomfortable.",
        "Relationships sometimes come second.",
      ],
    },
  },
  {
    id: "trusted-guide",
    trait: "Leadership",
    dominant_dimension: "Initiative",
    canonical_name: "Trusted Guide",
    identity_statement:
      "People naturally look to you when they need direction.",
    short_description:
      "Someone who steps up when something needs an owner — organizing the effort, developing the people in it, and making the unpopular call when the group needs one made.",
    dimension_weights: {
      Initiative: 0.8,
      Connection: 0.7,
      "Conflict Tolerance": 0.4,
    },
    typical_behaviors: [
      "Organizes the effort nobody else was going to organize",
      "Steps up first when something needs an owner",
      "Brings people into the work instead of hoarding it",
      "Develops the people around them",
      "Makes the unpopular call when the group needs it",
    ],
    curated_narrative: {
      becomes: [
        "You become someone others feel comfortable following.",
        "You stay steady when decisions need to be made, and people trust that you'll move everyone in the right direction.",
        "Your influence comes less from authority and more from the confidence other people have in you.",
      ],
      strengthens: [
        "Leading with confidence.",
        "Helping people move forward.",
        "Bringing clarity when things feel uncertain.",
      ],
      tradeoffs: [
        "You feel responsible for everyone.",
        "Making mistakes feels heavier.",
        "It's harder to admit when you don't have the answer.",
      ],
    },
  },
  {
    id: "hopeful-builder",
    trait: "Optimism",
    dominant_dimension: "Initiative",
    canonical_name: "Hopeful Builder",
    identity_statement:
      "You believe the future can be better, so you start building it.",
    short_description:
      "Someone whose default answer is that it could work — starting new things on that belief, trying again soon after setbacks, and treating the unfamiliar as promising rather than threatening.",
    dimension_weights: {
      Initiative: 0.8,
      Curiosity: 0.4,
      "Risk Tolerance": 0.4,
      Connection: 0.4,
    },
    typical_behaviors: [
      "Starts new things expecting them to work out",
      "Begins the next attempt soon after a setback",
      "Rallies others around what could go right",
      "Treats the unfamiliar as promising rather than threatening",
      "Bets on possibilities before there's proof",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who sees possibilities instead of obstacles.",
        "When other people hesitate because something might fail, you're willing to try because it might succeed.",
        "People leave conversations with you feeling more hopeful than when they arrived.",
      ],
      strengthens: [
        "Seeing opportunities others miss.",
        "Getting started instead of waiting.",
        "Helping people believe something is possible.",
      ],
      tradeoffs: [
        "Risks can look smaller than they really are.",
        "Warning signs are easier to overlook.",
        "Optimism can turn into disappointment when reality doesn't match expectations.",
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Reflection-dominant
  // -------------------------------------------------------------------------
  {
    id: "honest-reflector",
    trait: "Self-Awareness",
    dominant_dimension: "Reflection",
    canonical_name: "Honest Reflector",
    identity_statement: "You'd rather face the truth than protect your ego.",
    short_description:
      "Someone who examines themselves on purpose — naming their part in what went wrong, questioning their own assumptions first, and correcting course before anyone has to ask.",
    dimension_weights: {
      Reflection: 1.0,
      Vulnerability: 0.6,
      Curiosity: 0.2,
    },
    typical_behaviors: [
      "Sets aside time to examine their own patterns",
      "Names their part in what went wrong, out loud",
      "Corrects course when they catch themselves drifting",
      "Questions their own assumptions before anyone else does",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who learns from every experience.",
        "Instead of blaming other people or bad luck, you ask what you could do differently next time.",
        "People trust you because you're honest about both your strengths and your mistakes.",
      ],
      strengthens: [
        "Learning from experience.",
        "Accepting honest feedback.",
        "Understanding yourself clearly.",
      ],
      tradeoffs: [
        "You can be harder on yourself than other people are.",
        "Self-reflection can become self-criticism.",
        "Constant improvement makes it difficult to celebrate progress.",
      ],
    },
  },
  {
    id: "deep-analyzer",
    trait: "Overthinking",
    dominant_dimension: "Reflection",
    canonical_name: "Deep Analyzer",
    identity_statement:
      "You'd rather understand something completely than guess.",
    short_description:
      "Someone who takes problems apart completely — researching before deciding, returning to open questions until they resolve, understanding things other people are content to use.",
    legacy_names: ["The Quiet Authority", "The Scholar"],
    // v3 "The Quiet Authority" and its pre-v3 ancestor. (Pre-v3 ids with no
    // clear successor — deliberate-soloist, vulnerable-leader,
    // committed-achiever, resilient-adapter — stay unmapped and fade
    // gradually.)
    legacy_ids: ["the-scholar", "reflective-practitioner"],
    dimension_weights: {
      Reflection: 1.0,
      Curiosity: 0.7,
      Initiative: -0.4,
      "Risk Tolerance": -0.3,
    },
    typical_behaviors: [
      "Researches thoroughly before forming a position",
      "Returns to open questions until they resolve",
      "Keeps questioning after others have settled",
      "Reviews their own past decisions in detail",
      "Thinks the problem all the way through before moving",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who thinks before acting.",
        "You naturally look beneath the surface, asking questions other people never think to ask.",
        "People come to you when they need a thoughtful answer instead of a quick opinion.",
      ],
      strengthens: [
        "Seeing patterns other people miss.",
        "Making thoughtful decisions.",
        "Solving complicated problems.",
      ],
      tradeoffs: [
        "Decisions can take longer.",
        "Uncertainty becomes harder to tolerate.",
        "Thinking can replace acting.",
      ],
    },
  },
  {
    id: "careful-planner",
    trait: "Control",
    dominant_dimension: "Reflection",
    canonical_name: "Careful Planner",
    identity_statement: "You'd rather prepare today than scramble tomorrow.",
    short_description:
      "Someone who plans what others improvise — contingencies mapped, details tracked, conditions defined in advance — because a surprise is just a plan that wasn't made.",
    dimension_weights: {
      Reflection: 0.6,
      Consistency: 0.5,
      Independence: 0.3,
      Adaptability: -0.5,
      "Risk Tolerance": -0.4,
    },
    typical_behaviors: [
      "Plans the week, the project, the contingencies — in advance",
      "Tracks the details other people let slide",
      "Keeps the proven routine when surprises threaten it",
      "Turns down bets they can't control",
      "Defines the conditions themselves",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who rarely gets caught off guard.",
        "Thinking ahead becomes second nature, and you feel most comfortable when there's a plan.",
        "People rely on you because you've usually thought about problems before they happen.",
      ],
      strengthens: [
        "Planning ahead.",
        "Staying organized.",
        "Reducing unnecessary stress.",
      ],
      tradeoffs: [
        "Change becomes harder to enjoy.",
        "Spontaneous opportunities can be missed.",
        "Plans become difficult to let go of.",
      ],
    },
  },
  {
    id: "relentless-improver",
    trait: "Perfectionism",
    dominant_dimension: "Reflection",
    canonical_name: "Relentless Improver",
    identity_statement: "Good enough rarely feels finished.",
    short_description:
      "Someone whose standard keeps rising — studying their own work for what's still wrong, fixing flaws nobody else flagged, practicing past the point others call finished.",
    dimension_weights: {
      Reflection: 0.8,
      Consistency: 0.6,
      Adaptability: 0.3,
    },
    typical_behaviors: [
      "Studies their own work for what's still wrong with it",
      "Measures against a standard that keeps rising",
      "Fixes flaws nobody else flagged",
      "Reworks it once more after it was already acceptable",
      "Practices past the point others call finished",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who is always looking for a better way.",
        "Even when something works, you naturally see how it could improve.",
        "People admire your standards because they know you'll never settle for average.",
      ],
      strengthens: [
        "Producing high-quality work.",
        "Paying attention to details.",
        "Constantly improving your skills.",
      ],
      tradeoffs: [
        "Satisfaction becomes harder to reach.",
        "Finishing feels harder than improving.",
        "You can expect too much from yourself and others.",
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Adaptability-dominant
  // -------------------------------------------------------------------------
  {
    id: "adaptive-navigator",
    trait: "Adaptability",
    dominant_dimension: "Adaptability",
    canonical_name: "Adaptive Navigator",
    identity_statement: "You adjust faster than life can surprise you.",
    short_description:
      "Someone who moves with reality instead of arguing with it — absorbing upheaval, adjusting early, and leaving finished chapters behind without needing ceremony.",
    // Pre-v3 "Adaptive Explorer": adaptation was always its stronger half.
    legacy_ids: ["adaptive-explorer"],
    dimension_weights: {
      Adaptability: 1.0,
      Curiosity: 0.4,
      "Risk Tolerance": 0.2,
    },
    typical_behaviors: [
      "Changes approach when new information arrives",
      "Absorbs upheaval that would flatten most people",
      "Leaves finished chapters without needing ceremony",
      "Adjusts their own course before being forced to",
      "Reads new territory quickly",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who stays steady through change.",
        "Instead of resisting new situations, you learn how to work with them.",
        "People see you as someone who can handle almost anything life throws your way.",
      ],
      strengthens: [
        "Adjusting to change.",
        "Learning new situations quickly.",
        "Staying calm during uncertainty.",
      ],
      tradeoffs: [
        "Staying in one place becomes harder.",
        "Long-term routines can feel limiting.",
        "Constant change can make deeper roots harder to build.",
      ],
    },
  },
  {
    id: "comfort-seeker",
    trait: "Comfort Seeking",
    dominant_dimension: "Adaptability",
    canonical_name: "Comfort Seeker",
    identity_statement: "Peace becomes something you learn to protect.",
    short_description:
      "Someone who has found a shape of life that works and defends it — familiar options over novel ones, routines kept, disruptions politely declined.",
    dimension_weights: {
      Adaptability: -0.9,
      "Risk Tolerance": -0.5,
      Consistency: 0.4,
      Independence: -0.3,
      Initiative: -0.3,
    },
    typical_behaviors: [
      "Keeps the routine that already works",
      "Chooses the familiar option when both are on the table",
      "Passes on opportunities that would disrupt a good life",
      "Avoids bets with uncomfortable downsides",
      "Goes along with the group's plan rather than pushing their own",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who values stability.",
        "You naturally avoid unnecessary stress and build a life that feels safe and predictable.",
        "People experience you as calm and dependable because you don't create chaos where it doesn't belong.",
      ],
      strengthens: [
        "Creating stability.",
        "Appreciating everyday life.",
        "Staying calm during stressful moments.",
      ],
      tradeoffs: [
        "Growth opportunities can be passed by.",
        "Change becomes easier to avoid.",
        "Comfort can slowly replace curiosity.",
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Curiosity-dominant
  // -------------------------------------------------------------------------
  {
    id: "curious-explorer",
    trait: "Curiosity",
    dominant_dimension: "Curiosity",
    canonical_name: "Curious Explorer",
    identity_statement: "The world keeps getting bigger the more you learn.",
    short_description:
      "Someone whose life keeps getting wider — new domains entered before the current one is mastered, questions followed for their own sake, finished chapters traded for unopened ones.",
    legacy_names: ["The Threshold Crosser", "The Explorer"],
    // v3 "The Threshold Crosser" and the pre-v3 id that named it.
    legacy_ids: ["the-explorer", "threshold-crosser"],
    dimension_weights: {
      Curiosity: 1.0,
      Adaptability: 0.5,
      "Risk Tolerance": 0.3,
    },
    typical_behaviors: [
      "Follows a question past the point of practical need",
      "Enters unfamiliar domains before mastering the current one",
      "Pokes at assumptions to see if they hold",
      "Leaves the finished chapter for the unopened one",
      "Takes the uncertain option when it's the more interesting one",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who is always learning.",
        "New ideas, places, and experiences give you energy instead of making you uncomfortable.",
        "People enjoy being around you because you're genuinely interested in how things work.",
      ],
      strengthens: [
        "Learning quickly.",
        "Asking thoughtful questions.",
        "Exploring new ideas.",
      ],
      tradeoffs: [
        "One interest can quickly become the next.",
        "Finishing becomes harder than discovering.",
        "Curiosity can distract from deeper mastery.",
      ],
    },
  },
  {
    id: "original-creator",
    trait: "Creativity",
    dominant_dimension: "Curiosity",
    canonical_name: "Original Creator",
    identity_statement: "You make things that wouldn't exist without you.",
    short_description:
      "Someone with a growing body of original work — made from their own obsessions, put in front of people who could judge it, on terms they chose themselves.",
    legacy_names: ["The Original Voice", "The Creator"],
    legacy_ids: ["the-creator"],
    dimension_weights: {
      Curiosity: 0.8,
      Initiative: 0.6,
      Vulnerability: 0.5,
      Independence: 0.3,
    },
    typical_behaviors: [
      "Makes original things instead of only consuming what exists",
      "Starts new work from their own obsessions, not briefs",
      "Puts their work in front of people who could judge it",
      "Publishes, performs, or ships despite the exposure",
      "Chooses the path that allows self-expression",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who creates instead of copies.",
        "When you have an idea, your instinct is to build it in your own way rather than follow someone else's path.",
        "People begin recognizing your work because it carries your own style.",
      ],
      strengthens: [
        "Original thinking.",
        "Expressing your own ideas.",
        "Sharing your work confidently.",
      ],
      tradeoffs: [
        "Feedback becomes harder to separate from criticism.",
        "Original work often takes longer.",
        "Your ideas won't appeal to everyone.",
      ],
    },
  },
  {
    id: "lifelong-learner",
    trait: "Humility",
    dominant_dimension: "Curiosity",
    canonical_name: "Lifelong Learner",
    identity_statement: "You never believe you've finished growing.",
    short_description:
      "Someone who stays a student on purpose — entering rooms where they're the least experienced, asking for help without shame, admitting what they don't know out loud.",
    dimension_weights: {
      Curiosity: 0.9,
      Vulnerability: 0.5,
      Reflection: 0.4,
    },
    typical_behaviors: [
      "Studies what they don't yet know, on purpose",
      "Keeps entering rooms where they're the least experienced",
      "Asks for help without treating it as defeat",
      "Assumes they might be wrong and checks",
      "Admits what they don't know, out loud",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who is always improving.",
        "Instead of feeling like you already have the answers, you stay open to learning something new.",
        "People respect you because you're willing to change your mind when the evidence changes.",
      ],
      strengthens: [
        "Staying curious.",
        "Adapting your thinking.",
        "Learning from other people.",
      ],
      tradeoffs: [
        "You can spend too much time preparing.",
        "Confidence grows more slowly.",
        "Learning can become a substitute for doing.",
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Consistency-dominant
  // -------------------------------------------------------------------------
  {
    id: "steady-finisher",
    trait: "Discipline",
    dominant_dimension: "Consistency",
    canonical_name: "Steady Finisher",
    identity_statement: "You finish what you start.",
    short_description:
      "Someone who finishes — habits kept after the novelty dies, commitments held through difficulty, work delivered whether or not anyone is checking.",
    legacy_names: ["The Sure Hand", "The Craftsman"],
    legacy_ids: ["the-craftsman"],
    dimension_weights: {
      Consistency: 1.0,
      Initiative: 0.2,
      Adaptability: -0.3,
    },
    typical_behaviors: [
      "Completes what they start, over weeks not bursts",
      "Keeps the habit alive after the novelty dies",
      "Holds commitments through difficulty",
      "Delivers even when nobody is checking",
      "Tracks their own follow-through honestly",
    ],
    curated_narrative: {
      becomes: [
        "You become someone people can count on.",
        "When you commit to something, people stop wondering if you'll finish because you've shown them that you will.",
        "Your reputation grows because people trust you to follow through, even when things become difficult.",
      ],
      strengthens: [
        "Finishing what you start.",
        "Staying consistent.",
        "Earning people's trust.",
      ],
      tradeoffs: [
        "Rest starts feeling unproductive.",
        "You take on more than you should.",
        "Letting something go becomes harder.",
      ],
    },
  },
  {
    id: "steady-anchor",
    trait: "Stability",
    dominant_dimension: "Consistency",
    canonical_name: "Reliable Anchor",
    identity_statement: "People feel more steady when you're around.",
    short_description:
      "Someone other people get to relax around — the routines, promises, and places that hold because they hold them, and the risky disruptions calmly declined.",
    // "Steady Anchor" was this identity's Phase 4–5.2 name (renamed in 5.3 so
    // three cards no longer open with "Steady"/"Dependable" sameness).
    legacy_names: ["Steady Anchor", "The Promise Keeper", "The Guardian"],
    // v3 "The Promise Keeper" and its two pre-v3 ancestors.
    legacy_ids: ["the-guardian", "steady-foundation-builder", "quiet-supporter"],
    dimension_weights: {
      Consistency: 0.9,
      Connection: 0.4,
      "Risk Tolerance": -0.6,
      Adaptability: -0.4,
    },
    typical_behaviors: [
      "Keeps what already works instead of chasing what might",
      "Declines opportunities that would put the foundation at risk",
      "Turns down the exciting disruption others depend on them not to take",
      "Keeps promises intact through disruption",
      "Is still there when people check",
    ],
    curated_narrative: {
      becomes: [
        "You become someone others depend on during uncertain times.",
        "You stay calm when life becomes unpredictable, which helps the people around you feel grounded.",
        "Friends, family, and coworkers know they can rely on you when things matter most.",
      ],
      strengthens: [
        "Staying calm under pressure.",
        "Creating stability.",
        "Being dependable.",
      ],
      tradeoffs: [
        "You carry more responsibility than people realize.",
        "Change can feel disruptive.",
        "You often put other people's needs first.",
      ],
    },
  },
  {
    id: "dependable-steward",
    trait: "Responsibility",
    dominant_dimension: "Consistency",
    canonical_name: "Trusted Steward",
    identity_statement:
      "You take responsibility even when nobody asks you to.",
    short_description:
      "Someone who carries what's entrusted to them — obligations kept when they stop being convenient, unglamorous work finished, dependents factored into every decision.",
    legacy_names: ["Dependable Steward"],
    dimension_weights: {
      Consistency: 0.9,
      Connection: 0.6,
      "Risk Tolerance": -0.2,
    },
    typical_behaviors: [
      "Carries what was entrusted to them without being reminded",
      "Keeps obligations even when they stop being convenient",
      "Finishes the unglamorous work others drop",
      "Shows up for the people who count on them",
      "Puts dependents' needs into every decision",
    ],
    curated_narrative: {
      becomes: [
        "You become someone people trust with important responsibilities.",
        "You naturally take ownership instead of waiting for someone else to solve the problem.",
        "People feel comfortable putting their trust in you because you consistently do what you say you'll do.",
      ],
      strengthens: [
        "Taking ownership.",
        "Being dependable.",
        "Following through on commitments.",
      ],
      tradeoffs: [
        "Responsibility becomes difficult to put down.",
        "You carry problems that aren't yours.",
        "Delegating becomes harder.",
      ],
    },
  },
  {
    id: "long-game-thinker",
    trait: "Patience",
    dominant_dimension: "Consistency",
    canonical_name: "Long-Game Thinker",
    identity_statement:
      "You care more about where you're going than how fast you get there.",
    short_description:
      "Someone who can wait — steady progress toward outcomes years away, deliberate pauses instead of forced moments, fast payoffs declined when they'd risk the long plan.",
    dimension_weights: {
      Consistency: 0.8,
      Reflection: 0.5,
      "Risk Tolerance": -0.4,
    },
    typical_behaviors: [
      "Keeps working toward outcomes that are years away",
      "Makes steady progress without needing quick wins",
      "Pauses on purpose instead of forcing the moment",
      "Waits out the urge to rush",
      "Passes on the fast payoff that risks the long plan",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who thinks beyond the next week or month.",
        "You're comfortable making small decisions today because you know they'll matter years from now.",
        "People admire your patience because you don't sacrifice long-term success for short-term wins.",
      ],
      strengthens: [
        "Thinking ahead.",
        "Staying patient.",
        "Making thoughtful long-term decisions.",
      ],
      tradeoffs: [
        "Quick opportunities can be overlooked.",
        "Progress can feel slower than it actually is.",
        "Waiting can become easier than acting.",
      ],
    },
  },
  {
    id: "tireless-worker",
    trait: "Burnout",
    dominant_dimension: "Consistency",
    canonical_name: "Driven Worker",
    identity_statement: "You give more than most people ever see.",
    short_description:
      "Someone whose output never stops — commitments stacked on commitments, rest converted into more work, the next task picked up the moment one ends.",
    legacy_names: ["Tireless Worker"],
    dimension_weights: {
      Consistency: 0.9,
      Initiative: 0.6,
      Reflection: -0.4,
      Vulnerability: -0.3,
    },
    typical_behaviors: [
      "Keeps going long after others stop",
      "Works through what should have been rest",
      "Finishes everything they pick up",
      "Adds another commitment on top of a full plate",
      "Picks up the next task the moment one ends",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who works harder than people expect.",
        "You take pride in giving your best, even when nobody is watching.",
        "People admire your work ethic, but few realize how much energy it takes to keep going.",
      ],
      strengthens: [
        "Working with discipline.",
        "Pushing through difficult seasons.",
        "Setting a strong example.",
      ],
      tradeoffs: [
        "Rest becomes difficult.",
        "Your identity can become tied to productivity.",
        "Burnout becomes easier to ignore.",
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Risk Tolerance-dominant
  // -------------------------------------------------------------------------
  {
    id: "bold-decision-maker",
    trait: "Courage",
    dominant_dimension: "Risk Tolerance",
    canonical_name: "Bold Decision Maker",
    identity_statement: "You act while others are still deciding.",
    short_description:
      "Someone who acts under uncertainty — the leap others postpone, the harder option chosen on purpose, the difficult thing said directly.",
    dimension_weights: {
      "Risk Tolerance": 1.0,
      Initiative: 0.5,
      "Conflict Tolerance": 0.4,
    },
    typical_behaviors: [
      "Decides while the outcome is still uncertain",
      "Takes the leap others keep postponing",
      "Chooses the harder option when it's the right one",
      "Says the hard thing directly",
      "Acts first instead of waiting to be pushed",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who is comfortable making difficult decisions.",
        "Instead of waiting until everything is certain, you move forward with the best information you have.",
        "People naturally look to you when someone needs to make the call.",
      ],
      strengthens: [
        "Acting with confidence.",
        "Making difficult decisions.",
        "Moving forward during uncertainty.",
      ],
      tradeoffs: [
        "Some decisions deserve more time.",
        "Moving quickly can leave people behind.",
        "Mistakes become more visible.",
      ],
    },
  },
  {
    id: "spontaneous-adventurer",
    trait: "Impulsiveness",
    dominant_dimension: "Risk Tolerance",
    canonical_name: "Spontaneous Adventurer",
    identity_statement: "You trust yourself enough to follow your curiosity.",
    short_description:
      "Someone who moves on impulse and makes it work — yes before the details, the next chapter before the last one cools, the unfamiliar chased for its own sake.",
    dimension_weights: {
      "Risk Tolerance": 0.9,
      Adaptability: 0.6,
      Curiosity: 0.4,
      Reflection: -0.4,
      Consistency: -0.3,
    },
    typical_behaviors: [
      "Says yes before the details are settled",
      "Jumps into the new thing while others deliberate",
      "Drops the finished chapter for the next one",
      "Rolls with whatever the change brings",
      "Chases the unfamiliar for its own sake",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who says yes to new experiences.",
        "You enjoy discovering what happens when you step outside your routine instead of staying inside it.",
        "People experience life differently because you're willing to try things first.",
      ],
      strengthens: [
        "Trying new experiences.",
        "Adapting quickly.",
        "Living with curiosity.",
      ],
      tradeoffs: [
        "Plans become harder to keep.",
        "Stability becomes less exciting.",
        "Impulsive decisions can create unnecessary problems.",
      ],
    },
  },
  {
    id: "resilient-climber",
    trait: "Resilience",
    dominant_dimension: "Risk Tolerance",
    canonical_name: "Resilient Climber",
    identity_statement:
      "You keep going after most people would have stopped.",
    short_description:
      "Someone defined by the comeback — re-entering soon after losses, adjusting instead of quitting, taking on the harder version once the easy one is survived.",
    dimension_weights: {
      "Risk Tolerance": 0.7,
      Consistency: 0.6,
      Adaptability: 0.4,
    },
    typical_behaviors: [
      "Re-enters the arena soon after a loss",
      "Comes back to the thing that knocked them down",
      "Adjusts and tries again rather than quitting",
      "Takes on the harder version after surviving the easy one",
      "Tracks the comeback honestly",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who doesn't stay down for long.",
        "Difficult experiences teach you how to recover instead of convincing you to quit.",
        "People admire your resilience because they've seen you keep moving through challenges.",
      ],
      strengthens: [
        "Recovering from setbacks.",
        "Staying hopeful during difficult times.",
        "Building emotional strength.",
      ],
      tradeoffs: [
        "You can stay in difficult situations longer than you should.",
        "Asking for help becomes harder.",
        "Other people may underestimate how much you're carrying.",
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Conflict Tolerance-dominant
  // -------------------------------------------------------------------------
  {
    id: "principled-leader",
    trait: "Integrity",
    dominant_dimension: "Conflict Tolerance",
    canonical_name: "Principled Leader",
    identity_statement: "You'd rather do what's right than what's easy.",
    short_description:
      "Someone whose standards are load-bearing — problems named out loud, uncomfortable conversations stayed in, systems pushed to actually change rather than merely survived.",
    legacy_names: ["The Truth Teller", "The Reformer"],
    legacy_ids: ["the-reformer"],
    dimension_weights: {
      "Conflict Tolerance": 1.0,
      Consistency: 0.4,
      Initiative: 0.3,
    },
    typical_behaviors: [
      "Names the problem everyone agreed not to mention",
      "Stays in the uncomfortable conversation until it lands",
      "Challenges how things are done when the way quietly costs people",
      "Pushes to fix the system, not just survive it",
      "Holds the standard when it would be easier to bend",
    ],
    curated_narrative: {
      becomes: [
        "You become someone people trust because your values stay consistent.",
        "Even when the decision is unpopular, you try to do what you believe is right.",
        "People respect you because they know where you stand.",
      ],
      strengthens: [
        "Acting with integrity.",
        "Earning trust.",
        "Leading by example.",
      ],
      tradeoffs: [
        "Compromise becomes harder.",
        "Standing by your values can create conflict.",
        "Doing the right thing isn't always rewarded.",
      ],
    },
  },
  {
    id: "conflict-avoider",
    trait: "Avoidance",
    dominant_dimension: "Conflict Tolerance",
    canonical_name: "Conflict Avoider",
    identity_statement:
      "You'd rather protect the relationship than win the argument.",
    short_description:
      "Someone who routes around friction — points conceded rather than contested, exits found before arguments start, plans quietly bent to keep things calm.",
    dimension_weights: {
      "Conflict Tolerance": -0.9,
      Connection: 0.5,
      Adaptability: 0.4,
    },
    typical_behaviors: [
      "Steps back when a disagreement starts to heat up",
      "Lets the point go rather than contest it",
      "Finds the exit before the argument finds them",
      "Bends their plans around friction",
      "Lets someone else make the contested call",
    ],
    curated_narrative: {
      becomes: [
        "You become someone who keeps peace between people.",
        "You naturally look for ways to reduce tension instead of making disagreements bigger.",
        "People appreciate how calm you are, even if they don't always know what you kept to yourself.",
      ],
      strengthens: [
        "Staying calm during conflict.",
        "Helping people reconnect.",
        "Creating peaceful relationships.",
      ],
      tradeoffs: [
        "Your own needs stay unspoken.",
        "Difficult conversations happen later than they should.",
        "Resentment can build behind the silence.",
      ],
    },
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
