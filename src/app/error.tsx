"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Server-side details are already in the server logs (matched by digest);
    // this makes client-side errors visible in the browser console too.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24">
      <main className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
            Reflection
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Something went wrong on our side
          </h1>
          <p className="text-sm leading-6 text-zinc-600">
            Your reflections and situations are safe — this was a hiccup in
            loading the page, not in your data. Trying again usually resolves
            it.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Try again
          </button>
          <Link
            href="/overview"
            className="rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
          >
            Back to your Overview
          </Link>
        </div>

        {error.digest ? (
          <p className="text-xs text-zinc-400">
            If this keeps happening, mention this code: {error.digest}
          </p>
        ) : null}
      </main>
    </div>
  );
}
