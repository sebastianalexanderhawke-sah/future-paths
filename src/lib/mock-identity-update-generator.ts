import type { CheckIn, Moment } from "@/types/database";
import type { IdentityUpdateType, ThemeName } from "@/types/enums";

export type MockIdentityUpdateDraft = {
  update_type: IdentityUpdateType;
  title: string;
  summary: string;
  themes: ThemeName[];
};

export function generateMockIdentityUpdate(input: {
  moment: Pick<Moment, "title">;
  checkIn: Pick<CheckIn, "theme_changes" | "identity_impact">;
  priorCheckIns: Pick<CheckIn, "theme_changes">[];
}): MockIdentityUpdateDraft | null {
  const { moment, checkIn, priorCheckIns } = input;

  if (priorCheckIns.length === 0) {
    return {
      update_type: "reality_shift",
      title: "Intention meets reality",
      summary: `Your first check-in on "${moment.title}" may mark where prediction begins meeting outcome. ${checkIn.identity_impact}`,
      themes: checkIn.theme_changes.map((change) => change.theme).slice(0, 2),
    };
  }

  const priorThemes = new Set(
    priorCheckIns.flatMap((entry) =>
      entry.theme_changes.map((change) => change.theme),
    ),
  );

  const strengthenedNow = checkIn.theme_changes.filter(
    (change) => change.direction === "strengthened",
  );

  for (const change of strengthenedNow) {
    if (priorThemes.has(change.theme)) {
      return {
        update_type: "pattern_strengthened",
        title: `${change.theme} may be strengthening`,
        summary: `Across your check-ins on "${moment.title}", the theme of ${change.theme} may be recurring with greater weight.`,
        themes: [change.theme],
      };
    }
  }

  const emergingNow = checkIn.theme_changes.filter(
    (change) => change.direction === "emerging",
  );

  for (const change of emergingNow) {
    if (!priorThemes.has(change.theme)) {
      return {
        update_type: "theme_emerging",
        title: `${change.theme} may be emerging`,
        summary: `Your latest check-in on "${moment.title}" may suggest ${change.theme} is becoming more present in how this path unfolds.`,
        themes: [change.theme],
      };
    }
  }

  return null;
}
