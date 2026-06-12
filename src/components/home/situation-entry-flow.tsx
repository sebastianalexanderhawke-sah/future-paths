"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  runDecisionSimulatorAction,
  selectDecisionPathAction,
  type DecisionSimulatorResult,
} from "@/actions/decision-simulator";
import { runFutureForecastAction } from "@/actions/future-forecast";
import {
  areAllQuestionsAnswered,
  selectContextQuestions,
  type ContextQuestion,
  type SituationGoal,
} from "@/components/home/context-questions";
import { ContextQuestionsStage } from "@/components/home/context-questions-stage";
import { DecisionSimulatorResultView } from "@/components/home/decision-simulator-result";
import { formatDecisionPaths } from "@/components/home/decision-simulator-utils";
import type { ForecastResult } from "@/components/home/forecast-utils";
import { FutureForecastResultView } from "@/components/home/future-forecast-result";
import { SituationRotatingExamples } from "@/components/home/situation-rotating-examples";
import { Button } from "@/components/ui/button";
import { CardShell } from "@/components/ui/card-shell";

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

function buildContextSummary(
  questions: ContextQuestion[],
  answers: Record<string, string>,
): string | null {
  const lines = questions
    .map((question) => {
      const answer = answers[question.id]?.trim();
      if (!answer) {
        return null;
      }

      return `${question.prompt}\n${answer}`;
    })
    .filter((line): line is string => line !== null);

  return lines.length > 0 ? lines.join("\n\n") : null;
}

export function SituationEntryFlow() {
  const [situationText, setSituationText] = useState("");
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
  const [isPending, startTransition] = useTransition();
  const [isSelectingPath, startSelectTransition] = useTransition();

  const hasSituation = situationText.trim().length > 0;
  const hasGoal = goal !== null;
  const isDecisionMode = goal === "decision";
  const isForecastMode = goal === "forecast";

  const questions = useMemo(() => {
    if (!hasSituation || !goal) {
      return [];
    }

    return selectContextQuestions(situationText, goal);
  }, [situationText, goal, hasSituation, hasGoal]);

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
  }, [situationText, goal]);

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

  function handleGenerateForecast() {
    if (!isForecastMode || !allQuestionsAnswered) {
      return;
    }

    setForecastError(null);

    startTransition(async () => {
      const response = await runFutureForecastAction({
        situationText: situationText.trim(),
        contextSummary: buildContextSummary(questions, answers),
      });

      if (response.error) {
        setForecastError(response.error);
        setForecastResult(null);
        return;
      }

      setForecastResult(response.result);
    });
  }

  const showContinueStep =
    hasSituation &&
    hasGoal &&
    questionsComplete &&
    !simulatorResult &&
    !forecastResult &&
    !pathForecastResult;

  function handleContinueToDecisionSimulator() {
    if (!isDecisionMode || !allQuestionsAnswered) {
      return;
    }

    setSimulatorError(null);

    startTransition(async () => {
      const response = await runDecisionSimulatorAction({
        situationText: situationText.trim(),
        contextSummary: buildContextSummary(questions, answers),
      });

      if (response.error) {
        setSimulatorError(response.error);
        setSimulatorResult(null);
        return;
      }

      setSimulatorResult(response.result);
    });
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

  function handleForecastSelectedPath() {
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

    startTransition(async () => {
      const response = await runFutureForecastAction({
        situationText: situationText.trim(),
        contextSummary: buildContextSummary(questions, answers),
        momentId: simulatorResult.momentId,
        selectedPath: {
          id: selectedPath.id,
          title: formattedPath.title,
          description: selectedPath.description,
          benefits: selectedPath.benefits,
          consequences: selectedPath.consequences,
          future_shift: selectedPath.future_shift,
          themes: selectedPath.themes,
        },
      });

      if (response.error) {
        setPathForecastError(response.error);
        setPathForecastResult(null);
        return;
      }

      setPathForecastResult(response.result);
    });
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
            }
          }}
          placeholder="Describe what's happening or what you're thinking about…"
          rows={5}
          className="mt-4 w-full resize-y rounded-[var(--radius-card)] border border-[var(--ink-tertiary)]/25 bg-[var(--surface)] px-4 py-3 text-body text-ink-primary placeholder:text-ink-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-ring)]"
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
        title="Let's understand your situation"
        visible={hasSituation && hasGoal && !simulatorResult && !forecastResult && !pathForecastResult}
      >
        <p className="mb-5 text-body-small text-ink-secondary">
          One question at a time. Your answers shape what comes next.
        </p>
        <ContextQuestionsStage
          questions={questions}
          answers={answers}
          onAnswerChange={handleAnswerChange}
          onComplete={() => setQuestionsComplete(true)}
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
              disabled={!allQuestionsAnswered || isPending}
              onClick={handleContinueToDecisionSimulator}
            >
              {isPending ? "Generating decisions…" : "Continue to Decision Simulator"}
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
              disabled={!allQuestionsAnswered || isPending}
              onClick={handleGenerateForecast}
            >
              {isPending ? "Generating forecast…" : "Generate Forecast"}
            </Button>
          </>
        )}
      </FlowStep>

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
          isForecastPending={isPending}
          forecastBridgeError={pathForecastError}
        />
      ) : null}

      {pathForecastResult && isDecisionMode ? (
        <FutureForecastResultView forecast={pathForecastResult} />
      ) : null}

      {forecastResult && isForecastMode ? (
        <FutureForecastResultView forecast={forecastResult} />
      ) : null}
    </div>
  );
}
