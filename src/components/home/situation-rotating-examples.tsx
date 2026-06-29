"use client";

import { useEffect, useState } from "react";

const ROTATING_EXAMPLES = [
  "Should I move to Dallas?",
  "I want to start a business",
  "Should I ask her out?",
  "I'm thinking about quitting my job",
  "I lost my job",
  "Should I relocate?",
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
