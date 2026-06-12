"use client";

import { useState } from "react";

import { CardShell } from "@/components/ui/card-shell";
import { Button } from "@/components/ui/button";

import { OverviewSection } from "@/components/overview/overview-section";

type Mode = "decision" | "forecast" | null;

function DecisionModePanel() {
  return (
    <CardShell variant="elevated" className="p-6">
      <p className="text-label text-ink-tertiary">Decision Simulator</p>
      <h3 className="mt-2 text-h1 text-ink-primary">What should I do?</h3>
      <p className="mt-3 text-body text-ink-secondary">
        Possible decisions, potential outcomes, and a scenario future self will appear
        here once you select a situation and continue exploring a decision.
      </p>
      <div className="mt-5">
        <Button href="/moments" variant="secondary">
          Open a situation
        </Button>
      </div>
    </CardShell>
  );
}

function ForecastModePanel() {
  return (
    <CardShell variant="elevated" className="p-6">
      <p className="text-label text-ink-tertiary">Future Forecast</p>
      <h3 className="mt-2 text-h1 text-ink-primary">What might happen next?</h3>
      <p className="mt-3 text-body text-ink-secondary">
        Active, hidden, and blind-spot futures plus forecast history will appear here
        once you choose to forecast from a situation.
      </p>
      <div className="mt-5">
        <Button href="/future-selves" variant="secondary">
          View futures
        </Button>
      </div>
    </CardShell>
  );
}

export function SituationModeSection() {
  const [mode, setMode] = useState<Mode>(null);

  return (
    <OverviewSection
      label="Explore"
      title="How do you want to explore?"
      description="Choose a mode — nothing is selected until you decide"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant={mode === "decision" ? "primary" : "secondary"}
            onClick={() => setMode("decision")}
          >
            Explore a Decision
          </Button>
          <Button
            type="button"
            variant={mode === "forecast" ? "primary" : "secondary"}
            onClick={() => setMode("forecast")}
          >
            Forecast the Future
          </Button>
        </div>

        {mode === null ? (
          <CardShell variant="flat" className="p-6">
            <p className="text-body text-ink-secondary">
              Select a mode above to see where this path leads. Future Paths will never
              choose for you.
            </p>
          </CardShell>
        ) : null}

        {mode === "decision" ? <DecisionModePanel /> : null}
        {mode === "forecast" ? <ForecastModePanel /> : null}
      </div>
    </OverviewSection>
  );
}
