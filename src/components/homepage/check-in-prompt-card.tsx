import Link from "next/link";

import type { Moment } from "@/types/database";

type CheckInPromptCardProps = {
  moment: Moment;
  hasCheckIns: boolean;
};

export function CheckInPromptCard({ moment, hasCheckIns }: CheckInPromptCardProps) {
  return (
    <Link
      href={`/moments/${moment.id}`}
      className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
    >
      <h3 className="font-medium text-zinc-900">{moment.title}</h3>
      <p className="mt-2 text-sm text-zinc-600">
        {hasCheckIns ? "Add another check-in" : "Record your first check-in"}
      </p>
    </Link>
  );
}
