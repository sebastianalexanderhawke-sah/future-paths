import type { IdentityUpdate } from "@/types/database";

type IdentityUpdateCardProps = {
  update: IdentityUpdate;
};

export function IdentityUpdateCard({ update }: IdentityUpdateCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-400">
        {new Date(update.created_at).toLocaleDateString()}
      </p>
      <h3 className="mt-2 text-sm font-medium text-zinc-900">{update.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{update.summary}</p>
    </article>
  );
}
