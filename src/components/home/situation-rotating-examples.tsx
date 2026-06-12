"use client";

import { useEffect, useState } from "react";

const ROTATING_EXAMPLES = [
  "Should I reconnect with an old friend?",
  "Should I ask a girl I like out?",
  "Should I start a business?",
  "Should I move to a new city?",
  "Should I quit my job?",
  "Should I take the opportunity?",
  "Should I stay where I am?",
  "Should I reach out again?",
] as const;

const CYCLE_MS = 2600;
const FADE_MS = 350;

export function SituationRotatingExamples() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let fadeTimeout: ReturnType<typeof setTimeout> | undefined;

    const interval = setInterval(() => {
      setVisible(false);
      fadeTimeout = setTimeout(() => {
        setIndex((current) => (current + 1) % ROTATING_EXAMPLES.length);
        setVisible(true);
      }, FADE_MS);
    }, CYCLE_MS);

    return () => {
      clearInterval(interval);
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
      }
    };
  }, []);

  return (
    <p
      aria-live="polite"
      aria-atomic="true"
      className={`min-h-[1.5rem] text-body text-ink-tertiary transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {ROTATING_EXAMPLES[index]}
    </p>
  );
}
