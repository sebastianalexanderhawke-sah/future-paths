import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
            Future Paths
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Create account
          </h1>
          <p className="text-sm text-zinc-600">
            Begin mapping the paths that shape you.
          </p>
        </div>

        <SignupForm />
      </div>
    </div>
  );
}
