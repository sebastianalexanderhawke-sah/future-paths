import Link from "next/link";

import { DecisionSimulatorAuditPanel } from "@/components/home/ai-audit-panel";
import { formatDecisionPathsWithTrace } from "@/components/home/decision-simulator-utils";
import { compressCurrentUnderstanding, type ScannablePath } from "@/components/home/output-refinement";
import { Button } from "@/components/ui/button";
import { CardShell } from "@/components/ui/card-shell";
import { toProcessedPathAudit, type DecisionSimulatorAudit } from "@/lib/ai-audit";
import { computePathTextTransformationMetrics } from "@/lib/path-text-transformation-trace";
import type { Path } from "@/types/database";

type DecisionSimulatorResultProps = {
  situationTitle: string;
  currentUnderstanding: string;
  momentId: string;
  paths: Path[];
  audit?: DecisionSimulatorAudit;
  selectedPathId: string | null;
  onSelectPath: (pathId: string) => void;
  isSelectingPath?: boolean;
  showForecastBridge?: boolean;
  onForecastSelectedPath?: () => void;
  isForecastPending?: boolean;
  forecastBridgeError?: string | null;
};

type ScannablePathCardProps = {
  path: ScannablePath;
  rawPath: Path;
  index: number;
  isSelected: boolean;
  onSelectPath: (pathId: string) => void;
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

function ScannablePathCard({
  path,
  rawPath,
  index,
  isSelected,
  onSelectPath,
  isSelectingPath = false,
}: ScannablePathCardProps) {
  return (
    <CardShell
      variant="elevated"
      className={`flex flex-col p-4 sm:p-5 ${
        isSelected ? "ring-2 ring-[var(--action-fill)]" : ""
      }`}
    >
      <p className="text-label text-ink-tertiary">Path {index + 1}</p>
      <h4 className="mt-1 text-h2 text-ink-primary">{path.title}</h4>

      <div className="mt-3 flex flex-col gap-4">
        <div>
          <p className="text-label text-ink-tertiary">Explanation</p>
          <p className="mt-1 text-body-small text-ink-secondary">{path.explanation}</p>
        </div>

        <div>
          <p className="text-label text-[var(--state-strengthened)]">Benefits</p>
          <BulletList items={path.benefits} />
        </div>

        <div>
          <p className="text-label text-[var(--state-contradiction-detected)]">Consequences</p>
          <BulletList items={path.consequences} />
        </div>

        <div className="rounded-[var(--radius-whisper)] bg-[var(--surface-muted)] px-3 py-2.5">
          <p className="text-label text-ink-tertiary">Future you</p>
          <p className="mt-1 text-body-small text-ink-primary">{path.futureYou}</p>
        </div>
      </div>

      {path.expansion ? (
        <details className="mt-3 text-body-small text-ink-secondary">
          <summary className="cursor-pointer text-ink-tertiary hover:text-ink-secondary">
            View full reasoning
          </summary>
          <div className="mt-2 flex flex-col gap-2 border-t border-[var(--ink-tertiary)]/10 pt-2">
            <p>{path.expansion.description}</p>
            <p>{path.expansion.futureShift}</p>
          </div>
        </details>
      ) : null}

      <div className="mt-4">
        {isSelected ? (
          <p className="text-body-small font-medium text-[var(--state-strengthened)]">
            Selected path
          </p>
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
  isSelectingPath = false,
  showForecastBridge = false,
  onForecastSelectedPath,
  isForecastPending = false,
  forecastBridgeError = null,
}: DecisionSimulatorResultProps) {
  const { paths: scannablePaths, traces: pathTitleTraces, textTransformationAudit } =
    formatDecisionPathsWithTrace(paths, situationTitle);
  const selectedPath = paths.find((path) => path.id === selectedPathId);
  const selectedScannablePath = scannablePaths.find(
    (_, index) => paths[index]?.id === selectedPathId,
  );

  return (
    <CardShell variant="hero" className="overflow-hidden">
      <div className="border-b border-[var(--ink-tertiary)]/10 bg-[var(--surface-muted)] px-6 py-4 sm:px-8">
        <p className="text-label text-ink-tertiary">Decision Simulator</p>
        <h3 className="mt-1 text-h1 text-ink-primary">{situationTitle}</h3>
        <p className="mt-2 text-body-small text-ink-secondary">
          {compressCurrentUnderstanding(currentUnderstanding)}
        </p>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {scannablePaths.map((path, index) => (
            <ScannablePathCard
              key={paths[index]?.id ?? `${path.title}-${index}`}
              path={path}
              rawPath={paths[index]!}
              index={index}
              isSelected={paths[index]?.id === selectedPathId}
              onSelectPath={onSelectPath}
              isSelectingPath={isSelectingPath}
            />
          ))}
        </div>

        {selectedScannablePath ? (
          <CardShell
            variant="elevated"
            className="border border-[var(--state-strengthened)]/20 p-4 sm:p-5"
          >
            <p className="text-label text-[var(--state-strengthened)]">Selected path</p>
            <p className="mt-1 text-h2 text-ink-primary">{selectedScannablePath.title}</p>
          </CardShell>
        ) : null}

        {showForecastBridge && selectedPath && selectedScannablePath ? (
          <CardShell variant="elevated" className="p-4 sm:p-5">
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
          </CardShell>
        ) : null}

        <Link
          href={`/moments/${momentId}`}
          className="self-start text-body-small text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
        >
          View full situation
        </Link>
      </div>

      {audit ? (
        <div className="border-t border-[var(--ink-tertiary)]/10 p-4 sm:p-6">
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
          />
        </div>
      ) : null}
    </CardShell>
  );
}
