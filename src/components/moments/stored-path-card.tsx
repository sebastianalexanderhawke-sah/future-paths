import { formatScannablePath, toFirstSentence } from "@/components/home/output-refinement";
import { ThemeChip } from "@/components/ui/theme-chip";
import type { Path } from "@/types/database";

type BulletListProps = { items: string[] };
function BulletList({ items }: BulletListProps) {
  const nonEmpty = items.filter((item) => item.trim().length > 0);
  if (nonEmpty.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-col gap-2">
      {nonEmpty.map((item) => (
        <li
          key={item}
          className="flex gap-2.5 text-[14px] leading-[1.6] text-[#333333]"
        >
          <span aria-hidden="true" className="text-[#cccccc]">
            •
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PathDetails({
  path,
  index,
  showThemes = true,
}: {
  path: Path;
  index: number;
  showThemes?: boolean;
}) {
  const scannable = formatScannablePath(path, index);

  return (
    <>
      {scannable.explanation ? (
        <p className="mt-2 max-w-[52em] text-[14px] leading-[1.7] text-[#777777]">
          {scannable.explanation}
        </p>
      ) : null}

      {showThemes && path.themes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {path.themes.map((theme) => (
            <ThemeChip key={theme} theme={theme} />
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-5">
        {scannable.benefits.length > 0 ? (
          <div>
            <p className="text-[12px] font-semibold text-[#22c55e]">Benefits</p>
            <BulletList items={scannable.benefits} />
          </div>
        ) : null}

        {scannable.consequences.length > 0 ? (
          <div>
            <p className="text-[12px] font-semibold text-[#ef4444]">
              Tradeoffs
            </p>
            <BulletList items={scannable.consequences} />
          </div>
        ) : null}

        {scannable.futureYou ? (
          <div className="rounded-xl bg-[#f8f7ff] px-5 py-4">
            <p className="text-[12px] font-semibold text-[#6366f1]">
              Future you
            </p>
            <p className="mt-1.5 text-[14px] leading-[1.7] text-[#333333]">
              {scannable.futureYou.replace(/[:;,\s]+$/, "")}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

// ── Chosen path (fully expanded) ─────────────────────────────────────────────

type ChosenPathCardProps = { path: Path; index?: number };

export function ChosenPathCard({ path, index = 0 }: ChosenPathCardProps) {
  const scannable = formatScannablePath(path, index);

  return (
    <div className="rounded-xl border border-[#ececf0] bg-white px-6 py-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-[#111]">
          {scannable.title}
        </h3>
        <span className="shrink-0 rounded-full bg-[#f0fdf4] px-3 py-1 text-[11px] font-semibold text-[#22c55e]">
          Your path
        </span>
      </div>

      <PathDetails path={path} index={index} />
    </div>
  );
}

// ── Non-chosen path (selectable card with inner expand) ─────────────────────

type OtherPathCardProps = { path: Path; index: number };

export function OtherPathCard({ path, index }: OtherPathCardProps) {
  const scannable = formatScannablePath(path, index);
  const preview = toFirstSentence(scannable.explanation ?? "", 140);

  return (
    <div className="overflow-hidden rounded-xl border border-[#ececf0] bg-white">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-7 py-6 transition-colors duration-150 hover:bg-[#fafafa] [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 flex-col gap-2.5">
            <h4 className="text-[15px] font-semibold text-[#111]">
              {scannable.title}
            </h4>
            {path.themes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {path.themes.map((theme) => (
                  <ThemeChip key={theme} theme={theme} showDot={false} />
                ))}
              </div>
            ) : null}
            {preview ? (
              <p className="text-[13px] leading-relaxed text-[#888888] group-open:hidden">
                {preview}
              </p>
            ) : null}
          </div>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="mt-1.5 h-4 w-4 shrink-0 text-[#cccccc] transition-transform duration-200 group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </summary>

        <div className="border-t border-[#f5f5f5] px-7 pb-7 pt-2">
          <PathDetails path={path} index={index} showThemes={false} />
        </div>
      </details>
    </div>
  );
}
