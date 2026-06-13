import { describe, expect, it } from "vitest";

import { parseCrossroadOutput } from "@/lib/ai/schemas/crossroad";

describe("crossroad schema", () => {
  it("requires native titles on every generated path", () => {
    const parsed = parseCrossroadOutput({
      current_understanding: "You are deciding how to approach someone at work.",
      paths: [
        {
          title: "Ask Her Out",
          description: "Be direct after work and ask her on a date.",
          benefits: ["She may say yes.", "You stop wondering."],
          consequences: ["She may say no.", "Work may feel awkward."],
          future_shift: "More willing to make direct moves when interest is clear.",
          themes: ["Courage"],
        },
        {
          title: "Friendship First",
          description: "Stay friendly and build rapport before any romantic move.",
          benefits: ["Trust grows naturally.", "You learn her interests."],
          consequences: ["Romance may never emerge.", "She may see you as a friend."],
          future_shift: "More patient when building connection before risk.",
          themes: ["Connection"],
        },
        {
          title: "Keep It Professional",
          description: "Keep interactions strictly work-focused.",
          benefits: ["No workplace awkwardness.", "Your reputation stays clean."],
          consequences: ["The crush may linger.", "Nothing changes romantically."],
          future_shift: "More disciplined about separating work and personal interest.",
          themes: ["Stability"],
        },
        {
          title: "Message Her Outside Work",
          description: "Start texting outside the office to shift the dynamic.",
          benefits: ["You create private space.", "Tone can become more personal."],
          consequences: ["She may keep it platonic.", "Coworkers may notice changes."],
          future_shift: "More comfortable initiating contact outside formal settings.",
          themes: ["Curiosity"],
        },
        {
          title: "Move On",
          description: "Redirect your energy elsewhere and stop pursuing this.",
          benefits: ["Emotional energy frees up.", "Work stays simpler."],
          consequences: ["You may wonder what if.", "The attraction may fade slowly."],
          future_shift: "More willing to release unavailable options.",
          themes: ["Independence"],
        },
      ],
    });

    expect(parsed.paths).toHaveLength(5);
    expect(parsed.paths.map((path) => path.title)).toContain("Ask Her Out");
  });

  it("accepts imperfect native titles without failing generation", () => {
    const parsed = parseCrossroadOutput({
      current_understanding: "You are deciding how to approach someone at work.",
      paths: [
        {
          title: "Tell Her Directly And Honestly That",
          description: "Be direct after work.",
          benefits: ["She may say yes.", "You stop wondering."],
          consequences: ["She may say no.", "Work may feel awkward."],
          future_shift: "More willing to make direct moves when interest is clear.",
          themes: ["Courage"],
        },
        {
          title: "Friendship First",
          description: "Stay friendly and build rapport.",
          benefits: ["Trust grows naturally.", "You learn her interests."],
          consequences: ["Romance may never emerge.", "She may see you as a friend."],
          future_shift: "More patient when building connection before risk.",
          themes: ["Connection"],
        },
        {
          title: "Keep It Professional",
          description: "Keep interactions work-focused.",
          benefits: ["No workplace awkwardness.", "Your reputation stays clean."],
          consequences: ["The crush may linger.", "Nothing changes romantically."],
          future_shift: "More disciplined about separating work and personal interest.",
          themes: ["Stability"],
        },
        {
          title: "Message Her Outside Work",
          description: "Start texting outside the office.",
          benefits: ["You create private space.", "Tone can become more personal."],
          consequences: ["She may keep it platonic.", "Coworkers may notice changes."],
          future_shift: "More comfortable initiating contact outside formal settings.",
          themes: ["Curiosity"],
        },
        {
          title: "Move On",
          description: "Redirect your energy elsewhere.",
          benefits: ["Emotional energy frees up.", "Work stays simpler."],
          consequences: ["You may wonder what if.", "The attraction may fade slowly."],
          future_shift: "More willing to release unavailable options.",
          themes: ["Independence"],
        },
      ],
    });

    expect(parsed.paths[0]?.title).toBe("Tell Her Directly And Honestly That");
  });
});
