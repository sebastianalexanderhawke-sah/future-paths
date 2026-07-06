"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import { OverviewCard } from "@/components/overview/overview-card";

const LAST_VISIT_KEY = "fp:last-visit-at";

export type SinceLastVisitItem = {
  key: string;
  /** Outcome-oriented sentence — what changed for the user, never how. */
  text: string;
  href: string;
  /** ISO timestamp of when the outcome happened. */
  at: string;
};

// The previous visit marker, read once per page load and cached so the
// snapshot stays referentially stable across renders. The server snapshot is
// null, so the card renders nothing until hydration completes — it can never
// flash stale content.
let cachedLastVisit: number | null | undefined;

function readLastVisit(): number | null {
  if (cachedLastVisit === undefined) {
    try {
      const raw = localStorage.getItem(LAST_VISIT_KEY);
      const parsed = raw ? Date.parse(raw) : Number.NaN;
      cachedLastVisit = Number.isNaN(parsed) ? null : parsed;
    } catch {
      cachedLastVisit = null;
    }
  }
  return cachedLastVisit;
}

const emptySubscribe = () => () => {};

type SinceLastVisitCardProps = {
  items: SinceLastVisitItem[];
};

/**
 * One calm, consolidated "Since your last visit" digest. The server passes
 * every candidate outcome with its timestamp; this component shows only the
 * ones that happened after the reader was last here, then advances the
 * stored marker. First-time visitors (no marker yet) see nothing — the card
 * never fabricates history.
 */
export function SinceLastVisitCard({ items }: SinceLastVisitCardProps) {
  const lastVisit = useSyncExternalStore(
    emptySubscribe,
    readLastVisit,
    () => null,
  );

  // Advance the marker once the page has been seen. The snapshot above is
  // cached, so this doesn't retroactively hide the card mid-visit.
  useEffect(() => {
    try {
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    } catch {
      // Storage unavailable — the card simply won't personalize.
    }
  }, []);

  const visibleItems = useMemo(() => {
    if (lastVisit === null) return [];
    return items.filter((item) => {
      const at = Date.parse(item.at);
      return !Number.isNaN(at) && at > lastVisit;
    });
  }, [items, lastVisit]);

  if (visibleItems.length === 0) return null;

  return (
    <OverviewCard className="px-8 py-6">
      <h2 className="text-[13px] font-semibold text-[#999999]">
        Since your last visit
      </h2>
      <div className="mt-2">
        {visibleItems.map((item, i) => (
          <Link
            key={item.key}
            href={item.href}
            className={[
              "flex items-center justify-between gap-4 py-2.5 transition-opacity duration-150 hover:opacity-80",
              i < visibleItems.length - 1 ? "border-b border-[#f5f5f5]" : "",
            ].join(" ")}
          >
            <span className="text-[14px] font-medium leading-snug text-[#111]">
              {item.text}
            </span>
            <span aria-hidden="true" className="shrink-0 text-[#cccccc]">
              ›
            </span>
          </Link>
        ))}
      </div>
    </OverviewCard>
  );
}
