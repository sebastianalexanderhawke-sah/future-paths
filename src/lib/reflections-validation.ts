const REFLECTION_ANSWER_MIN_LENGTH = 1;
const REFLECTION_ANSWER_MAX_LENGTH = 2000;

export function validateReflectionAnswerLength(answer: string): string | null {
  const trimmed = answer.trim();

  if (trimmed.length < REFLECTION_ANSWER_MIN_LENGTH) {
    return "Answer is required.";
  }

  if (trimmed.length > REFLECTION_ANSWER_MAX_LENGTH) {
    return `Answer must be ${REFLECTION_ANSWER_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}
