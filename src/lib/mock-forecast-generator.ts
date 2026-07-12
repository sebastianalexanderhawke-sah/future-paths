import type { Moment } from "@/types/database";
import type { ForecastFutureDraft, ForecastOutput } from "@/lib/ai/schemas/forecast";

type ForecastPathContext = {
  title: string;
  description: string;
};

// Forecasts v3 Phase 3 mock: 6-8 practical decision cards per forecast —
// 5-6 realistic failure-based EVENTS (hidden) and 1-2 unexpected
// opportunities (wild_card). Every forecast is an observable real-world
// event — never an emotional state; feelings appear only inside whyThis as
// evidence. Mirrors the shape parseForecastOutput produces from live model
// output: exactly 2 bullets per section, newline-joined onto why ("Why
// Reflection thinks this") and impact ("What could happen"), 2 action
// bullets in actions, plus a 0-100 confidence used for display ordering.
// active and blind_spots are always empty for v3 generations.

type MockCard = {
  title: string;
  whatCouldHappen: [string, string];
  whyThis: [string, string];
  whatYouCanDo: [string, string];
  confidence: number;
  timeframe?: "days" | "weeks" | "months" | "longer_term";
};

function toDraft(card: MockCard): ForecastFutureDraft {
  return {
    title: card.title,
    why: card.whyThis.join("\n"),
    impact: card.whatCouldHappen.join("\n"),
    actions: [...card.whatYouCanDo],
    confidence: card.confidence,
    ...(card.timeframe ? { timeframe: card.timeframe } : {}),
  };
}

function toForecastOutput(risks: MockCard[], opportunities: MockCard[]): ForecastOutput {
  return {
    active: [],
    hidden: risks.map(toDraft),
    blind_spots: [],
    wild_card: opportunities.map(toDraft),
  };
}

function buildWorkCrushForecast(selectedPathTitle?: string): ForecastOutput {
  const direct = /ask her out|direct approach|change the context/i.test(selectedPathTitle ?? "");

  const risks: MockCard[] = [
    {
      title: "Six Months Pass Without An Ask",
      whatCouldHappen: [
        "The friendly routine continues unchanged into next season",
        "No plan outside work ever gets made",
      ],
      whyThis: [
        "You described waiting for the right moment",
        "Comfortable routines tend to defend themselves",
      ],
      whatYouCanDo: [
        "Set a private deadline for deciding this month",
        "Tell one trusted friend so the intention is real",
      ],
      confidence: 75,
      timeframe: "months",
    },
    {
      title: "She Starts Dating Someone Else",
      whatCouldHappen: [
        "She mentions weekend plans with someone new",
        "Your daily chats shrink to work topics only",
      ],
      whyThis: [
        "Nothing you described makes her timeline wait for yours",
        "Consistent platonic behavior reads as an answer",
      ],
      whatYouCanDo: [
        "Suggest one plan that isn't tied to work this week",
        "Add one signal that reads as more than friendly",
      ],
      confidence: 55,
      timeframe: "months",
    },
    {
      title: "A Coworker Asks Her Out First",
      whatCouldHappen: [
        "Someone in the same proximity makes the move you postponed",
        "Your window closes without a decision from you",
      ],
      whyThis: [
        "Workplace proximity puts others in your exact position",
        "You have been treating the current openness as permanent",
      ],
      whatYouCanDo: [
        "Act while the dynamic is still yours to shape",
        "Decide today what you would do if this happened",
      ],
      confidence: 40,
      timeframe: "months",
    },
    {
      title: "The Ask Gets Overheard At Work",
      whatCouldHappen: [
        "A coworker witnesses the conversation or hears about it",
        "The story circulates on your shared team within days",
      ],
      whyThis: [
        "You share a workplace and a team with her",
        "Shared spaces rarely stay private during personal moments",
      ],
      whatYouCanDo: [
        "Plan the conversation for a private, off-site setting",
        "Prepare a next-day script for either answer",
      ],
      confidence: 45,
      timeframe: "weeks",
    },
    {
      title: "A Schedule Change Ends The Daily Overlap",
      whatCouldHappen: [
        "A shift or team change cuts your shared hours",
        "Contact drops to occasional messages within a month",
      ],
      whyThis: [
        "The relationship currently lives entirely inside work hours",
        "You described no channel between you outside work",
      ],
      whatYouCanDo: [
        "Build one channel of contact outside work now",
        "Make one plan that survives a schedule change",
      ],
      confidence: 35,
      timeframe: "longer_term",
    },
  ];

  if (direct) {
    risks[0] = {
      title: "She Says No At A Shared Workplace",
      whatCouldHappen: [
        "The direct ask gets a polite refusal",
        "Daily interactions turn brief and careful for weeks",
      ],
      whyThis: [
        "You chose the direct approach at a shared workplace",
        "A clear answer always costs some ambiguity-comfort",
      ],
      whatYouCanDo: [
        "Pick a private, low-stakes setting for the ask",
        "Keep work behavior deliberately unchanged afterward",
      ],
      confidence: 45,
      timeframe: "weeks",
    };
  }

  const opportunities: MockCard[] = [
    {
      title: "A Mutual Friend Sets Up The Introduction",
      whatCouldHappen: [
        "A group plan turns into unexpected one-on-one time",
        "Someone who knows you both names the dynamic out loud",
      ],
      whyThis: [
        "You stayed close enough for others to see the dynamic",
        "Shared circles create openings no plan produces",
      ],
      whatYouCanDo: [
        "Say yes to group invitations that include her",
        "Let one trusted mutual know where you stand",
      ],
      confidence: 30,
      timeframe: "months",
    },
    {
      title: "She Suggests Plans Outside Work First",
      whatCouldHappen: [
        "An invitation arrives from her side unprompted",
        "The question you rehearsed gets asked of you",
      ],
      whyThis: [
        "The rapport you described runs in both directions",
        "She already initiates most of your conversations",
      ],
      whatYouCanDo: [
        "Leave obvious space for her to suggest something",
        "Say yes quickly instead of analyzing the signal",
      ],
      confidence: 25,
      timeframe: "months",
    },
  ];

  return toForecastOutput(risks, opportunities);
}

function buildBusinessForecast(): ForecastOutput {
  const risks: MockCard[] = [
    {
      title: "Nobody Signs Up In The First Month",
      whatCouldHappen: [
        "Launch week produces near-zero signups",
        "The analytics dashboard stays flat for weeks",
      ],
      whyThis: [
        "You are building before an audience exists",
        "First launches almost always start silent",
      ],
      whatYouCanDo: [
        "Line up ten hand-picked first users before launch",
        "Schedule direct outreach as a weekly habit",
      ],
      confidence: 80,
      timeframe: "weeks",
    },
    {
      title: "Launch Slips By Several Months",
      whatCouldHappen: [
        "Scope grows quietly while you build",
        "The public date moves from this season to the next",
      ],
      whyThis: [
        "You are balancing the build against other obligations",
        "Solo projects have no external deadline pressure",
      ],
      whatYouCanDo: [
        "Cut the first version to one core flow",
        "Announce a date to someone who will ask about it",
      ],
      confidence: 70,
      timeframe: "months",
    },
    {
      title: "The Project Goes Untouched For A Month",
      whatCouldHappen: [
        "Paid work and obligations absorb every build block",
        "The repository shows no commits for four straight weeks",
      ],
      whyThis: [
        "You mentioned income needs competing for your time",
        "Drift, not failure, ends most solo projects",
      ],
      whatYouCanDo: [
        "Protect two fixed build blocks per week",
        "Set a monthly milestone someone else will check",
      ],
      confidence: 60,
      timeframe: "months",
    },
    {
      title: "A Solved Problem Eats Your Weekend",
      whatCouldHappen: [
        "You lose days to an issue with a known solution",
        "The launch checklist stalls on one technical detail",
      ],
      whyThis: [
        "You are building alone by default",
        "You described no builder community around you",
      ],
      whatYouCanDo: [
        "Join one community of people building similar things",
        "Show unfinished work to someone this month",
      ],
      confidence: 55,
      timeframe: "months",
    },
    {
      title: "A Competitor Launches First",
      whatCouldHappen: [
        "A similar product appears while you are still building",
        "You enter a market with a visible alternative",
      ],
      whyThis: [
        "Similar ideas reach the market in waves",
        "Your timeline has no urgency forcing an early release",
      ],
      whatYouCanDo: [
        "Ship an imperfect version to claim the space",
        "Check adjacent products once a month, not daily",
      ],
      confidence: 40,
      timeframe: "months",
    },
  ];

  const opportunities: MockCard[] = [
    {
      title: "An Early User Offers To Help Build It",
      whatCouldHappen: [
        "A power user offers more than feedback",
        "You split responsibilities and ship faster",
      ],
      whyThis: [
        "Shipping something real makes strangers care",
        "Strong early believers often want involvement",
      ],
      whatYouCanDo: [
        "Talk to your most engaged users directly",
        "Name the help you would accept before it is offered",
      ],
      confidence: 30,
      timeframe: "months",
    },
    {
      title: "A Side Feature Becomes The Product",
      whatCouldHappen: [
        "Usage concentrates on something you built as an extra",
        "Real demand pulls the roadmap somewhere unplanned",
      ],
      whyThis: [
        "Usage reveals sharper problems than planning does",
        "Most successful products pivot at least once",
      ],
      whatYouCanDo: [
        "Watch what users actually do, not what they say",
        "Revisit the core pitch every few months",
      ],
      confidence: 35,
      timeframe: "longer_term",
    },
  ];

  return toForecastOutput(risks, opportunities);
}

function buildRelocationForecast(): ForecastOutput {
  const risks: MockCard[] = [
    {
      title: "Your Weekend Calendar Stays Empty For A Month",
      whatCouldHappen: [
        "Weeks pass with no plans that are not work",
        "New friendships take months to produce invitations",
      ],
      whyThis: [
        "You are moving without an existing circle there",
        "Adult friendships form slowly outside school structures",
      ],
      whatYouCanDo: [
        "Commit to one recurring activity in the first month",
        "Say yes to early invitations even when tired",
      ],
      confidence: 80,
      timeframe: "months",
    },
    {
      title: "The Role Differs From The Offer",
      whatCouldHappen: [
        "The day-to-day work does not match the job description",
        "Responsibilities shift within the first quarter",
      ],
      whyThis: [
        "The move rests heavily on this one role",
        "Job descriptions rarely survive contact with the actual team",
      ],
      whatYouCanDo: [
        "Ask the manager today what the first three months look like",
        "Keep your network warm from day one",
      ],
      confidence: 55,
      timeframe: "months",
    },
    {
      title: "Two Close Friendships Go Quiet",
      whatCouldHappen: [
        "Regular contact with old friends drops to holidays only",
        "You learn about big news secondhand",
      ],
      whyThis: [
        "Distance removes the low-effort contact that sustained them",
        "You described friendships built on spontaneous meetups",
      ],
      whatYouCanDo: [
        "Pick the few friendships you will actively maintain",
        "Put recurring calls on the calendar now",
      ],
      confidence: 65,
      timeframe: "longer_term",
    },
    {
      title: "Trips Home Cost Double Your Budget",
      whatCouldHappen: [
        "Each visit takes more time and money than planned",
        "You cut planned visits from the calendar",
      ],
      whyThis: [
        "You described family ties that will pull you back",
        "Travel costs compound across holidays and events",
      ],
      whatYouCanDo: [
        "Budget a realistic number of trips per year today",
        "Book holiday travel far in advance",
      ],
      confidence: 60,
      timeframe: "months",
    },
    {
      title: "Your Lease Outlasts Your Certainty",
      whatCouldHappen: [
        "The renewal date arrives before the move feels settled",
        "You sign for another year by default",
      ],
      whyThis: [
        "You framed the move as an experiment",
        "Exits need a decision; staying happens automatically",
      ],
      whatYouCanDo: [
        "Write down today what would make you leave",
        "Put a decision date on the calendar before the renewal",
      ],
      confidence: 50,
      timeframe: "longer_term",
    },
  ];

  const opportunities: MockCard[] = [
    {
      title: "A Recruiter Contacts You Because Of The Move",
      whatCouldHappen: [
        "A new market surfaces options invisible from home",
        "You field an offer you could not have gotten before",
      ],
      whyThis: [
        "Being physically present changes what finds you",
        "New-city networks form fastest in the first year",
      ],
      whatYouCanDo: [
        "Update your location and role visibility today",
        "Tell new contacts what you are good at early",
      ],
      confidence: 30,
      timeframe: "longer_term",
    },
    {
      title: "A Community Becomes Your Reason To Stay",
      whatCouldHappen: [
        "A weekly group or friendship anchors you more than the job",
        "You renew by choice, not by default",
      ],
      whyThis: [
        "Lives built on weekends outgrow the reason for the move",
        "You arrive open to a new chapter",
      ],
      whatYouCanDo: [
        "Join one recurring local group in the first two weeks",
        "Judge the city on its own terms, not the job's",
      ],
      confidence: 35,
      timeframe: "longer_term",
    },
  ];

  return toForecastOutput(risks, opportunities);
}

function buildGenericForecast(title: string): ForecastOutput {
  void title;

  const risks: MockCard[] = [
    {
      title: "Progress Stalls After The First Month",
      whatCouldHappen: [
        "The visible wins stop arriving after early momentum",
        "Weeks pass with no measurable movement",
      ],
      whyThis: [
        "Every commitment has a post-novelty dip",
        "Your timeline has no external forcing function",
      ],
      whatYouCanDo: [
        "Set one small visible milestone per month",
        "Decide today what week-six success looks like",
      ],
      confidence: 75,
      timeframe: "months",
    },
    {
      title: "The Real Cost Exceeds The Budget",
      whatCouldHappen: [
        "Time, money, or energy drains from unplanned places",
        "Something you protected least gets cut first",
      ],
      whyThis: [
        "Real costs surface only after committing",
        "Estimates made at decision time skew optimistic",
      ],
      whatYouCanDo: [
        "Name what you are least willing to sacrifice",
        "Review the real cost after one month",
      ],
      confidence: 65,
      timeframe: "months",
    },
    {
      title: "Someone Close Pushes Back On The Change",
      whatCouldHappen: [
        "A person who relied on your old routine objects",
        "A standing commitment gets renegotiated",
      ],
      whyThis: [
        "Commitments change routines other people share",
        "Friction usually targets the change, not the choice",
      ],
      whatYouCanDo: [
        "Tell the people affected what is changing and why",
        "Protect one shared ritual that stays untouched",
      ],
      confidence: 50,
      timeframe: "months",
    },
    {
      title: "The Timeline Doubles",
      whatCouldHappen: [
        "What felt like a season becomes a year",
        "The original end date passes without a decision",
      ],
      whyThis: [
        "Situations resolve slower than decision-moments suggest",
        "No checkpoint exists to force a re-decision",
      ],
      whatYouCanDo: [
        "Set a date to formally reassess",
        "Write down what 'working' looks like now",
      ],
      confidence: 55,
      timeframe: "longer_term",
    },
    {
      title: "Someone Else's Decision Changes The Situation",
      whatCouldHappen: [
        "Another person's choice reshapes your options",
        "The situation changes before you fully commit",
      ],
      whyThis: [
        "Other people's timelines run alongside yours",
        "Open situations rarely stay open indefinitely",
      ],
      whatYouCanDo: [
        "Identify who else can change this situation",
        "Decide your response to their likely moves in advance",
      ],
      confidence: 40,
      timeframe: "weeks",
    },
  ];

  const opportunities: MockCard[] = [
    {
      title: "An Unplanned Option Lands In Your Lap",
      whatCouldHappen: [
        "Being visibly in motion attracts an offer or invitation",
        "A path you had not weighed becomes realistic",
      ],
      whyThis: [
        "Momentum surfaces doors deliberation never finds",
        "People bring options to those already moving",
      ],
      whatYouCanDo: [
        "Tell people what you are working toward",
        "Leave room to say yes to the unexpected",
      ],
      confidence: 35,
      timeframe: "months",
    },
    {
      title: "A Skill From This Path Opens A Second Door",
      whatCouldHappen: [
        "Something you learned here gets requested elsewhere",
        "A side use of the work becomes its own track",
      ],
      whyThis: [
        "New commitments build capabilities with uses beyond the goal",
        "You described this as more than a practical choice",
      ],
      whatYouCanDo: [
        "Note which parts of the work others ask about",
        "Share one piece of what you are learning publicly",
      ],
      confidence: 30,
      timeframe: "longer_term",
    },
  ];

  return toForecastOutput(risks, opportunities);
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
