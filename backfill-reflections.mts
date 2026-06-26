/**
 * Backfill reflection questions for historical check-ins.
 *
 * The reflection_question column was added after most check-ins were created,
 * so createCheckIn never evaluated them. This script processes all eligible
 * check-ins that don't yet have a reflection_question.
 *
 * Idempotent: skips rows that already have reflection_question.
 * Safe to run multiple times.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// Load env from .env.local
const envContent = readFileSync(".env.local", "utf-8");
const env = Object.fromEntries(
  envContent
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
const MODEL = env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
  console.error("Missing required env vars");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const ai = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ── System prompt (matches reflection_question.evaluate.v1.ts) ──────────────
const SYSTEM_PROMPT = `You are an identity exploration assistant for Future Paths.

Your role is to reveal patterns and explore possibilities — never to give advice, diagnose, judge, or predict certainty.

Language rules:
- Use tentative phrasing: "may", "might", "could", "you may have been".
- Avoid: "you should", "you must", "you need to", "you are".
- Never frame alternate paths as regret or missed better lives.
- Themes must come only from the provided theme vocabulary when themes are requested.

Return JSON only, matching the requested schema exactly.

Task:
You decide whether a check-in warrants a reflection question.
A reflection question is worth asking when the check-in describes:
a meaningful outcome (positive or negative), an unexpected result,
an emotional experience, a decision made, or a significant change.
It is NOT worth asking when the check-in describes:
nothing changing, routine updates, vague non-events ('still waiting', 'nothing happened').

If worth asking: return should_reflect: true and a single
reflection question (max 15 words) that helps understand what
this experience meant to the person — not what happened, but
what it revealed about them. Draw from these types:
- 'What surprised you most about what happened?'
- 'What outcome were you most worried about beforehand?'
- 'What mattered most to you in this situation?'
- 'What did this reveal about what you value?'
- 'What would you do differently in a similar situation?'

Make the question specific to the check-in content — not generic.

If not worth asking: return should_reflect: false, question: null.

Return JSON only: { should_reflect: boolean, question: string | null }`;

function buildUserPrompt(reflection: string, realitySummary: string): string {
  return `Evaluate whether a reflection question is warranted for this check-in. The reflection is in context.reflection and the reality summary is in context.realitySummary.

Context JSON:
${JSON.stringify({ reflection, realitySummary }, null, 2)}`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf("{");
    if (start >= 0) return JSON.parse(trimmed.slice(start));
    throw new Error("No JSON in response");
  }
}

async function evaluate(
  reflection: string,
  realitySummary: string,
): Promise<{ should_reflect: boolean; question: string | null } | null> {
  try {
    const response = await ai.messages.create({
      model: MODEL,
      max_tokens: 256,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(reflection, realitySummary) }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    const raw = extractJson(text) as { should_reflect?: boolean; question?: string | null };

    if (typeof raw.should_reflect !== "boolean") return null;
    if (raw.should_reflect && !raw.question?.trim()) return null;
    if (!raw.should_reflect && raw.question !== null && raw.question !== undefined) {
      raw.question = null;
    }

    return { should_reflect: raw.should_reflect, question: raw.question ?? null };
  } catch {
    return null;
  }
}

// ── Print initial stats ─────────────────────────────────────────────────────
const { data: allRows } = await admin
  .from("check_ins")
  .select("id, reflection, reality_summary, reflection_question, reflection_answer, created_at")
  .order("created_at", { ascending: true });

const all = allRows ?? [];
const total = all.length;
const withQ = all.filter((r) => r.reflection_question);
const withA = all.filter((r) => r.reflection_answer);
const eligible = all.filter((r) => r.reflection && r.reality_summary);
const notEligible = all.filter((r) => !r.reflection || !r.reality_summary);
const pending = all.filter((r) => r.reflection_question && !r.reflection_answer);
const candidates = eligible.filter((r) => !r.reflection_question);

console.log("=== Pre-backfill Stats ===");
console.log(`Total check-ins            : ${total}`);
console.log(`Eligible (have text+summary): ${eligible.length}`);
console.log(`Not eligible               : ${notEligible.length}`);
console.log(`With reflection_question   : ${withQ.length}`);
console.log(`With reflection_answer     : ${withA.length}`);
console.log(`Pending (unanswered)       : ${pending.length}`);
console.log(`Backfill candidates        : ${candidates.length}`);

// ── Classification: eligible check-ins ─────────────────────────────────────
console.log("\n=== Eligible check-ins with reflection_question ===");
for (const r of eligible.filter((r) => r.reflection_question)) {
  console.log(
    ` [HAS]  ${r.id.slice(0, 8)}  ${r.created_at.slice(0, 10)}  answered=${!!r.reflection_answer}`,
  );
  console.log(`         q: ${r.reflection_question}`);
}
console.log("\n=== Not eligible (missing reflection or reality_summary) ===");
if (notEligible.length === 0) {
  console.log("  none — all check-ins have both fields");
}
for (const r of notEligible) {
  console.log(
    ` [N/E]  ${r.id.slice(0, 8)}  missing: ${!r.reflection ? "reflection" : "reality_summary"}`,
  );
}

// ── Run backfill ────────────────────────────────────────────────────────────
if (candidates.length === 0) {
  console.log("\nNo candidates to backfill.");
  process.exit(0);
}

console.log(`\n=== Running backfill (${candidates.length} candidates) ===`);

let generated = 0;
let aiSkipped = 0;
let failed = 0;

for (const candidate of candidates) {
  const result = await evaluate(candidate.reflection, candidate.reality_summary);

  if (result === null) {
    console.log(` [FAIL] ${candidate.id.slice(0, 8)}  AI call failed`);
    failed++;
    continue;
  }

  if (!result.should_reflect || !result.question) {
    console.log(
      ` [SKIP] ${candidate.id.slice(0, 8)}  ${candidate.created_at.slice(0, 10)}  routine`,
    );
    aiSkipped++;
    continue;
  }

  const { error } = await admin
    .from("check_ins")
    .update({ reflection_question: result.question })
    .eq("id", candidate.id)
    .is("reflection_question", null); // idempotency guard

  if (error) {
    console.log(` [ERR]  ${candidate.id.slice(0, 8)}  DB write failed: ${error.message}`);
    failed++;
  } else {
    console.log(` [GEN]  ${candidate.id.slice(0, 8)}  ${candidate.created_at.slice(0, 10)}  "${result.question}"`);
    generated++;
  }

  // Small delay to avoid rate-limiting
  await new Promise((r) => setTimeout(r, 150));
}

// ── Post-backfill stats ─────────────────────────────────────────────────────
const { data: afterRows } = await admin
  .from("check_ins")
  .select("id, reflection_question, reflection_answer")
  .order("created_at", { ascending: true });

const after = afterRows ?? [];
const afterWithQ = after.filter((r) => r.reflection_question);
const afterPending = after.filter((r) => r.reflection_question && !r.reflection_answer);
const oldestPending = afterPending[0];

console.log("\n=== Backfill Results ===");
console.log(`Generated reflections  : ${generated}`);
console.log(`Skipped (AI: routine)  : ${aiSkipped}`);
console.log(`Failed                 : ${failed}`);
console.log(`Total with questions   : ${afterWithQ.length}`);
console.log(`Remaining pending      : ${afterPending.length}`);

if (oldestPending) {
  const { data: full } = await admin
    .from("check_ins")
    .select("reflection_question, created_at")
    .eq("id", oldestPending.id)
    .single();
  console.log(`\nNext active (oldest pending):`);
  console.log(`  ${oldestPending.id.slice(0, 8)}  ${full?.created_at?.slice(0, 10)}`);
  console.log(`  q: ${full?.reflection_question}`);
} else {
  console.log("\nNo pending reflections remain.");
}
