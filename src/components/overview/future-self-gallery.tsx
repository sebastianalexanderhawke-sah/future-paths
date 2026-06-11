import type { FutureSelf } from "@/types/database";

import { FutureSelfPortraitCard } from "./future-self-portrait-card";

type FutureSelfGalleryProps = {
  futureSelves: FutureSelf[];
};

export function FutureSelfGallery({ futureSelves }: FutureSelfGalleryProps) {
  const featuredIndex = futureSelves.findIndex((futureSelf) => futureSelf.status === "active");

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[var(--surface-muted)] to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[var(--surface-muted)] to-transparent"
        aria-hidden="true"
      />

      <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {futureSelves.map((futureSelf, index) => (
          <div
            key={futureSelf.id}
            className="snap-center shrink-0 first:scroll-ml-2 last:scroll-mr-2"
          >
            <FutureSelfPortraitCard
              futureSelf={futureSelf}
              featured={index === (featuredIndex >= 0 ? featuredIndex : 0)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
