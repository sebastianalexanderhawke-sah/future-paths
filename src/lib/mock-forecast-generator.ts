import type { Moment } from "@/types/database";
import type { ForecastOutput } from "@/lib/ai/schemas/forecast";

type ForecastPathContext = {
  title: string;
  description: string;
};

function buildWorkCrushForecast(selectedPathTitle?: string): ForecastOutput {
  const direct = /ask her out|direct approach|change the context/i.test(selectedPathTitle ?? "");

  return {
    active: direct
      ? [
          {
            title: "She Says Yes To Coffee",
            why: "A clear ask after daily rapport can turn into plans quickly.",
            impact: "You meet outside work within the week.",
          },
          {
            title: "She Says No But Stays Friendly",
            why: "A direct question can end uncertainty without ending contact.",
            impact: "Daily work stays workable even if the crush fades.",
          },
          {
            title: "Coworkers Learn About The Ask",
            why: "Workplace moments rarely stay fully private.",
            impact: "Small talk feels strained for a few weeks.",
          },
          {
            title: "The Friendship Deepens First",
            why: "More time together can build comfort before romance.",
            impact: "You talk every week but nothing romantic happens yet.",
          },
        ]
      : [
          {
            title: "You Keep Talking Every Week",
            why: "Daily shifts keep contact easy without a decisive move.",
            impact: "The friendship stays steady but nothing changes romantically.",
          },
          {
            title: "She Starts Texting Outside Work",
            why: "Comfort at work can spill into off-hours messages.",
            impact: "Contact moves beyond the office for the first time.",
          },
          {
            title: "A Team Event Creates Alone Time",
            why: "After-work plans or projects can create a private moment.",
            impact: "You finally talk outside the usual routine.",
          },
          {
            title: "Someone Else Makes A Move First",
            why: "Shared proximity puts others in the same position.",
            impact: "She starts spending breaks with someone else.",
          },
        ],
    hidden: [
      {
        title: "She Leaves The Company",
        why: "Job changes can remove the situation entirely.",
        impact: "The crush fades because daily contact disappears.",
      },
      {
        title: "The Timing Never Aligns",
        why: "Busy schedules can keep things polite but static.",
        impact: "Months pass without a clear moment to act.",
      },
      {
        title: "You Receive Mixed Signals",
        why: "Friendly behavior can be hard to read over time.",
        impact: "You hesitate longer than planned.",
      },
    ],
    blind_spots: [
      {
        title: "She Assumes You're Not Interested",
        why: "Platonic behavior can read as disinterest when she initiates often.",
        impact: "She stops looking for signs because the friendship feels settled.",
      },
      {
        title: "A Mutual Friend Changes The Dynamic",
        why: "Shared social ties can shift how you both act at work.",
        impact: "Group plans replace one-on-one contact.",
      },
      {
        title: "A One-On-One Opportunity Appears Naturally",
        why: "Shared projects or social plans can create private time.",
        impact: "You finally talk outside the usual work routine.",
      },
    ],
  };
}

function buildBusinessForecast(): ForecastOutput {
  return {
    active: [
      {
        title: "The First 10 Users Arrive",
        why: "Early outreach can convert faster than expected.",
        impact: "Real usage feedback arrives within weeks.",
      },
      {
        title: "Launch Slips By Several Months",
        why: "School, work, or scope can push the first release back.",
        impact: "The launch moves to nights and weekends.",
      },
      {
        title: "An Early User Becomes Your Biggest Advocate",
        why: "Strong believers sometimes spread the product organically.",
        impact: "One user introduces several others.",
      },
      {
        title: "The Product Solves A Different Problem Than Expected",
        why: "Real usage reveals a different pain point worth solving.",
        impact: "The MVP pivots after the first tests.",
      },
    ],
    hidden: [
      {
        title: "A Competitor Launches First",
        why: "Similar ideas often appear on overlapping timelines.",
        impact: "You rush differentiation before your own launch.",
      },
      {
        title: "A Job Offer Delays The Launch",
        why: "Income pressure can push the business behind employment.",
        impact: "Building becomes a side project for months.",
      },
      {
        title: "The Business Becomes A Side Project",
        why: "Split focus can shrink available build time.",
        impact: "Progress slows to weekends only.",
      },
    ],
    blind_spots: [
      {
        title: "Graduation Creates More Time Than Expected",
        why: "A major transition can open more focused build hours.",
        impact: "The project gets more attention after the transition.",
      },
      {
        title: "An Early User Wants To Help Build It",
        why: "Power users sometimes offer more than feedback.",
        impact: "A user becomes part of the build process.",
      },
      {
        title: "A Co-Founder Joins The Project",
        why: "Shared excitement can turn a supporter into a partner.",
        impact: "You split responsibilities and ship faster.",
      },
    ],
  };
}

function buildRelocationForecast(): ForecastOutput {
  return {
    active: [
      {
        title: "Most New Friendships Begin At Work",
        why: "A new job becomes the main place you meet people after a move.",
        impact: "Your social life starts revolving around colleagues.",
      },
      {
        title: "You Renew Your Lease After One Year",
        why: "A good fit can turn a trial move into a longer chapter.",
        impact: "What felt temporary starts to feel permanent.",
      },
      {
        title: "Homesickness Hits After The Move",
        why: "Novelty fades before new roots feel solid.",
        impact: "Visits home become more frequent than planned.",
      },
      {
        title: "The Job Lasts Longer Than Planned",
        why: "Promotion paths and local ties can extend the stay.",
        impact: "The move stops feeling temporary.",
      },
    ],
    hidden: [
      {
        title: "Visiting Home Gets More Expensive Than Expected",
        why: "Distance makes every trip cost more time and money.",
        impact: "You visit less often than you first imagined.",
      },
      {
        title: "The Role Ends Sooner Than Expected",
        why: "Fit issues or company changes can shorten the chapter.",
        impact: "You start looking again within the first year.",
      },
      {
        title: "Old Friendships Fade From Distance",
        why: "Less spontaneous contact makes some ties quieter.",
        impact: "Home starts to feel farther away emotionally.",
      },
    ],
    blind_spots: [
      {
        title: "The Job Matters Less Than The New Life You Build",
        why: "Daily routines outside the office can become the reason you stay.",
        impact: "Weekend plans matter more than the role itself.",
      },
      {
        title: "A Former Colleague Becomes A Close Friend",
        why: "Shared work history can accelerate trust in a new city.",
        impact: "One friendship anchors your social life.",
      },
      {
        title: "You Move Again Within Two Years",
        why: "A first relocation sometimes leads to a second opportunity.",
        impact: "The city becomes a stepping stone, not a destination.",
      },
    ],
  };
}

function buildGenericForecast(title: string): ForecastOutput {
  return {
    active: [
      {
        title: "The Situation Resolves Within Months",
        why: "Action or time can bring the decision to a head.",
        impact: "You know where things stand by the end of the season.",
      },
      {
        title: "New Information Changes The Choice",
        why: "Details often emerge once you move forward.",
        impact: "You adjust plans based on what you learn.",
      },
      {
        title: "An Outside Opportunity Appears",
        why: "New options often show up once a decision is in motion.",
        impact: "A path you had not weighed becomes realistic.",
      },
      {
        title: "The Decision Takes Longer Than Expected",
        why: "Important choices often echo longer than planned.",
        impact: "The choice keeps shaping life after the first month.",
      },
    ],
    hidden: [
      {
        title: "Someone Else Acts First",
        why: "Other people involved may move before you do.",
        impact: "The situation changes before you commit.",
      },
      {
        title: "The Opportunity Passes",
        why: "Windows can close if the decision waits too long.",
        impact: "You choose stability over the original option.",
      },
      {
        title: "A Small Detail Becomes Central",
        why: "Minor context can drive the real outcome.",
        impact: "The future turns on something that seemed secondary.",
      },
    ],
    blind_spots: [
      {
        title: "A Relationship Shifts Because Of Timing",
        why: "Schedules and life changes can alter how people respond.",
        impact: "The same choice lands differently than expected.",
      },
      {
        title: "An Unexpected Setback Appears",
        why: "Real life rarely follows the first plan cleanly.",
        impact: "You pause, adjust, and try again.",
      },
      {
        title: "The Outcome Matters Less Over Time",
        why: "Daily routines can reduce the weight of one decision.",
        impact: "Other priorities start competing for attention.",
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
