import Link from "next/link";

import { BranchMap } from "@/components/futures/branch-map";
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
    <OverviewCard className="px-9 pb-5 pt-6">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.3px] text-[#111]">
            Future Paths
          </h2>
          <p className="mt-1 text-[13px] text-[#999999]">
            Where you&apos;re headed
          </p>
        </div>
        <Link
          href="/future-selves"
          className="text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#6366f1]"
        >
          Explore all futures →
        </Link>
      </div>

      <BranchMap
        futureSelves={futureSelves}
        // Full card width — THIS rendering is the canonical composition the
        // aspect ratio in branch-language.ts is defined by (968px wide →
        // ~320px tall in the 1120px shell).
        interaction={{ kind: "link", href: "/future-selves" }}
      />
    </OverviewCard>
  );
}
