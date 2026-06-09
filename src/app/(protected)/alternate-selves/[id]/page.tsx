import Link from "next/link";
import { notFound } from "next/navigation";

import {
  archiveAlternateSelfAction,
  refreshAlternateSelfAction,
} from "@/actions/alternate-selves";
import { signOut } from "@/actions/auth";
import { getAlternateSelf } from "@/lib/alternate-selves";

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
  const result = await getAlternateSelf(id);

  if ("error" in result) {
    if (result.error === "Alternate self not found.") {
      notFound();
    }

    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const { alternateSelf } = result;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <Link
            href="/alternate-selves"
            className="text-sm text-zinc-500 hover:text-zinc-700"
          >
            Alternate Selves
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">{alternateSelf.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <form action={refreshAlternateSelfAction}>
            <input type="hidden" name="alternateSelfId" value={alternateSelf.id} />
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Refresh perspective
            </button>
          </form>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-400">
            {new Date(alternateSelf.created_at).toLocaleDateString()}
          </p>
          <h2 className="mt-2 text-sm font-medium text-zinc-900">
            {alternateSelf.decision_title}
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-xs font-medium text-zinc-500">What happened</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                {alternateSelf.chosen_path}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-xs font-medium text-zinc-500">What almost happened</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                {alternateSelf.unchosen_path}
              </p>
            </div>
          </div>

          {alternateSelf.themes.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {alternateSelf.themes.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                >
                  {theme}
                </span>
              ))}
            </div>
          ) : null}
        </article>

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

        <form action={archiveAlternateSelfAction}>
          <input type="hidden" name="alternateSelfId" value={alternateSelf.id} />
          <button
            type="submit"
            className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-700 hover:underline"
          >
            Archive this alternate self
          </button>
        </form>
      </main>
    </div>
  );
}
