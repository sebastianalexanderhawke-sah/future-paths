"use client";

import { useEffect, useRef } from "react";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * The landing page's editorial motion: every wrapped chapter tracks scroll
 * position continuously — approaching content grows gently into focus
 * (opacity + a ~3.5% scale + a small rise), and a chapter leaving through
 * the top quietly recedes to half presence, handing attention to the next.
 * Nothing is pinned, no scrolling is hijacked, and there is no parallax:
 * the page scrolls exactly as a static page would, the cards simply carry
 * their distance from reading height.
 *
 * Structural guarantees:
 * - Server markup is untouched; styles are written only after hydration,
 *   so the page is complete without JavaScript.
 * - Reduced-motion visitors are never registered — no transforms at all.
 * - GPU-friendly properties only (opacity, translate3d, scale), written in
 *   one shared requestAnimationFrame pass. Reads (getBoundingClientRect)
 *   never interleave with layout-affecting writes, so there is no thrash.
 * - At full focus the inline transform is cleared entirely, keeping text
 *   rendering crisp at rest.
 */

const tracked = new Set<HTMLElement>();
let rafId: number | null = null;
let listening = false;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Ease-out: the last few percent of focus arrive softly. */
function easeOut(progress: number): number {
  return 1 - (1 - progress) * (1 - progress);
}

function applyFrame() {
  rafId = null;
  const vh = window.innerHeight;

  for (const element of tracked) {
    const rect = element.getBoundingClientRect();

    // Entering: 0 with the card's top at the viewport's bottom edge → 1
    // once it clears the lower 28% — the card grows into focus as it
    // approaches reading height.
    const enter = easeOut(clamp01((vh - rect.top) / (vh * 0.28)));
    // Leaving: 1 while the card's bottom sits below the top 22% band; the
    // finished chapter dims toward half presence as it exits above.
    const exit = clamp01(rect.bottom / (vh * 0.22));

    const opacity = enter * (0.5 + 0.5 * exit);
    const scale = (0.965 + 0.035 * enter) * (0.99 + 0.01 * exit);
    const rise = 20 * (1 - enter);

    element.style.opacity = opacity >= 0.999 ? "" : opacity.toFixed(3);
    element.style.transform =
      enter >= 1 && exit >= 1
        ? ""
        : `translate3d(0, ${rise.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
  }
}

function requestFrame() {
  if (rafId === null) rafId = requestAnimationFrame(applyFrame);
}

function startListening() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame);
}

function stopListeningIfIdle() {
  if (!listening || tracked.size > 0) return;
  listening = false;
  window.removeEventListener("scroll", requestFrame);
  window.removeEventListener("resize", requestFrame);
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function Reveal({ children, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    tracked.add(element);
    startListening();
    requestFrame();

    return () => {
      tracked.delete(element);
      element.style.opacity = "";
      element.style.transform = "";
      stopListeningIfIdle();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
