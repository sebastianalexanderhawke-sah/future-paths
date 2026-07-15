import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — Reflection",
  description: "Lightweight terms for the Reflection beta.",
};

// Same honesty rule as the Privacy Policy: these terms describe the product
// as it is during the beta — no invented guarantees, no boilerplate that
// promises things the product doesn't do.

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16">
      <article className="flex w-full max-w-2xl flex-col gap-10">
        <header className="flex flex-col gap-3">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
            Reflection
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Terms of Use
          </h1>
          <p className="text-sm text-zinc-500">
            For the beta · Last updated July 6, 2026
          </p>
          <p className="text-[15px] leading-7 text-zinc-600">
            Reflection is in beta. These terms are deliberately short and
            honest — they describe the deal between you and us as it actually
            is right now.
          </p>
        </header>

        <Section title="What using a beta means">
          <p className="text-[15px] leading-7 text-zinc-600">
            The product is actively being built. Features may change, be
            added, or be removed; occasional bugs and downtime are part of the
            deal. We work hard to protect your data (see the{" "}
            <Link href="/privacy" className="text-zinc-900 underline underline-offset-4">
              Privacy Policy
            </Link>
            ), but this is early software — if something you write here would
            be devastating to lose, keep your own copy too.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p className="text-[15px] leading-7 text-zinc-600">
            The beta is for your own personal use. Don&rsquo;t attempt to
            access other people&rsquo;s data, probe or overload the service,
            script against it, or work around the daily AI generation limits —
            those limits are what keep the beta free and available for
            everyone. Accounts that abuse the service can be suspended.
          </p>
        </Section>

        <Section title="What the AI is — and isn't">
          <p className="text-[15px] leading-7 text-zinc-600">
            The paths, forecasts, and identity insights are AI-generated
            interpretations of what you&rsquo;ve written. They can be wrong,
            incomplete, or overconfident. They are not medical, psychological,
            legal, or financial advice, and they&rsquo;re not a substitute for
            a professional in any of those fields. The decisions you make —
            including the ones you explore here — are yours.
          </p>
        </Section>

        <Section title="Your content is yours">
          <p className="text-[15px] leading-7 text-zinc-600">
            Everything you write in Reflection belongs to you. By using the
            product you give us permission to store and process it — including
            sending relevant parts to our AI provider — solely to make the
            product work for you. That&rsquo;s the only thing your content is
            used for. When your data is deleted, that permission ends with it.
          </p>
        </Section>

        <Section title="Feedback during the beta">
          <p className="text-[15px] leading-7 text-zinc-600">
            If you send us feedback — ideas, complaints, bug reports — we may
            use it to improve the product without owing compensation or
            attribution. That&rsquo;s the entire reason the beta exists, and
            we&rsquo;re grateful for it. Feedback never includes your private
            content unless you choose to share it with us yourself.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p className="text-[15px] leading-7 text-zinc-600">
            These terms may evolve as the beta does. If anything changes in a
            way that matters, we&rsquo;ll tell you by email before it takes
            effect — no silent updates.
          </p>
        </Section>

        <footer className="flex items-center gap-4 border-t border-zinc-200 pt-6 text-sm text-zinc-500">
          <Link href="/privacy" className="hover:text-zinc-700">
            Privacy Policy
          </Link>
          <Link href="/login" className="hover:text-zinc-700">
            Sign in
          </Link>
          <Link href="/" className="hover:text-zinc-700">
            Home
          </Link>
        </footer>
      </article>
    </div>
  );
}
