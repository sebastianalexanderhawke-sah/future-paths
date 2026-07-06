import { generateFutureSelvesAction } from "@/actions/future-selves";
import { FutureSelvesExplorer } from "@/components/futures/future-selves-explorer";
import { AppShell } from "@/components/overview/app-shell";
import { listFutureSelves } from "@/lib/future-selves";

type FutureSelvesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function FutureSelvesPage({ searchParams }: FutureSelvesPageProps) {
  const { error } = await searchParams;
  const result = await listFutureSelves();

  if ("error" in result) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{result.error}</p>
      </div>
    );
  }

  return (
    <AppShell activeHref="/future-selves">
      {/* Page header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
            Future Selves
          </h1>
          <p className="text-[15px] text-[#999999]">
            The people you may be becoming, based on what you&apos;ve recorded.
          </p>
        </div>
        <form action={generateFutureSelvesAction}>
          <button
            type="submit"
            className="shrink-0 cursor-pointer rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
          >
            Refresh futures
          </button>
        </form>
      </div>

      {error ? (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      <div className="pb-14">
        <FutureSelvesExplorer futureSelves={result.futureSelves} />
      </div>
    </AppShell>
  );
}
