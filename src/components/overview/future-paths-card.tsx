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
    <OverviewCard className="px-9 pb-7 pt-7">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="text-[#8b5cf6]">
              <IconRoute size={19} />
            </span>
            <h2 className="text-[22px] font-bold tracking-[-0.3px] text-[#111]">
              Future Paths
            </h2>
          </div>
          <p className="mt-1 text-[12px] text-[#aab0bb]">
            Where you&apos;re headed
          </p>
        </div>
        <Link
          href="/future-selves"
          className="text-[13px] font-medium text-[#9ca3af] transition-colors duration-150 hover:text-[#7c3aed]"
        >
          Explore all futures →
        </Link>
      </div>

      <BranchMap
        futureSelves={futureSelves}
        // Full card width — THIS rendering is the canonical composition the
        // aspect ratio in branch-language.ts is defined by: the original
        // full-width × 260px chart (966×260 in the 1120px shell).
        interaction={{ kind: "link", href: "/future-selves" }}
      />

    </OverviewCard>
  );
}
