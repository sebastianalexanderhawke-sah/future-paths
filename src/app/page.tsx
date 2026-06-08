import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24">
      <main className="flex w-full max-w-2xl flex-col items-center gap-10 text-center">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
            Future Paths
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Understand who you are becoming
          </h1>
          <p className="text-lg leading-8 text-zinc-600">
            An identity exploration platform for meaningful decisions, emerging
            patterns, and the paths that shape you.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
