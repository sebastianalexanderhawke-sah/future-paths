export type PathTextTransformationStatus =
  | "preserved"
  | "modified"
  | "truncated"
  | "appended"
  | "corrupted";

export type PathTextTransformationTrace = {
  original: string;
  afterRefinement: string;
  afterFormatting: string;
  final: string;
  status: PathTextTransformationStatus;
  preservedBypass?: boolean;
  flags: {
    modified: boolean;
    truncated: boolean;
    appended: boolean;
    preserved: boolean;
    corrupted: boolean;
    preservedBypass: boolean;
  };
};

export type PathTextFieldName = "explanation" | "benefit" | "consequence" | "futureYou";

export type PathTextFieldTrace = {
  field: PathTextFieldName;
  index?: number;
  label: string;
  trace: PathTextTransformationTrace;
};

export type PathTextTransformationPathAudit = {
  pathIndex: number;
  pathTitle: string;
  fields: PathTextFieldTrace[];
};

export type PathTextTransformationAudit = {
  paths: PathTextTransformationPathAudit[];
};

export type PathTextTransformationMetrics = {
  preservedFields: number;
  modifiedFields: number;
  corruptedFields: number;
  appendedFields: number;
  truncatedFields: number;
  bypassedRefinements: number;
  rewrittenRefinements: number;
  corruptedRefinements: number;
  totalFields: number;
  percentages: {
    preserved: number;
    modified: number;
    corrupted: number;
    appended: number;
    truncated: number;
    bypassedRefinements: number;
    rewrittenRefinements: number;
    corruptedRefinements: number;
  };
};

export type PathTextStageCapture = {
  afterRefinement: string;
  afterFormatting: string;
  preservedBypass?: boolean;
};

const APPEND_FRAGMENTS = [
  " and see how she responds",
  " and see what follows",
  " and commit to the next step",
  " and test what traction follows",
];

function normalizeComparableText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase().replace(/[^\w\s]/g, "");
}

function onlyPunctuationChanged(original: string, final: string): boolean {
  return (
    normalizeComparableText(original) === normalizeComparableText(final) &&
    original.trim() !== final.trim()
  );
}

function detectAppended(original: string, final: string): boolean {
  return APPEND_FRAGMENTS.some(
    (fragment) => final.includes(fragment) && !original.includes(fragment),
  );
}

function detectTruncated(original: string, afterRefinement: string, final: string): boolean {
  const normalizedOriginal = normalizeComparableText(original);
  const normalizedFinal = normalizeComparableText(final);
  const normalizedRefinement = normalizeComparableText(afterRefinement);

  if (!normalizedOriginal || !normalizedFinal) {
    return false;
  }

  if (normalizedFinal.length < normalizedOriginal.length * 0.85) {
    return true;
  }

  if (
    normalizedRefinement.length > 0 &&
    normalizedRefinement.length < normalizedOriginal.length * 0.9 &&
    normalizedOriginal.startsWith(normalizedRefinement.slice(0, Math.min(24, normalizedRefinement.length)))
  ) {
    return true;
  }

  return normalizedOriginal.includes(normalizedFinal) && normalizedOriginal !== normalizedFinal;
}

function detectSubjectStripped(original: string, final: string): boolean {
  const originalTrimmed = original.trim();
  const finalTrimmed = final.trim();

  if (!originalTrimmed || !finalTrimmed) {
    return false;
  }

  const originalLower = originalTrimmed.toLowerCase();
  const finalLower = finalTrimmed.toLowerCase();

  if (
    (originalLower.startsWith("you ") || originalLower.includes(" you ")) &&
    !finalLower.startsWith("you ") &&
    originalLower.endsWith(finalLower)
  ) {
    return true;
  }

  if (/^[a-z]/.test(finalTrimmed) && /^[A-Z]/.test(originalTrimmed)) {
    const strippedCandidate = originalTrimmed.replace(/^you may become someone who\s+/i, "").trim();
    if (normalizeComparableText(strippedCandidate) === normalizeComparableText(finalTrimmed)) {
      return true;
    }
  }

  return false;
}

export function buildPathTextTransformationTrace(
  original: string,
  afterRefinement: string,
  afterFormatting: string,
  final: string,
  preservedBypass = false,
): PathTextTransformationTrace {
  const normalizedOriginal = normalizeComparableText(original);
  const normalizedFinal = normalizeComparableText(final);
  const preserved =
    preservedBypass ||
    normalizedOriginal === normalizedFinal ||
    onlyPunctuationChanged(original, final);
  const appended = detectAppended(original, final);
  const truncated = detectTruncated(original, afterRefinement, final);
  const subjectStripped = detectSubjectStripped(original, final);
  const modified = !preserved && normalizedOriginal !== normalizedFinal;
  const corrupted = subjectStripped || (truncated && appended) || (appended && truncated);

  let status: PathTextTransformationStatus = "modified";
  if (preserved) {
    status = "preserved";
  } else if (corrupted) {
    status = "corrupted";
  } else if (appended) {
    status = "appended";
  } else if (truncated) {
    status = "truncated";
  }

  return {
    original,
    afterRefinement,
    afterFormatting,
    final,
    status,
    ...(preservedBypass ? { preservedBypass: true } : {}),
    flags: {
      modified,
      truncated,
      appended,
      preserved,
      corrupted,
      preservedBypass,
    },
  };
}

export function buildPathTextFieldLabel(field: PathTextFieldName, index?: number): string {
  if (field === "explanation") {
    return "Explanation";
  }

  if (field === "futureYou") {
    return "Future You";
  }

  if (field === "benefit") {
    return `Benefit #${(index ?? 0) + 1}`;
  }

  return `Consequence #${(index ?? 0) + 1}`;
}

export function computePathTextTransformationMetrics(
  audit: PathTextTransformationAudit,
): PathTextTransformationMetrics {
  const metrics = {
    preservedFields: 0,
    modifiedFields: 0,
    corruptedFields: 0,
    appendedFields: 0,
    truncatedFields: 0,
    bypassedRefinements: 0,
    rewrittenRefinements: 0,
    corruptedRefinements: 0,
    totalFields: 0,
  };

  for (const path of audit.paths) {
    for (const field of path.fields) {
      metrics.totalFields += 1;
      if (field.trace.flags.preserved) {
        metrics.preservedFields += 1;
      }
      if (field.trace.flags.modified) {
        metrics.modifiedFields += 1;
      }
      if (field.trace.flags.corrupted) {
        metrics.corruptedFields += 1;
        metrics.corruptedRefinements += 1;
      }
      if (field.trace.flags.appended) {
        metrics.appendedFields += 1;
      }
      if (field.trace.flags.truncated) {
        metrics.truncatedFields += 1;
      }
      if (field.trace.flags.preservedBypass) {
        metrics.bypassedRefinements += 1;
      } else if (field.trace.flags.modified && !field.trace.flags.corrupted) {
        metrics.rewrittenRefinements += 1;
      }
    }
  }

  const round = (count: number) =>
    metrics.totalFields === 0 ? 0 : Math.round((count / metrics.totalFields) * 100);

  return {
    ...metrics,
    percentages: {
      preserved: round(metrics.preservedFields),
      modified: round(metrics.modifiedFields),
      corrupted: round(metrics.corruptedFields),
      appended: round(metrics.appendedFields),
      truncated: round(metrics.truncatedFields),
      bypassedRefinements: round(metrics.bypassedRefinements),
      rewrittenRefinements: round(metrics.rewrittenRefinements),
      corruptedRefinements: round(metrics.corruptedRefinements),
    },
  };
}

export function createPathTextTransformationAudit(
  entries: Array<{
    pathIndex: number;
    pathTitle: string;
    fields: PathTextFieldTrace[];
  }>,
): PathTextTransformationAudit {
  return { paths: entries };
}
