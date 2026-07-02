/**
 * Phase 8G — Identity Engine Validation Suite runner.
 *
 * Runs 20 authored personas through the actual recognition engine exactly as
 * production does (recognizeIdentitiesWithAttribution with default options:
 * minLikelihood 10, top 5). No AI, no DB — deterministic and repeatable.
 * This is the benchmark future engine versions are tested against.
 *
 * Usage: npx tsx scripts/validation/run-validation.ts
 */

import {
  recognizeIdentitiesWithAttribution,
  type AttributableObservation,
  type IdentityMatchWithAttribution,
} from "../../src/lib/identity-recognition";
import { IDENTITY_LIBRARY } from "../../src/lib/identity-library";
import { PERSONAS_A, type ValidationPersona } from "./personas-a";
import { PERSONAS_B } from "./personas-b";

const PERSONAS = [...PERSONAS_A, ...PERSONAS_B];

function toObservations(persona: ValidationPersona, includeExtra = false): AttributableObservation[] {
  const situations = includeExtra
    ? [...persona.situations, ...(persona.extraSituations ?? [])]
    : persona.situations;

  const out: AttributableObservation[] = [];
  let obsIndex = 0;
  situations.forEach((situation, sitIndex) => {
    for (const [text, ...signals] of situation.observations) {
      out.push({
        id: `${persona.id}-obs-${obsIndex}`,
        observation: text,
        signals,
        momentId: `${persona.id}-sit-${sitIndex}`,
        momentTitle: situation.title,
        extractedAt: new Date(Date.UTC(2026, 0, 1 + sitIndex * 7, 12, obsIndex)).toISOString(),
      });
      obsIndex += 1;
    }
  });
  return out;
}

type PersonaResult = {
  persona: ValidationPersona;
  observationCount: number;
  matches: IdentityMatchWithAttribution[];
};

function run(): PersonaResult[] {
  return PERSONAS.map((persona) => {
    const observations = toObservations(persona);
    // Production call — default options, exactly as generateFutureSelves uses it.
    const matches = recognizeIdentitiesWithAttribution(observations);
    return { persona, observationCount: observations.length, matches };
  });
}

function main() {
  const results = run();

  console.log(`================ PER-PERSONA RESULTS (${results.length} personas) ================`);
  for (const { persona, observationCount, matches } of results) {
    console.log(`\n### ${persona.name}, ${persona.age} — ${persona.occupation} (${observationCount} obs, ${persona.situations.length} situations)`);
    if (matches.length === 0) {
      console.log(`  (no identity above threshold)`);
      continue;
    }
    for (const m of matches) {
      const topSit = m.supportingSituations[0];
      console.log(
        `  ${String(m.likelihood).padStart(3)}%  conf ${String(m.confidence).padStart(3)}  ${m.evidenceStrength.padEnd(8)}  ${m.canonicalName}  [top: ${topSit ? `${topSit.momentTitle} +${topSit.contribution.toFixed(1)}` : "-"}]`,
      );
    }
  }

  // ---- Coverage audit ----
  type Stat = {
    top5: number; top3: number; first: number;
    pcts: number[]; confs: number[]; supObs: number[];
  };
  const stats = new Map<string, Stat>();
  for (const identity of IDENTITY_LIBRARY) {
    stats.set(identity.canonical_name, { top5: 0, top3: 0, first: 0, pcts: [], confs: [], supObs: [] });
  }
  for (const { matches } of results) {
    matches.forEach((m, rank) => {
      const s = stats.get(m.canonicalName)!;
      s.top5 += 1;
      if (rank < 3) s.top3 += 1;
      if (rank === 0) s.first += 1;
      s.pcts.push(m.likelihood);
      s.confs.push(m.confidence);
      s.supObs.push(m.supportingObservations.length);
    });
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  console.log(`\n================ COVERAGE (across ${results.length} personas) ================`);
  console.log(`identity                         top5  top3  #1   avg%   min%  max%  avgConf  avgSupObs`);
  const sorted = [...stats.entries()].sort(([, a], [, b]) => b.top5 - a.top5);
  for (const [name, s] of sorted) {
    console.log(
      `${name.padEnd(32)} ${String(s.top5).padStart(3)}  ${String(s.top3).padStart(4)}  ${String(s.first).padStart(3)}  ${avg(s.pcts).toFixed(1).padStart(5)}  ${(s.pcts.length ? Math.min(...s.pcts) : 0).toString().padStart(4)}  ${(s.pcts.length ? Math.max(...s.pcts) : 0).toString().padStart(4)}  ${avg(s.confs).toFixed(0).padStart(6)}  ${avg(s.supObs).toFixed(1).padStart(8)}`,
    );
  }

  // ---- Stability audit ----
  console.log(`\n================ STABILITY AUDIT ================`);
  for (const result of results) {
    const { persona } = result;
    if (!persona.extraSituations?.length) continue;
    const before = result.matches;
    const after = recognizeIdentitiesWithAttribution(toObservations(persona, true));
    const fmt = (ms: IdentityMatchWithAttribution[]) =>
      ms.map((m) => `${m.canonicalName} ${m.likelihood}%`).join("  |  ");
    console.log(`\n  ${persona.name} +${persona.extraSituations.length} situation(s):`);
    console.log(`    before: ${fmt(before)}`);
    console.log(`    after:  ${fmt(after)}`);
    const beforeOrder = before.map((m) => m.identityId).join(",");
    const afterOrder = after.map((m) => m.identityId).join(",");
    const deltas = after
      .map((m) => {
        const prev = before.find((b) => b.identityId === m.identityId);
        return { name: m.canonicalName, delta: prev ? m.likelihood - prev.likelihood : m.likelihood };
      })
      .filter((d) => d.delta !== 0);
    console.log(`    rank order changed: ${beforeOrder === afterOrder ? "NO" : "YES"}`);
    console.log(
      `    deltas: ${deltas.length ? deltas.map((d) => `${d.name} ${d.delta > 0 ? "+" : ""}${d.delta}pp`).join(", ") : "none"}`,
    );
  }
}

main();
