import { CardShell } from "@/components/ui/card-shell";

export function SituationFlowHero() {
  return (
    <CardShell variant="hero" className="p-8">
      <p className="text-label text-ink-tertiary">Future Paths</p>
      <h2 className="mt-3 text-display text-ink-primary">Start with what&apos;s on your mind</h2>
      <p className="mt-3 max-w-2xl text-body text-ink-secondary">
        Tell us about a situation you are facing. Then choose whether you want help
        deciding what to do or forecasting what might happen next.
      </p>
    </CardShell>
  );
}
