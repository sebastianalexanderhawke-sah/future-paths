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
 * The dedicated Future Selves page: the SAME canonical BranchMap the
 * overview's Future Paths card renders, given a larger chart area — zooming
 * into the overview, not a second visualization. What this page adds is
 * interaction depth: selecting a branch opens the full identity card in a
 * dialog, and faded futures are listed below the map.
 */
export function FutureSelvesExplorer({ futureSelves }: FutureSelvesExplorerProps) {
  const active = useMemo(
    () => futureSelves.filter((f) => f.status === "active"),
    [futureSelves],
  );
  const faded = useMemo(
    () => futureSelves.filter((f) => f.status === "faded"),
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

  const fadedSection =
    faded.length > 0 ? (
      <details className="group mt-6">
        <summary className="cursor-pointer list-none py-1 text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#6366f1] [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">▼ Faded futures ({faded.length})</span>
          <span className="hidden group-open:inline">▲ Hide faded futures</span>
        </summary>
        <p className="mt-2 text-[13px] leading-relaxed text-[#888888]">
          Paths that once emerged but are no longer being reinforced. Active
          futures are the ones currently shaping your trajectory.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {faded.map((futureSelf) => (
            <FutureCard key={futureSelf.id} futureSelf={futureSelf} />
          ))}
        </div>
      </details>
    ) : null;

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
        // Overview composition, faithfully enlarged — never reshaped.
        widthClassName="mt-4"
        interaction={{
          kind: "dialog",
          openId,
          onOpen: (futureSelf, trigger) => {
            triggerRef.current = trigger;
            setOpenId(futureSelf.id);
          },
        }}
      />

      <div className="mx-auto w-full max-w-3xl">{fadedSection}</div>

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
            className={`relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl ${
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
