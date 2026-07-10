import type { Moment } from "@/types/database";
import type { ThemeName } from "@/types/enums";

export type MockPathDraft = {
  title: string;
  description: string;
  /** Situations v3: where this road leads (destination label). Validation-only — never persisted. */
  direction?: string;
  /** Situations v3: the framing assumption this path rejects, when it is the challenger. */
  challenges_assumption?: string;
  benefits: string[];
  consequences: string[];
  future_shift: string;
  themes: ThemeName[];
};

export type MockCrossroadResult = {
  current_understanding: string;
  paths: MockPathDraft[];
  opportunity_themes: ThemeName[];
  risk_themes: ThemeName[];
};

export function generateMockCrossroads(
  moment: Pick<Moment, "title" | "description">,
): MockCrossroadResult {
  const title = moment.title.trim();
  const description = moment.description?.trim() ?? null;

  const current_understanding = description
    ? `You are facing "${title}". ${description} This crossroads may be asking you to weigh what feels familiar against what might open a different version of yourself.`
    : `You are facing "${title}". This crossroads may be asking you to weigh what feels familiar against what might open a different version of yourself.`;

  const paths: MockPathDraft[] = [
    {
      title: "Take The Leap",
      direction: "full commitment to this change",
      challenges_assumption: "",
      description: `Move forward with "${title}" and commit to seeing it through.`,
      benefits: [
        "Clarity may come from decisive action rather than prolonged uncertainty.",
        "You may discover capacities you only find when you step in fully.",
      ],
      consequences: [
        "The door on alternative directions may close, at least for now.",
        "Progress may feel uneven before it feels meaningful.",
      ],
      future_shift: "You may become someone who trusts commitment over endless deliberation.",
      themes: ["Courage", "Growth"],
    },
    {
      title: "Wait And Observe",
      direction: "a deliberately slower decision",
      challenges_assumption: "",
      description: `Pause on "${title}" and gather more information before acting.`,
      benefits: [
        "Space to notice patterns in what you truly want versus what you fear.",
        "Less risk of choosing from pressure rather than intention.",
      ],
      consequences: [
        "Momentum may slow while others move ahead.",
        "Waiting can become its own habit if the pause has no end.",
      ],
      future_shift: "You may become someone who leads with reflection before motion.",
      themes: ["Reflection", "Stability"],
    },
    {
      title: "Test A Smaller Step",
      direction: "a scaled-down experiment first",
      challenges_assumption: "That this has to be an all-or-nothing decision.",
      description: `Reframe "${title}" and pursue a smaller, experimental version first.`,
      benefits: [
        "Lower stakes may make it easier to learn without overcommitting.",
        "You can test whether this direction fits before going all in.",
      ],
      consequences: [
        "A partial step may not deliver the full outcome you imagine.",
        "Others may read caution as lack of conviction.",
      ],
      future_shift: "You may become someone who grows through careful experimentation.",
      themes: ["Curiosity", "Creativity"],
    },
    {
      title: "Build Closer Ties",
      direction: "change shaped with other people",
      challenges_assumption: "",
      description: `Choose a path adjacent to "${title}" that honors connection and shared context.`,
      benefits: [
        "Important relationships may stay intact through the transition.",
        "Support from others may make the change more sustainable.",
      ],
      consequences: [
        "You may compromise on independence to preserve belonging.",
        "The path may take longer if it requires alignment with others.",
      ],
      future_shift: "You may become someone who shapes change through relationship, not isolation.",
      themes: ["Connection", "Belonging"],
    },
    {
      title: "Go Your Own Way",
      direction: "independence on your own terms",
      challenges_assumption: "",
      description: `Step back from "${title}" and prioritize independence on your own terms.`,
      benefits: [
        "Freedom to define success without external expectations.",
        "Room to discover what you want when no one else is steering.",
      ],
      consequences: [
        "Distance from familiar support systems may feel lonely at first.",
        "The responsibility of self-direction can feel heavy.",
      ],
      future_shift: "You may become someone who builds identity from self-trust and autonomy.",
      themes: ["Independence", "Leadership"],
    },
  ];

  if (description) {
    paths[0].description = `Act on "${title}" with the context you shared in mind: ${description.slice(0, 120)}${description.length > 120 ? "…" : ""}`;
  }

  return {
    current_understanding,
    paths,
    opportunity_themes: ["Courage", "Independence"],
    risk_themes: ["Stability", "Connection"],
  };
}
