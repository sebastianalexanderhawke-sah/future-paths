import Link from "next/link";

import { MomentForm } from "@/components/moments/moment-form";

export default function NewMomentPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/moments" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Back to moments
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">New moment</h1>
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <MomentForm mode="create" />
      </main>
    </div>
  );
}
