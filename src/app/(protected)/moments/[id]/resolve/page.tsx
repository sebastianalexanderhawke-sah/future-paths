import Link from "next/link";
import { notFound } from "next/navigation";

import { archiveMomentAction } from "@/actions/moments";
import { CheckInCard } from "@/components/check-ins/check-in-card";
import { IdentityUpdateCard } from "@/components/identity/identity-update-card";
import { AppShell } from "@/components/overview/app-shell";
import { ResolveTransformForm } from "@/components/situations/resolve-transform-form";
import { listCheckInsForMoment } from "@/lib/check-ins";
import { listIdentityUpdatesForMoment } from "@/lib/identity-updates";
import { getMoment } from "@/lib/moments";
import { listPathsForMoment } from "@/lib/paths";

type ResolvePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResolvePage({ params }: ResolvePageProps) {
  const { id } = await params;

  const [momentResult, pathsResult, checkInsResult, identityUpdatesResult] =
    await Promise.all([
      getMoment(id),
      listPathsForMoment(id),
      listCheckInsForMoment(id),
      listIdentityUpdatesForMoment(id),
    ]);

  if ("error" in momentResult) notFound();
  if ("error" in pathsResult) notFound();
  if ("error" in checkInsResult) notFound();
  if ("error" in identityUpdatesResult) notFound();

  const { moment } = momentResult;
  const { paths } = pathsResult;
  const { checkIns } = checkInsResult;
  const { identityUpdates } = identityUpdatesResult;

  if (moment.status === "archived") notFound();

  const chosenPath = paths.find((p) => p.is_chosen) ?? null;

  return (
    <AppShell activeHref="/moments">
      {/* Page header */}
      <div className="mb-10">
        <Link
          href={`/moments/${moment.id}`}
          className="text-[13px] font-medium text-[#707070] transition-colors duration-150 hover:text-[#b45309]"
        >
          ← Back to situation
        </Link>
        <h1 className="mb-1.5 mt-3 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
          {moment.title}
        </h1>
        <p className="text-[15px] text-[#707070]">Before you close this</p>
      </div>

      <div className="flex max-w-2xl flex-col gap-6 pb-14">
        {/* ── What was navigated ──────────────────────────────────────────── */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            What you navigated
          </p>
          {chosenPath ? (
            <p className="mt-2 text-sm text-zinc-700">
              You chose to{" "}
              <span className="font-medium text-zinc-900">{chosenPath.description}</span>
            </p>
          ) : null}
          {checkIns.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-xs text-zinc-500">
                {checkIns.length} check-in{checkIns.length !== 1 ? "s" : ""} recorded
              </p>
              {checkIns.slice(0, 3).map((ci) => (
                <CheckInCard key={ci.id} checkIn={ci} />
              ))}
              {checkIns.length > 3 ? (
                <p className="text-xs text-zinc-500">
                  + {checkIns.length - 3} more
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* ── What this revealed ──────────────────────────────────────────── */}
        {identityUpdates.length > 0 ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              What this situation revealed about you
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {identityUpdates.map((update) => (
                <IdentityUpdateCard key={update.id} update={update} />
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Option A: Complete ──────────────────────────────────────────── */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-base font-semibold text-zinc-900">
            This situation is complete
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            This chapter is done. It will remain in your resolved situations and
            continue to inform your identity journey.
          </p>
          <form action={archiveMomentAction} className="mt-5">
            <input type="hidden" name="momentId" value={moment.id} />
            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Mark as complete
            </button>
          </form>
        </section>

        {/* ── Option B: Transform ─────────────────────────────────────────── */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-base font-semibold text-zinc-900">
            This situation has become something else
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            This chapter is closing, but something new is opening. Name what
            you&apos;re stepping into and we&apos;ll carry what we&apos;ve learned forward.
          </p>
          <div className="mt-5">
            <ResolveTransformForm momentId={moment.id} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
