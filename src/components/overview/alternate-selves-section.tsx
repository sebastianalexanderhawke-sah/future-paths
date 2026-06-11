import Link from "next/link";

import { AlternateSelfCard } from "@/components/alternate-selves/alternate-self-card";
import type { PastCrossroadListItem } from "@/lib/past-crossroads";

import { OverviewEmptyPanel } from "./overview-empty-panel";
import { OverviewSection } from "./overview-section";

type AlternateSelvesSectionProps = {
  alternateSelves: PastCrossroadListItem[];
};

export function AlternateSelvesSection({ alternateSelves }: AlternateSelvesSectionProps) {
  return (
    <OverviewSection
      label="Story"
      title="Who could I have become?"
      description="Alternate selves"
      viewAllHref="/alternate-selves"
    >
      {alternateSelves.length === 0 ? (
        <OverviewEmptyPanel>
          Explore a significant past decision to see who you might have become along
          another path.{" "}
          <Link
            href="/alternate-selves/new"
            className="mt-4 inline-block text-ink-primary underline-offset-4 hover:underline"
          >
            New past crossroad
          </Link>
        </OverviewEmptyPanel>
      ) : (
        <div className="flex flex-col gap-3">
          {alternateSelves.map((item) => (
            <AlternateSelfCard key={item.crossroad.id} item={item} />
          ))}
        </div>
      )}
    </OverviewSection>
  );
}
