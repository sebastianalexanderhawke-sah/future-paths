import { assignUniquePathTitlesWithTrace, toPathTitleInput } from "@/components/home/path-titles";
import {
  buildPathTextTransformationPathAudit,
  formatScannablePath,
  formatScannablePathWithTrace,
  type ScannablePath,
} from "@/components/home/output-refinement";
import { isAiAuditEnabled } from "@/lib/ai-audit";
import { createPathTextTransformationAudit } from "@/lib/path-text-transformation-trace";
import type { Path } from "@/types/database";

export function formatDecisionPaths(paths: Path[], situationTitle = ""): ScannablePath[] {
  return formatDecisionPathsWithTrace(paths, situationTitle).paths;
}

export function formatDecisionPathsWithTrace(paths: Path[], situationTitle = "") {
  const { titles, traces } = assignUniquePathTitlesWithTrace(paths, situationTitle);
  const collectTextTrace = isAiAuditEnabled();
  const formatted = paths.map((path, index) =>
    collectTextTrace
      ? formatScannablePathWithTrace(path, index, titles[index])
      : { path: formatScannablePath(path, index, titles[index]), textTraces: [] },
  );

  return {
    paths: formatted.map((entry) => entry.path),
    traces,
    textTransformationAudit: collectTextTrace
      ? createPathTextTransformationAudit(
          formatted.map((entry, index) =>
            buildPathTextTransformationPathAudit(
              index,
              entry.path.title,
              entry.textTraces,
            ),
          ),
        )
      : undefined,
  };
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
  const { description } = toPathTitleInput(path);

  return [
    `Selected path: ${path.title}`,
    `Summary: ${description}`,
    "Potential outcomes:",
    ...path.benefits.map((benefit) => `- ${benefit}`),
    ...path.consequences.map((consequence) => `- ${consequence}`),
    `Future you: ${path.future_shift}`,
  ].join("\n");
}
