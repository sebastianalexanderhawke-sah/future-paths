// Phase C/D — theme labels for the possible-futures list.
//
// Each path already carries 1-3 approved themes (persisted, generation
// untouched). The list shows ONE theme per path as secondary context above
// the title. Themes are part of a path's identity, so every path with themes
// always gets a label (Phase D); the greedy clustering below still steers
// the set toward at most three distinct labels so the themes organize the
// futures instead of competing with them.
//
// Greedy cover: repeatedly pick the theme shared by the most still-unlabeled
// paths (ties go to the theme seen earliest in reading order), stopping at
// three themes. A path whose themes never make the cut falls back to its own
// leading theme — a label it genuinely has beats a blank, and beats a theme
// borrowed from another path. Only a path with no themes at all stays
// unlabeled.

import type { ThemeName } from "@/types/enums";

export const MAX_DISTINCT_THEME_LABELS = 3;

export function assignPathThemeLabels(
  pathThemes: readonly (readonly ThemeName[])[],
): (ThemeName | null)[] {
  const labels: (ThemeName | null)[] = pathThemes.map(() => null);

  // Reading-order rank for deterministic tie-breaking.
  const firstSeen = new Map<ThemeName, number>();
  for (const themes of pathThemes) {
    for (const theme of themes) {
      if (!firstSeen.has(theme)) {
        firstSeen.set(theme, firstSeen.size);
      }
    }
  }

  for (let round = 0; round < MAX_DISTINCT_THEME_LABELS; round += 1) {
    const counts = new Map<ThemeName, number>();
    pathThemes.forEach((themes, index) => {
      if (labels[index] !== null) {
        return;
      }
      for (const theme of new Set(themes)) {
        counts.set(theme, (counts.get(theme) ?? 0) + 1);
      }
    });

    let best: ThemeName | null = null;
    for (const [theme, count] of counts) {
      if (
        best === null ||
        count > counts.get(best)! ||
        (count === counts.get(best)! && firstSeen.get(theme)! < firstSeen.get(best)!)
      ) {
        best = theme;
      }
    }

    if (best === null) {
      break;
    }

    pathThemes.forEach((themes, index) => {
      if (labels[index] === null && themes.includes(best)) {
        labels[index] = best;
      }
    });
  }

  // Phase D: every path shows its theme identity. Paths the three-label
  // cluster could not cover fall back to their own leading theme.
  pathThemes.forEach((themes, index) => {
    if (labels[index] === null && themes.length > 0) {
      labels[index] = themes[0];
    }
  });

  return labels;
}
