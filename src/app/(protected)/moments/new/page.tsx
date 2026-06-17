import Link from "next/link";

import { SituationEntryClient } from "@/components/moments/situation-entry-client";

export default function NewSituationPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/overview" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Home
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-12">
        <SituationEntryClient />
      </main>
    </div>
  );
}
