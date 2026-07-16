import type { Metadata } from "next";
import Link from "next/link";

import {
  BecomingSection,
  ExampleJourneySection,
  FinalCtaSection,
  LandingHero,
  PricingSection,
} from "@/components/landing/landing-sections";

export const metadata: Metadata = {
  title: "Sibyl — every decision changes who you're becoming",
  description:
    "Sibyl helps you understand how today's choices shape your future, one situation at a time.",
};

/**
 * The public landing page. Deliberately just another Reflection page:
 * the app's canvas, cards, type scale, and buttons over illustrative
 * product fixtures — no marketing illustrations, no new visual styles.
 *
 * The page tells ONE story: a single relatable situation followed from
 * first words (Situation) through Future Paths, Future Forecast, and
 * Future Self to the Workspace check-in. The worked example is the whole
 * product explanation; the only section after it adds the one thing the
 * example can't show (what a year of decisions draws on the map), then
 * pricing and the close.
 */
export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="font-voice text-[18px] font-medium tracking-[-0.01em] text-ink-primary"
        >
          Sibyl
        </Link>
        <nav className="flex items-center gap-5">
          <Link
            href="/login"
            className="text-[14px] font-medium text-ink-secondary transition-colors hover:text-ink-primary"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-[#111] px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
          >
            Start Free
          </Link>
        </nav>
      </header>

      {/* Chapters separated by whitespace alone — one steady rhythm, no
          section dividers, the way the product's own pages breathe. */}
      <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-28 px-6 pb-28 pt-10 sm:gap-36 sm:pt-14">
        <LandingHero />
        <ExampleJourneySection />
        <BecomingSection />
        <PricingSection />
        <FinalCtaSection />
      </main>

      <footer className="border-t border-[#f0f0f0]">
        <div className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center justify-between gap-4 px-6 py-8">
          <p className="text-[14px] text-ink-tertiary">Sibyl</p>
          <div className="flex items-center gap-4 text-[14px] text-ink-tertiary">
            <Link href="/privacy" className="transition-colors hover:text-ink-primary">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink-primary">
              Terms of Use
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
