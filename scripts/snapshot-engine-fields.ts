/**
 * Phase 7C verification helper: snapshots every engine-owned field of
 * future_selves so before/after apply can be diffed. Narrative fields are
 * deliberately excluded — they are the only thing allowed to change.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && process.env[match[1]] === undefined) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await supabase
    .from("future_selves")
    .select(
      "id, name, status, percentage, previous_percentage, evidence_strength, confidence, core_behaviors, behavioral_evidence, dimension_breakdown, supporting_observations, supporting_situations, opposing_observations, created_at, updated_at",
    )
    .not("identity_id", "is", null)
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);

  const out = process.argv[2];
  if (!out) throw new Error("usage: tsx scripts/snapshot-engine-fields.ts <outfile>");
  writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(`Snapshot of ${data?.length ?? 0} rows written to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
