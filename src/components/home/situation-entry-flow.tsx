"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { flushSync, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { generateForecastForMomentAction } from "@/actions/future-forecast";
import { generatePathsAction } from "@/actions/paths";

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
  MAX_DISCOVERY_QUESTIONS,
  planDiscoveryQuestionSession,
  selectQuestionsForGoal,
  toContextQuestion,
  type ContextQuestion,
  type PlannedDiscoveryQuestion,
  type SituationGoal,
} from "@/components/home/context-questions";
import { ContextQuestionsStage } from "@/components/home/context-questions-stage";
import { DecisionSimulatorResultView } from "@/components/home/decision-simulator-result";
import { formatDecisionPaths } from "@/components/home/decision-simulator-utils";
import { toPathTitleInput } from "@/components/home/path-titles";
import type { ForecastResult } from "@/components/home/forecast-utils";
import { FutureForecastResultView } from "@/components/home/future-forecast-result";
import { SituationRotatingExamples } from "@/components/home/situation-rotating-examples";
import { withJustChosenPathFlag } from "@/lib/forecast-visit-flag";

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

// A server-side generation failure that happened AFTER the situation was
// created. The situation is kept (never deleted), so callers can offer to
// resume generation against `momentId` instead of re-creating a duplicate.
class StreamGenerationError extends Error {
  momentId: string | null;

  constructor(message: string, momentId: string | null) {
    super(message);
    this.momentId = momentId;
  }
}

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
          throw new StreamGenerationError(
            (event.error as string) ?? "Streaming error",
            typeof event.momentId === "string" ? event.momentId : null,
          );
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

// Shaped like a collapsed possible-future row (theme label → title →
// one-sentence hook) so the streamed result replaces the placeholder in
// place instead of reflowing the list.
function PathSkeleton() {
  return (
    <div className="animate-pulse py-4">
      <div className="h-3 w-16 rounded bg-[var(--ink-tertiary)]/10" />
      <div className="mt-2 h-5 w-2/3 rounded bg-[var(--ink-tertiary)]/15" />
      <div className="mt-2 h-3 w-5/6 rounded bg-[var(--ink-tertiary)]/10" />
    </div>
  );
}

// Shaped like the final forecast card's collapsed summary (timeframe chip →
// title → preview line) on the same white elevated surface.
function ForecastSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius-card)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-elevated)] sm:px-5">
      <div className="h-4 w-20 rounded-full bg-[var(--ink-tertiary)]/10" />
      <div className="mt-3 h-4 w-1/2 rounded bg-[var(--ink-tertiary)]/15" />
      <div className="mt-2 h-3 w-4/5 rounded bg-[var(--ink-tertiary)]/10" />
    </div>
  );
}

// A streamed path rendered exactly as its final collapsed row (serif title +
// first-line hook) — arrival means the row simply stops pulsing, not that
// the layout changes shape.
function StreamingPathCard({ path }: { path: StreamPathDraft }) {
  return (
    <div className="py-4">
      <h4 className="font-voice text-[19px] font-medium leading-[1.3] tracking-[-0.01em] text-ink-primary">
        {path.title}
      </h4>
      {path.description ? (
        <p className="mt-1 line-clamp-2 max-w-[46em] text-body-small text-ink-secondary">
          {path.description}
        </p>
      ) : (
        <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-[var(--ink-tertiary)]/10" />
      )}
    </div>
  );
}

function StreamingFutureCard({ future }: { future: StreamFutureDraft }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-elevated)] sm:px-5">
      <h4 className="text-body font-medium text-ink-primary">{future.title}</h4>
      {future.why ? (
        <p className="mt-2 line-clamp-2 text-body-small text-ink-secondary">{future.why}</p>
      ) : (
        <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-[var(--ink-tertiary)]/10" />
      )}
    </div>
  );
}

function ResumeGenerationButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
    >
      {pending ? "Resuming…" : "Resume generation"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Stage type
// ---------------------------------------------------------------------------

type Stage = "describe" | "questions" | "paths" | "forecast";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SituationEntryFlow() {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("describe");

  const [situationText, setSituationText] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [goal, setGoal] = useState<SituationGoal | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionsComplete, setQuestionsComplete] = useState(false);
  const [simulatorError, setSimulatorError] = useState<string | null>(null);
  // Set when the situation exists server-side but generation failed: the
  // situation is kept, so the error UI offers "Resume generation" for it.
  const [strandedMomentId, setStrandedMomentId] = useState<string | null>(null);
  const [strandedForecastMomentId, setStrandedForecastMomentId] = useState<string | null>(null);
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

  // Idempotency token for situation creation, same pattern as the check-in
  // form: stable while the submission identity (title + goal) is unchanged,
  // so a retry after a dropped connection recovers the moment the server
  // already created instead of creating a duplicate. Computed lazily in the
  // submit handlers (client-only), keyed rather than effect-driven so a new
  // title/goal mints a new token without extra renders.
  const clientTokenRef = useRef<{ key: string; token: string } | null>(null);

  function getClientToken(): string {
    const key = `${situationText.trim()}|${goal ?? ""}`;
    if (!clientTokenRef.current || clientTokenRef.current.key !== key) {
      clientTokenRef.current = { key, token: crypto.randomUUID() };
    }
    return clientTokenRef.current.token;
  }

  const hasSituation = situationText.trim().length > 0;
  const hasContext = additionalContext.trim().length > 0;
  const hasGoal = goal !== null;
  const isDecisionMode = goal === "decision";
  const isForecastMode = goal === "forecast";

  // Questions start pre-loading as soon as title + goal are set, even while
  // the user is still on Stage 1 filling in context.
  useEffect(() => {
    setAnswers({});
    setQuestionsComplete(false);
    setSimulatorError(null);
    setStrandedMomentId(null);
    setStrandedForecastMomentId(null);
    setSimulatorResult(null);
    setSelectedPathId(null);
    setForecastError(null);
    setForecastResult(null);
    setPathForecastResult(null);
    setPathForecastError(null);
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
    setStrandedForecastMomentId(null);
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
          clientToken: getClientToken(),
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
    } catch (streamError) {
      // The server created the situation but generation failed afterward. The
      // situation is kept, so offer to resume it rather than immediately
      // re-running generation via the fallback.
      if (streamError instanceof StreamGenerationError && streamError.momentId) {
        setForecastError(streamError.message);
        setStrandedForecastMomentId(streamError.momentId);
        return;
      }

      // Network failure: fall back to server action. The shared client token
      // recovers a moment the stream request may have already created.
      try {
        const response = await runFutureForecastAction({
          situationText: situationText.trim(),
          contextSummary: buildContextSummary(
            questions,
            answers,
            additionalContext.trim() || undefined,
          ),
          clientToken: getClientToken(),
        });
        if (response.error) {
          setForecastError(response.error);
          setStrandedForecastMomentId(response.momentId ?? null);
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

  async function handleContinueToDecisionSimulator() {
    if (!isDecisionMode || !allQuestionsAnswered) {
      return;
    }

    setSimulatorError(null);
    setStrandedMomentId(null);
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
          clientToken: getClientToken(),
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
    } catch (streamError) {
      // The server created the situation but generation failed afterward. The
      // situation is kept, so offer to resume it — the server-action fallback
      // would create a duplicate situation (and generation just failed anyway).
      if (streamError instanceof StreamGenerationError && streamError.momentId) {
        setSimulatorError(streamError.message);
        setStrandedMomentId(streamError.momentId);
        return;
      }

      // Network failure: fall back to server action. The shared client token
      // recovers a moment the stream request may have already created.
      try {
        const response = await runDecisionSimulatorAction({
          situationText: situationText.trim(),
          contextSummary: buildContextSummary(
            questions,
            answers,
            additionalContext.trim() || undefined,
          ),
          clientToken: getClientToken(),
        });
        if (response.error) {
          setSimulatorError(response.error);
          setStrandedMomentId(response.momentId ?? null);
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

  // Number of placeholder skeletons to show below arrived streaming items.
  // Paths reserve five slots up front — the generation contract guarantees
  // at least five futures, so the list holds its final height instead of
  // growing as paths arrive.
  const pathSkeletonCount = isStreamingPaths
    ? Math.max(0, 5 - streamingPaths.length)
    : 0;
  const forecastSkeletonCount = isStreamingForecast
    ? Math.max(0, 3 - streamingFutures.length)
    : 0;
  const pathForecastSkeletonCount = isStreamingPathForecast
    ? Math.max(0, 3 - streamingPathFutures.length)
    : 0;

  // ---------------------------------------------------------------------------
  // Stage transition handlers
  // ---------------------------------------------------------------------------

  function handleContinueFromDescribe() {
    setStage("questions");
  }

  function handleContinueFromQuestions() {
    if (isDecisionMode) {
      setStage("paths");
      void handleContinueToDecisionSimulator();
    } else {
      setStage("forecast");
      void handleGenerateForecast();
    }
  }

  function handleContinueFromPaths() {
    setStage("forecast");
    void handleForecastSelectedPath();
  }

  function handleContinueFromForecast() {
    const momentId =
      pathForecastResult?.momentId ?? forecastResult?.momentId ?? simulatorResult?.momentId;
    if (momentId) {
      router.push(withJustChosenPathFlag(`/moments/${momentId}`));
    }
  }

  const forecastDone =
    (isDecisionMode && pathForecastResult !== null) ||
    (isForecastMode && forecastResult !== null);
  const forecastStreaming = isStreamingPathForecast || isStreamingForecast;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-10">

      {/* ── Stage 1: Describe your situation ── */}
      {stage === "describe" ? (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                What should we call this situation?
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                A short title that helps you recognize this situation later.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <SituationRotatingExamples />
              <input
                id="situation-input"
                type="text"
                value={situationText}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSituationText(nextValue);
                  if (nextValue.trim().length === 0) {
                    setGoal(null);
                    setAdditionalContext("");
                  }
                }}
                autoFocus
                maxLength={120}
                placeholder="Give this situation a short title…"
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {hasSituation ? (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  Tell Future Paths what&apos;s happening
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Describe your situation in as much detail as you&apos;d like. The more context you
                  provide, the more personalized your paths and forecasts become.
                </p>
              </div>
              <textarea
                id="additional-context-input"
                value={additionalContext}
                onChange={(event) => setAdditionalContext(event.target.value)}
                placeholder="What's going on? Who's involved? What have you tried? What are the constraints?"
                rows={6}
                className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:bg-white transition-colors"
              />
            </div>
          ) : null}

          {hasSituation && hasContext ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-zinc-700">
                What kind of help are you looking for?
              </p>
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:border-zinc-300 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50">
                  <input
                    type="radio"
                    name="entry-goal"
                    value="decision"
                    checked={goal === "decision"}
                    onChange={() => setGoal("decision")}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="block text-sm font-medium text-zinc-900">
                      Explore a decision
                    </span>
                    <span className="mt-0.5 block text-sm text-zinc-500">
                      Help me think through what to do
                    </span>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:border-zinc-300 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50">
                  <input
                    type="radio"
                    name="entry-goal"
                    value="forecast"
                    checked={goal === "forecast"}
                    onChange={() => setGoal("forecast")}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="block text-sm font-medium text-zinc-900">
                      Forecast the future
                    </span>
                    <span className="mt-0.5 block text-sm text-zinc-500">
                      Help me see what might happen next
                    </span>
                  </div>
                </label>
              </div>
            </div>
          ) : null}

          {hasSituation && hasContext && hasGoal ? (
            <button
              type="button"
              onClick={handleContinueFromDescribe}
              className="self-start rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Continue
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ── Stage 2: Understand your situation ── */}
      {stage === "questions" ? (
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              Help us understand your situation
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Answer a few questions so we can tailor the analysis to your specific situation.
            </p>
          </div>

          {isLoadingQuestions && questions.length === 0 ? (
            <div>
              <p className="animate-pulse text-label text-ink-tertiary">
                Preparing questions…
              </p>
              {/* Same surface the questions arrive on, so the panel fills in
                  rather than appearing from nothing. */}
              <div className="mt-3 animate-pulse rounded-xl border border-zinc-100 bg-zinc-50/50 p-6">
                <div className="h-3 w-24 rounded bg-[var(--ink-tertiary)]/10" />
                <div className="mt-3 h-4 w-3/4 rounded bg-[var(--ink-tertiary)]/15" />
                <div className="mt-4 h-24 w-full rounded-lg bg-[var(--ink-tertiary)]/10" />
                <div className="mt-4 h-9 w-28 rounded-lg bg-[var(--ink-tertiary)]/10" />
              </div>
            </div>
          ) : null}

          {questionsError ? (
            <p className="text-sm text-red-500">{questionsError}</p>
          ) : null}

          {questions.length > 0 ? (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-6">
              <ContextQuestionsStage
                questions={questions}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                onComplete={() => setQuestionsComplete(true)}
                onContinueFromLast={handleContinueFromLast}
              />
            </div>
          ) : null}

          {questionsComplete ? (
            <button
              type="button"
              onClick={handleContinueFromQuestions}
              className="self-start rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Continue
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ── Stage 3: Explore possible paths (decision mode) ── */}
      {stage === "paths" ? (
        <div className="flex flex-col gap-8">
          {/* Once the result exists it opens with its own editorial situation
              intro — a second stage heading above it would stack two headers
              and bring back the report feel. */}
          {!simulatorResult ? (
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">Explore possible paths</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Here are the different decisions you could make. Select the one that resonates most.
              </p>
            </div>
          ) : null}

          {isStreamingPaths && !simulatorResult ? (
            <div>
              {/* Same scaffold as the final result: a "Possible futures"
                  label over a hairline-divided list, so the finished view
                  lands on the structure the user is already reading. */}
              <p className="animate-pulse text-label text-ink-tertiary">
                Exploring possible futures…
              </p>
              <div className="mt-2 flex flex-col divide-y divide-[var(--ink-tertiary)]/10">
                {streamingPaths.map((path, i) => (
                  <StreamingPathCard key={i} path={path} />
                ))}
                {[...Array(pathSkeletonCount)].map((_, i) => (
                  <PathSkeleton key={`sk-${i}`} />
                ))}
              </div>
            </div>
          ) : null}

          {simulatorError ? (
            <p className="text-sm text-red-500">{simulatorError}</p>
          ) : null}

          {simulatorError && strandedMomentId ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-500">
                Your situation and everything you wrote were saved. You can pick
                up path generation where it left off.
              </p>
              <form action={generatePathsAction}>
                <input type="hidden" name="momentId" value={strandedMomentId} />
                <ResumeGenerationButton />
              </form>
            </div>
          ) : null}

          {simulatorResult ? (
            <DecisionSimulatorResultView
              situationTitle={situationText.trim()}
              currentUnderstanding={simulatorResult.currentUnderstanding}
              momentId={simulatorResult.momentId}
              paths={simulatorResult.paths}
              audit={simulatorResult.audit}
              selectedPathId={selectedPathId}
              onSelectPath={handleSelectPath}
              onContinue={
                selectedPathId && !isSelectingPath ? handleContinueFromPaths : undefined
              }
              isSelectingPath={isSelectingPath}
              showForecastBridge={false}
            />
          ) : null}
        </div>
      ) : null}

      {/* ── Stage 4: Look ahead ── */}
      {stage === "forecast" ? (
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Look ahead</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Here&apos;s what might happen based on your situation.
            </p>
          </div>

          {isDecisionMode ? (
            <>
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

              {pathForecastError ? (
                <p className="text-sm text-red-500">{pathForecastError}</p>
              ) : null}

              {pathForecastResult ? (
                <FutureForecastResultView forecast={pathForecastResult} />
              ) : null}
            </>
          ) : null}

          {isForecastMode ? (
            <>
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

              {forecastError ? (
                <p className="text-sm text-red-500">{forecastError}</p>
              ) : null}

              {forecastError && strandedForecastMomentId ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-zinc-500">
                    Your situation and everything you wrote were saved. You can
                    pick up the forecast where it left off.
                  </p>
                  <form action={generateForecastForMomentAction}>
                    <input
                      type="hidden"
                      name="momentId"
                      value={strandedForecastMomentId}
                    />
                    <ResumeGenerationButton />
                  </form>
                </div>
              ) : null}

              {forecastResult ? (
                <FutureForecastResultView forecast={forecastResult} />
              ) : null}
            </>
          ) : null}

          {forecastDone && !forecastStreaming ? (
            <button
              type="button"
              onClick={handleContinueFromForecast}
              className="self-start rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Continue
            </button>
          ) : null}
        </div>
      ) : null}

    </div>
  );
}
