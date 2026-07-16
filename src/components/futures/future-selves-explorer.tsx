"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { layoutBranches } from "@/components/futures/branch-language";
import { BranchMap } from "@/components/futures/branch-map";
import { FutureCard } from "@/components/futures/future-card";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { FutureSelf } from "@/types/database";

type FutureSelvesExplorerProps = {
  futureSelves: FutureSelf[];
  /** Deep link (?selected=<id> from the Overview map): this future's dialog
      opens on load. Unknown or faded ids simply render nothing open. */
  initialOpenId?: string | null;
};

/**
 * The active-futures visualization of the dedicated Future Selves page: the
 * SAME canonical BranchMap the overview's Future Paths card renders, given a
 * larger chart area — zooming into the overview, not a second visualization.
 * What this adds is interaction depth: selecting a branch opens the full
 * identity card in a dialog. Faded futures live in their own sibling card on
 * the page (FadedPathsCard), deliberately separate from the tree.
 */
export function FutureSelvesExplorer({
  futureSelves,
  initialOpenId = null,
}: FutureSelvesExplorerProps) {
  const active = useMemo(
    () => futureSelves.filter((f) => f.status === "active"),
    [futureSelves],
  );

  // Tree-first: nothing is selected on load unless a deep link named a
  // future. The card exists only as a temporary deep dive in a modal.
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const [closing, setClosing] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // The same layout the map draws from — used here only to hand the dialog
  // card the accent its branch wears.
  const branches = useMemo(() => layoutBranches(active), [active]);
  const openBranch = branches.find((b) => b.futureSelf.id === openId) ?? null;
  const openFuture = openBranch?.futureSelf ?? null;

  // The workflow bridge for the dialog footer: this future's strongest
  // supporting situation, when the attribution carries one. Checking in
  // there is exactly how the user keeps feeding this path — no new
  // mechanics, just a door to the existing one.
  const topSituation = (() => {
    const row = openFuture?.supporting_situations?.[0] as
      | Record<string, unknown>
      | undefined;
    const id = row?.momentId;
    const title = row?.momentTitle;
    return typeof id === "string" && typeof title === "string"
      ? { id, title }
      : null;
  })();

  // Modal open/close plumbing.
  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setOpenId(null);
      triggerRef.current?.focus();
      triggerRef.current = null;
    }, 160);
  }, []);

  useEffect(() => {
    if (!openId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openId, close]);

  const trapTab = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), summary, a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="w-full">
      {active.length > 0 ? (
        // The invitation speaks in the product's serif voice — the same
        // voice as "You" and the destination names it introduces — so the
        // heading belongs to the map instead of competing with it.
        <div className="text-center">
          <h2 className="font-voice text-[24px] font-medium tracking-[-0.01em] text-[#111]">
            Which future are you becoming?
          </h2>
          <p className="mt-2 text-[13px] text-[#71717a]">
            Each branch is a possible life. Select one to explore it.
          </p>
        </div>
      ) : null}

      <BranchMap
        futureSelves={active}
        // Full width of this page's quieter, wider surface: the exact
        // Overview composition, faithfully enlarged — never reshaped. The
        // top margin lets the hero breathe under its heading without
        // pushing the map into the card's lower half.
        widthClassName="mt-8"
        interaction={{
          kind: "dialog",
          openId,
          onOpen: (futureSelf, trigger) => {
            trackEvent(ANALYTICS_EVENTS.futureSelfExpanded, {
              future_self_id: futureSelf.id,
            });
            triggerRef.current = trigger;
            setOpenId(futureSelf.id);
          },
        }}
      />

      {/* Deep dive: a temporary, centered exploration of one future. */}
      {openFuture ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="presentation"
          onClick={close}
        >
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-zinc-200/50 backdrop-blur-[2px] ${
              closing ? "modal-backdrop-out" : "modal-backdrop-in"
            }`}
          />
          {/* The dialog is two layers: a non-scrolling shell that owns the
              radius, shadow, and close button (so the corner never clips the
              scrollbar and the close never scrolls away), and a scrolling
              body with the platform's quiet thin scrollbar. The width is a
              reading column, not a panel — the card's ~58ch prose should sit
              centered, not float in dead space. */}
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={openFuture.name}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={trapTab}
            className={`relative flex max-h-[85vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(17,17,17,0.06),0_32px_80px_rgba(17,17,17,0.18)] ${
              closing ? "modal-out" : "modal-in"
            }`}
          >
            <button
              ref={closeButtonRef}
              type="button"
              aria-label={`Close ${openFuture.name}`}
              onClick={close}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-lg leading-none text-zinc-500 backdrop-blur-sm transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            >
              ×
            </button>
            <div className="dialog-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {/* Frameless: the dialog shell already owns the radius and
                  border, so the card's own frame would double it — and its
                  rounded corners would scroll visibly through the middle. */}
              <FutureCard
                futureSelf={openFuture}
                accent={openBranch?.accent}
                frameless
              />
            </div>
            {/* The exploration doesn't end at Close: one quiet line back
                into the existing workflow — checking in on the situation
                that feeds this future most, or opening a situation when the
                attribution carries none. Existing routes only. */}
            <div className="flex items-center justify-between gap-4 border-t border-zinc-100 px-8 py-3.5 sm:px-10">
              <p className="hidden text-[13px] text-zinc-500 sm:block">
                Futures strengthen with what you actually do.
              </p>
              {/* The platform's black primary button — the same mark every
                  disclosure and primary action wears. */}
              {topSituation ? (
                <Link
                  href={`/moments/${topSituation.id}#check-in`}
                  className="min-w-0 truncate rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-ring)] focus-visible:ring-offset-2"
                >
                  Check in on “{topSituation.title}” →
                </Link>
              ) : (
                <Link
                  href="/moments"
                  className="shrink-0 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-ring)] focus-visible:ring-offset-2"
                >
                  Explore a situation →
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
