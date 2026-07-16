"use client";

import { useEffect, useRef } from "react";

/**
 * The landing page's editorial motion, in five scroll-driven languages.
 * Every wrapped element tracks scroll position continuously — nothing is
 * pinned, no scrolling is hijacked, there is no parallax, and there are no
 * time-based delays: the page scrolls exactly as a static page would, each
 * element simply carries its distance from reading height.
 *
 * The effects (each section of the page owns one, so motion carries the
 * story instead of decorating it):
 * - "focus"   — the page's default voice: approaching content grows gently
 *               into focus (opacity + ~3.5% scale + a small rise) and a
 *               chapter leaving through the top recedes to half presence.
 * - "stagger" — direct children arrive one after another from a single
 *               scroll position; for rows of sibling cards whose tops align.
 * - "draw"    — a line draws itself downward, its tip tracking reading
 *               height; for the story's connecting spine.
 * - "bloom"   — opacity + a deeper, slower scale-up with no rise and no
 *               exit recede; for the Future Self map growing into place.
 * - "unfold"  — content unrolls from the top edge as it enters; for the
 *               forecast reading.
 *
 * Structural guarantees:
 * - Server markup is untouched; styles are written only after hydration,
 *   so the page is complete without JavaScript.
 * - Reduced-motion visitors are never registered — no transforms at all.
 * - Compositor/paint-friendly properties only (opacity, translate3d, scale,
 *   clip-path), written in one shared requestAnimationFrame pass. Reads
 *   (getBoundingClientRect) never interleave with layout-affecting writes,
 *   so there is no thrash.
 * - At full focus all inline styles are cleared entirely, keeping text
 *   rendering crisp at rest.
 */

export type RevealEffect = "focus" | "stagger" | "draw" | "bloom" | "unfold";

type RevealProps = {
  /** Optional: a "draw" element is usually an empty decorative line. */
  children?: React.ReactNode;
  className?: string;
  effect?: RevealEffect;
};

const tracked = new Map<HTMLElement, RevealEffect>();
let rafId: number | null = null;
let listening = false;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Ease-out: the last few percent of focus arrive softly. */
function easeOut(progress: number): number {
  return 1 - (1 - progress) * (1 - progress);
}

function clearStyles(element: HTMLElement) {
  element.style.opacity = "";
  element.style.transform = "";
  element.style.clipPath = "";
}

function applyFrame() {
  rafId = null;
  const vh = window.innerHeight;

  for (const [element, effect] of tracked) {
    const rect = element.getBoundingClientRect();

    switch (effect) {
      case "focus": {
        // Entering: 0 with the element's top at the viewport's bottom edge
        // → 1 once it clears the lower 28%. Leaving: dims toward half
        // presence as the finished chapter exits through the top 22% band.
        const enter = easeOut(clamp01((vh - rect.top) / (vh * 0.28)));
        const exit = clamp01(rect.bottom / (vh * 0.22));

        const opacity = enter * (0.5 + 0.5 * exit);
        const scale = (0.965 + 0.035 * enter) * (0.99 + 0.01 * exit);
        const rise = 20 * (1 - enter);

        element.style.opacity = opacity >= 0.999 ? "" : opacity.toFixed(3);
        element.style.transform =
          enter >= 1 && exit >= 1
            ? ""
            : `translate3d(0, ${rise.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        break;
      }

      case "stagger": {
        // One shared entry window; each child joins 22% of it later than
        // the one before, so a row of cards arrives left to right.
        const raw = (vh - rect.top) / (vh * 0.5);
        const children = element.children;
        for (let i = 0; i < children.length; i++) {
          const child = children[i] as HTMLElement;
          const progress = easeOut(clamp01(raw - i * 0.22));
          child.style.opacity = progress >= 0.999 ? "" : progress.toFixed(3);
          child.style.transform =
            progress >= 0.999
              ? ""
              : `translate3d(0, ${(16 * (1 - progress)).toFixed(2)}px, 0)`;
        }
        break;
      }

      case "draw": {
        // The line's tip follows reading height (75% down the viewport).
        // offsetHeight (layout height) rather than rect.height: the rect
        // shrinks with the scaleY we ourselves applied last frame.
        const progress = clamp01((vh * 0.75 - rect.top) / element.offsetHeight);
        element.style.transform =
          progress >= 0.999 ? "" : `scaleY(${progress.toFixed(4)})`;
        break;
      }

      case "bloom": {
        // A deeper scale over a longer window — growth, not movement.
        const enter = easeOut(clamp01((vh - rect.top) / (vh * 0.5)));
        element.style.opacity =
          enter >= 0.999 ? "" : (0.2 + 0.8 * enter).toFixed(3);
        element.style.transform =
          enter >= 0.999 ? "" : `scale(${(0.92 + 0.08 * enter).toFixed(4)})`;
        break;
      }

      case "unfold": {
        // The card unrolls from its top edge as it enters.
        const enter = easeOut(clamp01((vh - rect.top) / (vh * 0.42)));
        element.style.opacity =
          enter >= 0.999 ? "" : (0.35 + 0.65 * enter).toFixed(3);
        element.style.clipPath =
          enter >= 0.999 ? "" : `inset(0 0 ${((1 - enter) * 55).toFixed(2)}% 0 round 16px)`;
        break;
      }
    }
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

export function Reveal({ children, className = "", effect = "focus" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (effect === "draw") element.style.transformOrigin = "top";
    tracked.set(element, effect);
    startListening();
    requestFrame();

    return () => {
      tracked.delete(element);
      clearStyles(element);
      element.style.transformOrigin = "";
      for (const child of element.children) {
        clearStyles(child as HTMLElement);
      }
      stopListeningIfIdle();
    };
  }, [effect]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
