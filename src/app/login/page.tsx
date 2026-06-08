import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
            Future Paths
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Sign in
          </h1>
          <p className="text-sm text-zinc-600">
            Continue exploring who you are becoming.
          </p>
        </div>

        <LoginForm redirectTo={redirectTo ?? "/overview"} />
      </div>
    </div>
  );
}
