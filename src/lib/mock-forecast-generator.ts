import type { Moment } from "@/types/database";
import type { ForecastOutput } from "@/lib/ai/schemas/forecast";

type ForecastPathContext = {
  title: string;
  description: string;
};

// Forecasts v2 mock: exactly 8 moments per forecast — 3 likely developments
// (active), 3 failure modes (hidden), 2 alternative outcomes (wild_card) —
// shaped as one believable year of the chosen path. blind_spots is always
// empty for v2 generations.

function buildWorkCrushForecast(selectedPathTitle?: string): ForecastOutput {
  const direct = /ask her out|direct approach|change the context/i.test(selectedPathTitle ?? "");

  return {
    active: direct
      ? [
          {
            title: "You Finally Ask Her To Coffee",
            why: "Weeks of daily rapport build to a moment where the question feels natural rather than forced. Actually asking changes the story from wondering to knowing.",
            impact: "You meet outside work for the first time within the month.",
          },
          {
            title: "You Start Spending Time Together Outside Work",
            why: "One plan tends to lead to another once the first invitation lands. The relationship stops depending on shift schedules.",
            impact: "Weekends start including her instead of just workdays.",
          },
          {
            title: "Coworkers Notice The Change",
            why: "Workplace dynamics rarely stay private, and the way you two act around each other becomes visible before either of you announces anything.",
            impact: "The team starts treating you as a pair at social events.",
          },
        ]
      : [
          {
            title: "The Friendship Deepens First",
            why: "Choosing patience means the connection grows through ordinary shifts and small favors. Comfort builds before anything is named.",
            impact: "She starts seeking you out instead of the other way around.",
          },
          {
            title: "She Starts Texting Outside Work",
            why: "Comfort at work eventually spills past it. The first off-hours message marks the friendship crossing into personal territory.",
            impact: "Contact moves beyond the office for the first time.",
          },
          {
            title: "A Team Event Creates Alone Time",
            why: "After-work plans eventually produce the private moment daily shifts never quite allow. What you do with it shapes the next months.",
            impact: "You finally talk without the usual audience.",
          },
        ],
    hidden: [
      {
        title: "The Ambiguity Outlasts Your Patience",
        why: "Waiting for the perfect moment can quietly become the plan itself. Months of friendly routine make the question harder to ask, not easier.",
        impact: "The situation feels the same in spring as it did in autumn.",
      },
      {
        title: "She Assumes You're Not Interested",
        why: "Consistent platonic behavior reads as an answer even when you never meant to give one. She stops looking for signs because the friendship feels settled.",
        impact: "She starts talking to you about other people she likes.",
      },
      {
        title: "Work Gets Complicated Before The Answer Comes",
        why: "Sharing a workplace means every step happens in front of the same people you both see daily. The stakes of an awkward outcome grow the longer things stay undefined.",
        impact: "You start editing yourself at work to protect the dynamic.",
      },
    ],
    blind_spots: [],
    wild_card: [
      {
        title: "She Leaves The Company",
        why: "Job changes end the daily proximity the whole situation rests on — and force the question of whether this was a work friendship or something more.",
        impact: "You have to decide whether to pursue contact deliberately.",
      },
      {
        title: "A Mutual Friend Changes Everything",
        why: "Someone who knows you both can reframe the situation in one conversation — because you chose to stay close enough for others to see what's there.",
        impact: "The dynamic shifts through someone neither of you planned on.",
      },
    ],
  };
}

function buildBusinessForecast(): ForecastOutput {
  return {
    active: [
      {
        title: "The First Real Users Arrive",
        why: "Committing to the build turns the idea into something strangers actually touch. Their first reactions carry more information than months of planning.",
        impact: "Real usage feedback starts steering the roadmap.",
      },
      {
        title: "The Work Becomes Part Of Your Routine",
        why: "The project stops being a burst of excitement and becomes the thing your evenings quietly organize around. That shift is what makes it real.",
        impact: "Friends start asking how the business is going, not whether.",
      },
      {
        title: "The Product Solves A Different Problem Than Expected",
        why: "Real usage reveals what people actually need, which is rarely exactly what you built first. Following that signal is how the business finds its shape.",
        impact: "The pitch you give in month six sounds different from month one.",
      },
    ],
    hidden: [
      {
        title: "Nobody Uses The Product At First",
        why: "The launch moment you imagined often lands quietly. The silence isn't a verdict — but it tests whether the commitment was to the idea or to the outcome.",
        impact: "You face weeks of building without applause.",
      },
      {
        title: "You Stop Asking For Help",
        why: "Building alone makes self-reliance the habit, and the habit slowly closes the doors that feedback and collaborators would have opened.",
        impact: "Problems that others solved months ago eat your weekends.",
      },
      {
        title: "The Business Becomes A Side Project",
        why: "Income pressure and daily obligations shrink the build hours without any single decision to quit. Drift, not failure, is the likelier ending.",
        impact: "Progress slows to weekends only.",
      },
    ],
    blind_spots: [],
    wild_card: [
      {
        title: "An Early User Wants To Build It With You",
        why: "Shipping something real is what makes a stranger care enough to offer more than feedback — the path itself creates the partnership.",
        impact: "You split responsibilities and ship faster.",
      },
      {
        title: "The Product Evolves Into Something Else",
        why: "Following real demand can carry the project somewhere the original plan never pointed. The business you end up running may not be the one you started.",
        impact: "A feature becomes the product.",
      },
    ],
  };
}

function buildRelocationForecast(): ForecastOutput {
  return {
    active: [
      {
        title: "The New City Starts Feeling Familiar",
        why: "Somewhere in the first months, navigation stops requiring thought and a few places become yours. Familiarity arrives quietly, before belonging does.",
        impact: "You stop describing the move as an experiment.",
      },
      {
        title: "Most New Friendships Begin At Work",
        why: "A new job becomes the main place you meet people after a move. The colleagues you click with shape what the city feels like.",
        impact: "Your social life starts revolving around a few coworkers.",
      },
      {
        title: "You Renew Your Lease",
        why: "The renewal is the first moment the move stops being temporary in your own head. Signing again is choosing the city on purpose this time.",
        impact: "What felt like a trial quietly becomes a chapter.",
      },
    ],
    hidden: [
      {
        title: "Loneliness Lasts Longer Than Expected",
        why: "New friendships take months to carry real weight, and the gap between arriving and belonging is where most moves get hard. Knowing it's coming makes it survivable.",
        impact: "Weekends feel emptier than weekdays for a while.",
      },
      {
        title: "The Job Isn't What You Expected",
        why: "The role that justified the move reveals its real shape only after you're living inside it. The gap between the offer and the reality tests why you actually came.",
        impact: "You separate what the job gives you from what the city does.",
      },
      {
        title: "Old Friendships Fade From Distance",
        why: "Without spontaneous contact, some ties quietly go dormant. The fading is gradual enough that you notice it only when you go to share news.",
        impact: "Home starts to feel farther away emotionally than physically.",
      },
    ],
    blind_spots: [],
    wild_card: [
      {
        title: "You Decide To Stay For A Completely Different Reason",
        why: "The job may have brought you here, but a relationship, a community, or a life you built on weekends can become the real anchor.",
        impact: "The role becomes replaceable; the city doesn't.",
      },
      {
        title: "A Better Opportunity Appears Because You Moved",
        why: "Being in a new market and a new network surfaces options that were invisible from home — the move itself widens what's possible.",
        impact: "You field an offer you couldn't have gotten before.",
      },
    ],
  };
}

function buildGenericForecast(title: string): ForecastOutput {
  void title;
  return {
    active: [
      {
        title: "The First Weeks Feel Like Progress",
        why: "Committing to a direction replaces deliberation with motion, and early steps land quickly. The momentum makes the choice feel real.",
        impact: "You stop revisiting the decision every day.",
      },
      {
        title: "The Choice Starts Shaping Your Routine",
        why: "A real commitment shows up in how ordinary weeks are spent. The path stops being a decision and becomes a life.",
        impact: "People around you start treating the change as settled.",
      },
      {
        title: "New Information Changes The Plan",
        why: "Moving forward surfaces details that deliberation never could. Adjusting course is part of the path working, not failing.",
        impact: "You adjust plans based on what you learn.",
      },
    ],
    hidden: [
      {
        title: "The Early Momentum Fades",
        why: "Every commitment has a stretch where novelty is gone and results haven't arrived. This is where the path is most often quietly abandoned.",
        impact: "The work feels like maintenance instead of progress.",
      },
      {
        title: "It Costs More Than You Budgeted For",
        why: "Paths demand time, money, or energy from places you didn't plan to draw on. The overrun strains whatever you protected least.",
        impact: "Something else in life gets less of you than it used to.",
      },
      {
        title: "Someone Close Doesn't Adjust With You",
        why: "Your commitment changes routines that other people relied on. Their friction is usually about the change, not the choice.",
        impact: "A relationship needs renegotiating you didn't expect.",
      },
    ],
    blind_spots: [],
    wild_card: [
      {
        title: "A Better Opportunity Appears",
        why: "Being visibly in motion attracts options that never find people who are still deciding. The path creates doors beside it.",
        impact: "A choice you had not weighed becomes realistic.",
      },
      {
        title: "The Reason You Started Stops Being The Reason You Continue",
        why: "Living inside the path reveals what you actually value about it, which is often different from what made you choose it.",
        impact: "You keep going, but for something you couldn't have named at the start.",
      },
    ],
  };
}

export function generateMockForecast(input: {
  moment: Pick<Moment, "title" | "description">;
  selectedPath?: ForecastPathContext | null;
}): ForecastOutput {
  const combined = `${input.moment.title}\n${input.moment.description ?? ""}`.toLowerCase();
  const selectedPathTitle = input.selectedPath?.title;

  if (/\b(girl|guy|crush|work|colleague)\b/.test(combined)) {
    return buildWorkCrushForecast(selectedPathTitle);
  }

  if (/\b(startup|business|launch|product|users|company|founder|mvp|starting a business)\b/.test(combined)) {
    return buildBusinessForecast();
  }

  if (/\b(dallas|move|relocat|new city|new job|job offer|might get a job)\b/.test(combined)) {
    return buildRelocationForecast();
  }

  return buildGenericForecast(input.moment.title);
}
