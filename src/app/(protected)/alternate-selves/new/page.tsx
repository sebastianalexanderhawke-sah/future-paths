import Link from "next/link";

import { PastCrossroadForm } from "@/components/alternate-selves/past-crossroad-form";

export default function NewAlternateSelfPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <Link
          href="/alternate-selves"
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          ← Back to alternate selves
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">New past crossroad</h1>
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <p className="mb-8 text-sm text-zinc-500">
          Describe a significant decision that already happened. You will generate
          plausible alternative paths next, then explore an alternate self — never as
          regret, never as advice.
        </p>
        <PastCrossroadForm />
      </main>
    </div>
  );
}
