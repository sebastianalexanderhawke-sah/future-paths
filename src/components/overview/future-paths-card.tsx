import Link from "next/link";

import { BranchMap } from "@/components/futures/branch-map";
import { IconRoute } from "@/components/icons";
import { OverviewCard } from "@/components/overview/overview-card";
import type { FutureSelf } from "@/types/database";

type FuturePathsCardProps = {
  futureSelves: FutureSelf[];
};

/**
 * The overview's Future Paths section: the canonical branch visualization at
 * dashboard scale. The dedicated Future Selves page renders the exact same
 * BranchMap larger — selecting any branch here zooms into that page.
 */
export function FuturePathsCard({ futureSelves }: FuturePathsCardProps) {
  return (
    // Header grammar shared by every Overview card (icon 16 + 17px bold
    // title, 12px subtitle, mb-8; footer action bottom-left behind pt-6).
    // Horizontal padding stays px-9: the BranchMap below is the canonical
    // 966px composition and must not change width.
    <OverviewCard className="flex flex-col px-9 py-9">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-[#8b5cf6]">
            <IconRoute size={16} />
          </span>
          <h2 className="text-[17px] font-bold text-[#111]">
            Future Paths
          </h2>
        </div>
        <p className="mt-1 text-[12px] text-[#aab0bb]">
          Where you&apos;re headed
        </p>
      </div>

      <BranchMap
        futureSelves={futureSelves}
        // Full card width — THIS rendering is the canonical composition the
        // aspect ratio in branch-language.ts is defined by: the original
        // full-width × 260px chart (966×260 in the 1120px shell).
        interaction={{ kind: "link", href: "/future-selves" }}
      />

      <Link
        href="/future-selves"
        className="mt-auto pt-6 text-[13px] font-medium text-[#9ca3af] transition-colors duration-150 hover:text-[#7c3aed]"
      >
        Explore all futures →
      </Link>
    </OverviewCard>
  );
}
