import { formatScannablePath } from "@/components/home/output-refinement";
import { ThemeChip } from "@/components/ui/theme-chip";
import type { Path } from "@/types/database";

function Bullets({ items }: { items: string[] }) {
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

type ChosenPathPanelProps = { path: Path; index?: number };

/**
 * The chosen path presented as a decision, not a panel: large title,
 * breathing room, and clear Benefits / Tradeoffs / Future note hierarchy.
 * Pure presentation over the same formatScannablePath output the original
 * card used — no AI text is altered.
 */
export function ChosenPathPanel({ path, index = 0 }: ChosenPathPanelProps) {
  const scannable = formatScannablePath(path, index);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-voice max-w-[24em] text-[24px] font-medium leading-[1.3] tracking-[-0.3px] text-[#111]">
          {scannable.title}
        </h3>
        <span className="mt-1 shrink-0 rounded-full bg-[#ecfdf5] px-3 py-1 text-[11px] font-semibold text-[#10b981]">
          Your path
        </span>
      </div>

      {scannable.explanation ? (
        <p className="mt-3 max-w-[52em] text-[14px] leading-[1.7] text-[#707070]">
          {scannable.explanation}
        </p>
      ) : null}

      {path.themes.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {path.themes.map((theme) => (
            <ThemeChip key={theme} theme={theme} />
          ))}
        </div>
      ) : null}

      {scannable.benefits.length > 0 || scannable.consequences.length > 0 ? (
        <div className="mt-7 grid grid-cols-2 gap-9">
          {scannable.benefits.length > 0 ? (
            <div>
              <p className="text-[12px] font-semibold text-[#10b981]">
                Benefits
              </p>
              <Bullets items={scannable.benefits} />
            </div>
          ) : null}
          {scannable.consequences.length > 0 ? (
            <div>
              <p className="text-[12px] font-semibold text-[#f43f5e]">
                Tradeoffs
              </p>
              <Bullets items={scannable.consequences} />
            </div>
          ) : null}
        </div>
      ) : null}

      {scannable.futureYou ? (
        <div className="mt-7 rounded-xl bg-[#f8f7ff] px-5 py-4">
          <p className="text-[12px] font-semibold text-[#b45309]">
            Future note
          </p>
          <p className="mt-1.5 max-w-[52em] text-[14px] leading-[1.7] text-[#333333]">
            {scannable.futureYou.replace(/[:;,\s]+$/, "")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
