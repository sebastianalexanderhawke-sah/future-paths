export type FutureShiftPreservationStatus = "preserved" | "rewritten" | "fallback";

export type FutureShiftValidationResult = {
  valid: boolean;
  reason?: "empty" | "fragment" | "too-long" | "incomplete" | "invalid" | "reflection-language" | "safety";
};

export type FutureShiftAuditItem = {
  pathIndex: number;
  pathTitle: string;
  rawFutureShift: string;
  validationResult: FutureShiftValidationResult;
  displayedFutureShift: string;
  status: FutureShiftPreservationStatus;
};

export type FutureShiftPreservationAudit = {
  paths: FutureShiftAuditItem[];
};

export type FutureShiftPreservationMetrics = {
  preservedFutureShifts: number;
  rewrittenFutureShifts: number;
  fallbackFutureShifts: number;
  totalFutureShifts: number;
  percentages: {
    preservedFutureShifts: number;
    rewrittenFutureShifts: number;
    fallbackFutureShifts: number;
  };
};

export function createFutureShiftPreservationAudit(
  items: FutureShiftAuditItem[],
): FutureShiftPreservationAudit {
  return { paths: items };
}

export function computeFutureShiftPreservationMetrics(
  audit: FutureShiftPreservationAudit,
): FutureShiftPreservationMetrics {
  const metrics = {
    preservedFutureShifts: 0,
    rewrittenFutureShifts: 0,
    fallbackFutureShifts: 0,
    totalFutureShifts: audit.paths.length,
  };

  for (const item of audit.paths) {
    if (item.status === "preserved") {
      metrics.preservedFutureShifts += 1;
    } else if (item.status === "rewritten") {
      metrics.rewrittenFutureShifts += 1;
    } else {
      metrics.fallbackFutureShifts += 1;
    }
  }

  const round = (count: number) =>
    metrics.totalFutureShifts === 0
      ? 0
      : Math.round((count / metrics.totalFutureShifts) * 100);

  return {
    ...metrics,
    percentages: {
      preservedFutureShifts: round(metrics.preservedFutureShifts),
      rewrittenFutureShifts: round(metrics.rewrittenFutureShifts),
      fallbackFutureShifts: round(metrics.fallbackFutureShifts),
    },
  };
}

export function buildFutureShiftAuditItem(input: {
  pathIndex: number;
  pathTitle: string;
  rawFutureShift: string;
  validationResult: FutureShiftValidationResult;
  displayedFutureShift: string;
  status: FutureShiftPreservationStatus;
}): FutureShiftAuditItem {
  return {
    pathIndex: input.pathIndex,
    pathTitle: input.pathTitle,
    rawFutureShift: input.rawFutureShift,
    validationResult: input.validationResult,
    displayedFutureShift: input.displayedFutureShift,
    status: input.status,
  };
}
