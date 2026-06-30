import type { IdentityDimension } from "@/types/behavior";

export type IdentityDimensionWeights = Partial<Record<IdentityDimension, number>>;

export type IdentityProfile = {
  id: string;
  canonical_name: string;
  short_description: string;
  dimension_weights: IdentityDimensionWeights;
  typical_behaviors: string[];
};

export const IDENTITY_LIBRARY: readonly IdentityProfile[] = [
  {
    id: "self-reliant-builder",
    canonical_name: "Self-Reliant Builder",
    short_description:
      "Builds capability and makes decisions independently, preferring to figure things out before asking for help.",
    dimension_weights: {
      Independence: 1.0,
      Initiative: 0.8,
      Consistency: 0.7,
      Connection: -0.3,
      Vulnerability: -0.2,
    },
    typical_behaviors: [
      "Starts projects or changes without waiting for external validation",
      "Creates systems or routines that reduce dependence on specific people or places",
      "Makes major decisions using self-generated criteria rather than others' input",
      "Solves problems independently before considering asking for help",
      "Structures life to increase personal capability over time",
    ],
  },
  {
    id: "community-weaver",
    canonical_name: "Community Weaver",
    short_description:
      "Builds and holds relationships deliberately, staying present through difficulty and sharing openly.",
    dimension_weights: {
      Connection: 1.0,
      Vulnerability: 0.7,
      "Conflict Tolerance": 0.6,
      Consistency: 0.4,
      Independence: -0.4,
    },
    typical_behaviors: [
      "Stays in relationships through conflict rather than stepping back",
      "Shares personal difficulty with others rather than managing it alone",
      "Invests time in relationships even when returns are not immediate",
      "Organizes shared experiences and checks in on people during hard stretches",
      "Prioritizes group cohesion when individual preference and group need pull apart",
    ],
  },
  {
    id: "relentless-grower",
    canonical_name: "Relentless Grower",
    short_description:
      "Treats plateaus as problems and discomfort as a signal to push further, measuring progress continuously.",
    dimension_weights: {
      Initiative: 1.0,
      Consistency: 0.8,
      "Risk Tolerance": 0.7,
      Reflection: -0.2,
      Vulnerability: -0.3,
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
    short_description:
      "Pauses to examine decisions and patterns before committing, developing understanding through deliberate self-examination.",
    dimension_weights: {
      Reflection: 1.0,
      Consistency: 0.6,
      Curiosity: 0.4,
      Initiative: -0.3,
      "Risk Tolerance": -0.3,
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
    short_description:
      "Moves toward novelty and changes direction readily when something better appears, comfortable with uncertainty as the default state.",
    dimension_weights: {
      Adaptability: 1.0,
      Curiosity: 0.8,
      Initiative: 0.3,
      Consistency: -0.5,
      "Risk Tolerance": 0.3,
    },
    typical_behaviors: [
      "Changes plans when new information makes a different direction more interesting",
      "Pursues unfamiliar domains before mastering current ones",
      "Stays functional and engaged when circumstances shift unexpectedly",
      "Tries new approaches to familiar problems rather than repeating what worked",
      "Moves on from pursuits without needing formal closure",
    ],
  },
  {
    id: "courageous-leap-taker",
    canonical_name: "Courageous Leap-Taker",
    short_description:
      "Acts before certainty is available and moves toward difficulty rather than away from it, accepting instability as the price of forward motion.",
    dimension_weights: {
      "Risk Tolerance": 1.0,
      Initiative: 0.7,
      Adaptability: 0.5,
      Consistency: -0.4,
      "Conflict Tolerance": -0.2,
    },
    typical_behaviors: [
      "Makes high-stakes decisions with incomplete information rather than waiting",
      "Pursues options that require giving up current stability",
      "Accepts visible risk of failure rather than choosing the safer path",
      "Returns to difficult situations after bad outcomes rather than avoiding them",
      "Acts before others consider readiness confirmed",
    ],
  },
  {
    id: "quiet-supporter",
    canonical_name: "Quiet Supporter",
    short_description:
      "Shows up reliably for others without needing to lead or initiate, maintaining consistent presence across time.",
    dimension_weights: {
      Connection: 0.8,
      Consistency: 0.8,
      Vulnerability: 0.4,
      Initiative: -0.4,
      "Risk Tolerance": -0.4,
    },
    typical_behaviors: [
      "Follows through on commitments to others without needing reminders",
      "Responds when people reach out rather than initiating contact first",
      "Maintains relationships through steady low-key contact over long periods",
      "Supports others during difficulty without taking charge of the situation",
      "Stays in circumstances that are good enough rather than seeking better ones",
    ],
  },
  {
    id: "steady-foundation-builder",
    canonical_name: "Steady Foundation Builder",
    short_description:
      "Anchors decisions to protecting what already works, moving deliberately and treating stability as the measure of success.",
    dimension_weights: {
      Consistency: 1.0,
      "Conflict Tolerance": 0.5,
      "Risk Tolerance": -0.8,
      Adaptability: -0.6,
      Initiative: -0.2,
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
    short_description:
      "Chooses solitude as the environment for clearest thinking and most self-directed work, building a life with significant independence from others.",
    dimension_weights: {
      Independence: 1.0,
      Reflection: 0.7,
      Curiosity: 0.3,
      Connection: -0.6,
      Vulnerability: -0.4,
    },
    typical_behaviors: [
      "Does best thinking and work alone, with minimal collaboration",
      "Makes decisions without consulting others, even for major choices",
      "Spends significant time in solitude without it feeling like absence",
      "Keeps personal information close rather than sharing it widely",
      "Structures work and life to minimize required coordination with others",
    ],
  },
  {
    id: "vulnerable-leader",
    canonical_name: "Vulnerable Leader",
    short_description:
      "Leads while sharing difficulty openly, combining accountability for others with willingness to name personal struggle.",
    dimension_weights: {
      Vulnerability: 1.0,
      Initiative: 0.8,
      Connection: 0.7,
      "Conflict Tolerance": 0.4,
    },
    typical_behaviors: [
      "Names personal difficulty or uncertainty in situations where others are watching",
      "Takes responsibility for group outcomes while acknowledging own limitations",
      "Shares what is hard about a decision, not just the decision itself",
      "Invests in others' development while being open about own growth edges",
      "Stays in difficult conversations rather than deferring or delegating them",
    ],
  },
  {
    id: "creative-risk-taker",
    canonical_name: "Creative Risk-Taker",
    short_description:
      "Experiments with new ideas and shares unfinished work, combining curiosity with willingness to fail publicly.",
    dimension_weights: {
      Curiosity: 1.0,
      "Risk Tolerance": 0.8,
      Adaptability: 0.7,
      Vulnerability: 0.4,
      Consistency: -0.5,
    },
    typical_behaviors: [
      "Starts experiments before having a clear framework for success",
      "Shares work before it is fully formed to get early reactions",
      "Pursues questions across domain boundaries without worrying about credentials",
      "Changes direction mid-project when a more interesting question appears",
      "Accepts visible failure as a normal part of making or exploring something",
    ],
  },
  {
    id: "committed-achiever",
    canonical_name: "Committed Achiever",
    short_description:
      "Sets direction deliberately and executes over long timescales, maintaining focus without being pulled off course.",
    dimension_weights: {
      Consistency: 0.8,
      Initiative: 0.8,
      Independence: 0.5,
      "Risk Tolerance": 0.4,
      Adaptability: -0.3,
      Vulnerability: -0.3,
    },
    typical_behaviors: [
      "Sets goals at the start of a period and returns to them consistently",
      "Continues toward a target when momentum is low or progress is unclear",
      "Resists requests to redirect effort toward new priorities",
      "Tracks progress and uses it to sustain focus rather than to celebrate",
      "Completes what was started before opening new commitments",
    ],
  },
  {
    id: "resilient-adapter",
    canonical_name: "Resilient Adapter",
    short_description:
      "Maintains core commitments while adjusting approach as circumstances change, naming difficulty without being derailed by it.",
    dimension_weights: {
      Adaptability: 0.9,
      Consistency: 0.7,
      Vulnerability: 0.7,
      "Conflict Tolerance": 0.5,
      "Risk Tolerance": -0.2,
    },
    typical_behaviors: [
      "Adjusts plans when conditions change without losing sight of the goal",
      "Acknowledges setbacks directly rather than minimizing or hiding them",
      "Finds a workable path in circumstances that seem restrictive",
      "Maintains commitments while changing methods as the situation evolves",
      "Recovers from disruption without extended avoidance or withdrawal",
    ],
  },
  {
    id: "grounded-realist",
    canonical_name: "Grounded Realist",
    short_description:
      "Assesses situations honestly before acting and navigates difficulty without either avoiding it or catastrophizing it.",
    dimension_weights: {
      Reflection: 0.8,
      "Conflict Tolerance": 0.8,
      Adaptability: 0.6,
      "Risk Tolerance": -0.2,
      Initiative: -0.3,
    },
    typical_behaviors: [
      "Names what is difficult about a situation accurately, without softening or amplifying",
      "Stays present in difficult conversations without shutting down or escalating",
      "Gathers information before committing, but acts once enough is known",
      "Adjusts expectations based on what is actually happening rather than what was hoped",
      "Accepts unwanted circumstances without either denying them or being immobilized",
    ],
  },
];

export function getIdentityById(id: string): IdentityProfile | undefined {
  return IDENTITY_LIBRARY.find((identity) => identity.id === id);
}

export function getIdentityByName(name: string): IdentityProfile | undefined {
  return IDENTITY_LIBRARY.find((identity) => identity.canonical_name === name);
}
