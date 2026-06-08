import Link from "next/link";
import { notFound } from "next/navigation";

import { generatePathsAction } from "@/actions/paths";
import { archiveMomentAction } from "@/actions/moments";
import { CheckInCard } from "@/components/check-ins/check-in-card";
import { CheckInForm } from "@/components/check-ins/check-in-form";
import { MomentForm } from "@/components/moments/moment-form";
import { PathCard } from "@/components/paths/path-card";
import { listCheckInsForMoment } from "@/lib/check-ins";
import { getMoment } from "@/lib/moments";
import { listPathsForMoment } from "@/lib/paths";

type MomentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function MomentPage({ params, searchParams }: MomentPageProps) {
  const { id } = await params;
  const { error: queryError } = await searchParams;

  const momentResult = await getMoment(id);
  if ("error" in momentResult) {
    notFound();
  }

  const pathsResult = await listPathsForMoment(id);
  if ("error" in pathsResult) {
    notFound();
  }

  const checkInsResult = await listCheckInsForMoment(id);
  if ("error" in checkInsResult) {
    notFound();
  }

  const { moment } = momentResult;
  const { paths } = pathsResult;
  const { checkIns } = checkInsResult;
  const chosenPath = paths.find((path) => path.is_chosen);
  const canChoose = paths.length > 0 && !chosenPath;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/moments" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Back to moments
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">{moment.title}</h1>
        <p className="text-sm text-zinc-500">
          Created {new Date(moment.created_at).toLocaleDateString()}
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
        {queryError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {queryError}
          </p>
        ) : null}

        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900">Paths</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Explore possible directions. These are possibilities, not
            recommendations.
          </p>

          {paths.length === 0 ? (
            <form action={generatePathsAction} className="mt-4">
              <input type="hidden" name="momentId" value={moment.id} />
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Generate paths
              </button>
            </form>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {moment.current_understanding ? (
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Current understanding
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                    {moment.current_understanding}
                  </p>
                </div>
              ) : null}

              {chosenPath?.is_locked ? (
                <p className="text-sm text-zinc-500">
                  Your chosen path is locked after your first check-in.
                </p>
              ) : null}

              {paths.map((path) => (
                <PathCard
                  key={path.id}
                  path={path}
                  momentId={moment.id}
                  canChoose={canChoose && !path.is_locked}
                />
              ))}
            </div>
          )}
        </section>

        {chosenPath ? (
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-sm font-medium text-zinc-900">Check-ins</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Record what actually happened. Reality carries more weight than
              prediction.
            </p>

            <div className="mt-6">
              <CheckInForm momentId={moment.id} />
            </div>

            {checkIns.length > 0 ? (
              <div className="mt-8 flex flex-col gap-4">
                <h3 className="text-sm font-medium text-zinc-900">History</h3>
                {checkIns.map((checkIn) => (
                  <CheckInCard key={checkIn.id} checkIn={checkIn} />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900">Edit moment</h2>
          <div className="mt-4">
            <MomentForm
              mode="edit"
              momentId={moment.id}
              defaultTitle={moment.title}
              defaultDescription={moment.description}
            />
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900">Archive</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Archiving removes this moment from your active list. Your identity
            history is preserved.
          </p>
          <form action={archiveMomentAction} className="mt-4">
            <input type="hidden" name="momentId" value={moment.id} />
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Archive moment
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
