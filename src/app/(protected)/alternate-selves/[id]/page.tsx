import Link from "next/link";
import { notFound } from "next/navigation";

import {
  archivePastCrossroadAction,
  generateAlternateSelfAction,
  generateAlternativePathsAction,
} from "@/actions/alternate-selves";
import { AlternativePathCard } from "@/components/alternate-selves/alternative-path-card";
import { AppShell } from "@/components/overview/app-shell";
import { getPastCrossroad } from "@/lib/past-crossroads";

type AlternateSelfDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AlternateSelfDetailPage({
  params,
  searchParams,
}: AlternateSelfDetailPageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const result = await getPastCrossroad(id);

  if ("error" in result) {
    if (result.error === "Past crossroad not found.") {
      notFound();
    }

    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{result.error}</p>
      </div>
    );
  }

  const { crossroad, alternativePaths, alternateSelf } = result;
  const selectedPath = alternativePaths.find((path) => path.is_selected);
  const canSelect = alternativePaths.length > 0;

  return (
    <AppShell activeHref="/alternate-selves">
      {/* Page header */}
      <div className="mb-10">
        <Link
          href="/alternate-selves"
          className="text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#6366f1]"
        >
          ← Alternate Selves
        </Link>
        <h1 className="mb-1.5 mt-3 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
          {alternateSelf?.name ?? "Past crossroad"}
        </h1>
      </div>

      {error ? (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex max-w-2xl flex-col gap-8 pb-14">
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-400">
            {new Date(crossroad.created_at).toLocaleDateString()}
          </p>
          <h2 className="mt-2 text-sm font-medium text-zinc-900">What happened</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {crossroad.what_happened}
          </p>

          {crossroad.why_chosen ? (
            <div className="mt-4 rounded-lg bg-zinc-50 p-3">
              <p className="text-xs font-medium text-zinc-500">Why you chose it</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                {crossroad.why_chosen}
              </p>
            </div>
          ) : null}

          {crossroad.life_stage ? (
            <p className="mt-4 text-sm text-zinc-500">
              Life stage: {crossroad.life_stage}
            </p>
          ) : null}
        </article>

        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900">Alternative paths</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Plausible directions that may have existed at the time — not fantasy
            outcomes, and not better choices.
          </p>

          {alternativePaths.length === 0 ? (
            <form action={generateAlternativePathsAction} className="mt-4">
              <input type="hidden" name="crossroadId" value={crossroad.id} />
              <button
                type="submit"
                className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Generate alternative paths
              </button>
            </form>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              <form action={generateAlternativePathsAction}>
                <input type="hidden" name="crossroadId" value={crossroad.id} />
                <button
                  type="submit"
                  className="cursor-pointer text-sm text-zinc-600 underline-offset-4 hover:underline"
                >
                  Regenerate alternative paths
                </button>
              </form>

              {alternativePaths.map((path) => (
                <AlternativePathCard
                  key={path.id}
                  path={path}
                  crossroadId={crossroad.id}
                  canSelect={canSelect}
                />
              ))}
            </div>
          )}
        </section>

        {selectedPath ? (
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Alternate self</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Generate a perspective from your actual path and{" "}
                  <span className="font-medium text-zinc-900">{selectedPath.title}</span>.
                </p>
              </div>
              <form action={generateAlternateSelfAction}>
                <input type="hidden" name="crossroadId" value={crossroad.id} />
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
                >
                  {alternateSelf ? "Refresh alternate self" : "Generate alternate self"}
                </button>
              </form>
            </div>
          </section>
        ) : null}

        {alternateSelf ? (
          <>
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-zinc-900">The Road Not Taken</h3>
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <p className="text-sm leading-relaxed text-zinc-700">
                  {alternateSelf.road_not_taken}
                </p>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-zinc-900">The Alternate Self</h3>
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <p className="text-sm leading-relaxed text-zinc-700">
                  {alternateSelf.alternate_self}
                </p>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-zinc-900">
                What Remains Available Today
              </h3>
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <p className="text-sm leading-relaxed text-zinc-700">
                  {alternateSelf.what_remains_available}
                </p>
              </div>
            </section>
          </>
        ) : null}

        <form action={archivePastCrossroadAction}>
          <input type="hidden" name="crossroadId" value={crossroad.id} />
          <button
            type="submit"
            className="cursor-pointer text-sm text-zinc-500 underline-offset-4 hover:text-zinc-700 hover:underline"
          >
            Archive this past crossroad
          </button>
        </form>
      </div>
    </AppShell>
  );
}
