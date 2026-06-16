const MAX_LENGTH = 150;

/**
 * Returns the first sentence of text, splitting on . ! ? followed by
 * whitespace or end of string. Truncates to 150 chars with "..." if needed.
 */
export function firstSentence(text: string | null | undefined): string {
  if (!text?.trim()) {
    return "";
  }

  const trimmed = text.trim();
  const match = trimmed.match(/^[^.!?]*[.!?](?=\s|$)/);
  const sentence = (match ? match[0] : trimmed).trim();

  if (sentence.length <= MAX_LENGTH) {
    return sentence;
  }

  return `${sentence.slice(0, MAX_LENGTH - 3).trimEnd()}...`;
}
