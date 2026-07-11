import { describe, expect, it } from "vitest";

import { assignPathThemeLabels } from "@/components/home/path-theme-labels";
import type { ThemeName } from "@/types/enums";

describe("assignPathThemeLabels", () => {
  it("gives every path a label from its own themes", () => {
    const labels = assignPathThemeLabels([
      ["Growth", "Courage"],
      ["Stability"],
      ["Growth"],
      ["Independence", "Stability"],
      ["Courage", "Growth"],
    ]);

    expect(labels).toEqual(["Growth", "Stability", "Growth", "Stability", "Growth"]);
  });

  it("always labels every themed path, even when clustering cannot reach three labels", () => {
    const labels = assignPathThemeLabels([
      ["Growth"],
      ["Stability"],
      ["Courage"],
      ["Independence"],
      ["Curiosity"],
    ]);

    // Themes are part of each path's identity: no themed path is ever blank.
    // With zero overlap the cluster cap cannot help, so each path falls back
    // to its own leading theme.
    expect(labels).toEqual(["Growth", "Stability", "Courage", "Independence", "Curiosity"]);
  });

  it("clusters to at most three labels whenever the paths' themes allow it", () => {
    const labels = assignPathThemeLabels([
      ["Growth", "Courage"],
      ["Stability", "Courage"],
      ["Courage"],
      ["Independence", "Growth"],
      ["Curiosity", "Stability"],
    ]);

    expect(labels.every((label) => label !== null)).toBe(true);
    expect(new Set(labels).size).toBeLessThanOrEqual(3);
  });

  it("prefers themes shared across paths so the labels organize the set", () => {
    const labels = assignPathThemeLabels([
      ["Courage", "Connection"],
      ["Connection", "Growth"],
      ["Connection"],
      ["Reflection", "Connection"],
    ]);

    expect(labels).toEqual(["Connection", "Connection", "Connection", "Connection"]);
  });

  it("breaks frequency ties by reading order", () => {
    const labels = assignPathThemeLabels([["Belonging"], ["Leadership"]]);

    expect(labels).toEqual(["Belonging", "Leadership"]);
  });

  it("returns null for paths without themes", () => {
    const labels = assignPathThemeLabels([[], ["Growth"], []]);

    expect(labels).toEqual([null, "Growth", null]);
  });

  it("handles an empty set", () => {
    expect(assignPathThemeLabels([] as ThemeName[][])).toEqual([]);
  });
});
