/**
 * Phase 7C — One-time Future Self narrative migration.
 *
 * Regenerates ONLY the narrative fields (why_emerging, blind_spots,
 * likely_evolution) of existing future_selves rows using the improved
 * Phase 7B prompt. Everything owned by the identity engine — percentage,
 * previous_percentage, confidence, evidence_strength, supporting/opposing
 * observations, supporting situations, dimension breakdown, status,
 * timestamps — is never written.
 *
 * Usage:
 *   npx tsx scripts/migrate-future-self-narratives.ts           # dry-run (default)
 *   npx tsx scripts/migrate-future-self-narratives.ts --apply   # write changes
 *
 * Safety properties:
 * - Dry-run by default: calls the AI and prints before/after, writes nothing.
 * - Backs up the old narrative fields of every row it is about to change to
 *   scripts/backups/<timestamp>.json before the first write.
 * - Skips rows where the AI returned the generic fallback (failed request),
 *   so a partial outage can never overwrite real narratives with boilerplate.
 * - Skips rows whose regenerated text contains banned mechanics/coaching
 *   phrases — the migration only writes text that satisfies Phase 7B rules.
 * - Idempotent in the safety sense: rerunning only ever rewrites the three
 *   narrative fields with fresh prompt-compliant text; engine fields are
 *   untouched on every run.
 * - Legacy rows (identity_id null) are skipped — they have no library
 *   profile and are never surfaced by the product.
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Env: load .env.local (without adding a dotenv dependency)
// ---------------------------------------------------------------------------

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  let raw: string;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    console.error("Could not read .env.local — run from the project root.");
    process.exit(1);
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] === undefined) {
      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvLocal();

// Static imports are hoisted above loadEnvLocal(), which is safe: lib/ai/config
// reads process.env lazily inside its functions, never at module load.
import { explainIdentities, fallbackExplanation } from "../src/lib/ai/explain-identity";
import { resolveProviderForMode } from "../src/lib/ai/config";
import { getIdentityById } from "../src/lib/identity-library";
import type { IdentityMatchWithAttribution, DimensionContribution } from "../src/lib/identity-recognition";
import type { FutureSelf } from "../src/types/database";
import type { IdentityDimension } from "../src/types/behavior";

// ---------------------------------------------------------------------------
// Phase 7B content rules, enforced mechanically before any write
// ---------------------------------------------------------------------------

const BANNED_PHRASES = [
  "if similar choices repeat",
  "if these patterns continue",
  "will strengthen",
  "repeated patterns",
  "watch for",
  "be careful",
  "make sure",
  // measurement machinery must never leak into user-facing text
  " score",
  "dimension",
  "likelihood",
  "evidence strength",
];

function violatesContentRules(explanation: {
  likely_evolution: string;
  blind_spots: string[];
}): string | null {
  const prediction = explanation.likely_evolution.toLowerCase();
  const tradeOffs = explanation.blind_spots.map((s) => s.toLowerCase());

  for (const phrase of BANNED_PHRASES) {
    if (prediction.includes(phrase)) return `prediction contains "${phrase}"`;
    const hit = tradeOffs.find((t) => t.includes(phrase));
    if (hit !== undefined) return `trade-off contains "${phrase}"`;
  }
  if (explanation.blind_spots.length !== 3) {
    return `${explanation.blind_spots.length} risks (need exactly 3)`;
  }
  const longRisk = explanation.blind_spots.find((s) => s.length > 80);
  if (longRisk) {
    return `risk too long for "What You Risk" register: "${longRisk.slice(0, 50)}..."`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reconstruct the explainIdentities input from a stored row.
// Recognition is NOT re-run — every value comes from the row or the library.
// ---------------------------------------------------------------------------

function rebuildMatch(row: FutureSelf): IdentityMatchWithAttribution | null {
  const profile = getIdentityById(row.identity_id ?? "");
  if (!profile) return null;

  // opposing dimensions aren't persisted; reconstruct the identity's
  // structural opposition from the library's negative weights so trade-offs
  // can still be derived from opposing dimensions, as Phase 7B requires.
  const opposingDimensions: DimensionContribution[] = Object.entries(profile.dimension_weights)
    .filter(([, weight]) => (weight as number) < 0)
    .map(([dimension, weight]) => ({
      dimension: dimension as IdentityDimension,
      identityWeight: weight as number,
      userScore: 0,
      contribution: weight as number,
    }))
    .sort((a, b) => a.contribution - b.contribution);

  const rebuilt = {
    identityId: row.identity_id!,
    canonicalName: profile.canonical_name,
    score: 0, // not used by the prompt
    likelihood: row.percentage,
    confidence: row.confidence ?? 0,
    evidenceStrength: row.evidence_strength,
    matchedDimensions: [], // not used by the prompt
    dimensionBreakdown:
      (row.dimension_breakdown as unknown as DimensionContribution[]) ?? [],
    opposingDimensions,
    supportingObservations:
      (row.supporting_observations as unknown as IdentityMatchWithAttribution["supportingObservations"]) ?? [],
    opposingObservations:
      (row.opposing_observations as unknown as IdentityMatchWithAttribution["opposingObservations"]) ?? [],
    supportingSituations:
      (row.supporting_situations as unknown as IdentityMatchWithAttribution["supportingSituations"]) ?? [],
  };

  // The uncapped v4.3 counts aren't persisted on old rows; the capped lists
  // are the best reconstruction available (and this script's prompt never
  // reads them).
  return {
    ...rebuilt,
    supportingObservationCount: rebuilt.supportingObservations.length,
    supportingSituationCount: rebuilt.supportingSituations.length,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function main() {
  const apply = process.argv.includes("--apply");

  if (resolveProviderForMode() === "mock") {
    console.error(
      "IDENTITY_ENGINE_MODE resolves to mock — the migration would only produce fallback text. Aborting.",
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  const { data: rows, error } = await supabase
    .from("future_selves")
    .select("*")
    .not("identity_id", "is", null)
    .order("user_id", { ascending: true });

  if (error) {
    console.error("Failed to load future_selves:", error.message);
    process.exit(1);
  }

  const all = (rows ?? []) as FutureSelf[];
  console.log(`Loaded ${all.length} identity-linked future_selves rows.`);
  if (all.length === 0) return;

  // Group by user so each AI batch shares the distinctness constraint with
  // the same rows it will live next to in the product.
  const byUser = new Map<string, FutureSelf[]>();
  for (const row of all) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const backup: Array<Record<string, unknown>> = [];
  let backupPath: string | null = null;
  if (apply) {
    const backupDir = path.resolve(process.cwd(), "scripts", "backups");
    mkdirSync(backupDir, { recursive: true });
    backupPath = path.join(
      backupDir,
      `future-self-narratives-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );
  }
  let updated = 0;
  let skipped = 0;

  for (const [userId, userRows] of byUser) {
    for (const batch of chunk(userRows, 5)) {
      const entries = batch.flatMap((row) => {
        const match = rebuildMatch(row);
        const profile = getIdentityById(row.identity_id!);
        if (!match || !profile) {
          console.log(`  SKIP ${row.name} (${row.id}): no library profile`);
          skipped += 1;
          return [];
        }
        return [{ row, match, profile }];
      });
      if (entries.length === 0) continue;

      const results = await explainIdentities(
        entries.map(({ match, profile }) => ({ match, profile })),
      );
      const resultById = new Map(results.map((r) => [r.identityId, r.explanation]));

      for (const { row, match } of entries) {
        const explanation = resultById.get(match.identityId);
        if (!explanation) {
          console.log(`  SKIP ${row.name}: no result returned`);
          skipped += 1;
          continue;
        }

        // Never overwrite a real narrative with the generic failure fallback.
        const fallback = fallbackExplanation(match.evidenceStrength);
        if (explanation.likely_evolution === fallback.likely_evolution) {
          console.log(`  SKIP ${row.name}: AI returned fallback (request failed?)`);
          skipped += 1;
          continue;
        }

        const violation = violatesContentRules(explanation);
        if (violation) {
          console.log(`  SKIP ${row.name}: ${violation}`);
          skipped += 1;
          continue;
        }

        console.log(`\n=== ${row.name} (user ${userId.slice(0, 8)}…, ${row.status}) ===`);
        console.log(`  percentage (untouched):        ${row.percentage}%`);
        console.log(`  evidence_strength (untouched): ${row.evidence_strength}`);
        console.log(`  confidence (untouched):        ${row.confidence}`);
        console.log(`  BEFORE prediction: ${row.likely_evolution}`);
        console.log(`  AFTER  prediction: ${explanation.likely_evolution}`);
        console.log(`  BEFORE trade-offs (${row.blind_spots.length}): ${JSON.stringify(row.blind_spots)}`);
        console.log(`  AFTER  trade-offs (${explanation.blind_spots.length}): ${JSON.stringify(explanation.blind_spots)}`);

        backup.push({
          id: row.id,
          user_id: row.user_id,
          name: row.name,
          why_emerging: row.why_emerging,
          blind_spots: row.blind_spots,
          likely_evolution: row.likely_evolution,
        });
        // Flush the backup to disk BEFORE the write it protects, so a crash
        // mid-run can never leave an updated row without its backup.
        if (backupPath) {
          writeFileSync(backupPath, JSON.stringify(backup, null, 2));
        }

        if (apply) {
          const { error: updateError } = await supabase
            .from("future_selves")
            .update({
              // The ONLY fields this migration writes. why_emerging is
              // included because it remains in the product (trend summaries)
              // and the Phase 7B distinctness rules apply to it too.
              why_emerging: explanation.why_emerging,
              blind_spots: explanation.blind_spots,
              likely_evolution: explanation.likely_evolution,
            })
            .eq("id", row.id);

          if (updateError) {
            console.error(`  WRITE FAILED for ${row.name}: ${updateError.message}`);
            skipped += 1;
            continue;
          }
        }
        updated += 1;
      }
    }
  }

  if (backupPath && backup.length > 0) {
    console.log(`\nBackup of previous narratives written to ${backupPath}`);
  }

  console.log(
    `\n${apply ? "APPLIED" : "DRY-RUN (nothing written — rerun with --apply)"}: ${updated} row(s) ${apply ? "updated" : "would update"}, ${skipped} skipped.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
