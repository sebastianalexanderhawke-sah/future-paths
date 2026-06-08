import Link from "next/link";

import type { Moment } from "@/types/database";

type MomentCardProps = {
  moment: Moment;
};

export function MomentCard({ moment }: MomentCardProps) {
  return (
    <Link
      href={`/moments/${moment.id}`}
      className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
    >
      <h2 className="font-medium text-zinc-900">{moment.title}</h2>
      {moment.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
          {moment.description}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-zinc-400">
        {new Date(moment.created_at).toLocaleDateString()}
      </p>
    </Link>
  );
}
