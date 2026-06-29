"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  generateDiscoveryQuestionsAction,
  type DiscoveryQuestionsSource,
} from "@/actions/discovery-questions";
import {
  runDecisionSimulatorAction,
  selectDecisionPathAction,
  type DecisionSimulatorResult,
} from "@/actions/decision-simulator";
import { runFutureForecastAction } from "@/actions/future-forecast";
import {
  areAllQuestionsAnswered,
  buildContextSummary,
  buildDiscoveryQuestionAudit,
  computeDiscoveryQuestionMetrics,
  MAX_DISCOVERY_QUESTIONS,
  planDiscoveryQuestionSession,
  selectQuestionsForGoal,
  toContextQuestion,
  type ContextQuestion,
  type PlannedDiscoveryQuestion,
  type SituationGoal,
} from "@/components/home/context-questions";
import { ContextQuestionsStage } from "@/components/home/context-questions-stage";
import { DiscoveryQuestionAuditPanel } from "@/components/home/discovery-question-audit-panel";
import { DecisionSimulatorResultView } from "@/components/home/decision-simulator-result";
import { formatDecisionPaths } from "@/components/home/decision-simulator-utils";
import { toPathTitleInput } from "@/components/home/path-titles";
import type { ForecastResult } from "@/components/home/forecast-utils";
import { FutureForecastResultView } from "@/components/home/future-forecast-result";
import { SituationRotatingExamples } from "@/components/home/situation-rotating-examples";
import { Button } from "@/components/ui/button";
import { CardShell } from "@/components/ui/card-shell";

// ---------------------------------------------------------------------------
// SSE stream reader — fetches a streaming endpoint and yields typed events.
// ---------------------------------------------------------------------------

async function readSSEStream<T>(
  url: string,
  body: unknown,
  onText?: (chunk: string) => void,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  if (!response.body) {
    throw new Error("No response body from server");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        let event: { type: string; data?: unknown; error?: string; content?: string };
        try {
          event = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        if (event.type === "text") {
          onText?.(event.content as string);
        } else if (event.type === "result") {
          return event.data as T;
        } else if (event.type === "error") {
          throw new Error(event.error ?? "Streaming error");
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  throw new Error("Stream ended without a result event");
}

// ---------------------------------------------------------------------------
// Skeleton loading cards
// ---------------------------------------------------------------------------

function PathSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius-card)] border border-[var(--ink-tertiary)]/10 bg-[var(--surface-muted)] p-6">
      <div className="mb-4 h-5 w-3/4 rounded bg-[var(--ink-tertiary)]/15" />
      <div className="mb-2 h-3 w-full rounded bg-[var(--ink-tertiary)]/10" />
      <div className="mb-2 h-3 w-5/6 rounded bg-[var(--ink-tertiary)]/10" />
      <div className="h-3 w-4/6 rounded bg-[var(--ink-tertiary)]/10" />
    </div>
  );
}

function ForecastSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius-card)] border border-[var(--ink-tertiary)]/10 bg-[var(--surface-muted)] p-5">
      <div className="mb-3 h-5 w-1/2 rounded bg-[var(--ink-tertiary)]/15" />
      <div className="mb-2 h-3 w-full rounded bg-[var(--ink-tertiary)]/10" />
      <div className="h-3 w-4/5 rounded bg-[var(--ink-tertiary)]/10" />
    </div>
  );
}

// ---------------------------------------------------------------------------

function FlowStep({
  step,
  title,
  children,
  visible = true,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  visible?: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <CardShell variant="elevated" className="p-6 sm:p-8">
      <p className="text-label text-ink-tertiary">Step {step}</p>
      <h3 className="mt-2 text-h1 text-ink-primary">{title}</h3>
      <div className="mt-5">{children}</div>
    </CardShell>
  );
}

export function SituationEntryFlow() {
  const [situationText, setSituationText] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [goal, setGoal] = useState<SituationGoal | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionsComplete, setQuestionsComplete] = useState(false);
  const [simulatorError, setSimulatorError] = useState<string | null>(null);
  const [simulatorResult, setSimulatorResult] = useState<DecisionSimulatorResult | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [pathForecastResult, setPathForecastResult] = useState<ForecastResult | null>(null);
  const [pathForecastError, setPathForecastError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ContextQuestion[]>([]);
  const [plannedQuestions, setPlannedQuestions] = useState<PlannedDiscoveryQuestion[]>([]);
  const [discoveryQuestionSource, setDiscoveryQuestionSource] =
    useState<DiscoveryQuestionsSource | null>(null);
  // AI batches questions upfront; duplicate blocking only applies to rule-based fallback.
  const [duplicateQuestionsBlocked, setDuplicateQuestionsBlocked] = useState(0);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // Streaming state for each AI call (replaces a single isPending useTransition)
  const [isStreamingPaths, setIsStreamingPaths] = useState(false);
  const [isStreamingForecast, setIsStreamingForecast] = useState(false);
  const [isStreamingPathForecast, setIsStreamingPathForecast] = useState(false);

  const [isLoadingQuestions, startQuestionsTransition] = useTransition();
  const [isSelectingPath, startSelectTransition] = useTransition();

  const hasSituation = situationText.trim().length > 0;
  const hasGoal = goal !== null;
  const isDecisionMode = goal === "decision";
  const isForecastMode = goal === "forecast";

  useEffect(() => {
    setAnswers({});
    setQuestionsComplete(false);
    setSimulatorError(null);
    setSimulatorResult(null);
    setSelectedPathId(null);
    setForecastError(null);
    setForecastResult(null);
    setPathForecastResult(null);
    setPathForecastError(null);
    setDuplicateQuestionsBlocked(0);
    setDiscoveryQuestionSource(null);
    setQuestionsError(null);
    setIsStreamingPaths(false);
    setIsStreamingForecast(false);
    setIsStreamingPathForecast(false);

    if (!hasSituation || !goal) {
      setQuestions([]);
      setPlannedQuestions([]);
      return;
    }

    startQuestionsTransition(async () => {
      try {
        const result = await readSSEStream<{
          questions: PlannedDiscoveryQuestion[];
          source: DiscoveryQuestionsSource;
        }>("/api/stream/discovery-questions", {
          situationText: situationText.trim(),
          goal,
          additionalContext: additionalContext.trim() || undefined,
        });

        setPlannedQuestions(result.questions);
        setQuestions(selectQuestionsForGoal(result.questions.map(toContextQuestion), goal));
        setDiscoveryQuestionSource(result.source);
      } catch {
        // Network failure: fall back to server action
        const response = await generateDiscoveryQuestionsAction({
          situationText: situationText.trim(),
          goal,
          additionalContext: additionalContext.trim() || undefined,
        });

        if ("error" in response) {
          const fallback = planDiscoveryQuestionSession(
            { title: situationText.trim(), goal },
            MAX_DISCOVERY_QUESTIONS,
          );
          setPlannedQuestions(fallback);
          setQuestions(selectQuestionsForGoal(fallback.map(toContextQuestion), goal));
          setDiscoveryQuestionSource("fallback");
          setQuestionsError(response.error);
          return;
        }

        setPlannedQuestions(response.questions);
        setQuestions(selectQuestionsForGoal(response.questions.map(toContextQuestion), goal));
        setDiscoveryQuestionSource(response.source);
      }
    });
  }, [situationText, goal, hasSituation, hasGoal]);

  const discoveryAudit = useMemo(
    () => buildDiscoveryQuestionAudit(plannedQuestions),
    [plannedQuestions],
  );
  const discoveryMetrics = useMemo(
    () =>
      computeDiscoveryQuestionMetrics({
        plannedQuestions,
        duplicateQuestionsBlocked,
      }),
    [plannedQuestions, duplicateQuestionsBlocked],
  );

  const allQuestionsAnswered = areAllQuestionsAnswered(questions, answers);

  useEffect(() => {
    if (!allQuestionsAnswered) {
      setQuestionsComplete(false);
    }
  }, [allQuestionsAnswered]);

  function handleAnswerChange(questionId: string, value: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  function handleContinueFromLast(): boolean {
    return true;
  }

  async function handleGenerateForecast() {
    if (!isForecastMode || !allQuestionsAnswered) {
      return;
    }

    setForecastError(null);
    setIsStreamingForecast(true);

    try {
      const result = await readSSEStream<ForecastResult>(
        "/api/stream/future-forecast",
        {
          situationText: situationText.trim(),
          contextSummary: buildContextSummary(questions, answers, additionalContext.trim() || undefined),
        },
      );
      setForecastResult(result);
    } catch {
      // Network failure: fall back to server action
      try {
        const response = await runFutureForecastAction({
          situationText: situationText.trim(),
          contextSummary: buildContextSummary(questions, answers, additionalContext.trim() || undefined),
        });
        if (response.error) {
          setForecastError(response.error);
        } else {
          setForecastResult(response.result);
        }
      } catch (err) {
        setForecastError(err instanceof Error ? err.message : "Failed to generate forecast");
      }
    } finally {
      setIsStreamingForecast(false);
    }
  }

  const showContinueStep =
    hasSituation &&
    hasGoal &&
    questionsComplete &&
    !simulatorResult &&
    !forecastResult &&
    !pathForecastResult &&
    !isStreamingPaths &&
    !isStreamingForecast &&
    !isStreamingPathForecast;

  async function handleContinueToDecisionSimulator() {
    if (!isDecisionMode || !allQuestionsAnswered) {
      return;
    }

    setSimulatorError(null);
    setIsStreamingPaths(true);

    try {
      const result = await readSSEStream<DecisionSimulatorResult>(
        "/api/stream/decision-simulator",
        {
          situationText: situationText.trim(),
          contextSummary: buildContextSummary(questions, answers, additionalContext.trim() || undefined),
        },
      );
      setSimulatorResult(result);
    } catch {
      // Network failure: fall back to server action
      try {
        const response = await runDecisionSimulatorAction({
          situationText: situationText.trim(),
          contextSummary: buildContextSummary(questions, answers, additionalContext.trim() || undefined),
        });
        if (response.error) {
          setSimulatorError(response.error);
        } else {
          setSimulatorResult(response.result);
        }
      } catch (err) {
        setSimulatorError(err instanceof Error ? err.message : "Failed to generate decisions");
      }
    } finally {
      setIsStreamingPaths(false);
    }
  }

  function handleSelectPath(pathId: string) {
    setSelectedPathId(pathId);
    setPathForecastResult(null);
    setPathForecastError(null);

    if (!simulatorResult) {
      return;
    }

    startSelectTransition(async () => {
      await selectDecisionPathAction({
        momentId: simulatorResult.momentId,
        pathId,
      });
    });
  }

  async function handleForecastSelectedPath() {
    if (!simulatorResult || !selectedPathId) {
      return;
    }

    const selectedIndex = simulatorResult.paths.findIndex((path) => path.id === selectedPathId);
    const selectedPath = simulatorResult.paths[selectedIndex];
    const formattedPath = formatDecisionPaths(simulatorResult.paths, situationText.trim())[
      selectedIndex
    ];

    if (!selectedPath || !formattedPath) {
      return;
    }

    setPathForecastError(null);
    setIsStreamingPathForecast(true);

    const cleanedSelectedPath = toPathTitleInput(selectedPath);
    const forecastInput = {
      situationText: situationText.trim(),
      contextSummary: buildContextSummary(questions, answers, additionalContext.trim() || undefined),
      momentId: simulatorResult.momentId,
      selectedPath: {
        id: selectedPath.id,
        title: formattedPath.title,
        description: cleanedSelectedPath.description,
        benefits: selectedPath.benefits,
        consequences: selectedPath.consequences,
        future_shift: selectedPath.future_shift,
        themes: selectedPath.themes,
      },
    };

    try {
      const result = await readSSEStream<ForecastResult>(
        "/api/stream/future-forecast",
        forecastInput,
      );
      setPathForecastResult(result);
    } catch {
      // Network failure: fall back to server action
      try {
        const response = await runFutureForecastAction(forecastInput);
        if (response.error) {
          setPathForecastError(response.error);
        } else {
          setPathForecastResult(response.result);
        }
      } catch (err) {
        setPathForecastError(err instanceof Error ? err.message : "Failed to generate forecast");
      }
    } finally {
      setIsStreamingPathForecast(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <FlowStep step={1} title="What's on your mind?">
        <SituationRotatingExamples />
        <label htmlFor="situation-input" className="sr-only">
          Describe your situation
        </label>
        <textarea
          id="situation-input"
          value={situationText}
          onChange={(event) => {
            const nextValue = event.target.value;
            setSituationText(nextValue);
            if (nextValue.trim().length === 0) {
              setGoal(null);
              setAdditionalContext("");
            }
          }}
          placeholder="Describe what's happening or what you're thinking about…"
          rows={5}
          className="mt-4 w-full resize-y rounded-[var(--radius-card)] border border-[var(--ink-tertiary)]/25 bg-[var(--surface)] px-4 py-3 text-body text-ink-primary placeholder:text-ink-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-ring)]"
        />
        <label htmlFor="additional-context-input" className="mt-5 block text-body-small font-medium text-ink-secondary">
          Anything else that&apos;s relevant?
        </label>
        <textarea
          id="additional-context-input"
          value={additionalContext}
          onChange={(event) => setAdditionalContext(event.target.value)}
          placeholder="Background, history, constraints, people involved — anything that gives more context…"
          rows={4}
          className="mt-2 w-full resize-y rounded-[var(--radius-card)] border border-[var(--ink-tertiary)]/25 bg-[var(--surface)] px-4 py-3 text-body text-ink-primary placeholder:text-ink-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-ring)]"
        />
      </FlowStep>

      <FlowStep step={2} title="What would you like help with?" visible={hasSituation}>
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Choose how you want to explore this situation</legend>

          <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/20 bg-[var(--surface-muted)] px-4 py-3 has-[:checked]:border-[var(--action-fill)] has-[:checked]:bg-[var(--action-soft-fill)]">
            <input
              type="radio"
              name="situation-goal"
              value="decision"
              checked={goal === "decision"}
              onChange={() => setGoal("decision")}
              className="mt-1"
            />
            <span>
              <span className="block text-body font-medium text-ink-primary">
                Explore a Decision
              </span>
              <span className="mt-1 block text-body-small text-ink-secondary">
                What should I do?
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/20 bg-[var(--surface-muted)] px-4 py-3 has-[:checked]:border-[var(--action-fill)] has-[:checked]:bg-[var(--action-soft-fill)]">
            <input
              type="radio"
              name="situation-goal"
              value="forecast"
              checked={goal === "forecast"}
              onChange={() => setGoal("forecast")}
              className="mt-1"
            />
            <span>
              <span className="block text-body font-medium text-ink-primary">
                Forecast the Future
              </span>
              <span className="mt-1 block text-body-small text-ink-secondary">
                What might happen next?
              </span>
            </span>
          </label>
        </fieldset>
      </FlowStep>

      <FlowStep
        step={3}
        title={isDecisionMode ? "One quick question" : "Let's understand your situation"}
        visible={hasSituation && hasGoal && !simulatorResult && !forecastResult && !pathForecastResult}
      >
        <p className="mb-5 text-body-small text-ink-secondary">
          {isDecisionMode
            ? "Your answer helps generate more accurate, relevant paths."
            : "One question at a time. Your answers shape what comes next."}
        </p>
        {isLoadingQuestions ? (
          <p className="animate-pulse text-body-small text-ink-secondary">
            Thinking about your situation…
          </p>
        ) : null}
        {questionsError ? (
          <p className="mb-5 text-body-small text-[var(--state-contradiction-detected)]">
            {questionsError}
          </p>
        ) : null}
        <ContextQuestionsStage
          questions={questions}
          answers={answers}
          onAnswerChange={handleAnswerChange}
          onComplete={() => setQuestionsComplete(true)}
          onContinueFromLast={handleContinueFromLast}
        />
        <DiscoveryQuestionAuditPanel
          audit={discoveryAudit}
          metrics={discoveryMetrics}
          source={discoveryQuestionSource}
        />
      </FlowStep>

      <FlowStep
        step={4}
        title={isForecastMode ? "Generate Forecast" : "Decision Simulator"}
        visible={showContinueStep}
      >
        {isDecisionMode ? (
          <>
            <p className="mb-5 text-body text-ink-secondary">
              You're ready to explore possible decisions.
            </p>
            {simulatorError ? (
              <p className="mb-5 text-body-small text-[var(--state-contradiction-detected)]">
                {simulatorError}
              </p>
            ) : null}
            <Button
              type="button"
              size="lg"
              disabled={!allQuestionsAnswered || isStreamingPaths}
              onClick={handleContinueToDecisionSimulator}
            >
              {isStreamingPaths ? "Generating decisions…" : "Continue to Decision Simulator"}
            </Button>
          </>
        ) : (
          <>
            <p className="mb-5 text-body text-ink-secondary">
              Your situation will be saved automatically, then Future Forecast will generate what
              might happen next.
            </p>
            {forecastError ? (
              <p className="mb-5 text-body-small text-[var(--state-contradiction-detected)]">
                {forecastError}
              </p>
            ) : null}
            <Button
              type="button"
              size="lg"
              disabled={!allQuestionsAnswered || isStreamingForecast}
              onClick={handleGenerateForecast}
            >
              {isStreamingForecast ? "Generating forecast…" : "Generate Forecast"}
            </Button>
          </>
        )}
      </FlowStep>

      {isStreamingPaths && isDecisionMode ? (
        <div className="flex flex-col gap-3">
          <p className="animate-pulse text-label text-ink-tertiary">
            Exploring possible decisions…
          </p>
          {[1, 2, 3, 4, 5].map((i) => (
            <PathSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {simulatorResult && isDecisionMode ? (
        <DecisionSimulatorResultView
          situationTitle={situationText.trim()}
          currentUnderstanding={simulatorResult.currentUnderstanding}
          momentId={simulatorResult.momentId}
          paths={simulatorResult.paths}
          audit={simulatorResult.audit}
          selectedPathId={selectedPathId}
          onSelectPath={handleSelectPath}
          isSelectingPath={isSelectingPath}
          showForecastBridge={!pathForecastResult}
          onForecastSelectedPath={handleForecastSelectedPath}
          isForecastPending={isStreamingPathForecast}
          forecastBridgeError={pathForecastError}
        />
      ) : null}

      {isStreamingPathForecast && isDecisionMode && !pathForecastResult ? (
        <div className="flex flex-col gap-3">
          <p className="animate-pulse text-label text-ink-tertiary">
            Forecasting your futures…
          </p>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ForecastSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {pathForecastResult && isDecisionMode ? (
        <FutureForecastResultView forecast={pathForecastResult} />
      ) : null}

      {isStreamingForecast && isForecastMode && !forecastResult ? (
        <div className="flex flex-col gap-3">
          <p className="animate-pulse text-label text-ink-tertiary">
            Forecasting your futures…
          </p>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ForecastSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {forecastResult && isForecastMode ? (
        <FutureForecastResultView forecast={forecastResult} />
      ) : null}
    </div>
  );
}
