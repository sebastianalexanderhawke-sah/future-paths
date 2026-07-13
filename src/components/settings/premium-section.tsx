import {
  buySituationTokens,
  manageSubscription,
  startPremiumCheckout,
} from "@/actions/billing";
import { TrackView } from "@/components/analytics/track-view";
import { OverviewCard } from "@/components/overview/overview-card";
import type { PlanStatus } from "@/lib/plan";
import { TOKENS_PER_PACK } from "@/lib/plan";

/**
 * Settings → Reflection Premium: the account's plan and available usage.
 * Calm and account-focused by design — a statement of what the account has,
 * not a sales pitch: no pricing tables, no comparison grids, Premium and
 * tokens presented as two equal ways to add situations. Purchase buttons
 * post to the billing actions, which respond honestly until checkout
 * launches (see src/actions/billing.ts).
 */
type PremiumSectionProps = {
  plan: PlanStatus;
  /** True when a billing action just reported checkout isn't open yet. */
  showBillingNotice: boolean;
};

function PlanLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-2.5 text-[14px] leading-[1.85] text-[#777777]">
      <span aria-hidden="true" className="text-[11px] text-[#c9c9d1]">
        •
      </span>
      <span>{children}</span>
    </li>
  );
}

function formatRenewalDate(iso: string): string {
  // UTC keeps the rendered date deterministic across server timezones,
  // matching the product's UTC day conventions.
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function PremiumSection({ plan, showBillingNotice }: PremiumSectionProps) {
  const isPremium = plan.plan === "premium";

  return (
    <OverviewCard className="px-9 py-7">
      <TrackView event="premium_viewed" properties={{ plan: plan.plan }} />
      <div id="premium" className="mb-5 scroll-mt-6">
        <h2 className="text-[17px] font-bold text-[#111]">
          Reflection Premium
        </h2>
        <p className="mt-[3px] text-[13px] text-[#888888]">
          Your plan and available usage.
        </p>
      </div>

      <div className="max-w-[36rem]">
        {isPremium ? (
          <>
            <p className="text-[15px] font-semibold text-[#111]">
              Premium{" "}
              <span aria-hidden="true" className="text-[#10b981]">
                ✓
              </span>
            </p>
            <ul className="mt-3">
              <PlanLine>Unlimited Situations</PlanLine>
              <PlanLine>Unlimited Check-ins</PlanLine>
              <PlanLine>Unlimited Reflections</PlanLine>
              <PlanLine>Unlimited Current Self updates</PlanLine>
              <PlanLine>Unlimited Future Forecast updates</PlanLine>
              <PlanLine>Unlimited Timeline</PlanLine>
            </ul>

            {plan.renewsAt ? (
              <p className="mt-4 text-[13px] text-[#999999]">
                Renews on {formatRenewalDate(plan.renewsAt)}.
              </p>
            ) : null}

            <form action={manageSubscription} className="mt-5">
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
              >
                Manage Subscription
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-[#111]">Free Plan</p>
            <ul className="mt-3">
              <PlanLine>
                {plan.situationsUsed} / {plan.freeSituationAllowance} Situations
                Used
              </PlanLine>
              <PlanLine>Unlimited Check-ins</PlanLine>
              <PlanLine>Unlimited Current Self updates</PlanLine>
              <PlanLine>Unlimited Future Forecast updates</PlanLine>
              <PlanLine>Unlimited Timeline</PlanLine>
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <form action={startPremiumCheckout}>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
                >
                  Upgrade to Premium — $9.99/month
                </button>
              </form>
              <form action={buySituationTokens}>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl border border-[#e5e5e5] bg-white px-[18px] py-2.5 text-[13px] font-medium text-[#333333] transition-colors hover:border-[#111] hover:text-[#111]"
                >
                  Buy {TOKENS_PER_PACK} Situation Tokens — $9.99
                </button>
              </form>
            </div>

            <p className="mt-3 text-[13px] leading-[1.6] text-[#999999]">
              Tokens permanently unlock {TOKENS_PER_PACK} additional situations
              — no subscription required. Premium includes unlimited situations
              for as long as it&apos;s active.
            </p>
          </>
        )}

        {plan.situationTokens > 0 ? (
          <div className="mt-6 border-t border-[#f0f0f0] pt-4">
            <p className="text-[14px] font-medium text-[#111]">
              Situation Tokens
            </p>
            <ul className="mt-2">
              <PlanLine>Remaining: {plan.situationTokens}</PlanLine>
              <PlanLine>Each new situation uses one token.</PlanLine>
            </ul>
          </div>
        ) : null}

        {showBillingNotice ? (
          <p className="mt-5 rounded-xl bg-[#f7f7f9] px-4 py-3 text-[13px] leading-[1.6] text-[#777777]">
            Checkout isn&apos;t open during the beta yet. The pricing shown is
            what these options will cost at launch — nothing has been charged.
          </p>
        ) : null}
      </div>
    </OverviewCard>
  );
}
