export type ForecastSlotIntegrityItem = {
  raw: string;
  survived: boolean;
  finalSlot: number | null;
  replaced: boolean;
  replacedBy?: string;
};

export type ForecastSectionIntegrity = {
  rawCount: number;
  survivedCount: number;
  displayedCount: number;
  replacements: number;
  recoveryAdds: number;
  fallbackAdds: number;
  integrityScore: number;
  slots: ForecastSlotIntegrityItem[];
};

export type ForecastIntegrityAudit = {
  active: ForecastSectionIntegrity;
  hidden: ForecastSectionIntegrity;
  blind_spots: ForecastSectionIntegrity;
};

export type SlotFillAuditEntry = {
  raw: string;
  survived: boolean;
  displayedTitle: string | null;
  source: "survivor" | "recovery" | "fallback" | "none";
};

export function buildForecastSectionIntegrity(
  entries: SlotFillAuditEntry[],
  recoveryAdds: number,
  fallbackAdds: number,
): ForecastSectionIntegrity {
  const slots: ForecastSlotIntegrityItem[] = entries.map((entry, index) => {
    const rewrittenSurvivor =
      entry.survived &&
      entry.displayedTitle !== null &&
      entry.source === "survivor" &&
      entry.displayedTitle.trim().toLowerCase() !== entry.raw.trim().toLowerCase();
    const replaced =
      rewrittenSurvivor ||
      (entry.survived && entry.displayedTitle !== null && entry.source !== "survivor");

    return {
      raw: entry.raw,
      survived: entry.survived,
      finalSlot: entry.displayedTitle ? index + 1 : null,
      replaced,
      ...(replaced && entry.displayedTitle ? { replacedBy: entry.displayedTitle } : {}),
    };
  });

  const rawCount = entries.length;
  const survivedCount = entries.filter((entry) => entry.survived).length;
  const displayedCount = entries.filter((entry) => entry.displayedTitle).length;
  const replacements = slots.filter((slot) => slot.replaced).length;
  const unchangedSurvivors = entries.filter(
    (entry) => entry.survived && entry.source === "survivor" && entry.displayedTitle !== null,
  ).length;
  const integrityScore =
    survivedCount === 0 ? 1 : unchangedSurvivors / survivedCount;

  return {
    rawCount,
    survivedCount,
    displayedCount,
    replacements,
    recoveryAdds,
    fallbackAdds,
    integrityScore,
    slots,
  };
}

export function formatIntegrityScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}
