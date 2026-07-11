import Link from "next/link";

import { AlternateSelfCard } from "@/components/alternate-selves/alternate-self-card";
import { AppShell } from "@/components/overview/app-shell";
import { listPastCrossroads } from "@/lib/past-crossroads";

export default async function AlternateSelvesPage() {
  const result = await listPastCrossroads();

  if ("error" in result) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{result.error}</p>
      </div>
    );
  }

  const { crossroads } = result;

  return (
    <AppShell activeHref="/alternate-selves">
      {/* Page header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
            Alternate Selves
          </h1>
          <p className="text-[15px] text-[#999999]">
            Past crossroads and the roads not taken — perspective, not regret.
          </p>
        </div>
        <Link
          href="/alternate-selves/new"
          className="shrink-0 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
        >
          New past crossroad
        </Link>
      </div>

      <div className="flex max-w-2xl flex-col gap-8 pb-14">
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-[17px] font-bold text-[#111]">
              Who could you have become?
            </h2>
          </div>

          {crossroads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center text-sm text-zinc-600">
              No past crossroads yet. Describe a significant decision from your past
              to explore plausible roads not taken.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {crossroads.map((item) => (
                <AlternateSelfCard key={item.crossroad.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
