import type { ThemeChange } from "@/types/database";
import type { FutureSelfEvidenceStrength, ThemeName } from "@/types/enums";

export const FUTURE_SELF_MOVEMENT_DIRECTIONS = ["positive", "negative", "unchanged"] as const;
export type FutureSelfMovementDirection = (typeof FUTURE_SELF_MOVEMENT_DIRECTIONS)[number];

export type MockFutureSelfDraft = {
  name: string;
  summary: string;
  movement_direction: FutureSelfMovementDirection;
  evidence_strength: FutureSelfEvidenceStrength;
  benefits: string[];
  consequences: string[];
  prediction: string;
  themes: ThemeName[];
  why_changed: string;
};

type ThemeTrajectory = {
  name: string;
  summary: string;
  benefits: string[];
  consequences: string[];
  prediction: string;
};

// Concrete trajectory per theme — not an archetype/personality label, but a
// description of what this person keeps choosing and what that costs.
const THEME_TRAJECTORY: Record<ThemeName, ThemeTrajectory> = {
  Connection: {
    name: "Increasingly prioritizes closeness with the people already in their life",
    summary:
      "Someone who chooses ongoing connection over independence when the two pull in different directions.",
    benefits: [
      "Relationships deepen and become more reliable.",
      "Support is available during difficult stretches.",
      "Shared experiences accumulate faster.",
    ],
    consequences: [
      "Time and energy for solo pursuits shrinks.",
      "Decisions increasingly bend around other people's needs.",
      "Independence muscles get less practice.",
    ],
    prediction:
      "Becomes someone whose sense of identity is closely tied to the people around them, with fewer choices made in isolation.",
  },
  Independence: {
    name: "Builds a life that depends less on any one relationship or place",
    summary:
      "Someone who keeps choosing autonomy, even when it means stepping away from familiar support.",
    benefits: [
      "Decisions become easier to make without needing approval.",
      "Self-reliance grows.",
      "Major moves become easier to make on short notice.",
    ],
    consequences: [
      "Close relationships may thin out from lack of ongoing investment.",
      "Support during hard moments may be harder to find.",
      "Fewer people end up with full context on the person's life.",
    ],
    prediction:
      "Becomes someone increasingly comfortable making major decisions alone, with a smaller but more selective circle of close relationships.",
  },
  Curiosity: {
    name: "Keeps choosing the unfamiliar option over the comfortable one",
    summary:
      "Someone who treats new information and new situations as worth pursuing, even at the cost of stability.",
    benefits: [
      "Exposure to more options and perspectives.",
      "Adaptability to new circumstances increases.",
      "New skills and interests keep entering the picture.",
    ],
    consequences: [
      "Commitments may be harder to sustain.",
      "Less depth builds in any single pursuit.",
      "Unfinished projects pile up over time.",
    ],
    prediction:
      "Becomes someone defined by breadth of experience rather than mastery of one path, often mid-exploration rather than settled.",
  },
  Stability: {
    name: "Protects existing routines and commitments over new opportunities",
    summary:
      "Someone who weighs new options against the cost to current stability, and often chooses to stay the course.",
    benefits: [
      "Day-to-day life remains predictable and manageable.",
      "Existing commitments stay intact.",
      "Stress from uncertainty stays low.",
    ],
    consequences: [
      "Opportunities that require disruption go unexplored.",
      "Growth may slow without new challenge.",
      "The comfortable routine gets harder to leave the longer it continues.",
    ],
    prediction:
      "Becomes someone who is reliable and consistent, but increasingly risk-averse about anything that threatens the current routine.",
  },
  Creativity: {
    name: "Channels decisions through self-expression rather than convention",
    summary:
      "Someone who keeps choosing paths that let them make or shape something, even when a safer option is available.",
    benefits: [
      "Original work or expression accumulates over time.",
      "A distinct point of view becomes more defined.",
      "Work feels more personally meaningful.",
    ],
    consequences: [
      "Financial or schedule stability may suffer for the sake of the work.",
      "Conventional paths get deprioritized.",
      "Feedback and rejection land harder when the work is personal.",
    ],
    prediction:
      "Becomes someone whose identity is tied to what they make, increasingly uncomfortable in roles that don't allow for it.",
  },
  Growth: {
    name: "Keeps taking on harder versions of the same challenge",
    summary: "Someone who treats discomfort as a signal to keep going rather than to stop.",
    benefits: [
      "Skills and capability compound steadily.",
      "Confidence builds from repeated effort.",
      "Harder goals start to feel reachable.",
    ],
    consequences: [
      "Rest and satisfaction with \"good enough\" become harder to access.",
      "Other areas of life may be neglected in favor of the effort.",
      "Burnout risk builds quietly over time.",
    ],
    prediction:
      "Becomes someone who measures their life largely by progress and improvement, often restless when things plateau.",
  },
  Belonging: {
    name: "Orients major decisions around being part of a group or place",
    summary:
      "Someone who keeps choosing the option that keeps them embedded in a community rather than apart from one.",
    benefits: [
      "A stable sense of identity tied to a community forms.",
      "Access to support and shared resources increases.",
      "A sense of belonging shows up in daily life.",
    ],
    consequences: [
      "Decisions that would separate them from the group become harder to make.",
      "Individual preferences may get deprioritized for the sake of fitting in.",
      "Leaving or disagreeing with the group gets costlier over time.",
    ],
    prediction:
      "Becomes someone whose choices are increasingly shaped by what keeps them inside a group, with identity and group membership closely linked.",
  },
  Leadership: {
    name: "Keeps stepping into the role of organizing or guiding others",
    summary:
      "Someone who, given the option, takes on responsibility for others' outcomes rather than only their own.",
    benefits: [
      "Influence over outcomes and direction increases.",
      "Others increasingly rely on and trust their judgment.",
      "More say in decisions that affect the group.",
    ],
    consequences: [
      "Personal needs may get deprioritized behind the group's.",
      "Visibility increases the cost of mistakes.",
      "Free time shrinks as more people depend on them.",
    ],
    prediction:
      "Becomes someone others look to first, with identity increasingly tied to being responsible for a group's direction.",
  },
  Reflection: {
    name: "Pauses to examine decisions before acting on them",
    summary:
      "Someone who keeps choosing to slow down and make sense of a situation before committing to a direction.",
    benefits: [
      "Decisions are made with more self-awareness.",
      "Patterns are more likely to be recognized before they repeat.",
      "Fewer impulsive choices that need walking back later.",
    ],
    consequences: [
      "Action may be delayed past the point it was useful.",
      "Overthinking may substitute for actually deciding.",
      "Opportunities with short windows may close while still weighing options.",
    ],
    prediction:
      "Becomes someone who trusts their own analysis more than impulse, sometimes at the cost of momentum.",
  },
  Courage: {
    name: "Keeps choosing the harder, riskier option when it matters",
    summary:
      "Someone who treats discomfort and uncertainty as a cost worth paying for the outcome on the other side.",
    benefits: [
      "New opportunities that require risk become available.",
      "Confidence builds from having faced difficulty directly.",
      "Fewer regrets about chances not taken.",
    ],
    consequences: [
      "Some risks taken will not pay off.",
      "Stability is repeatedly put at stake for the sake of the attempt.",
      "Recovery time after a bad outcome can be significant.",
    ],
    prediction:
      "Becomes someone defined by a willingness to act despite uncertainty, with a track record that includes both gains and real losses.",
  },
};

type EvidenceSource = "path" | "checkin" | "identity";

function themeChangeWeight(change: ThemeChange): number {
  if (change.direction === "strengthened") {
    return 3;
  }

  if (change.direction === "emerging") {
    return 2;
  }

  return 1;
}

function evidenceStrengthFromSources(
  sources: Set<EvidenceSource>,
): FutureSelfEvidenceStrength {
  if (sources.size >= 3) {
    return "Strong";
  }

  if (sources.size >= 2) {
    return "Moderate";
  }

  return "Emerging";
}

export function generateMockFutureSelves(input: {
  momentCount: number;
  checkInCount: number;
  pathThemes: ThemeName[];
  checkInThemeChanges: ThemeChange[];
  identityUpdateThemes: ThemeName[];
}): MockFutureSelfDraft[] {
  if (input.momentCount < 1) {
    return [];
  }

  const themeScores = new Map<ThemeName, number>();
  const themeSources = new Map<ThemeName, Set<EvidenceSource>>();

  function addEvidence(theme: ThemeName, weight: number, source: EvidenceSource) {
    themeScores.set(theme, (themeScores.get(theme) ?? 0) + weight);
    const sources = themeSources.get(theme) ?? new Set<EvidenceSource>();
    sources.add(source);
    themeSources.set(theme, sources);
  }

  for (const theme of input.pathThemes) {
    addEvidence(theme, 1, "path");
  }

  for (const change of input.checkInThemeChanges) {
    const theme = change.theme as ThemeName;
    if (theme in THEME_TRAJECTORY) {
      addEvidence(theme, themeChangeWeight(change) * 3, "checkin");
    }
  }

  for (const theme of input.identityUpdateThemes) {
    addEvidence(theme, 2, "identity");
  }

  const ranked = [...themeScores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (ranked.length === 0) {
    return [];
  }

  return ranked.map(([theme]) => {
    const trajectory = THEME_TRAJECTORY[theme];
    const sources = themeSources.get(theme) ?? new Set<EvidenceSource>();

    return {
      name: trajectory.name,
      summary: trajectory.summary,
      movement_direction: "positive" as const,
      evidence_strength: evidenceStrengthFromSources(sources),
      benefits: trajectory.benefits,
      consequences: trajectory.consequences,
      prediction: trajectory.prediction,
      themes: [theme],
      why_changed: "",
    };
  });
}
