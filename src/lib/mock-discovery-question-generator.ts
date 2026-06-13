import type { Moment } from "@/types/database";

import {
  discoveryQuestionOutputSchema,
  type DiscoveryQuestionOutput,
} from "@/lib/ai/schemas/discovery-question";
import type { SituationGoal } from "@/lib/discovery-question-planner";
import {
  understandSituation,
  type DiscoveryQuestionCategory,
} from "@/lib/situation-understanding";

type MockDiscoveryQuestionInput = {
  moment: Pick<Moment, "title" | "description">;
  goal: SituationGoal;
};

type MockQuestionDraft = {
  question: string;
  category: DiscoveryQuestionCategory;
  reason: string;
};

const CATEGORY_QUESTIONS: Record<DiscoveryQuestionCategory, MockQuestionDraft[]> = {
  Relocation: [
    {
      question: "What is the biggest reason you're considering moving?",
      category: "Relocation",
      reason: "Primary motivation strongly influences path generation.",
    },
    {
      question: "Do you already know where you'd move?",
      category: "Relocation",
      reason: "A known destination changes what paths are realistic.",
    },
    {
      question: "What would be hardest to leave behind?",
      category: "Relocation",
      reason: "Tradeoffs reveal what the move would cost emotionally and practically.",
    },
    {
      question: "How soon would you realistically make this decision?",
      category: "Relocation",
      reason: "Timing determines whether waiting, preparing, or acting is the live path.",
    },
    {
      question: "Is the move mainly for a job, lifestyle, or something else?",
      category: "Relocation",
      reason: "The driver of relocation separates career paths from personal ones.",
    },
  ],
  Relationships: [
    {
      question: "Have you spent time together one-on-one?",
      category: "Relationships",
      reason: "Private time is a strong signal for how direct a path can be.",
    },
    {
      question: "What worries you most about making a move here?",
      category: "Relationships",
      reason: "The main fear points to the path the user is trying to avoid.",
    },
    {
      question: "What makes you think they may like you back?",
      category: "Relationships",
      reason: "Concrete signals distinguish hopeful paths from friendly ones.",
    },
    {
      question: "Who usually starts conversations between you?",
      category: "Relationships",
      reason: "Initiation patterns help distinguish interest from politeness.",
    },
    {
      question: "Do you interact outside of work hours?",
      category: "Relationships",
      reason: "Off-hours contact suggests the connection may extend beyond the workplace.",
    },
  ],
  Career: [
    {
      question: "What attracts you most about the new role?",
      category: "Career",
      reason: "Motivation separates growth paths from escape paths.",
    },
    {
      question: "What would you lose by staying where you are?",
      category: "Career",
      reason: "Opportunity cost clarifies whether staying is truly safe.",
    },
    {
      question: "Do you have a deadline to decide?",
      category: "Career",
      reason: "Timing changes whether negotiation or immediate action is realistic.",
    },
    {
      question: "What would make you confident saying yes?",
      category: "Career",
      reason: "Decision criteria reveal which paths are still missing information.",
    },
    {
      question: "Who else is affected if you take this role?",
      category: "Career",
      reason: "Stakeholders change the weight of relocation or schedule shifts.",
    },
  ],
  Business: [
    {
      question: "What problem are you trying to solve for customers?",
      category: "Business",
      reason: "Problem clarity separates viable business paths from vague ambition.",
    },
    {
      question: "How much runway do you have before this needs to pay off?",
      category: "Business",
      reason: "Runway determines whether bold or conservative paths are realistic.",
    },
    {
      question: "What would success look like in the first six months?",
      category: "Business",
      reason: "Near-term milestones shape which forecast outcomes are plausible.",
    },
    {
      question: "What part of starting this feels most uncertain?",
      category: "Business",
      reason: "Uncertainty hotspots guide which paths need de-risking first.",
    },
    {
      question: "Are you doing this alone or with a partner?",
      category: "Business",
      reason: "Partnership dynamics change accountability and path structure.",
    },
  ],
  Education: [
    {
      question: "What are you hoping this degree or program unlocks?",
      category: "Education",
      reason: "Expected outcomes determine whether education paths fit the situation.",
    },
    {
      question: "What would you give up to pursue this?",
      category: "Education",
      reason: "Sacrifice tradeoffs reveal whether the path is sustainable.",
    },
    {
      question: "Do you need to decide by a specific date?",
      category: "Education",
      reason: "Deadlines change whether preparation or immediate enrollment paths apply.",
    },
    {
      question: "What worries you most about choosing this path?",
      category: "Education",
      reason: "Fears highlight constraints the forecast should respect.",
    },
    {
      question: "Have you talked to anyone who took a similar route?",
      category: "Education",
      reason: "Reference points reduce blind spots in path generation.",
    },
  ],
  Health: [
    {
      question: "What outcome would tell you this is working?",
      category: "Health",
      reason: "Success criteria shape which health paths are worth pursuing.",
    },
    {
      question: "What has stopped you from acting on this before?",
      category: "Health",
      reason: "Past blockers reveal recurring constraints in generated paths.",
    },
    {
      question: "Who supports you when health decisions get hard?",
      category: "Health",
      reason: "Support systems change feasibility of sustained paths.",
    },
    {
      question: "Is there a timeline or event driving this decision?",
      category: "Health",
      reason: "Timing pressure affects which paths are urgent versus gradual.",
    },
    {
      question: "What feels most risky about the option you're leaning toward?",
      category: "Health",
      reason: "Risk perception separates cautious paths from decisive ones.",
    },
  ],
  Finance: [
    {
      question: "What would change in your life if this money decision went well?",
      category: "Finance",
      reason: "Desired outcomes anchor which financial paths matter most.",
    },
    {
      question: "What is the main constraint you are working within?",
      category: "Finance",
      reason: "Constraints filter unrealistic paths early.",
    },
    {
      question: "How reversible is this decision if it goes wrong?",
      category: "Finance",
      reason: "Reversibility changes the risk profile of each path.",
    },
    {
      question: "Who else depends on this outcome?",
      category: "Finance",
      reason: "Dependents raise the stakes of conservative versus bold paths.",
    },
    {
      question: "What deadline or trigger is pushing you to decide now?",
      category: "Finance",
      reason: "Triggers determine whether waiting paths remain viable.",
    },
  ],
  Family: [
    {
      question: "Who in your family is most affected by this decision?",
      category: "Family",
      reason: "Affected relationships change which paths preserve connection.",
    },
    {
      question: "What would your family need from you during this transition?",
      category: "Family",
      reason: "Needs reveal practical constraints on timing and location.",
    },
    {
      question: "What conversation have you not had yet that would change things?",
      category: "Family",
      reason: "Missing conversations often gate realistic paths.",
    },
    {
      question: "What would feel like a fair compromise to everyone involved?",
      category: "Family",
      reason: "Compromise boundaries shape multi-party path options.",
    },
    {
      question: "Is there a family event or deadline influencing timing?",
      category: "Family",
      reason: "Family timing anchors forecast sequences.",
    },
  ],
  Custom: [
    {
      question: "What would need to be true for you to feel good about deciding?",
      category: "Custom",
      reason: "Decision criteria reveal which paths still lack key information.",
    },
    {
      question: "What part of this situation feels most unclear right now?",
      category: "Custom",
      reason: "Uncertainty hotspots guide which paths to explore first.",
    },
    {
      question: "What would you regret more — acting or waiting?",
      category: "Custom",
      reason: "Regret framing surfaces the user's implicit priority.",
    },
    {
      question: "Who else is involved in how this plays out?",
      category: "Custom",
      reason: "Stakeholders change interpersonal and practical path options.",
    },
    {
      question: "What timeline are you working with, if any?",
      category: "Custom",
      reason: "Timing determines whether gradual paths remain open.",
    },
  ],
};

function selectQuestions(
  primaryCategory: DiscoveryQuestionCategory,
  goal: SituationGoal,
): MockQuestionDraft[] {
  const primary = CATEGORY_QUESTIONS[primaryCategory].slice(0, 4);
  const secondaryCategory =
    primaryCategory === "Custom" ? "Custom" : ("Custom" as DiscoveryQuestionCategory);
  const secondary = CATEGORY_QUESTIONS[secondaryCategory].slice(0, 1);

  const combined = [...primary, ...secondary];
  const goalTailored =
    goal === "forecast"
      ? combined.map((entry, index) =>
          index === combined.length - 1
            ? {
                ...entry,
                question: entry.question.replace("decision", "outcome"),
              }
            : entry,
        )
      : combined;

  return goalTailored.slice(0, 5);
}

export function generateMockDiscoveryQuestions(
  input: MockDiscoveryQuestionInput,
): DiscoveryQuestionOutput {
  const title = input.moment.title.trim();
  const description = input.moment.description?.trim() ?? "";
  const understanding = understandSituation(title, description);
  const questions = selectQuestions(understanding.primaryCategory, input.goal);

  return discoveryQuestionOutputSchema.parse({ questions });
}
