/**
 * Phase 8A — Identity Engine Audit (read-only).
 *
 * Loads the user's real behavior observations, runs the actual recognition
 * engine (no modifications, no writes), and dumps a complete audit:
 * raw scores, likelihoods, per-dimension contributions, supporting
 * observations/situations, pairwise identity comparison, and library-wide
 * dimension overlap.
 *
 * Usage: npx tsx scripts/audit-identity-engine.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import {
  recognizeIdentitiesWithAttribution,
  scoreToLikelihood,
  type AttributableObservation,
} from "../src/lib/identity-recognition";
import { computeDimensionScoresFromObservations, ALL_DIMENSIONS } from "../src/lib/behavior-signals";
import { IDENTITY_LIBRARY } from "../src/lib/identity-library";
import type { IdentityDimension } from "../src/types/behavior";

function weightVector(weights: Partial<Record<IdentityDimension, number>>): number[] {
  return ALL_DIMENSIONS.map((d) => weights[d] ?? 0);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // The single user who owns the audited future selves.
  const { data: fsRows, error: fsError } = await supabase
    .from("future_selves")
    .select("user_id, name, percentage, status")
    .not("identity_id", "is", null);
  if (fsError) throw new Error(fsError.message);
  const userIds = [...new Set((fsRows ?? []).map((r) => r.user_id))];
  console.log(`Users with identity-linked future selves: ${userIds.length}`);
  const userId = userIds[0];

  const { data: rawObs, error: obsError } = await supabase
    .from("behavior_observations")
    .select("id, observation, signals, moment_id, extracted_at, moments(title)")
    .eq("user_id", userId)
    .order("extracted_at", { ascending: true });
  if (obsError) throw new Error(obsError.message);

  const observations: AttributableObservation[] = (rawObs ?? []).map((row) => ({
    id: row.id,
    observation: row.observation,
    signals: row.signals,
    momentId: row.moment_id,
    momentTitle: (row.moments as unknown as { title: string } | null)?.title ?? "Untitled",
    extractedAt: row.extracted_at ?? undefined,
  }));

  console.log(`\n================ RAW INPUT ================`);
  console.log(`Observations: ${observations.length}`);
  const situations = new Set(observations.map((o) => o.momentId));
  console.log(`Distinct situations: ${situations.size}`);
  const signalCounts = new Map<string, number>();
  for (const o of observations) for (const s of o.signals) signalCounts.set(s, (signalCounts.get(s) ?? 0) + 1);
  console.log(`Signal frequency:`);
  for (const [slug, count] of [...signalCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${slug}: ${count}`);
  }

  const dims = computeDimensionScoresFromObservations(observations);
  console.log(`\n================ USER DIMENSION PROFILE ================`);
  for (const d of ALL_DIMENSIONS) {
    console.log(`  ${d}: ${dims[d]}`);
  }

  // Score ALL identities, no threshold, full attribution.
  const matches = recognizeIdentitiesWithAttribution(observations, {
    minLikelihood: 0,
    maxResults: IDENTITY_LIBRARY.length,
  });

  console.log(`\n================ FULL IDENTITY AUDIT (all ${matches.length} scored) ================`);
  for (const m of matches) {
    console.log(`\n--- ${m.canonicalName} ---`);
    console.log(`  raw score: ${m.score.toFixed(2)}   likelihood: ${m.likelihood}%   evidence: ${m.evidenceStrength}   confidence: ${m.confidence}`);
    console.log(`  contributing dimensions:`);
    for (const d of m.dimensionBreakdown) {
      console.log(`    +${d.contribution.toFixed(1).padStart(6)}  ${d.dimension} (weight ${d.identityWeight} x user ${d.userScore})`);
    }
    for (const d of m.opposingDimensions) {
      console.log(`    ${d.contribution.toFixed(1).padStart(7)}  ${d.dimension} (weight ${d.identityWeight} x user ${d.userScore})`);
    }
    console.log(`  supporting observations (top ${m.supportingObservations.length}):`);
    for (const o of m.supportingObservations) {
      console.log(`    [+${o.contribution.toFixed(1)}] "${o.observationText.slice(0, 90)}" (${o.momentTitle})`);
    }
    console.log(`  supporting situations:`);
    for (const s of m.supportingSituations) {
      console.log(`    [+${s.contribution.toFixed(1)}] ${s.momentTitle} (${s.observationCount} obs)`);
    }
  }

  // Pairwise comparison of the user's ACTUAL top 5.
  const top5 = matches.slice(0, 5);
  console.log(`\n================ PAIRWISE (user's top 5) ================`);
  for (let i = 0; i < top5.length; i++) {
    for (let j = i + 1; j < top5.length; j++) {
      const a = top5[i];
      const b = top5[j];
      const pa = IDENTITY_LIBRARY.find((x) => x.id === a.identityId)!;
      const pb = IDENTITY_LIBRARY.find((x) => x.id === b.identityId)!;
      const posA = new Set(Object.entries(pa.dimension_weights).filter(([, w]) => (w as number) > 0).map(([d]) => d));
      const posB = new Set(Object.entries(pb.dimension_weights).filter(([, w]) => (w as number) > 0).map(([d]) => d));
      const shared = [...posA].filter((d) => posB.has(d));
      const cos = cosine(weightVector(pa.dimension_weights), weightVector(pb.dimension_weights));
      console.log(
        `  ${a.canonicalName} vs ${b.canonicalName}: raw Δ=${Math.abs(a.score - b.score).toFixed(2)}, likelihood Δ=${Math.abs(a.likelihood - b.likelihood)}pp, shared+dims=[${shared.join(", ")}], cosine=${cos.toFixed(3)}`,
      );
    }
  }

  // Library-wide dimension overlap (independent of this user's data).
  console.log(`\n================ LIBRARY-WIDE WEIGHT-VECTOR SIMILARITY ================`);
  const pairs: Array<{ a: string; b: string; cos: number; shared: number }> = [];
  for (let i = 0; i < IDENTITY_LIBRARY.length; i++) {
    for (let j = i + 1; j < IDENTITY_LIBRARY.length; j++) {
      const A = IDENTITY_LIBRARY[i];
      const B = IDENTITY_LIBRARY[j];
      const posA = new Set(Object.entries(A.dimension_weights).filter(([, w]) => (w as number) > 0).map(([d]) => d));
      const posB = new Set(Object.entries(B.dimension_weights).filter(([, w]) => (w as number) > 0).map(([d]) => d));
      const shared = [...posA].filter((d) => posB.has(d)).length;
      pairs.push({
        a: A.canonical_name,
        b: B.canonical_name,
        cos: cosine(weightVector(A.dimension_weights), weightVector(B.dimension_weights)),
        shared,
      });
    }
  }
  pairs.sort((x, y) => y.cos - x.cos);
  console.log(`  Most similar pairs:`);
  for (const p of pairs.slice(0, 8)) {
    console.log(`    ${p.a} ~ ${p.b}: cosine=${p.cos.toFixed(3)}, shared+dims=${p.shared}`);
  }
  console.log(`  Most separated pairs:`);
  for (const p of pairs.slice(-5)) {
    console.log(`    ${p.a} ~ ${p.b}: cosine=${p.cos.toFixed(3)}, shared+dims=${p.shared}`);
  }

  // Sensitivity: what raw-score gap does 1 likelihood point represent here?
  console.log(`\n================ LIKELIHOOD CURVE SENSITIVITY ================`);
  for (const s of [5, 10, 15, 17, 20, 30, 50]) {
    console.log(`  raw ${s} -> ${scoreToLikelihood(s)}%`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
