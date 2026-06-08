import type { CheckIn, Moment, Path, ThemeChange } from "@/types/database";
import type { ThemeName } from "@/types/enums";

export type MockCheckInResult = {
  reality_summary: string;
  theme_changes: ThemeChange[];
  identity_impact: string;
};

export function generateMockCheckIn(input: {
  moment: Pick<Moment, "title" | "description">;
  path: Pick<Path, "description" | "themes" | "future_shift">;
  reflection: string;
}): MockCheckInResult {
  const { moment, path, reflection } = input;
  const reflectionSnippet = reflection.trim().slice(0, 160);

  const primaryTheme = path.themes[0] ?? ("Reflection" as ThemeName);
  const secondaryTheme = path.themes[1] ?? ("Growth" as ThemeName);

  const theme_changes: ThemeChange[] = [
    { theme: primaryTheme, direction: "strengthened" },
    { theme: secondaryTheme, direction: "emerging" },
  ];

  const reality_summary = moment.description
    ? `Regarding "${moment.title}", you noted: "${reflectionSnippet}". What happened may reflect how your choice to ${path.description.toLowerCase()} is unfolding in real life.`
    : `Regarding "${moment.title}", you noted: "${reflectionSnippet}". What happened may reflect how your chosen direction is unfolding in real life.`;

  const identity_impact = `This check-in may suggest movement toward ${path.future_shift.toLowerCase()} The theme of ${primaryTheme} appears especially present in what you shared.`;

  return {
    reality_summary,
    theme_changes,
    identity_impact,
  };
}
