import Link from "next/link";

import { PastCrossroadForm } from "@/components/alternate-selves/past-crossroad-form";
import { AppShell } from "@/components/overview/app-shell";

export default function NewAlternateSelfPage() {
  return (
    <AppShell activeHref="/alternate-selves">
      {/* Page header */}
      <div className="mb-10">
        <Link
          href="/alternate-selves"
          className="text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#6366f1]"
        >
          ← Alternate Selves
        </Link>
        <h1 className="mb-1.5 mt-3 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
          New past crossroad
        </h1>
        <p className="text-[15px] text-[#999999]">
          Describe a significant decision that already happened. You&apos;ll
          explore plausible alternative paths next — never as regret, never as
          advice.
        </p>
      </div>

      <div className="max-w-2xl pb-14">
        <PastCrossroadForm />
      </div>
    </AppShell>
  );
}
