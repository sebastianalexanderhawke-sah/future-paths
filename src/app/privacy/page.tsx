import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Future Paths",
  description: "How Future Paths handles your data during the beta.",
};

// Honesty rule for this page: every statement below describes behavior that
// actually exists in the product today. If the product changes, this page
// changes with it — nothing here is aspirational.

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

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16">
      <article className="flex w-full max-w-2xl flex-col gap-10">
        <header className="flex flex-col gap-3">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
            Future Paths
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Privacy Policy
          </h1>
          <p className="text-sm text-zinc-500">
            For the beta · Last updated July 6, 2026
          </p>
          <p className="text-[15px] leading-7 text-zinc-600">
            Future Paths asks you to write down genuinely personal things —
            decisions you&rsquo;re facing, how situations actually went, what
            you think they say about you. That only works if you know exactly
            what happens to those words. This page is the whole picture, in
            plain English.
          </p>
        </header>

        <Section title="What we store">
          <p className="text-[15px] leading-7 text-zinc-600">
            Your account: your email address, a password (stored only in
            securely hashed form by our authentication provider — we never see
            it), and a display name if you choose to set one.
          </p>
          <p className="text-[15px] leading-7 text-zinc-600">
            Your content: the situations and decisions you record, the paths
            you consider and choose, your check-ins, and your reflection
            answers — plus everything the AI generates from them: your Current
            Self, Future Selves, forecasts, identity updates, timeline, and
            life chapters. All of it lives in a database where every row is
            tied to your account and protected so that only your account can
            read it.
          </p>
          <p className="text-[15px] leading-7 text-zinc-600">
            A small operational record: a daily count of how many AI
            generations your account has used. This exists to keep the beta
            affordable and prevent abuse — it&rsquo;s a number, not content.
          </p>
        </Section>

        <Section title="What the AI processes">
          <p className="text-[15px] leading-7 text-zinc-600">
            When Future Paths generates paths, forecasts, or identity insights,
            the relevant parts of what you&rsquo;ve written are sent to
            Anthropic&rsquo;s Claude API for processing, and the response is
            stored back into your account. Under Anthropic&rsquo;s commercial
            API terms, data sent this way is not used to train their models by
            default. No other AI provider receives your content.
          </p>
          <p className="text-[15px] leading-7 text-zinc-600">
            Everything the AI writes about you is generated only from what you
            yourself have recorded — the product never invents experiences you
            didn&rsquo;t describe.
          </p>
        </Section>

        <Section title="What is never shared">
          <p className="text-[15px] leading-7 text-zinc-600">
            Nothing you write is ever public. There are no public profiles, no
            feeds, no sharing features. We do not sell your data, we do not
            share it with advertisers, and there are no ads. Your content is
            visible to exactly one account: yours. The only third parties that
            touch it are the infrastructure that runs the product — Supabase,
            which hosts the database and authentication, and Anthropic, as
            described above.
          </p>
        </Section>

        <Section title="How signing in works">
          <p className="text-[15px] leading-7 text-zinc-600">
            You sign in with your email and password, handled by Supabase
            Auth. A session cookie keeps you signed in between visits —
            that&rsquo;s the only kind of cookie the product sets; there are no
            tracking cookies. Password resets and email changes work through
            confirmation links sent to your inbox, and a reset request never
            reveals whether an account exists for an address.
          </p>
        </Section>

        <Section title="Analytics">
          <p className="text-[15px] leading-7 text-zinc-600">
            There are no analytics or tracking scripts in the app — no page
            view tracking, no behavioral profiles, no third-party trackers.
            Our servers keep standard operational logs (errors, and how much
            AI generation is being used) so we can keep the product working
            and affordable. Those logs reference account identifiers, not the
            content of what you&rsquo;ve written, and are never used for
            advertising.
          </p>
        </Section>

        <Section title="Deleting your data during the beta">
          <p className="text-[15px] leading-7 text-zinc-600">
            In-app account deletion hasn&rsquo;t been built yet — we&rsquo;d
            rather say that plainly than pretend. If you want your account and
            everything in it deleted, reply to your beta invite email and ask.
            We&rsquo;ll remove your account and all of your content, usually
            within a few days, and confirm when it&rsquo;s done.
          </p>
        </Section>

        <Section title="How long we keep your data">
          <p className="text-[15px] leading-7 text-zinc-600">
            Your data is kept for as long as your account exists during the
            beta, so your history — the raw material for everything the
            product does — stays intact. It&rsquo;s deleted when you ask (see
            above). If the beta ever ends in a way that affects your data, we
            will tell you by email first, with time to request deletion.
          </p>
        </Section>

        <Section title="About the AI's accuracy">
          <p className="text-[15px] leading-7 text-zinc-600">
            The reflections, forecasts, and identity insights are generated by
            an AI model working from what you&rsquo;ve written. They can be
            imperfect — oversimplified, overconfident, or occasionally just
            wrong. Treat them as a mirror to think with, not a verdict. They
            are not medical, psychological, legal, or financial advice.
          </p>
        </Section>

        <Section title="Questions">
          <p className="text-[15px] leading-7 text-zinc-600">
            Anything unclear, or anything here that doesn&rsquo;t match what
            you see in the product? Reply to your beta invite email —
            during the beta, that goes straight to the people building this.
          </p>
        </Section>

        <footer className="flex items-center gap-4 border-t border-zinc-200 pt-6 text-sm text-zinc-500">
          <Link href="/terms" className="hover:text-zinc-700">
            Terms of Use
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
