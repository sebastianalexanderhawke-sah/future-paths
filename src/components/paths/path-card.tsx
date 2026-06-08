import { choosePathAction } from "@/actions/paths";
import type { Path } from "@/types/database";

type PathCardProps = {
  path: Path;
  momentId: string;
  canChoose: boolean;
};

export function PathCard({ path, momentId, canChoose }: PathCardProps) {
  return (
    <article
      className={`rounded-lg border bg-white p-5 ${
        path.is_chosen
          ? "border-zinc-900 ring-1 ring-zinc-900"
          : "border-zinc-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-medium text-zinc-900">{path.description}</h3>
        {path.is_chosen ? (
          <span className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white">
            Your path
          </span>
        ) : null}
      </div>

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

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Benefits
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-zinc-600">
            {path.benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Consequences
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-zinc-600">
            {path.consequences.map((consequence) => (
              <li key={consequence}>{consequence}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-sm text-zinc-600">
        <span className="font-medium text-zinc-900">Future shift: </span>
        {path.future_shift}
      </p>

      {canChoose && !path.is_chosen ? (
        <form action={choosePathAction} className="mt-5">
          <input type="hidden" name="momentId" value={momentId} />
          <input type="hidden" name="pathId" value={path.id} />
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
          >
            Choose this path
          </button>
        </form>
      ) : null}
    </article>
  );
}
