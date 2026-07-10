import Link from "next/link";

export type SituationStatus = {
  label: string;
  /** Text/dot tone. */
  color: string;
  /** Soft pill background. */
  soft: string;
};

type SituationCardProps = {
  href: string;
  title: string;
  summary: string | null;
  updatedLabel: string;
  status: SituationStatus;
};

/**
 * One active situation as a clickable card. Mirrors the OverviewCard surface
 * (border, radius, shadow, hover lift) so the grid reads as part of the same
 * system even though the whole card is a link.
 */
export function SituationCard({
  href,
  title,
  summary,
  updatedLabel,
  status,
}: SituationCardProps) {
  return (
    <Link
      href={href}
      className={[
        "group flex flex-col rounded-2xl border border-[#f0f0f2] bg-white px-7 py-6",
        "shadow-[0_1px_2px_rgba(17,17,17,0.02),0_12px_32px_rgba(17,17,17,0.04)]",
        "transition-[box-shadow,transform] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(17,17,17,0.03),0_18px_48px_rgba(17,17,17,0.07)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-[15px] font-semibold text-[#111]">
          {title}
        </h3>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: status.soft, color: status.color }}
        >
          {status.label}
        </span>
      </div>

      <p className="mt-1.5 truncate text-[13px] text-[#888888]">
        {summary ?? "No summary yet."}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[12px] text-[#999999]">
          Updated {updatedLabel}
        </span>
        <span className="text-[13px] font-medium text-[#b45309] transition-opacity duration-150 group-hover:opacity-80">
          Open →
        </span>
      </div>
    </Link>
  );
}
