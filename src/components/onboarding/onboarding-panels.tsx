import { finishOnboardingAction } from "@/actions/onboarding";
import { BranchMap } from "@/components/futures/branch-map";
import { IconTrendingUp, IconUser } from "@/components/icons";
import { ILLUSTRATIVE_FUTURE_SELVES } from "@/components/onboarding/future-selves-preview";
import { OverviewCard } from "@/components/overview/overview-card";

const CONTINUE_BUTTON_CLASSES =
  "self-start rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700";

/**
 * Step 1 — the frame, nothing more. One headline carrying the single idea
 * onboarding exists to teach, one paragraph setting up the journey, one way
 * forward. The features themselves are deliberately absent: each is
 * introduced by the flow at the moment it becomes real.
 */
export function WelcomePanel({ onBegin }: { onBegin: () => void }) {
  return (
    <OverviewCard className="px-9 py-12">
      <div className="mx-auto flex max-w-[560px] flex-col items-center text-center">
        <p className="text-label text-ink-tertiary">Welcome to Reflection</p>
        <h1 className="font-voice mt-3 text-[30px] font-medium leading-[1.25] tracking-[-0.4px] text-ink-primary">
          Every decision shapes two things — the futures you might live, and
          the person you&apos;re becoming.
        </h1>
        <p className="mt-4 text-[15px] leading-[1.7] text-ink-secondary">
          The fastest way to see how is to use Reflection once. Bring one real
          situation — a decision you&apos;re weighing right now — and follow
          it from first words to a forecast of the year ahead. About three
          minutes.
        </p>
        <button
          type="button"
          onClick={onBegin}
          className="mt-8 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Write your first situation
        </button>
      </div>
    </OverviewCard>
  );
}

/**
 * Step 6 — Future Selves, the long view. Arrives right after the first
 * forecast so the two readings are felt side by side: the forecast was one
 * situation looking a year out; this is every choice adding up to who you
 * could become. The map is the canonical BranchMap over openly fictional
 * rows (see future-selves-preview.ts) with an inert interaction — a picture
 * of what grows here, in the product's real visual language.
 */
export function FutureSelvesPanel({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <OverviewCard className="px-9 py-8">
        <p className="text-label text-ink-tertiary">The longer view</p>
        <h1 className="font-voice mt-2 text-[26px] font-medium leading-[1.3] tracking-[-0.4px] text-ink-primary">
          Choices like the one you just made add up to people you could
          become.
        </h1>
        <p className="mt-3 max-w-[46em] text-[14px] leading-[1.7] text-ink-secondary">
          The forecast you just read looked one year out from one situation.
          Future Selves looks further: as you keep choosing and checking in,
          Reflection starts to recognize who your behavior keeps pointing
          toward — each branch a version of you, growing stronger or fading
          with what you actually do.
        </p>

        <div className="mt-6 border-t border-[#f0f0f0] pt-8">
          <BranchMap
            futureSelves={ILLUSTRATIVE_FUTURE_SELVES}
            interaction={{ kind: "dialog", openId: null, onOpen: () => {} }}
            widthClassName="max-w-[880px]"
          />
        </div>
        <p className="mt-6 text-center text-[12px] text-[#6b7280]">
          An illustration, not your data — your own map begins with a single
          &ldquo;You&rdquo; and grows from what you record.
        </p>
      </OverviewCard>

      <button type="button" onClick={onContinue} className={CONTINUE_BUTTON_CLASSES}>
        Continue
      </button>
    </div>
  );
}

// The two quiet surfaces underneath, in their family colors (indigo = Self,
// emerald = Timeline/growth). One sentence each — the pages themselves do
// the deep explaining once there's data.
const FOUNDATIONS = [
  {
    name: "Current Self",
    Icon: IconUser,
    color: "#4f46e5",
    bg: "#f5f5ff",
    description:
      "A portrait of who you are right now, drawn only from what you've recorded. Today it holds one situation; each one you add makes it more sure of itself.",
  },
  {
    name: "Timeline",
    Icon: IconTrendingUp,
    color: "#047857",
    bg: "#ecfdf5",
    description:
      "Each month becomes a chapter of how you changed, composed from the situations and check-ins you were already making.",
  },
] as const;

/**
 * Step 7 — Current Self & Timeline, briefly. The framing is confidence, not
 * capability: nothing waits to be unlocked, everything sharpens as evidence
 * accumulates. The check-in loop is introduced here as the mechanism that
 * feeds it all.
 */
export function FoundationsPanel({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <OverviewCard className="px-9 py-8">
        <p className="text-label text-ink-tertiary">Meanwhile, underneath</p>
        <h1 className="font-voice mt-2 text-[26px] font-medium leading-[1.3] tracking-[-0.4px] text-ink-primary">
          Reflection&apos;s understanding of you sharpens with every entry.
        </h1>

        <div className="mt-5 divide-y divide-[#f5f5f5]">
          {FOUNDATIONS.map(({ name, Icon, color, bg, description }) => (
            <div key={name} className="flex items-start gap-4 py-4">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: bg, color }}
              >
                <Icon size={15} />
              </span>
              <div className="pt-0.5">
                <p className="text-[14px] font-bold text-[#111]">{name}</p>
                <p className="mt-1 max-w-[46em] text-[13px] leading-relaxed text-[#707070]">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-[#f8f7ff] px-5 py-4">
          <p className="text-[12px] font-semibold text-[#7c3aed]">
            Nothing here waits to be unlocked
          </p>
          <p className="mt-1.5 max-w-[46em] text-[13px] leading-relaxed text-[#666666]">
            Every situation, reflection, and check-in simply makes Reflection
            more confident about what it shows you. In a few days it will ask
            how your first situation is actually going — that check-in is how
            everything above learns.
          </p>
        </div>
      </OverviewCard>

      <button type="button" onClick={onContinue} className={CONTINUE_BUTTON_CLASSES}>
        Continue
      </button>
    </div>
  );
}

/**
 * Step 8 — the hand-over. Ends on the one understanding onboarding exists
 * to leave behind, then opens the app. Both exits run finishOnboardingAction
 * so sign-in never routes back here.
 */
export function ClosingPanel({ momentId }: { momentId: string | null }) {
  return (
    <div className="flex flex-col gap-5">
      <OverviewCard className="px-9 py-12">
        <div className="mx-auto flex max-w-[560px] flex-col items-center text-center">
          <p className="text-label text-ink-tertiary">That&apos;s the whole idea</p>
          <h1 className="font-voice mt-3 text-[28px] font-medium leading-[1.3] tracking-[-0.4px] text-ink-primary">
            Every decision shapes both the futures you might live and the
            person you&apos;re becoming.
          </h1>
          <p className="mt-4 text-[15px] leading-[1.7] text-ink-secondary">
            You&apos;ve already made the first one. Reflection takes it from
            here — one situation at a time.
          </p>
        </div>
      </OverviewCard>

      <div className="flex items-center gap-6 self-center">
        <form action={finishOnboardingAction}>
          <input type="hidden" name="next" value="/overview" />
          <input type="hidden" name="outcome" value="completed" />
          <button
            type="submit"
            className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Enter Reflection
          </button>
        </form>
        {momentId ? (
          <form action={finishOnboardingAction}>
            <input type="hidden" name="next" value={`/moments/${momentId}`} />
            <input type="hidden" name="outcome" value="completed" />
            <button
              type="submit"
              className="cursor-pointer text-[13px] font-medium text-[#707070] transition-colors duration-150 hover:text-[#111]"
            >
              or revisit your first situation →
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
