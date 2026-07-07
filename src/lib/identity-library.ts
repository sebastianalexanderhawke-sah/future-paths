import type { IdentityDimension } from "@/types/behavior";

export type IdentityDimensionWeights = Partial<Record<IdentityDimension, number>>;

export type IdentityProfile = {
  id: string;
  canonical_name: string;
  /**
   * Timeless one-sentence answer to "who is this person?" — hand-written,
   * never AI-generated, identical every time this identity appears. Shown
   * quoted under the name on the Future Self card, so it must not
   * paraphrase short_description or read like a forecast (the card's
   * closing narrative owns the future tense).
   */
  identity_statement: string;
  short_description: string;
  dimension_weights: IdentityDimensionWeights;
  typical_behaviors: string[];
};

export const IDENTITY_LIBRARY: readonly IdentityProfile[] = [
  {
    id: "self-reliant-builder",
    canonical_name: "Self-Reliant Builder",
    identity_statement: "Builds a life that doesn't wait for anyone's permission.",
    // Phase 8F boundary vs Long-Haul Finisher: the Builder persists to stay
    // free of anyone else's control; the Finisher persists to complete what
    // was chosen, comfortably inside structures. Autonomy vs completion.
    short_description:
      "Builds a life that doesn't require anyone's permission — capability, systems, and decisions all self-made, because depending on others feels like the real risk.",
    dimension_weights: {
      Independence: 1.0,
      Initiative: 0.8,
      Consistency: 0.7,
      Connection: -0.3,
      Vulnerability: -0.2,
      Reflection: -0.3,
    },
    typical_behaviors: [
      "Starts projects or changes without waiting for permission or validation",
      "Creates systems or routines that reduce dependence on specific people or places",
      "Turns down good opportunities when they come with someone else holding the reins",
      "Solves problems independently before considering asking for help",
      "Figures things out by doing rather than planning or deliberating at length",
    ],
  },
  {
    id: "community-weaver",
    canonical_name: "Community Weaver",
    identity_statement: "Creates the belonging other people get to live inside.",
    short_description:
      "Actively initiates and holds relationships, organizing shared experiences and staying present through difficulty.",
    dimension_weights: {
      Connection: 1.0,
      Vulnerability: 0.7,
      "Conflict Tolerance": 0.6,
      // Phase 8H: Consistency removed and Initiative reduced from 0.6 — the
      // validation showed CW acting as a generic "good adult" detector (#1
      // for 11 of 20 personas, including an Army officer and an Olympic
      // hurdler). Weaving is organized around creating belonging; ordinary
      // reliability and initiative are not what makes someone a Weaver.
      Initiative: 0.3,
      Independence: -0.4,
    },
    typical_behaviors: [
      "Organizes gatherings, introductions, or shared experiences others wouldn't have created",
      "Stays in relationships through conflict rather than stepping back",
      "Shares personal difficulty with others rather than managing it alone",
      "Checks in on people during hard stretches without needing a reason",
      "Prioritizes group cohesion when individual preference and group need pull apart",
    ],
  },
  {
    id: "relentless-grower",
    canonical_name: "Relentless Grower",
    identity_statement: "Chooses long-term growth over immediate comfort.",
    short_description:
      "Treats plateaus as problems and discomfort as a signal to push further, adapting method to pursue harder challenges.",
    dimension_weights: {
      Initiative: 1.0,
      // Phase 8D: reduced from 0.7 — the Grower escalates rather than
      // consolidates ("takes on harder versions rather than consolidating"),
      // so routine-keeping should barely feed it. Persistence lives in
      // Initiative + Risk Tolerance.
      Consistency: 0.2,
      "Risk Tolerance": 0.7,
      Adaptability: 0.4,
      // Phase 8H: reduced from -0.3 each — the old penalties encoded a
      // grinder-who-never-feels stereotype. The validation's Olympic athlete
      // (journals, sports psychologist, admits fear) had no Grower in her top
      // five despite a life of pure escalation. Growth doesn't require
      // emotional suppression.
      Reflection: -0.1,
      Vulnerability: -0.1,
    },
    typical_behaviors: [
      "Takes on harder versions of the same challenge rather than consolidating",
      "Sets measurable goals and adjusts approach based on results",
      "Stays with a pursuit through difficulty rather than switching to something easier",
      "Chooses the option that produces growth over the option that reduces stress",
      "Returns to difficult tasks after setbacks without prolonged recovery time",
    ],
  },
  {
    id: "reflective-practitioner",
    canonical_name: "Reflective Practitioner",
    identity_statement: "Understands life by pausing to examine it.",
    short_description:
      "Pauses to examine decisions and patterns before committing, building understanding through consistent self-examination.",
    dimension_weights: {
      Reflection: 1.0,
      Consistency: 0.7,
      Curiosity: 0.5,
      Initiative: -0.3,
      "Risk Tolerance": -0.4,
      Adaptability: -0.2,
    },
    typical_behaviors: [
      "Reviews past decisions to extract patterns before making new ones",
      "Slows down when others accelerate, especially before committing",
      "Journals or otherwise externalizes thinking to understand it more clearly",
      "Returns to questions that were left open rather than moving on from them",
      "Takes deliberate pauses between experiencing something and responding to it",
    ],
  },
  {
    id: "adaptive-explorer",
    canonical_name: "Adaptive Explorer",
    identity_statement: "Follows what is interesting before it is certain.",
    short_description:
      "Pursues unfamiliar ideas and territories readily, changing direction when something more interesting appears and sharing experiments before they are complete.",
    dimension_weights: {
      Adaptability: 1.0,
      Curiosity: 0.9,
      // Phase 8D: reduced from 0.6 — exploration is moving toward the
      // interesting, not through the frightening. High Risk weight was
      // borrowed from Threshold Crosser's core and made the pair co-fire.
      "Risk Tolerance": 0.3,
      Initiative: 0.3,
      Vulnerability: 0.3,
      Consistency: -0.6,
    },
    typical_behaviors: [
      "Changes plans when new information makes a different direction more interesting",
      "Pursues unfamiliar domains before fully mastering current ones",
      "Starts experiments before having a clear framework for success",
      "Shares work or ideas before they are fully formed to get early reactions",
      "Moves on from pursuits without needing formal closure",
    ],
  },
  {
    id: "threshold-crosser",
    canonical_name: "Threshold Crosser",
    identity_statement: "Moves while the outcome is still unknowable.",
    short_description:
      "Acts before certainty arrives and moves into high-stakes situations others hesitate at, accepting instability as the cost of forward motion.",
    dimension_weights: {
      "Risk Tolerance": 1.0,
      Initiative: 0.7,
      // Phase 8D: reduced from 0.5 — the Crosser's core is committing despite
      // uncertainty, not changing direction. High Adaptability was borrowed
      // from Adaptive Explorer's core and made the pair co-fire.
      Adaptability: 0.2,
      // Phase 8H: reduced from -0.4 — the engine's Consistency signals measure
      // honoring commitments, not preferring stability. The old weight made
      // reliable risk-takers (validation: the founder, the flight-nurse
      // applicant) unrecognizable as Crossers.
      Consistency: -0.1,
      "Conflict Tolerance": -0.2,
    },
    typical_behaviors: [
      "Makes high-stakes decisions with incomplete information rather than waiting",
      "Pursues options that require giving up current stability",
      "Accepts visible risk of failure rather than choosing the safer path",
      "Re-enters high-stakes territory soon after a loss rather than retreating to safety",
      "Acts before others consider readiness confirmed",
    ],
  },
  {
    id: "quiet-supporter",
    canonical_name: "Quiet Supporter",
    identity_statement: "Shows up for their people and asks for almost nothing back.",
    // Phase 8F boundary vs Steady Foundation Builder: the Supporter's
    // steadiness exists FOR specific people; the Foundation Builder's exists
    // FOR the built structure. Loyalty to persons vs loyalty to arrangements.
    short_description:
      "Steadfast for specific people — the one who answers when called, stays through hard seasons, and asks for almost nothing back.",
    dimension_weights: {
      Consistency: 1.0,
      Connection: 0.7,
      Vulnerability: 0.4,
      Initiative: -0.4,
      "Risk Tolerance": -0.4,
    },
    typical_behaviors: [
      "Follows through on commitments to others without needing reminders",
      "Responds when people reach out rather than initiating contact first",
      "Maintains relationships through steady low-key contact over long periods",
      "Supports others during difficulty without taking charge of the situation",
      "Puts someone else's hard week ahead of their own plans without mentioning it",
    ],
  },
  {
    id: "steady-foundation-builder",
    canonical_name: "Steady Foundation Builder",
    identity_statement: "Protects what has been patiently built.",
    // Phase 8F boundary vs Quiet Supporter: this steadiness protects the
    // built structure — house, routine, arrangement — not a specific person.
    short_description:
      "Anchors every decision to protecting what has been built — the home, the routine, the proven arrangement — because nothing matters more than nothing collapsing.",
    dimension_weights: {
      Consistency: 1.0,
      "Risk Tolerance": -0.8,
      Adaptability: -0.6,
      Initiative: -0.3,
      Vulnerability: -0.2,
    },
    typical_behaviors: [
      "Protects existing routines and commitments before considering new opportunities",
      "Waits for certainty to accumulate before making changes",
      "Declines opportunities that would disrupt stable current arrangements",
      "Completes existing commitments before starting new ones",
      "Returns to proven methods when novel approaches introduce uncertainty",
    ],
  },
  {
    id: "deliberate-soloist",
    canonical_name: "Deliberate Soloist",
    identity_statement: "Does their deepest work in their own company.",
    short_description:
      "Chooses solitude as the environment for clearest thinking and deepest work, building a life with significant independence from others.",
    dimension_weights: {
      Independence: 1.0,
      Reflection: 0.8,
      Curiosity: 0.4,
      Connection: -0.7,
      Vulnerability: -0.4,
      Initiative: -0.3,
    },
    typical_behaviors: [
      "Does best thinking and work alone, with minimal collaboration",
      "Makes decisions without consulting others, even for major choices",
      "Spends significant time in solitude without it feeling like absence",
      "Keeps personal information close rather than sharing it widely",
      "Prefers to understand something deeply before starting, rather than figuring it out through action",
    ],
  },
  {
    id: "vulnerable-leader",
    canonical_name: "Vulnerable Leader",
    identity_statement: "Steps forward without pretending to be certain.",
    // Phase 8F: rewritten out of corporate leadership-training language into
    // ordinary human terms — the person who steps forward without pretending
    // certainty. Same psychology, same weights.
    short_description:
      "Steps forward when something needs doing and says out loud what they don't know — people follow because nothing is being hidden from them.",
    dimension_weights: {
      Initiative: 1.0,
      Vulnerability: 0.6,
      Connection: 0.6,
      "Conflict Tolerance": 0.5,
      Independence: 0.4,
      // Phase 8I: reduced from -0.4 — Consistency signals measure keeping
      // promises and staying accountable, which strengthen leadership rather
      // than oppose it. Same reasoning as Threshold Crosser in 8H; the
      // benchmark showed this penalty was most of why the literal
      // vulnerable-leader persona could never lead his own board.
      Consistency: -0.1,
    },
    typical_behaviors: [
      "Steps up to handle hard situations without pretending to be certain",
      "Starts the conversation everyone else is avoiding",
      "Admits fear, doubt, or a mistake in front of people who are watching them lead",
      "Takes responsibility when things go wrong instead of finding someone to blame",
      "Stays in a hard conversation to the end rather than handing it to someone else",
    ],
  },
  {
    // Phase 8F: renamed from "Committed Achiever" — everyone believes they
    // are a committed achiever, so the old name confronted no one. The id is
    // deliberately unchanged: existing future_selves rows match by identity_id
    // and pick up the new display name on their next generation run.
    id: "committed-achiever",
    canonical_name: "Long-Haul Finisher",
    identity_statement: "Stays long after the excitement is gone.",
    short_description:
      "Stays with chosen commitments long after the excitement is gone, refusing pivots that would restart the clock — effort compounds because it is never scattered.",
    dimension_weights: {
      Consistency: 0.9,
      Initiative: 0.8,
      Independence: 0.5,
      // Phase 8D: Risk Tolerance removed — achievement is persistence toward
      // long-term goals, not risk appetite. Its former 0.3 weight let risky
      // decisions inflate this identity (the 25/25/25 tie in the 8A audit).
      Adaptability: -0.4,
      Vulnerability: -0.3,
    },
    typical_behaviors: [
      "Keeps a small number of long-term commitments and returns to them season after season",
      "Works through the long unglamorous middle of a pursuit, when progress is invisible",
      "Refuses attractive pivots that would restart the clock on years of accumulated effort",
      "Tracks progress to stay honest about the pace, not to celebrate",
      "Finishes ambitious work at full standard even after the initial excitement is gone",
    ],
  },
  {
    id: "resilient-adapter",
    canonical_name: "Resilient Adapter",
    identity_statement: "Becomes the steady one when everything shakes.",
    // Phase 8F: rewritten from "survives things" to chosen steadiness — this
    // person deliberately becomes the stable force others hold onto during
    // uncertainty. Absorbs Grounded Realist's clear-sightedness (naming
    // difficulty exactly as it is). Weights unchanged.
    short_description:
      "Deliberately becomes the steady one when circumstances shake — keeping commitments intact through disruption and naming hard truths plainly, so others have something solid to hold onto.",
    dimension_weights: {
      Adaptability: 0.9,
      Consistency: 0.7,
      Vulnerability: 0.7,
      "Conflict Tolerance": 0.5,
      "Risk Tolerance": -0.2,
    },
    typical_behaviors: [
      "Steps into the steady role when everyone around them is rattled — by choice, not by default",
      "Keeps promises intact through disruption by changing the method, never the commitment",
      "Names exactly how bad a situation is, without softening it or catastrophizing",
      "Becomes the first call for others when their lives destabilize",
      "Rebuilds routines quickly after upheaval so the people around them have solid ground again",
    ],
  },
];

export function getIdentityById(id: string): IdentityProfile | undefined {
  return IDENTITY_LIBRARY.find((identity) => identity.id === id);
}

export function getIdentityByName(name: string): IdentityProfile | undefined {
  return IDENTITY_LIBRARY.find((identity) => identity.canonical_name === name);
}
