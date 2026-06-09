import Link from "next/link";

import type { AlternateSelf } from "@/types/database";

type AlternateSelfCardProps = {
  alternateSelf: AlternateSelf;
};

export function AlternateSelfCard({ alternateSelf }: AlternateSelfCardProps) {
  return (
    <Link
      href={`/alternate-selves/${alternateSelf.id}`}
      className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
    >
      <p className="text-xs text-zinc-400">{alternateSelf.name}</p>
      <h3 className="mt-2 text-sm font-medium text-zinc-900">
        {alternateSelf.decision_title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
        {alternateSelf.road_not_taken}
      </p>

      {alternateSelf.themes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {alternateSelf.themes.map((theme) => (
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
