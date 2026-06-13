"use client";

import { useEffect, useState } from "react";

import type { ContextQuestion } from "./context-questions";
import { Button } from "@/components/ui/button";

type ContextQuestionsStageProps = {
  questions: ContextQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  onComplete?: () => void;
  onContinueFromLast?: () => boolean;
};

export function ContextQuestionsStage({
  questions,
  answers,
  onAnswerChange,
  onComplete,
  onContinueFromLast,
}: ContextQuestionsStageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [questions]);

  if (questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id] ?? "";
  const isCurrentAnswered = currentAnswer.trim().length > 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const allAnswered = questions.every((question) => answers[question.id]?.trim().length > 0);

  function handleContinue() {
    if (!isCurrentAnswered) {
      return;
    }

    if (isLastQuestion) {
      const shouldComplete = onContinueFromLast?.() ?? true;
      if (shouldComplete) {
        onComplete?.();
      } else {
        setCurrentIndex((index) => index + 1);
      }
      return;
    }

    setCurrentIndex((index) => index + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-label text-ink-tertiary">
        Question {currentIndex + 1} of {questions.length}
      </p>

      <div>
        <label htmlFor={currentQuestion.id} className="block text-h2 text-ink-primary">
          {currentQuestion.prompt}
        </label>
        <textarea
          id={currentQuestion.id}
          value={currentAnswer}
          onChange={(event) => onAnswerChange(currentQuestion.id, event.target.value)}
          rows={3}
          placeholder="Your answer…"
          className="mt-3 w-full resize-y rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/25 bg-[var(--surface)] px-3 py-2 text-body text-ink-primary placeholder:text-ink-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-ring)]"
        />
      </div>

      <div className="flex items-center gap-3">
        {currentIndex > 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCurrentIndex((index) => index - 1)}
          >
            Back
          </Button>
        ) : null}

        <Button type="button" disabled={!isCurrentAnswered} onClick={handleContinue}>
          {isLastQuestion ? (allAnswered ? "Done" : "Answer to finish") : "Continue"}
        </Button>
      </div>
    </div>
  );
}
