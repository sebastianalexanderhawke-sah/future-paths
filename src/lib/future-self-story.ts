import { getFutureSelfTrend } from "@/lib/future-self-trend";
import type { FutureSelf, FutureSelfEvent } from "@/types/database";

/**
 * Deterministic, evidence-grounded stories for how a Future Self is moving.
 *
 * Everything here is derived from data the identity pipeline already
 * persists — supporting/opposing observations (real extracted behavior
 * text), supporting situations (real moment titles), the percentage
 * snapshot pair, and the future_self_events trajectory. No AI call, and no
 * sentence is emitted unless the data behind it exists: when evidence is
 * present the story quotes it; only when a row carries none does it fall
 * back to a direction-only line.
 */

function stringField(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Real extracted behavior lines, strongest contribution first. */
export function observationTexts(raw: Record<string, unknown>[] | null): string[] {
  return (raw ?? []).flatMap((row) => {
    const text = stringField(row, "observationText");
    return text ? [text] : [];
  });
}

/** Deduped situation titles, highest total contribution first. */
export function situationTitles(raw: Record<string, unknown>[] | null): string[] {
  const titles = (raw ?? []).flatMap((row) => {
    const title = stringField(row, "momentTitle");
    return title ? [title] : [];
  });
  return [...new Set(titles)];
}

export type MovementStory = {
  direction: "up" | "down";
  /** e.g. "+12% since your last update" */
  headline: string;
  /** One grounded sentence introducing the evidence. */
  lead: string;
  /** Real observation texts behind the move (may be empty; lead still reads). */
  evidence: string[];
};

/**
 * Why an active future just moved. Increases are explained by the strongest
 * supporting evidence (the observations and situations that actually feed
 * this identity's score); decreases by the opposing observations that pushed
 * against it.
 */
export function getMovementStory(futureSelf: FutureSelf): MovementStory | null {
  const { delta, direction } = getFutureSelfTrend(futureSelf);
  if (direction === "new" || direction === "flat") {
    return null;
  }

  if (direction === "up") {
    const evidence = observationTexts(futureSelf.supporting_observations).slice(0, 3);
    const situations = situationTitles(futureSelf.supporting_situations);
    const lead =
      situations.length > 0
        ? `Evidence from ${situations.length} situation${
            situations.length === 1 ? "" : "s"
          } — including “${situations[0]}” — strengthened this path.`
        : evidence.length > 0
          ? "Your recent recorded behavior reinforced this trajectory."
          : // why_emerging is one evidence bullet per line (v2); the lead is a
            // single sentence, so the strongest bullet speaks for it.
            futureSelf.why_emerging.split("\n")[0] ||
            "Recent patterns aligned more closely with this trajectory.";
    return {
      direction,
      headline: `+${delta}% since your last update`,
      lead,
      evidence,
    };
  }

  const evidence = observationTexts(futureSelf.opposing_observations).slice(0, 3);
  const lead =
    evidence.length > 0
      ? "Your recent recorded behavior pushed against this path."
      : "No new evidence reinforced this path — recent patterns favored others.";
  return {
    direction,
    headline: `${delta}% since your last update`,
    lead,
    evidence,
  };
}

/**
 * A faded row re-shaped as the identity the user last saw while it was
 * active: likelihood restored to its last strength, trend silenced
 * (previous_percentage null suppresses the trend arrow and the movement
 * section — those describe the fade, which is told separately). Content
 * fields need no reconstruction: the fade update never touches them.
 */
export function asLastActive(futureSelf: FutureSelf): FutureSelf {
  return {
    ...futureSelf,
    percentage: futureSelf.previous_percentage ?? futureSelf.percentage,
    previous_percentage: null,
  };
}

export type FadeStory = {
  /** Strength this future last held while active, if known. */
  lastStrength: number | null;
  /** Human-readable date it faded, if known. */
  fadedOn: string | null;
  /** Strength milestones over its life, ending in "faded" (e.g. 12% → 24% → 18% → faded). */
  trajectory: string[];
  /** Grounded prose: what the record shows about why it faded. */
  why: string;
  /** Section label for the evidence list below. */
  evidenceLabel: string;
  /** Real evidence lines — opposing behavior when recorded, else the last supporting record. */
  evidence: string[];
};

/**
 * The story of a faded future: how strong it once was, how it declined, and
 * what the recorded evidence says about why. Reflective, not negative — a
 * faded path is part of the user's story, not a failure.
 */
export function getFadeStory(
  futureSelf: FutureSelf,
  events: FutureSelfEvent[],
): FadeStory {
  const lastStrength = futureSelf.previous_percentage;

  const fadedEvent = [...events].reverse().find((e) => e.event_type === "faded");
  const fadedAtIso = fadedEvent?.created_at ?? futureSelf.updated_at;
  const fadedOn = fadedAtIso
    ? new Date(fadedAtIso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // Every strength this future was recorded holding, in order. A "faded"
  // event contributes its percentage_before — the strength the path had
  // thinned to by the time it faded (declines themselves produce no event).
  const strengths: number[] = [];
  for (const event of events) {
    const value =
      event.event_type === "faded" ? event.percentage_before : event.percentage_after;
    if (value !== null && value > 0 && strengths[strengths.length - 1] !== value) {
      strengths.push(value);
    }
  }
  if (strengths.length === 0 && lastStrength !== null && lastStrength > 0) {
    strengths.push(lastStrength);
  }
  const trajectory = [...strengths.map((v) => `${v}%`), "faded"];
  const peak = strengths.length > 0 ? Math.max(...strengths) : null;

  const fadedClause = fadedOn ? ` on ${fadedOn}` : "";
  const arc =
    peak !== null && lastStrength !== null && lastStrength > 0 && lastStrength < peak
      ? `At its strongest this path reached ${peak}%, and it had thinned to ${lastStrength}% by the time it faded${fadedClause}.`
      : lastStrength !== null && lastStrength > 0
        ? `This path held ${lastStrength}% before it faded${fadedClause}.`
        : `This path faded${fadedClause} after its evidence stopped accumulating.`;

  // The row keeps the attribution from its last active run, so this is the
  // evidence that surrounded the path when it was last alive.
  const opposing = observationTexts(futureSelf.opposing_observations);
  const lastSupport = situationTitles(futureSelf.supporting_situations);

  if (opposing.length > 0) {
    return {
      lastStrength,
      fadedOn,
      trajectory,
      why: `${arc} Your recorded choices were accumulating on the other side of it.`,
      evidenceLabel: "What pushed against it",
      evidence: opposing.slice(0, 3),
    };
  }

  if (lastSupport.length > 0) {
    return {
      lastStrength,
      fadedOn,
      trajectory,
      why: `${arc} Nothing new reinforced it after the evidence from “${lastSupport[0]}”.`,
      evidenceLabel: "Its last supporting evidence",
      evidence: lastSupport.slice(0, 3),
    };
  }

  return {
    lastStrength,
    fadedOn,
    trajectory,
    why: `${arc} No recent situations added evidence in its direction.`,
    evidenceLabel: "Evidence",
    evidence: [],
  };
}
