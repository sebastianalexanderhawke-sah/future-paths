import { assignUniquePathTitles } from "@/components/home/path-titles";
import { formatScannablePath, type ScannablePath } from "@/components/home/output-refinement";
import type { Path } from "@/types/database";

export function formatDecisionPaths(paths: Path[], situationTitle = ""): ScannablePath[] {
  const titles = assignUniquePathTitles(paths, situationTitle);

  return paths.map((path, index) => formatScannablePath(path, index, titles[index]));
}

export type SelectedPathContext = {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  consequences: string[];
  future_shift: string;
  themes: Path["themes"];
};

export function buildSelectedPathSummary(path: SelectedPathContext): string {
  return [
    `Selected path: ${path.title}`,
    `Summary: ${path.description}`,
    "Potential outcomes:",
    ...path.benefits.map((benefit) => `- ${benefit}`),
    ...path.consequences.map((consequence) => `- ${consequence}`),
    `Future you: ${path.future_shift}`,
  ].join("\n");
}
