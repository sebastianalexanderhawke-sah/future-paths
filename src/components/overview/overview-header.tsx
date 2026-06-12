import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function OverviewHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-4 shadow-[var(--shadow-elevated)]">
      <div>
        <p className="text-label text-ink-tertiary">Future Paths</p>
        <h1 className="mt-1 text-h2 text-ink-primary">Home</h1>
      </div>
      <div className="flex items-center gap-3">
        <Button href="/situations/new" size="sm">
          Create Situation
        </Button>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
