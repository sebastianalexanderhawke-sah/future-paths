import Link from "next/link";

import type { PastCrossroadListItem } from "@/lib/past-crossroads";

type AlternateSelfCardProps = {
  item: PastCrossroadListItem;
};

export function AlternateSelfCard({ item }: AlternateSelfCardProps) {
  const { crossroad, alternateSelf } = item;
  const themes = alternateSelf?.themes ?? [];

  return (
    <Link
      href={`/alternate-selves/${crossroad.id}`}
      className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
    >
      {alternateSelf ? (
        <p className="text-xs text-zinc-400">{alternateSelf.name}</p>
      ) : (
        <p className="text-xs text-zinc-400">Past crossroad</p>
      )}
      <h3 className="mt-2 text-sm font-medium text-zinc-900 line-clamp-2">
        {crossroad.what_happened}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
        {alternateSelf?.road_not_taken ??
          "Generate alternative paths to explore who you might have become."}
      </p>

      {themes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {themes.map((theme) => (
            <span
              key={theme}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
            >
              {theme}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
