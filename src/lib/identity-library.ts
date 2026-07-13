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
      "You build your own thing instead of waiting for a spot in someone else's.",
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
        "People who keep choosing to build on their own terms usually end up with something that is unmistakably theirs — a business, a body of work, a way of living assembled piece by piece.",
        "Over time, waiting on others starts to feel unbearable. Permission quietly stops being part of how decisions get made.",
        "Eventually the people around them adjust. Friends stop asking whether they'll do the thing and start asking what they're building next.",
      ],
      strengthens: [
        "Starting things without needing anyone's go-ahead.",
        "Owning outcomes — good and bad — without excuses.",
        "Turning ideas into real, finished things.",
      ],
      tradeoffs: [
        "Help gets harder to accept, even when it would speed things up.",
        "Collaborators can feel shut out of decisions that affect them.",
        "When something breaks, there's no one to share the weight with.",
      ],
    },
  },
  {
    id: "quiet-confident",
    trait: "Confidence",
    dominant_dimension: "Independence",
    canonical_name: "Quiet Confident",
    identity_statement: "You trust your own judgment before anyone confirms it.",
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
        "This usually grows into a steady, unshowy certainty. Decisions get made once, calmly, without a tour of everyone's opinions first.",
        "Under pressure, someone like this becomes the calmest person in the room — not because nothing worries them, but because their own judgment has held often enough to lean on.",
        "In time other people notice, and they start bringing their hardest calls to the one who doesn't flinch.",
      ],
      strengthens: [
        "Deciding without waiting for reassurance.",
        "Staying steady when others push back.",
        "Trusting your own read of a messy situation.",
      ],
      tradeoffs: [
        "Second opinions arrive less often — people assume you don't want them.",
        "Real doubts get hidden because calm has become expected of you.",
        "When you're wrong, you can be confidently wrong.",
      ],
    },
  },
  {
    id: "independent-loner",
    trait: "Isolation",
    dominant_dimension: "Independence",
    canonical_name: "Independent Loner",
    identity_statement: "You handle it yourself, start to finish.",
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
        "Going it alone starts as a preference and slowly becomes the default. Working solo is faster, quieter, and nobody has to be managed.",
        "The skills compound — someone who handles everything themselves gets genuinely good at handling everything.",
        "The circle grows smaller and calmer. A few people stay close; everyone else meets the capable, self-contained version.",
      ],
      strengthens: [
        "Handling hard things start to finish on your own.",
        "Comfort with your own company for long stretches.",
        "Independence from anyone else's schedule, mood, or approval.",
      ],
      tradeoffs: [
        "People stop offering help because you never seem to need it.",
        "Hard seasons get carried alone, even the ones that shouldn't be.",
        "Being really known by someone gets rarer every year.",
      ],
    },
  },
  {
    id: "careful-protector",
    trait: "Guardedness",
    dominant_dimension: "Independence",
    canonical_name: "Careful Protector",
    identity_statement: "You keep what matters close until trust is earned.",
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
        "Caution like this usually builds a life with very few disasters in it. Risks get spotted early, exits get planned, and the important things stay covered.",
        "Trust becomes something people earn slowly. New people meet a polite, careful version first; the real one appears much later, if at all.",
        "What's inside the walls stays genuinely safe. The question that grows over the years is what never got let in.",
      ],
      strengthens: [
        "Spotting risks other people walk straight into.",
        "Keeping what you're responsible for safe.",
        "Staying composed, because little catches you off guard.",
      ],
      tradeoffs: [
        "Good opportunities get declined along with the bad ones.",
        "People can wait years to meet the unguarded version of you.",
        "Protecting a life can quietly shrink it.",
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
    identity_statement:
      "You keep choosing your people, even when leaving would be easier.",
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
        "Showing up, repeated for years, turns into something rare: friendships that survive moves, new jobs, and bad seasons.",
        "Someone like this becomes the fixed point in other people's lives — the one who remembers, checks in, and still calls.",
        "Their calendar fills with other people's big days. It's rarely glamorous, and it's exactly why they're irreplaceable.",
      ],
      strengthens: [
        "Friendships that hold up over years, not seasons.",
        "Being the person others actually call in a crisis.",
        "Keeping promises people have stopped expecting anyone to keep.",
      ],
      tradeoffs: [
        "Your own needs go last often enough that people forget you have them.",
        "Leaving anything — a job, a group, a faded friendship — gets very hard.",
        "Time given to your people is time not given to your own projects.",
      ],
    },
  },
  {
    id: "steady-caregiver",
    trait: "Compassion",
    dominant_dimension: "Connection",
    canonical_name: "Steady Caregiver",
    identity_statement: "You notice who's struggling and show up before they ask.",
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
        "Noticing who's struggling becomes automatic. Long before anyone says a word, someone like this has already seen it and quietly started helping.",
        "Homes and workplaces reorganize around them — they turn into the person others recover near.",
        "Years of this build an unusual kind of authority: when they say someone isn't okay, everyone listens.",
      ],
      strengthens: [
        "Reading how people are really doing beneath what they say.",
        "Making hard moments easier for the people inside them.",
        "Being trusted with what others hide from everyone else.",
      ],
      tradeoffs: [
        "Other people's problems can crowd out your own.",
        "Some people take more than they give, and you let them.",
        "Rest can start to feel like abandoning someone.",
      ],
    },
  },
  {
    id: "peace-keeper",
    trait: "People-Pleasing",
    dominant_dimension: "Connection",
    canonical_name: "Peace Keeper",
    identity_statement: "You make sure everyone else is okay before you are.",
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
        "Smoothing things over becomes a skill few people appreciate until it's missing. Rooms with a peace keeper in them simply have fewer blowups.",
        "The habit deepens with practice: reading the mood on entry, adjusting plans early, conceding small points so the day stays good.",
        "The cost accumulates quietly. After enough years, almost nobody knows what the peace keeper actually wants — sometimes including the peace keeper.",
      ],
      strengthens: [
        "Sensing tension before it turns into conflict.",
        "Making groups feel easy to belong to.",
        "Settling arguments without anyone losing face.",
      ],
      tradeoffs: [
        "Your real preferences go unstated so long they get forgotten.",
        "Problems that needed an argument stay politely unresolved.",
        "Resentment can build underneath all that agreeableness.",
      ],
    },
  },
  {
    id: "thoughtful-mentor",
    trait: "Wisdom",
    dominant_dimension: "Connection",
    canonical_name: "Thoughtful Mentor",
    identity_statement: "You spend your experience on other people's growth.",
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
        "Experience, looked at honestly, turns into something worth handing over. A person like this stops merely having a past and starts using it.",
        "A trail of people forms behind them — juniors, friends, younger family — each carrying a piece of advice that saved them a year of mistakes.",
        "Later on, their influence is mostly invisible. It lives in how other people now do things.",
      ],
      strengthens: [
        "Turning your mistakes into someone else's shortcut.",
        "Seeing what someone could become before they see it.",
        "Giving advice people actually come back for.",
      ],
      tradeoffs: [
        "Your own next chapter can stall while you tend everyone else's.",
        "Not everyone wants guidance, and offering it anyway costs goodwill.",
        "It's easy to hide from your own growth inside other people's.",
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
    identity_statement: "You aim at something specific and keep moving toward it.",
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
        "A goal is always running. Someone like this wakes up mid-project by default, and finishing one thing mostly means the next one starts.",
        "The results stack up — skills, roles, finished work — because effort pointed in one direction for years compounds.",
        "Standing still becomes the one thing that genuinely unsettles them.",
      ],
      strengthens: [
        "Making steady progress where others make plans.",
        "A track record that speaks before you do.",
        "Raising your own bar without being asked.",
      ],
      tradeoffs: [
        "Arrival never lasts — every finish line turns into a starting line.",
        "People and pastimes that don't serve the goal drift away.",
        "Rest feels earned only after output, and sometimes not even then.",
      ],
    },
  },
  {
    id: "trusted-guide",
    trait: "Leadership",
    dominant_dimension: "Initiative",
    canonical_name: "Trusted Guide",
    identity_statement:
      "You take responsibility for where the group ends up, not just yourself.",
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
        "Somebody has to own it — and a person like this keeps discovering that somebody is them. Stepping up stops being a decision and becomes a reflex.",
        "Groups around them simply work better: clearer plans, fewer dropped balls, someone watching the whole board.",
        "Responsibility follows them home. Even off duty, they're the one others glance at when things wobble.",
      ],
      strengthens: [
        "Getting a group moving in one direction.",
        "Making the call nobody else wants to make.",
        "Growing the people who work alongside you.",
      ],
      tradeoffs: [
        "The blame arrives before the credit does.",
        "Being just a participant in anything gets difficult.",
        "Other people's outcomes start weighing more than your own.",
      ],
    },
  },
  {
    id: "hopeful-builder",
    trait: "Optimism",
    dominant_dimension: "Initiative",
    canonical_name: "Hopeful Builder",
    identity_statement: "You start things expecting they'll work out.",
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
        "Expecting things to work out turns into a habit of beginning. While others wait for better conditions, someone like this has already sent the message, signed up, or started the draft.",
        "The misses fade fast and the starts add up. Over years, that math quietly wins — more attempts means more of them land.",
        "People borrow the energy. Being around someone who believes the plan can work makes everyone likelier to try it.",
      ],
      strengthens: [
        "Getting started while others are still weighing it.",
        "Recovering quickly when an attempt doesn't land.",
        "Lifting a group's belief that the thing can be done.",
      ],
      tradeoffs: [
        "Warning signs get less attention than bright sides.",
        "Some starts deserved more doubt than they got.",
        "Disappointment lands hardest on the people who trusted the sunny forecast.",
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
    identity_statement: "You look at your own patterns before they harden.",
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
        "Few people actually study themselves; this becomes someone who does. Mistakes get examined instead of explained away, and the same one rarely happens three times.",
        "Apologies get specific. Instead of a general sorry, they can name exactly what they did and what will be different next time.",
        "Little by little, the gap closes between who they think they are and who they actually are. It's slow work, and it shows.",
      ],
      strengthens: [
        "Catching your own patterns while they can still change.",
        "Owning mistakes plainly, without excuses attached.",
        "Telling apart what happened from the story you tell about it.",
      ],
      tradeoffs: [
        "All that self-examination can slide into self-blame.",
        "Time spent looking inward is time not spent acting.",
        "People less honest with themselves can find you uncomfortable company.",
      ],
    },
  },
  {
    id: "deep-analyzer",
    trait: "Overthinking",
    dominant_dimension: "Reflection",
    canonical_name: "Deep Analyzer",
    identity_statement: "You think it all the way through before you move.",
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
        "Thinking everything through becomes its own kind of expertise. Someone like this ends up understanding how things actually work while everyone else settles for how they seem to.",
        "Their answers age well. Conclusions built over days of turning a problem around tend to survive contact with reality.",
        "The habit spreads to everything — big purchases, career moves, dinner plans. Nothing gets decided lightly, including the things that could have been.",
      ],
      strengthens: [
        "Seeing the second and third consequences others miss.",
        "Reasoning that holds up under hard questioning.",
        "Understanding things thoroughly instead of approximately.",
      ],
      tradeoffs: [
        "Windows close while the thinking is still in progress.",
        "Simple choices get the same heavy treatment as hard ones.",
        "A busy mind at midnight comes with the territory.",
      ],
    },
  },
  {
    id: "careful-planner",
    trait: "Control",
    dominant_dimension: "Reflection",
    canonical_name: "Careful Planner",
    identity_statement: "You'd rather control the plan than gamble on the moment.",
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
        "Planning everything means rarely being caught flat. Trips have backup routes, projects have buffers, and important dates never sneak up.",
        "Others learn to lean on it. \"Ask them, they'll know\" becomes a sentence said about this person in every group they join.",
        "The unplanned starts to feel like a threat instead of a possibility. Even good surprises need a moment to be forgiven for being surprises.",
      ],
      strengthens: [
        "Delivering on time because the schedule was real.",
        "Walking into most situations already prepared.",
        "Sparing the people around you from avoidable chaos.",
      ],
      tradeoffs: [
        "Spontaneity — yours and everyone else's — gets squeezed out.",
        "A changed plan can ruin a day more than the change itself.",
        "A lot of energy goes to futures that never arrive.",
      ],
    },
  },
  {
    id: "relentless-improver",
    trait: "Perfectionism",
    dominant_dimension: "Reflection",
    canonical_name: "Relentless Improver",
    identity_statement:
      "You keep working on it after everyone else calls it done.",
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
        "The gap between good and excellent is where this person lives. Work that would satisfy most people goes back on the bench for another pass.",
        "Quality becomes their signature. In time, \"they made it\" turns into a reason to trust a thing before even seeing it.",
        "\"Done\" turns into a moving target. Whatever was achieved last time quietly becomes the new minimum.",
      ],
      strengthens: [
        "Producing work that holds up under close inspection.",
        "Noticing flaws before they become failures.",
        "A standard that pulls everyone around you upward.",
      ],
      tradeoffs: [
        "Finishing takes longer than it needs to, every time.",
        "Good work gets thrown out for not being perfect work.",
        "Praise is hard to hear over the flaw only you can see.",
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
    identity_statement:
      "You change course when the situation changes, not when it's comfortable.",
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
        "Change stops being an emergency and becomes ordinary. New boss, new city, new plan — someone like this takes stock and adjusts.",
        "Recovery gets fast. What derails others for a season costs this person a week, because rebuilding a routine is a practiced move.",
        "They end up the steady one in unsteady times, which surprises people who mistook flexibility for flakiness.",
      ],
      strengthens: [
        "Landing on your feet when plans fall apart.",
        "Reading new situations quickly and moving with them.",
        "Staying useful in the middle of upheaval.",
      ],
      tradeoffs: [
        "Always adjusting can mean never insisting.",
        "Long commitments compete with the ease of moving on.",
        "People can't always tell what you'd actually fight to keep.",
      ],
    },
  },
  {
    id: "comfort-seeker",
    trait: "Comfort Seeking",
    dominant_dimension: "Adaptability",
    canonical_name: "Comfort Seeker",
    identity_statement: "You protect the life that already works.",
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
        "A good life, defended well, stays good. The same coffee spot, the same crew, the same route home — chosen again because they keep working.",
        "Contentment gets real depth. While others chase upgrades, someone like this actually enjoys what they already have.",
        "The border of the familiar hardens a little each year. Things outside it stop being options and start being other people's lives.",
      ],
      strengthens: [
        "Actually enjoying what you have, not just having it.",
        "A calm daily life with very few nasty surprises.",
        "Knowing clearly what's worth keeping.",
      ],
      tradeoffs: [
        "Growth mostly lives outside the zone you rarely leave.",
        "Chances get missed for being new rather than for being bad.",
        "Routine can quietly turn from a choice into a limit.",
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
    identity_statement:
      "You follow what's interesting past the point where most people stop.",
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
        "Interests multiply instead of settling. One question opens three more, and a year later there's a full bookshelf, a new hobby, and two rabbit holes that turned into real skills.",
        "Conversations with this person go somewhere. They connect corners of the world most people never put together.",
        "Life keeps widening. New places, subjects, and people keep entering the picture long after most lives have stopped adding them.",
      ],
      strengthens: [
        "Getting comfortable in territory you've never seen before.",
        "Connecting ideas from fields that never usually meet.",
        "Staying genuinely interested in a world others find stale.",
      ],
      tradeoffs: [
        "Depth loses out to the pull of the next new thing.",
        "Half-finished pursuits pile up behind you.",
        "Staying on one path long enough to collect its rewards is the hard part.",
      ],
    },
  },
  {
    id: "original-creator",
    trait: "Creativity",
    dominant_dimension: "Curiosity",
    canonical_name: "Original Creator",
    identity_statement: "You make things that didn't exist until you made them.",
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
        "The making never really stops. Notebooks fill, drafts stack up, and the shelf of finished work grows year over year into something nobody else could have made.",
        "Showing the work gets easier with repetition. What once took courage becomes routine: make it, share it, start the next one.",
        "Eventually the work turns into a second signature. People recognize a piece as theirs before seeing the name on it.",
      ],
      strengthens: [
        "Finishing and releasing work instead of only imagining it.",
        "A voice of your own, built piece by piece.",
        "Nerve that grows each time something goes public.",
      ],
      tradeoffs: [
        "Every release invites judgment, and some of it lands.",
        "Steady income and creative freedom are frequent rivals.",
        "The next idea can crowd out the people in the room.",
      ],
    },
  },
  {
    id: "lifelong-learner",
    trait: "Humility",
    dominant_dimension: "Curiosity",
    canonical_name: "Lifelong Learner",
    identity_statement:
      "You'd rather find out you were wrong than stay comfortable.",
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
        "Being the least experienced person in the room stops being embarrassing and starts being the plan. That's where the learning is, so that's where they go.",
        "Knowledge stacks across decades. Kept on purpose, the beginner's mindset stops old expertise from going stale.",
        "Admitting \"I don't know\" becomes a quiet advantage. It gets answered, while everyone else's bluffing doesn't.",
      ],
      strengthens: [
        "Changing your mind when the facts change.",
        "Asking the question everyone else is afraid reveals too much.",
        "Staying teachable long after you've earned the right not to be.",
      ],
      tradeoffs: [
        "Feeling like a beginner never fully goes away — you keep choosing it.",
        "Deference can be mistaken for lacking conviction.",
        "Louder people collect the credit while you're still studying.",
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
    identity_statement: "You keep showing up after the excitement wears off.",
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
        "Finishing becomes the identity. Half the world starts things; this becomes the person still there in week eleven, closing it out.",
        "The habits do the heavy lifting. Runs happen in the rain, pages get written on dull days, and the work advances whether or not the mood shows up.",
        "A pile of finished things grows where other people keep a pile of maybes. Sooner or later, everyone notices.",
      ],
      strengthens: [
        "Carrying things all the way to done.",
        "Habits that survive boredom, bad weeks, and no applause.",
        "Being trusted with work that has a deadline.",
      ],
      tradeoffs: [
        "Quitting a thing that deserves quitting feels like failure.",
        "Grinding on can outlast the reason you started.",
        "Flexibility suffers when the streak matters this much.",
      ],
    },
  },
  {
    id: "steady-anchor",
    trait: "Stability",
    dominant_dimension: "Consistency",
    canonical_name: "Reliable Anchor",
    identity_statement:
      "You keep what matters standing while everything around it moves.",
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
        "Whole lives get built on this steadiness. The household runs, the bills clear, the traditions happen — because one person makes sure they do.",
        "In a crisis, everyone's first call is the same. Not because this person fixes everything, but because they don't wobble.",
        "Decades in, the value is plain: the things that lasted, lasted because someone refused to let them drop.",
      ],
      strengthens: [
        "Being the fixed point others plan their lives around.",
        "Keeping commitments standing through chaos.",
        "Judgment people trust because it changes slowly.",
      ],
      tradeoffs: [
        "Steadiness gets taken for granted long before it gets thanked.",
        "Saying no to change sometimes means saying no to better.",
        "Everyone leans on the anchor; the anchor leans on nobody.",
      ],
    },
  },
  {
    id: "dependable-steward",
    trait: "Responsibility",
    dominant_dimension: "Consistency",
    canonical_name: "Trusted Steward",
    identity_statement: "You take care of what's been trusted to you.",
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
        "Responsibility gravitates toward someone like this. The keys, the budget, the aging parent, the club account — whatever must not be dropped ends up in their hands.",
        "Doing the unglamorous thing on time, every time, becomes a reputation. Nobody double-checks their work twice.",
        "Their word starts working like a contract. Once they say it's handled, everyone else simply plans from there.",
      ],
      strengthens: [
        "Being handed what matters most, because you've earned it.",
        "Following through on obligations nobody would notice you skipping.",
        "Making the people who depend on you feel safe doing so.",
      ],
      tradeoffs: [
        "More gets added to your plate than ever comes off it.",
        "Saying no feels like letting someone down, so you rarely do.",
        "Your own wants wait quietly behind everyone else's needs.",
      ],
    },
  },
  {
    id: "long-game-thinker",
    trait: "Patience",
    dominant_dimension: "Consistency",
    canonical_name: "Long-Game Thinker",
    identity_statement:
      "You work on years-long timelines while others chase this week.",
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
        "Years become the working unit of time. Savings build, skills mature, and projects get started whose payoff is a decade out.",
        "Urgency loses its grip. Fads and panics pass by while the plan advances one unhurried step at a time.",
        "The payoff arrives late and large. What looked like standing still turns out to have been the shortest route.",
      ],
      strengthens: [
        "Letting time do work that force can't.",
        "Staying calm through swings that rattle everyone else.",
        "Building things whose value shows up years later.",
      ],
      tradeoffs: [
        "Today keeps getting spent on a decade from now.",
        "Chances that required moving fast went to people who moved fast.",
        "Others can read the patience as passivity and plan around you.",
      ],
    },
  },
  {
    id: "tireless-worker",
    trait: "Burnout",
    dominant_dimension: "Consistency",
    canonical_name: "Driven Worker",
    identity_statement:
      "You keep going long after most people would have stopped.",
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
        "Capacity becomes the reputation. One person delivers two people's output, sustained long enough that everyone recalibrates what's normal to ask.",
        "Momentum stops having an off switch. Evenings, weekends, and holidays get annexed one small task at a time.",
        "The engine runs hot for years — right up until it doesn't. Most people see the output; few see the fuel gauge.",
      ],
      strengthens: [
        "Output that outpaces everyone's expectations.",
        "Pushing through stretches that make others fold.",
        "Being the reason hard things actually got finished.",
      ],
      tradeoffs: [
        "Rest starts to require a permission you never quite grant.",
        "The people closest to you get the tired version.",
        "The crash, when it comes, is bigger for having been postponed.",
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
    identity_statement: "You decide while others are still waiting to feel sure.",
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
        "Deciding becomes a muscle. While others deliberate, someone like this has chosen, acted, and started learning what only action can teach.",
        "A history of survivable mistakes builds real nerve. Having been wrong and turned out fine, they stop fearing wrong.",
        "Rooms reorganize around decisiveness. When nobody wants to make the call, every eye drifts to the person who will.",
      ],
      strengthens: [
        "Moving before the window closes.",
        "Comfort deciding with incomplete information.",
        "Cutting through stalls that trap whole groups.",
      ],
      tradeoffs: [
        "Speed produces mistakes that patience would have caught.",
        "Deliberate people can feel steamrolled rather than led.",
        "Some decisions deserved the slower treatment they didn't get.",
      ],
    },
  },
  {
    id: "spontaneous-adventurer",
    trait: "Impulsiveness",
    dominant_dimension: "Risk Tolerance",
    canonical_name: "Spontaneous Adventurer",
    identity_statement: "You say yes first and figure out the rest on the way.",
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
        "Yes becomes the default answer. The trip gets booked, the invitation accepted, the plan changed mid-plan — and most of it turns into stories.",
        "Comfort with the unplanned grows into genuine skill. Improvising stops being the backup and becomes the method.",
        "The life that results is wide and eventful. What it tends to miss is whatever required staying put.",
      ],
      strengthens: [
        "Saying yes to things others talk themselves out of.",
        "Improvising well when there is no plan.",
        "Making ordinary weekends memorable.",
      ],
      tradeoffs: [
        "The follow-through bill arrives after the yes.",
        "People who plan around you learn to plan in pencil.",
        "Some doors only open for those who wait, and waiting isn't the strong suit.",
      ],
    },
  },
  {
    id: "resilient-climber",
    trait: "Resilience",
    dominant_dimension: "Risk Tolerance",
    canonical_name: "Resilient Climber",
    identity_statement: "You come back to the thing that knocked you down.",
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
        "Setbacks lose their finality. A failed attempt becomes round one, then round two, and the running tally of comebacks becomes something to stand on.",
        "Falling stops being frightening once getting up is routine. That steadiness under failure lets them attempt what others won't risk.",
        "In time, the recoveries become the résumé. Anyone facing their own knockdown seeks out the person who's been down and come back.",
      ],
      strengthens: [
        "Getting up faster each time something knocks you down.",
        "Attempting things where failure is likely but survivable.",
        "Turning losses into fuel for the next round.",
      ],
      tradeoffs: [
        "Some fights deserved to be walked away from sooner.",
        "Toughness makes it hard to admit when you're actually hurt.",
        "Repeated recovery costs energy that quieter paths never spend.",
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
    identity_statement: "You say the uncomfortable thing while it can still help.",
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
        "Saying the true thing becomes non-negotiable. Meetings change shape when this person is in the room, because the unsayable is going to get said.",
        "Trust builds on an unusual foundation: everyone knows flattery isn't on offer, so the praise means something and the warnings get heeded.",
        "Broken things get fixed around them. Not always gracefully — but the problems that outlive everyone else's politeness don't outlive theirs.",
      ],
      strengthens: [
        "Naming the problem while it's still fixable.",
        "A reputation for meaning exactly what you say.",
        "Standing firm where bending would be easier.",
      ],
      tradeoffs: [
        "The truth-teller gets invited to fewer things.",
        "Friction follows you into rooms that wanted peace.",
        "Being right and being liked keep pulling in opposite directions.",
      ],
    },
  },
  {
    id: "conflict-avoider",
    trait: "Avoidance",
    dominant_dimension: "Conflict Tolerance",
    canonical_name: "Conflict Avoider",
    identity_statement: "You keep the peace even when it costs you the point.",
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
        "Daily life gets genuinely smoother. Arguments that eat other people's weeks simply don't happen; the detour around them is taken early and without fuss.",
        "The skill is real — calming, redirecting, absorbing. Most rooms are easier for having this person in them.",
        "What gets avoided doesn't vanish, though. Unspoken disagreements settle in and quietly decide what can be talked about.",
      ],
      strengthens: [
        "Steering situations away from blowups before they start.",
        "Staying on decent terms with almost everyone.",
        "Keeping your head while others heat up.",
      ],
      tradeoffs: [
        "Your side of the argument rarely gets heard.",
        "Small problems grow while waiting for a conversation that never comes.",
        "Peace bought with silence gets more expensive every year.",
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
