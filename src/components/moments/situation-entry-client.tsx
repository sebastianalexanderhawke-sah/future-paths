"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  generateDiscoveryQuestionsAction,
} from "@/actions/discovery-questions";
import { runDecisionSimulatorAction } from "@/actions/decision-simulator";
import { runForecastModeAction } from "@/actions/future-forecast";
import {
  areAllQuestionsAnswered,
  buildContextSummary,
  selectQuestionsForGoal,
  toContextQuestion,
  type ContextQuestion,
  type SituationGoal,
} from "@/components/home/context-questions";
import { ContextQuestionsStage } from "@/components/home/context-questions-stage";

type Step = "situation" | "mode" | "questions" | "action";

function currentStep(
  situationText: string,
  additionalContext: string,
  goal: SituationGoal | null,
  questionsComplete: boolean,
): Step {
  if (!situationText.trim() || !additionalContext.trim()) return "situation";
  if (!goal) return "mode";
  if (!questionsComplete) return "questions";
  return "action";
}

export function SituationEntryClient() {
  const router = useRouter();

  const [situationText, setSituationText] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [goal, setGoal] = useState<SituationGoal | null>(null);
  const [questions, setQuestions] = useState<ContextQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionsComplete, setQuestionsComplete] = useState(false);
  const [loadingQuestions, startQuestionsTransition] = useTransition();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const step = currentStep(situationText, additionalContext, goal, questionsComplete);

  // Reset questions and answers whenever situation text or goal changes
  const prevGoalRef = useRef<SituationGoal | null>(null);
  useEffect(() => {
    if (goal === prevGoalRef.current) return;
    prevGoalRef.current = goal;

    setAnswers({});
    setQuestionsComplete(false);
    setQuestions([]);
    setError(null);

    if (!situationText.trim() || !goal) return;

    startQuestionsTransition(async () => {
      const response = await generateDiscoveryQuestionsAction({
        situationText: situationText.trim(),
        goal,
        additionalContext: additionalContext.trim() || undefined,
      });

      if ("error" in response) {
        // Fall back to rule-based questions
        const { planDiscoveryQuestionSession, MAX_DISCOVERY_QUESTIONS } = await import(
          "@/lib/discovery-question-planner"
        );
        const fallback = planDiscoveryQuestionSession(
          { title: situationText.trim(), goal },
          MAX_DISCOVERY_QUESTIONS,
        );
        setQuestions(selectQuestionsForGoal(fallback.map(toContextQuestion), goal));
        return;
      }

      setQuestions(selectQuestionsForGoal(response.questions.map(toContextQuestion), goal));
    });
  }, [goal, situationText, additionalContext]);

  const allAnswered = areAllQuestionsAnswered(questions, answers);

  function handleAnswerChange(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleAction() {
    if (!goal || !allAnswered) return;

    const contextSummary = buildContextSummary(
      questions,
      answers,
      additionalContext.trim() || undefined,
    );

    setError(null);

    startTransition(async () => {
      if (goal === "decision") {
        const result = await runDecisionSimulatorAction({
          situationText: situationText.trim(),
          contextSummary,
        });
        if (result.error || !result.result) {
          setError(result.error ?? "Something went wrong.");
          return;
        }
        router.push(`/moments/${result.result.momentId}`);
        return;
      }

      // goal === "forecast"
      const result = await runForecastModeAction({
        situationText: situationText.trim(),
        contextSummary,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/moments/${result.momentId}`);
    });
  }

  const actionLabel =
    goal === "decision"
      ? isPending
        ? "Exploring decisions…"
        : "Explore decisions"
      : isPending
        ? "Generating forecast…"
        : "Generate forecast";

  return (
    <div className="flex flex-col gap-8">

      {/* ── Situation ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="situation-text" className="text-lg font-semibold text-zinc-900">
            Give this situation a short title
          </label>
          <input
            id="situation-text"
            type="text"
            value={situationText}
            onChange={(e) => {
              setSituationText(e.target.value);
              if (!e.target.value.trim()) {
                setGoal(null);
              }
            }}
            autoFocus
            maxLength={120}
            placeholder="e.g. A friendship feels different lately"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="additional-context" className="text-sm font-semibold text-zinc-900">
            What's the context?
          </label>
          <p className="text-sm text-zinc-500">
            This is what the forecast and paths are actually built from — be specific.
          </p>
          <textarea
            id="additional-context"
            required
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="What happened, who's involved, what you've tried, any constraints…"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 resize-none"
          />
        </div>
      </div>

      {/* ── Mode selector ────────────────────────────────────────────── */}
      {step !== "situation" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-zinc-900">What are you looking for?</p>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50">
            <input
              type="radio"
              name="entry-goal"
              value="decision"
              checked={goal === "decision"}
              onChange={() => setGoal("decision")}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium text-zinc-900">Explore Decisions</span>
              <span className="mt-0.5 block text-sm text-zinc-500">Help me decide what to do.</span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50">
            <input
              type="radio"
              name="entry-goal"
              value="forecast"
              checked={goal === "forecast"}
              onChange={() => setGoal("forecast")}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium text-zinc-900">Forecast Futures</span>
              <span className="mt-0.5 block text-sm text-zinc-500">
                Help me understand what may happen next.
              </span>
            </span>
          </label>
        </div>
      ) : null}

      {/* ── Discovery questions ──────────────────────────────────────── */}
      {step === "questions" || step === "action" ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          {loadingQuestions ? (
            <p className="text-sm text-zinc-500">Preparing questions…</p>
          ) : questions.length > 0 ? (
            <ContextQuestionsStage
              questions={questions}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              onComplete={() => setQuestionsComplete(true)}
              onContinueFromLast={() => true}
            />
          ) : null}
        </div>
      ) : null}

      {/* ── Action button ────────────────────────────────────────────── */}
      {step === "action" ? (
        <div className="flex flex-col gap-3">
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleAction}
            disabled={!allAnswered || isPending}
            className="self-start rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {actionLabel}
          </button>
        </div>
      ) : null}

    </div>
  );
}
