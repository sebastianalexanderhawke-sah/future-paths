"use client";

import { useState } from "react";
import Link from "next/link";

import { DecisionSimulatorAuditPanel } from "@/components/home/ai-audit-panel";
import { formatDecisionPathsWithTrace } from "@/components/home/decision-simulator-utils";
import {
  compressCurrentUnderstanding,
  toFirstSentence,
  type ScannablePath,
} from "@/components/home/output-refinement";
import { Button } from "@/components/ui/button";
import { CardShell } from "@/components/ui/card-shell";
import { ThemeChip } from "@/components/ui/theme-chip";
import { toProcessedPathAudit, type DecisionSimulatorAudit } from "@/lib/ai-audit";
import { computePathTextTransformationMetrics } from "@/lib/path-text-transformation-trace";
import { computeFutureShiftPreservationMetrics } from "@/lib/future-shift-preservation";
import type { Path } from "@/types/database";

type DecisionSimulatorResultProps = {
  situationTitle: string;
  currentUnderstanding: string;
  momentId: string;
  paths: Path[];
  audit?: DecisionSimulatorAudit;
  selectedPathId: string | null;
  onSelectPath: (pathId: string) => void;
  /** Advances the flow from the chosen path. When provided, the selected
   *  path's action becomes a primary "Continue →" instead of a static
   *  selected marker — choosing should feel like moving forward. */
  onContinue?: () => void;
  isSelectingPath?: boolean;
  showForecastBridge?: boolean;
  onForecastSelectedPath?: () => void;
  isForecastPending?: boolean;
  forecastBridgeError?: string | null;
};

type PathRowProps = {
  path: ScannablePath;
  rawPath: Path;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: (pathId: string) => void;
  onSelectPath: (pathId: string) => void;
  onContinue?: () => void;
  isSelectingPath?: boolean;
};

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-1 flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-body-small text-ink-secondary">
          <span aria-hidden="true" className="text-ink-tertiary">
            •
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// One possible future as a DESTINATION CARD — the same elevated surface,
// radius, and hover lift as the Future Forecast cards, so paths and
// forecasts read as chapters of one story. Collapsed, the card is wide and
// shallow (serif title → theme chips → one-sentence hook) for side-scanning
// five futures; expanded, it spreads across the width instead of growing
// tall. The chips are the path's own persisted themes (up to three,
// generation untouched): the emotional character of that future.
function PathRow({
  path,
  rawPath,
  isSelected,
  isExpanded,
  onToggleExpand,
  onSelectPath,
  onContinue,
  isSelectingPath = false,
}: PathRowProps) {
  // The collapsed line is the first sentence of the explanation — the "why
  // this future is different" hook. The full explanation only reappears in
  // the expanded body when it actually says more than the hook.
  const summary = toFirstSentence(path.explanation);
  const explanationAddsMore = path.explanation.trim() !== summary;
  const panelId = `path-panel-${rawPath.id}`;
  const themes = (rawPath.themes ?? []).slice(0, 3);

  return (
    <CardShell
      variant="elevated"
      className={isSelected ? "ring-1 ring-[var(--state-strengthened)]/30" : ""}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={() => onToggleExpand(rawPath.id)}
        className="flex w-full cursor-pointer items-center gap-4 rounded-[var(--radius-card)] px-7 py-5 text-left"
      >
        <div className="min-w-0 flex-1">
          {isSelected ? (
            <p className="mb-1 text-label text-[var(--state-strengthened)]">
              ✓ Selected
            </p>
          ) : null}
          <h4 className="font-voice text-[19px] font-medium leading-[1.3] tracking-[-0.01em] text-ink-primary">
            {path.title}
          </h4>
          {themes.length > 0 ? (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {themes.map((theme) => (
                <ThemeChip
                  key={theme}
                  theme={theme}
                  showDot={false}
                  className="shadow-[0_1px_2px_rgba(17,17,17,0.06)]"
                />
              ))}
            </span>
          ) : null}
          <p className="mt-2 max-w-[60em] text-body-small text-ink-secondary">{summary}</p>
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={`h-4 w-4 shrink-0 text-ink-tertiary transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-6 px-7 pb-7 pt-1">
            {explanationAddsMore ? (
              <p className="max-w-[60em] text-body-small text-ink-secondary">
                {path.explanation}
              </p>
            ) : null}

            {/* Benefits and trade-offs read side by side — the trade-off IS
                the comparison, and pairing the columns keeps the expanded
                future wide and balanced instead of tall. */}
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-12">
              <div>
                <p className="text-label text-[var(--state-strengthened)]">Benefits</p>
                <BulletList items={path.benefits} />
              </div>

              <div>
                <p className="text-label text-[var(--state-contradiction-detected)]">Trade-offs</p>
                <BulletList items={path.consequences} />
              </div>
            </div>

            <div className="rounded-[var(--radius-whisper)] bg-[var(--surface-muted)] px-5 py-4">
              <p className="text-label text-ink-tertiary">Future you</p>
              <p className="mt-1 max-w-[60em] text-body-small text-ink-primary">{path.futureYou}</p>
            </div>

            {path.expansion ? (
              <details className="text-body-small text-ink-secondary">
                <summary className="cursor-pointer text-ink-tertiary hover:text-ink-secondary">
                  View full reasoning
                </summary>
                <div className="mt-2 flex flex-col gap-2 border-t border-[var(--ink-tertiary)]/10 pt-2">
                  <p>{path.expansion.description}</p>
                  <p>{path.expansion.futureShift}</p>
                </div>
              </details>
            ) : null}

            {/* Choosing is progressing: once a path is selected its card
                confirms quietly (✓ Selected) and the black primary button
                becomes Continue — the decision immediately points forward. */}
            <div className="flex items-center gap-4">
              {isSelected ? (
                <>
                  <span className="text-body-small font-medium text-[var(--state-strengthened)]">
                    ✓ Selected
                  </span>
                  {onContinue ? (
                    <Button type="button" onClick={onContinue}>
                      Continue →
                    </Button>
                  ) : null}
                </>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSelectingPath}
                  onClick={() => onSelectPath(rawPath.id)}
                >
                  Choose This Path
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

export function DecisionSimulatorResultView({
  situationTitle,
  currentUnderstanding,
  momentId,
  paths,
  audit,
  selectedPathId,
  onSelectPath,
  onContinue,
  isSelectingPath = false,
  showForecastBridge = false,
  onForecastSelectedPath,
  isForecastPending = false,
  forecastBridgeError = null,
}: DecisionSimulatorResultProps) {
  // One future open at a time: expanding a path collapses the previous one,
  // so the page reads as a scan-first list of alternate futures instead of a
  // wall of parallel reports.
  const [expandedPathId, setExpandedPathId] = useState<string | null>(null);
  const { paths: scannablePaths, traces: pathTitleTraces, textTransformationAudit, futureShiftAudit } =
    formatDecisionPathsWithTrace(paths, situationTitle);
  const selectedPath = paths.find((path) => path.id === selectedPathId);
  const selectedScannablePath = scannablePaths.find(
    (_, index) => paths[index]?.id === selectedPathId,
  );

  return (
    <section>
      {/* Editorial introduction — the situation as a readable opening, not
          another boxed panel. The page's single surface is the card the
          entry flow already lives on. */}
      <header>
        <p className="text-label text-ink-tertiary">The situation</p>
        <h3 className="mt-2 text-h1 text-ink-primary">{situationTitle}</h3>
        <p className="mt-3 max-w-[46em] text-body text-ink-secondary">
          {compressCurrentUnderstanding(currentUnderstanding)}
        </p>
      </header>

      <div className="mt-8">
        <p className="text-label text-ink-tertiary">Possible futures</p>
        <div className="mt-3 flex flex-col gap-3">
          {scannablePaths.map((path, index) => (
            <PathRow
              key={paths[index]?.id ?? `${path.title}-${index}`}
              path={path}
              rawPath={paths[index]!}
              isSelected={paths[index]?.id === selectedPathId}
              isExpanded={paths[index]?.id === expandedPathId}
              onToggleExpand={(pathId) =>
                setExpandedPathId((current) => (current === pathId ? null : pathId))
              }
              onSelectPath={onSelectPath}
              onContinue={onContinue}
              isSelectingPath={isSelectingPath}
            />
          ))}
        </div>

        {/* The forward action lives inside the expanded chosen row. If the
            user collapses that row, keep exactly one Continue visible so a
            made decision never loses its next step. */}
        {onContinue && selectedPath && expandedPathId !== selectedPathId ? (
          <div className="mt-6">
            <Button type="button" onClick={onContinue}>
              Continue →
            </Button>
          </div>
        ) : null}
      </div>

      {showForecastBridge && selectedPath && selectedScannablePath ? (
        <div className="mt-8 border-t border-[var(--ink-tertiary)]/10 pt-6">
          <p className="text-label text-[var(--state-emerging)]">Forecast this path</p>
          <p className="mt-2 text-body text-ink-secondary">
            See what may happen if this path becomes reality.
          </p>
          {forecastBridgeError ? (
            <p className="mt-3 text-body-small text-[var(--state-contradiction-detected)]">
              {forecastBridgeError}
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            className="mt-4"
            disabled={isForecastPending}
            onClick={onForecastSelectedPath}
          >
            {isForecastPending ? "Generating forecast…" : "Forecast This Future"}
          </Button>
        </div>
      ) : null}

      <Link
        href={`/moments/${momentId}`}
        className="mt-8 inline-block text-body-small text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
      >
        View full situation
      </Link>

      {audit ? (
        <div className="mt-8 border-t border-[var(--ink-tertiary)]/10 pt-6">
          <DecisionSimulatorAuditPanel
            rawPaths={audit.rawPaths}
            processedPaths={scannablePaths.map(toProcessedPathAudit)}
            pathTitleTraces={pathTitleTraces}
            textTransformationAudit={
              textTransformationAudit ?? audit.textTransformationAudit
            }
            textTransformationMetrics={
              textTransformationAudit
                ? computePathTextTransformationMetrics(textTransformationAudit)
                : audit.textTransformationMetrics
            }
            futureShiftAudit={futureShiftAudit ?? audit.futureShiftAudit}
            futureShiftMetrics={
              futureShiftAudit
                ? computeFutureShiftPreservationMetrics(futureShiftAudit)
                : audit.futureShiftMetrics
            }
          />
        </div>
      ) : null}
    </section>
  );
}
