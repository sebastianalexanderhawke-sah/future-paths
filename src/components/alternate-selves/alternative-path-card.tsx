import { selectAlternativePathAction } from "@/actions/alternate-selves";
import type { PastAlternativePath } from "@/types/database";

type AlternativePathCardProps = {
  path: PastAlternativePath;
  crossroadId: string;
  canSelect: boolean;
};

export function AlternativePathCard({
  path,
  crossroadId,
  canSelect,
}: AlternativePathCardProps) {
  return (
    <article
      className={`rounded-lg border bg-white p-5 ${
        path.is_selected
          ? "border-zinc-900 ring-1 ring-zinc-900"
          : "border-zinc-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-medium text-zinc-900">{path.title}</h3>
        {path.is_selected ? (
          <span className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white">
            Selected
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-600">{path.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {path.themes.map((theme) => (
          <span
            key={theme}
            className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600"
          >
            {theme}
          </span>
        ))}
      </div>

      <p className="mt-4 text-sm text-zinc-600">
        <span className="font-medium text-zinc-900">Possible future shift: </span>
        {path.possible_future_shift}
      </p>

      {canSelect && !path.is_selected ? (
        <form action={selectAlternativePathAction} className="mt-5">
          <input type="hidden" name="crossroadId" value={crossroadId} />
          <input type="hidden" name="pathId" value={path.id} />
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
          >
            Explore this path
          </button>
        </form>
      ) : null}
    </article>
  );
}
