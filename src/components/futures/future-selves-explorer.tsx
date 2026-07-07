"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { layoutBranches } from "@/components/futures/branch-language";
import { BranchMap } from "@/components/futures/branch-map";
import { FutureCard } from "@/components/futures/future-card";
import type { FutureSelf } from "@/types/database";

type FutureSelvesExplorerProps = {
  futureSelves: FutureSelf[];
};

/**
 * The active-futures visualization of the dedicated Future Selves page: the
 * SAME canonical BranchMap the overview's Future Paths card renders, given a
 * larger chart area — zooming into the overview, not a second visualization.
 * What this adds is interaction depth: selecting a branch opens the full
 * identity card in a dialog. Faded futures live in their own sibling card on
 * the page (FadedPathsCard), deliberately separate from the tree.
 */
export function FutureSelvesExplorer({ futureSelves }: FutureSelvesExplorerProps) {
  const active = useMemo(
    () => futureSelves.filter((f) => f.status === "active"),
    [futureSelves],
  );

  // Tree-first: nothing is selected on load. The card exists only as a
  // temporary deep dive in a modal.
  const [openId, setOpenId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // The same layout the map draws from — used here only to hand the dialog
  // card the accent its branch wears.
  const branches = useMemo(() => layoutBranches(active), [active]);
  const openBranch = branches.find((b) => b.futureSelf.id === openId) ?? null;
  const openFuture = openBranch?.futureSelf ?? null;

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
      'button, summary, a[href], [tabindex]:not([tabindex="-1"])',
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
        <div className="text-center">
          <h2 className="text-[22px] font-bold tracking-[-0.3px] text-[#111]">
            Which future are you becoming?
          </h2>
          <p className="mt-1.5 text-[13px] text-[#999999]">
            Each branch is a possible life. Select one to explore it.
          </p>
        </div>
      ) : null}

      <BranchMap
        futureSelves={active}
        // Full width of this page's quieter, wider surface: the exact
        // Overview composition, faithfully enlarged — never reshaped. The
        // generous top margin lets the hero breathe under its heading.
        widthClassName="mt-10"
        interaction={{
          kind: "dialog",
          openId,
          onOpen: (futureSelf, trigger) => {
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
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={openFuture.name}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={trapTab}
            className={`relative max-h-[85vh] w-full max-w-[960px] overflow-y-auto rounded-2xl shadow-xl ${
              closing ? "modal-out" : "modal-in"
            }`}
          >
            <button
              ref={closeButtonRef}
              type="button"
              aria-label={`Close ${openFuture.name}`}
              onClick={close}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            >
              ×
            </button>
            <FutureCard futureSelf={openFuture} accent={openBranch?.accent} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
