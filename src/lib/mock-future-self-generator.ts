import type { ThemeChange } from "@/types/database";
import type { FutureSelfEvidenceStrength, ThemeName } from "@/types/enums";

export const FUTURE_SELF_MOVEMENT_DIRECTIONS = ["positive", "negative", "unchanged"] as const;
export type FutureSelfMovementDirection = (typeof FUTURE_SELF_MOVEMENT_DIRECTIONS)[number];

export type MockFutureSelfDraft = {
  name: string;
  summary: string;
  movement_direction: FutureSelfMovementDirection;
  evidence_strength: FutureSelfEvidenceStrength;
  core_behaviors: string[];
  behavioral_evidence: string[];
  growth_opportunities: string[];
  blind_spots: string[];
  likely_evolution: string;
  themes: ThemeName[];
  why_emerging: string;
};

type ThemeTrajectory = {
  name: string;
  summary: string;
  core_behaviors: string[];
  growth_opportunities: string[];
  blind_spots: string[];
  likely_evolution: string;
};

const THEME_TRAJECTORY: Record<ThemeName, ThemeTrajectory> = {
  Connection: {
    name: "Community Builder",
    summary:
      "Someone who consistently chooses connection over independence when the two pull in different directions.",
    core_behaviors: [
      "Prioritizes time with existing relationships over new opportunities.",
      "Checks in on others during difficult stretches.",
      "Organizes shared experiences rather than pursuing solo ones.",
    ],
    growth_opportunities: [
      "Relationships deepen and become more reliable over time.",
      "Support is available during difficult stretches.",
      "Shared experiences accumulate faster than they would alone.",
    ],
    blind_spots: [
      "Time and energy for solo pursuits shrinks.",
      "Decisions increasingly bend around other people's needs.",
      "Independence muscles get less practice the longer this continues.",
    ],
    likely_evolution:
      "Becomes someone whose sense of identity is closely tied to the people around them, with fewer choices made in isolation.",
  },
  Independence: {
    name: "Self-Reliant Architect",
    summary:
      "Someone who keeps choosing autonomy, even when it means stepping away from familiar support.",
    core_behaviors: [
      "Makes major decisions without seeking external approval.",
      "Structures life to reduce dependency on any one relationship or place.",
      "Declines help that would come with conditions attached.",
    ],
    growth_opportunities: [
      "Decisions become easier to make without needing approval.",
      "Self-reliance and adaptability grow steadily.",
      "Major moves become easier to make on short notice.",
    ],
    blind_spots: [
      "Close relationships may thin out from lack of ongoing investment.",
      "Support during hard moments may be harder to find.",
      "Fewer people end up with full context on the person's life.",
    ],
    likely_evolution:
      "Becomes someone increasingly comfortable making major decisions alone, with a smaller but more selective circle of close relationships.",
  },
  Curiosity: {
    name: "Curious Explorer",
    summary:
      "Someone who treats new information and new situations as worth pursuing, even at the cost of stability.",
    core_behaviors: [
      "Chooses the unfamiliar option over the comfortable one.",
      "Follows questions into new domains without a clear destination.",
      "Starts new things before finishing existing ones.",
    ],
    growth_opportunities: [
      "Exposure to more options and perspectives than most people accumulate.",
      "Adaptability to new circumstances increases.",
      "New skills and interests keep entering the picture.",
    ],
    blind_spots: [
      "Commitments may be harder to sustain when something new appears.",
      "Less depth builds in any single pursuit.",
      "Unfinished projects and half-explored paths accumulate over time.",
    ],
    likely_evolution:
      "Becomes someone defined by breadth of experience rather than mastery of one path, often mid-exploration rather than settled.",
  },
  Stability: {
    name: "Steady Foundation Builder",
    summary:
      "Someone who weighs new options against the cost to current stability, and often chooses to stay the course.",
    core_behaviors: [
      "Protects existing routines before considering new opportunities.",
      "Anchors decisions to confirmed realities rather than open possibilities.",
      "Moves slowly and deliberately when change is on the table.",
    ],
    growth_opportunities: [
      "Day-to-day life remains predictable and manageable.",
      "Existing commitments stay intact.",
      "Stress from uncertainty stays consistently low.",
    ],
    blind_spots: [
      "Opportunities that require disruption go unexplored.",
      "Growth slows without new challenge.",
      "The comfortable routine gets harder to leave the longer it continues.",
    ],
    likely_evolution:
      "Becomes someone who is reliable and consistent, but increasingly risk-averse about anything that threatens the current routine.",
  },
  Creativity: {
    name: "Creative Maker",
    summary:
      "Someone who keeps choosing paths that let them make or shape something, even when a safer option is available.",
    core_behaviors: [
      "Channels decisions through self-expression rather than convention.",
      "Chooses work that allows making or shaping something original.",
      "Invests personal meaning into output in ways others don't.",
    ],
    growth_opportunities: [
      "Original work or expression accumulates over time.",
      "A distinct point of view becomes more defined.",
      "Work feels more personally meaningful than conventional paths.",
    ],
    blind_spots: [
      "Financial or schedule stability may suffer for the sake of the work.",
      "Conventional paths that would have been useful get deprioritized.",
      "Feedback and rejection land harder when the work is personal.",
    ],
    likely_evolution:
      "Becomes someone whose identity is tied to what they make, increasingly uncomfortable in roles that don't allow for it.",
  },
  Growth: {
    name: "Relentless Grower",
    summary: "Someone who treats discomfort as a signal to keep going rather than to stop.",
    core_behaviors: [
      "Takes on harder versions of the same challenge rather than consolidating.",
      "Treats plateaus as problems to be solved.",
      "Measures progress continuously and adjusts accordingly.",
    ],
    growth_opportunities: [
      "Skills and capability compound steadily over time.",
      "Confidence builds from repeated effort and visible progress.",
      "Harder goals start to feel reachable that once seemed impossible.",
    ],
    blind_spots: [
      "Rest and satisfaction with 'good enough' become harder to access.",
      "Other areas of life may be neglected in favor of the effort.",
      "Burnout risk builds quietly behind the scenes.",
    ],
    likely_evolution:
      "Becomes someone who measures their life largely by progress and improvement, often restless when things plateau.",
  },
  Belonging: {
    name: "Belonging Seeker",
    summary:
      "Someone who keeps choosing the option that keeps them embedded in a community rather than apart from one.",
    core_behaviors: [
      "Orients major decisions around being part of a group or place.",
      "Prioritizes fitting into a community over standing apart from one.",
      "Stays in situations longer than optimal to maintain group membership.",
    ],
    growth_opportunities: [
      "A stable sense of identity tied to a community forms.",
      "Access to support and shared resources increases.",
      "A sense of belonging shows up in daily life rather than being searched for.",
    ],
    blind_spots: [
      "Decisions that would separate them from the group become harder to make.",
      "Individual preferences may get deprioritized for the sake of fitting in.",
      "Leaving or disagreeing with the group gets costlier over time.",
    ],
    likely_evolution:
      "Becomes someone whose choices are increasingly shaped by what keeps them inside a group, with identity and group membership closely linked.",
  },
  Leadership: {
    name: "Natural Leader",
    summary:
      "Someone who, given the option, takes on responsibility for others' outcomes rather than only their own.",
    core_behaviors: [
      "Steps into the role of organizing or guiding others when it's available.",
      "Takes on responsibility for group outcomes beyond their own.",
      "Invests in others' development even when it costs personal time.",
    ],
    growth_opportunities: [
      "Influence over outcomes and direction increases.",
      "Others increasingly rely on and trust their judgment.",
      "More say in decisions that affect the group.",
    ],
    blind_spots: [
      "Personal needs may get deprioritized behind the group's.",
      "Visibility increases the cost of mistakes.",
      "Free time shrinks as more people depend on them.",
    ],
    likely_evolution:
      "Becomes someone others look to first, with identity increasingly tied to being responsible for a group's direction.",
  },
  Reflection: {
    name: "Reflective Practitioner",
    summary:
      "Someone who keeps choosing to slow down and make sense of a situation before committing to a direction.",
    core_behaviors: [
      "Pauses to examine decisions before acting on them.",
      "Revisits past choices to extract patterns and lessons.",
      "Slows down when others speed up.",
    ],
    growth_opportunities: [
      "Decisions are made with more self-awareness than most.",
      "Patterns are more likely to be recognized before they repeat.",
      "Fewer impulsive choices that need walking back later.",
    ],
    blind_spots: [
      "Action may be delayed past the point it was useful.",
      "Overthinking may substitute for actually deciding.",
      "Opportunities with short windows may close while still weighing options.",
    ],
    likely_evolution:
      "Becomes someone who trusts their own analysis more than impulse, sometimes at the cost of momentum.",
  },
  Courage: {
    name: "Courageous Risk-Taker",
    summary:
      "Someone who treats discomfort and uncertainty as a cost worth paying for the outcome on the other side.",
    core_behaviors: [
      "Chooses the harder, riskier option when it matters.",
      "Acts before certainty is available.",
      "Returns to difficult situations rather than avoiding them.",
    ],
    growth_opportunities: [
      "New opportunities that require risk become available.",
      "Confidence builds from having faced difficulty directly.",
      "Fewer regrets about chances not taken.",
    ],
    blind_spots: [
      "Some risks taken will not pay off.",
      "Stability is repeatedly put at stake for the sake of the attempt.",
      "Recovery time after a bad outcome can be significant.",
    ],
    likely_evolution:
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
      core_behaviors: trajectory.core_behaviors,
      behavioral_evidence: [],
      growth_opportunities: trajectory.growth_opportunities,
      blind_spots: trajectory.blind_spots,
      likely_evolution: trajectory.likely_evolution,
      themes: [theme],
      why_emerging: "",
    };
  });
}
