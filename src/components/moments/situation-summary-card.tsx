type SituationSummaryCardProps = {
  text: string;
};

// Collapsed by default: a 3-line preview is enough to confirm "yes, Future
// Paths understands my situation" without the summary dominating the page.
export function SituationSummaryCard({ text }: SituationSummaryCardProps) {
  return (
    <details className="group rounded-xl border border-zinc-200 bg-white">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-6 py-4 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            What Future Paths Understands
          </p>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-700 group-open:hidden">
            {text}
          </p>
        </div>
        <span aria-hidden="true" className="mt-0.5 shrink-0 text-xs text-zinc-400 hover:text-zinc-600">
          <span className="group-open:hidden">Show more ↓</span>
          <span className="hidden group-open:inline">Hide ↑</span>
        </span>
      </summary>
      <div className="border-t border-zinc-100 px-6 pb-5 pt-3">
        <p className="text-sm leading-relaxed text-zinc-700">{text}</p>
      </div>
    </details>
  );
}
