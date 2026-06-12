import { CardShell } from "@/components/ui/card-shell";
import { Button } from "@/components/ui/button";

export function SituationHero() {
  return (
    <CardShell variant="hero" className="flex flex-col gap-4 p-8">
      <p className="text-label text-ink-tertiary">Future Paths</p>
      <h2 className="text-display text-ink-primary">Your path, at a glance</h2>
      <p className="max-w-2xl text-body text-ink-secondary">
        See who you are today, where you may be heading, and the situations you are
        working through. When something new is on your mind, create a situation to
        explore it.
      </p>
      <div>
        <Button href="/situations/new" size="lg">
          Create Situation
        </Button>
      </div>
    </CardShell>
  );
}
