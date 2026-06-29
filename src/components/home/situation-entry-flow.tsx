"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { flushSync } from "react-dom";

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
// Types for streamed preview items (before final DB-saved result arrives)
// ---------------------------------------------------------------------------

type StreamPathDraft = {
  title: string;
  description: string;
  benefits: string[];
  consequences: string[];
  future_shift: string;
};

type StreamFutureDraft = {
  title: string;
  why: string;
  impact: string;
};

// ---------------------------------------------------------------------------
// SSE stream reader — fires onEvent for each intermediate event, returns T
// when the final {type:"result"} event arrives.
// ---------------------------------------------------------------------------

async function readSSEStream<T>(
  url: string,
  body: unknown,
  onEvent?: (event: { type: string; [key: string]: unknown }) => void,
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

        let event: { type: string; [key: string]: unknown };
        try {
          event = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        if (event.type === "result") {
          return event.data as T;
        } else if (event.type === "error") {
          throw new Error((event.error as string) ?? "Streaming error");
        } else {
          onEvent?.(event);
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  throw new Error("Stream ended without a result event");
}

// ---------------------------------------------------------------------------
// Skeleton + preview cards
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

function StreamingPathCard({ path }: { path: StreamPathDraft }) {
  return (
    <CardShell variant="elevated" className="p-6">
      <h4 className="text-body font-semibold text-ink-primary">{path.title}</h4>
      {path.description ? (
        <p className="mt-1 line-clamp-2 text-body-small text-ink-secondary">{path.description}</p>
      ) : null}
      {path.benefits.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1">
          {path.benefits.slice(0, 2).map((benefit, i) => (
            <li key={i} className="text-body-small text-ink-secondary">
              + {benefit}
            </li>
          ))}
        </ul>
      ) : null}
    </CardShell>
  );
}

function StreamingFutureCard({ future }: { future: StreamFutureDraft }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--ink-tertiary)]/15 bg-[var(--surface-muted)] p-5">
      <h4 className="text-body font-medium text-ink-primary">{future.title}</h4>
      {future.why ? (
        <p className="mt-2 text-body-small text-ink-secondary">{future.why}</p>
      ) : null}
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
  const [duplicateQuestionsBlocked, setDuplicateQuestionsBlocked] = useState(0);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // Streaming state — booleans track in-progress, arrays hold previews
  const [isStreamingPaths, setIsStreamingPaths] = useState(false);
  const [isStreamingForecast, setIsStreamingForecast] = useState(false);
  const [isStreamingPathForecast, setIsStreamingPathForecast] = useState(false);
  const [streamingPaths, setStreamingPaths] = useState<StreamPathDraft[]>([]);
  const [streamingFutures, setStreamingFutures] = useState<StreamFutureDraft[]>([]);
  const [streamingPathFutures, setStreamingPathFutures] = useState<StreamFutureDraft[]>([]);

  // Plain useState — NOT useTransition. Updates must commit immediately so Q1
  // appears the moment it arrives, not after the full stream completes.
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
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
    setStreamingPaths([]);
    setStreamingFutures([]);
    setStreamingPathFutures([]);

    if (!hasSituation || !goal) {
      setQuestions([]);
      setPlannedQuestions([]);
      return;
    }

    // `active` prevents a stale effect (situation/goal changed while streaming)
    // from writing into the new state after the cleanup has fired.
    let active = true;
    setIsLoadingQuestions(true);

    void (async () => {
      try {
        const result = await readSSEStream<{
          questions: PlannedDiscoveryQuestion[];
          source: DiscoveryQuestionsSource;
        }>(
          "/api/stream/discovery-questions",
          {
            situationText: situationText.trim(),
            goal,
            additionalContext: additionalContext.trim() || undefined,
          },
          (event) => {
            if (!active) return;
            if (event.type === "question") {
              const q = event.data as PlannedDiscoveryQuestion;
              flushSync(() => {
                setPlannedQuestions((prev) => [...prev, q]);
                setQuestions((prev) => [...prev, toContextQuestion(q)]);
              });
            }
          },
        );

        if (!active) return;
        // Finalize: replace with the server's properly ordered/filtered set
        setPlannedQuestions(result.questions);
        setQuestions(selectQuestionsForGoal(result.questions.map(toContextQuestion), goal));
        setDiscoveryQuestionSource(result.source);
      } catch {
        if (!active) return;
        // Network failure: fall back to server action
        const response = await generateDiscoveryQuestionsAction({
          situationText: situationText.trim(),
          goal,
          additionalContext: additionalContext.trim() || undefined,
        });

        if (!active) return;

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
      } finally {
        if (active) setIsLoadingQuestions(false);
      }
    })();

    return () => {
      active = false;
    };
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
    // Block final submission until all questions have arrived so the user
    // can't skip questions that haven't loaded yet.
    return !isLoadingQuestions;
  }

  async function handleGenerateForecast() {
    if (!isForecastMode || !allQuestionsAnswered) {
      return;
    }

    setForecastError(null);
    setStreamingFutures([]);
    setIsStreamingForecast(true);

    try {
      const result = await readSSEStream<ForecastResult>(
        "/api/stream/future-forecast",
        {
          situationText: situationText.trim(),
          contextSummary: buildContextSummary(
            questions,
            answers,
            additionalContext.trim() || undefined,
          ),
        },
        (event) => {
          if (event.type === "future") {
            const raw = event.data as { title?: string; why?: string; impact?: string };
            flushSync(() => {
              setStreamingFutures((prev) => [
                ...prev,
                { title: raw.title ?? "", why: raw.why ?? "", impact: raw.impact ?? "" },
              ]);
            });
          }
        },
      );
      setForecastResult(result);
    } catch {
      // Network failure: fall back to server action
      try {
        const response = await runFutureForecastAction({
          situationText: situationText.trim(),
          contextSummary: buildContextSummary(
            questions,
            answers,
            additionalContext.trim() || undefined,
          ),
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
    setStreamingPaths([]);
    setIsStreamingPaths(true);

    try {
      const result = await readSSEStream<DecisionSimulatorResult>(
        "/api/stream/decision-simulator",
        {
          situationText: situationText.trim(),
          contextSummary: buildContextSummary(
            questions,
            answers,
            additionalContext.trim() || undefined,
          ),
        },
        (event) => {
          if (event.type === "path") {
            const raw = event.data as {
              title?: string;
              description?: string;
              benefits?: string[];
              consequences?: string[];
              future_shift?: string;
            };
            flushSync(() => {
              setStreamingPaths((prev) => [
                ...prev,
                {
                  title: raw.title ?? "",
                  description: raw.description ?? "",
                  benefits: raw.benefits ?? [],
                  consequences: raw.consequences ?? [],
                  future_shift: raw.future_shift ?? "",
                },
              ]);
            });
          }
        },
      );
      setSimulatorResult(result);
    } catch {
      // Network failure: fall back to server action
      try {
        const response = await runDecisionSimulatorAction({
          situationText: situationText.trim(),
          contextSummary: buildContextSummary(
            questions,
            answers,
            additionalContext.trim() || undefined,
          ),
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
    setStreamingPathFutures([]);
    setIsStreamingPathForecast(true);

    const cleanedSelectedPath = toPathTitleInput(selectedPath);
    const forecastInput = {
      situationText: situationText.trim(),
      contextSummary: buildContextSummary(
        questions,
        answers,
        additionalContext.trim() || undefined,
      ),
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
        (event) => {
          if (event.type === "future") {
            const raw = event.data as { title?: string; why?: string; impact?: string };
            flushSync(() => {
              setStreamingPathFutures((prev) => [
                ...prev,
                { title: raw.title ?? "", why: raw.why ?? "", impact: raw.impact ?? "" },
              ]);
            });
          }
        },
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
        setPathForecastError(
          err instanceof Error ? err.message : "Failed to generate forecast",
        );
      }
    } finally {
      setIsStreamingPathForecast(false);
    }
  }

  // Number of placeholder skeletons to show below arrived streaming items
  const pathSkeletonCount = isStreamingPaths
    ? Math.max(0, 3 - streamingPaths.length)
    : 0;
  const forecastSkeletonCount = isStreamingForecast
    ? Math.max(0, 3 - streamingFutures.length)
    : 0;
  const pathForecastSkeletonCount = isStreamingPathForecast
    ? Math.max(0, 3 - streamingPathFutures.length)
    : 0;

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
        <label
          htmlFor="additional-context-input"
          className="mt-5 block text-body-small font-medium text-ink-secondary"
        >
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
        visible={
          hasSituation &&
          hasGoal &&
          !simulatorResult &&
          !forecastResult &&
          !pathForecastResult
        }
      >
        <p className="mb-5 text-body-small text-ink-secondary">
          {isDecisionMode
            ? "Your answer helps generate more accurate, relevant paths."
            : "One question at a time. Your answers shape what comes next."}
        </p>
        {isLoadingQuestions && questions.length === 0 ? (
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
              You&apos;re ready to explore possible decisions.
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

      {/* ---- Progressive path cards (Decision Simulator) ---- */}
      {isStreamingPaths && !simulatorResult ? (
        <div className="flex flex-col gap-3">
          <p className="animate-pulse text-label text-ink-tertiary">
            Exploring possible decisions…
          </p>
          {streamingPaths.map((path, i) => (
            <StreamingPathCard key={i} path={path} />
          ))}
          {[...Array(pathSkeletonCount)].map((_, i) => (
            <PathSkeleton key={`sk-${i}`} />
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

      {/* ---- Progressive futures (path forecast, Decision mode) ---- */}
      {isStreamingPathForecast && !pathForecastResult ? (
        <div className="flex flex-col gap-3">
          <p className="animate-pulse text-label text-ink-tertiary">
            Forecasting your futures…
          </p>
          {streamingPathFutures.map((future, i) => (
            <StreamingFutureCard key={i} future={future} />
          ))}
          {[...Array(pathForecastSkeletonCount)].map((_, i) => (
            <ForecastSkeleton key={`sk-${i}`} />
          ))}
        </div>
      ) : null}

      {pathForecastResult && isDecisionMode ? (
        <FutureForecastResultView forecast={pathForecastResult} />
      ) : null}

      {/* ---- Progressive futures (Forecast mode) ---- */}
      {isStreamingForecast && !forecastResult ? (
        <div className="flex flex-col gap-3">
          <p className="animate-pulse text-label text-ink-tertiary">
            Forecasting your futures…
          </p>
          {streamingFutures.map((future, i) => (
            <StreamingFutureCard key={i} future={future} />
          ))}
          {[...Array(forecastSkeletonCount)].map((_, i) => (
            <ForecastSkeleton key={`sk-${i}`} />
          ))}
        </div>
      ) : null}

      {forecastResult && isForecastMode ? (
        <FutureForecastResultView forecast={forecastResult} />
      ) : null}
    </div>
  );
}
