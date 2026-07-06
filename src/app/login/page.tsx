import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
};

// Calm explanations for the ways an emailed auth link can fail; anything else
// in the error param is ignored rather than echoed back to the page.
const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed:
    "That link has expired or was already used. Sign in below, or request a fresh link.",
  recovery_link_expired:
    "That password reset link has expired or was already used. You can request a new one below.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo, error } = await searchParams;
  const callbackMessage = error ? CALLBACK_ERROR_MESSAGES[error] : undefined;

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

        {callbackMessage ? (
          <div
            role="status"
            className="w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
          >
            {callbackMessage}{" "}
            {error === "recovery_link_expired" ? (
              <Link
                href="/forgot-password"
                className="font-medium underline underline-offset-4"
              >
                Request a new link
              </Link>
            ) : null}
          </div>
        ) : null}

        <LoginForm redirectTo={redirectTo ?? "/overview"} />

        <footer className="flex items-center gap-4 text-sm text-zinc-500">
          <Link href="/privacy" className="hover:text-zinc-700">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-zinc-700">
            Terms of Use
          </Link>
        </footer>
      </div>
    </div>
  );
}
