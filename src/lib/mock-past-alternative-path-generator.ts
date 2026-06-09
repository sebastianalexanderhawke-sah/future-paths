import type { PastCrossroad } from "@/types/database";
import type { ThemeName } from "@/types/enums";

export type MockPastAlternativePathDraft = {
  title: string;
  description: string;
  themes: ThemeName[];
  possible_future_shift: string;
};

type PathTemplate = MockPastAlternativePathDraft;

const EDUCATION_PATHS: PathTemplate[] = [
  {
    title: "Transfer farther from home",
    description:
      "You might have moved to a university farther away, trading proximity for a wider environment.",
    themes: ["Independence", "Curiosity"],
    possible_future_shift:
      "You may have become someone who learned to build a life away from familiar support.",
  },
  {
    title: "Take a gap year first",
    description:
      "You might have paused before committing, using a year to explore work, travel, or uncertainty.",
    themes: ["Reflection", "Courage"],
    possible_future_shift:
      "You may have become someone who let experience, not urgency, shape your direction.",
  },
  {
    title: "Enter the workforce immediately",
    description:
      "You might have skipped or deferred formal study and learned through work instead.",
    themes: ["Growth", "Stability"],
    possible_future_shift:
      "You may have become someone who grew through practical responsibility rather than classrooms.",
  },
  {
    title: "Pursue a different field",
    description:
      "You might have chosen another area of study that felt closer to a different curiosity.",
    themes: ["Creativity", "Growth"],
    possible_future_shift:
      "You may have become someone whose identity formed around a different intellectual path.",
  },
  {
    title: "Build something while studying",
    description:
      "You might have started a small project, business, or creative pursuit alongside school.",
    themes: ["Creativity", "Leadership"],
    possible_future_shift:
      "You may have become someone who learned to create while still finding your footing.",
  },
];

const CAREER_PATHS: PathTemplate[] = [
  {
    title: "Choose the other field",
    description:
      "You might have pursued the profession or craft that felt more uncertain but more alive.",
    themes: ["Courage", "Creativity"],
    possible_future_shift:
      "You may have become someone who followed aptitude toward a less obvious calling.",
  },
  {
    title: "Delay and explore first",
    description:
      "You might have taken more time before committing to a career track.",
    themes: ["Reflection", "Curiosity"],
    possible_future_shift:
      "You may have become someone who resisted early specialization.",
  },
  {
    title: "Accept a different first role",
    description:
      "You might have taken a first job that emphasized learning over prestige or pay.",
    themes: ["Growth", "Connection"],
    possible_future_shift:
      "You may have become someone who built identity through mentorship and early experimentation.",
  },
  {
    title: "Work independently sooner",
    description:
      "You might have chosen freelance, entrepreneurial, or self-directed work earlier.",
    themes: ["Independence", "Leadership"],
    possible_future_shift:
      "You may have become someone who learned to trust your own direction early.",
  },
];

const LOCATION_PATHS: PathTemplate[] = [
  {
    title: "Move away",
    description:
      "You might have left your hometown or current city for a new environment.",
    themes: ["Independence", "Courage"],
    possible_future_shift:
      "You may have become someone shaped by distance, adaptation, and self-reliance.",
  },
  {
    title: "Stay and deepen roots",
    description:
      "You might have invested more deeply where you already were instead of leaving.",
    themes: ["Belonging", "Stability"],
    possible_future_shift:
      "You may have become someone whose identity grew through continuity and local ties.",
  },
  {
    title: "Move temporarily",
    description:
      "You might have tried another place for a defined season rather than a permanent shift.",
    themes: ["Curiosity", "Growth"],
    possible_future_shift:
      "You may have become someone who learned through reversible experiments with place.",
  },
  {
    title: "Choose community over geography",
    description:
      "You might have followed people rather than place when deciding where to land.",
    themes: ["Connection", "Belonging"],
    possible_future_shift:
      "You may have become someone who let relationships anchor your sense of home.",
  },
];

const RELATIONSHIP_PATHS: PathTemplate[] = [
  {
    title: "Wait before committing",
    description:
      "You might have given the relationship or commitment more time before deciding.",
    themes: ["Reflection", "Independence"],
    possible_future_shift:
      "You may have become someone who learned to hold uncertainty without rushing closure.",
  },
  {
    title: "Choose partnership earlier",
    description:
      "You might have moved toward commitment sooner than you ultimately did.",
    themes: ["Connection", "Belonging"],
    possible_future_shift:
      "You may have become someone whose identity formed earlier around shared life.",
  },
  {
    title: "Prioritize independence",
    description:
      "You might have preserved more autonomy instead of merging paths with someone else.",
    themes: ["Independence", "Courage"],
    possible_future_shift:
      "You may have become someone who defined yourself apart from partnership for longer.",
  },
  {
    title: "Follow a different kind of bond",
    description:
      "You might have invested in friendship, family, or community instead of the path you took.",
    themes: ["Connection", "Growth"],
    possible_future_shift:
      "You may have become someone whose belonging came through a different kind of tie.",
  },
];

const GENERIC_PATHS: PathTemplate[] = [
  {
    title: "Choose the bolder direction",
    description:
      "You might have taken the option that felt less safe but more expansive at the time.",
    themes: ["Courage", "Growth"],
    possible_future_shift:
      "You may have become someone who learned through risk rather than caution.",
  },
  {
    title: "Choose the steadier direction",
    description:
      "You might have prioritized security, familiarity, or predictability.",
    themes: ["Stability", "Reflection"],
    possible_future_shift:
      "You may have become someone who built identity through consistency and care.",
  },
  {
    title: "Delay the decision",
    description:
      "You might have waited longer before committing, keeping options open.",
    themes: ["Reflection", "Curiosity"],
    possible_future_shift:
      "You may have become someone who tolerated ambiguity longer than you did.",
  },
  {
    title: "Follow connection",
    description:
      "You might have let people, community, or belonging weigh more heavily in the choice.",
    themes: ["Connection", "Belonging"],
    possible_future_shift:
      "You may have become someone whose path was shaped more by relationship than plan.",
  },
  {
    title: "Follow independence",
    description:
      "You might have chosen the path that preserved more freedom or self-direction.",
    themes: ["Independence", "Courage"],
    possible_future_shift:
      "You may have become someone who learned to trust your own compass earlier.",
  },
];

function detectCategory(text: string): "education" | "career" | "location" | "relationship" | "generic" {
  const normalized = text.toLowerCase();

  if (
    /university|college|school|degree|study|major|engineering|medicine|campus/.test(
      normalized,
    )
  ) {
    return "education";
  }

  if (/job|career|work|employ|profession|engineer|doctor|medicine|business/.test(normalized)) {
    return "career";
  }

  if (/move|city|hometown|stay|relocate|travel|abroad|home/.test(normalized)) {
    return "location";
  }

  if (/marry|married|partner|relationship|spouse|wife|husband|love/.test(normalized)) {
    return "relationship";
  }

  return "generic";
}

function templatesForCategory(
  category: ReturnType<typeof detectCategory>,
): PathTemplate[] {
  switch (category) {
    case "education":
      return EDUCATION_PATHS;
    case "career":
      return CAREER_PATHS;
    case "location":
      return LOCATION_PATHS;
    case "relationship":
      return RELATIONSHIP_PATHS;
    default:
      return GENERIC_PATHS;
  }
}

export function generateMockPastAlternativePaths(
  crossroad: Pick<PastCrossroad, "what_happened" | "why_chosen" | "life_stage">,
): MockPastAlternativePathDraft[] {
  const combined = [
    crossroad.what_happened,
    crossroad.why_chosen ?? "",
    crossroad.life_stage ?? "",
  ].join(" ");

  const templates = templatesForCategory(detectCategory(combined));
  return templates.slice(0, 5);
}
