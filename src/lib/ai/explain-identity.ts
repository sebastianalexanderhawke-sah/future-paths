import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import {
  getAnthropicApiKey,
  getClaudeModel,
  getGenerationTimeoutMs,
  resolveProviderForMode,
} from "@/lib/ai/config";
import type { RankedFuture } from "@/lib/identity-brief";
import type { IdentityProfile } from "@/lib/identity-library";
import type {
  DimensionContribution,
  IdentityMatchWithAttribution,
  ObservationContribution,
  SituationContribution,
} from "@/lib/identity-recognition";
import { TRAIT_LIBRARY } from "@/lib/trait-library";
import type { FutureSelfEvidenceStrength } from "@/types/enums";

// The strengthening trait the card will headline: the strongest contributing
// dimension, translated through the hand-written trait library. The prompt
// names it so the narrative is written about the trait, not the archetype.
function traitLabelForDimensions(dims: DimensionContribution[] | undefined): string {
  const top = dims?.[0]?.dimension;
  return top ? TRAIT_LIBRARY[top].label : "Unknown";
}

/**
 * The narrative layer of one Future Self, encoded into the existing
 * future_selves columns (newline-encoded multi-part strings, the same idiom
 * current_self uses for values/fears/tradeoff):
 *
 * v8 (Phase 4 — strengthening traits, not archetypes):
 *
 * - why_emerging — "Why Reflection Believes This": exactly three evidence
 *   bullets, one per line, newline-separated (unchanged since v2).
 * - growth_opportunities — "What This Strengthens": exactly three short
 *   bullets. (v3–v7 rows hold the single "What keeps pulling you here"
 *   sentence instead — a one-element array is the pre-v8 marker; see
 *   needsExplanationRegeneration.)
 * - blind_spots — "Tradeoffs": exactly three short, honest bullets. (v2–v7
 *   rows hold a single cost paragraph.)
 * - likely_evolution — "What This Usually Becomes": one plain prose
 *   paragraph, single line. (v2–v7 rows hold multi-line portrait/closing
 *   encodings; the card renders only their first line until their one-time
 *   regeneration.)
 */
export type IdentityExplanation = {
  why_emerging: string;
  growth_opportunities: string[];
  blind_spots: string[];
  likely_evolution: string;
};

export type IdentityExplanationSource = "ai" | "fallback";

export type IdentityExplanationResult = {
  identityId: string;
  explanation: IdentityExplanation;
  /**
   * Whether this explanation came from real AI generation or the hard-coded
   * fallback. Persisted as future_selves.narrative_source so a fallback
   * narrative is repaired on a later run instead of becoming permanent.
   */
  source: IdentityExplanationSource;
};

// ---------------------------------------------------------------------------
// Regeneration decision
// ---------------------------------------------------------------------------

export type ExplanationRegenerationReason =
  | "new"
  | "fallback_repair"
  | "format_upgrade"
  | "identity_renamed"
  | "evidence_tier_increased"
  | "stable";

export type ExplanationRegenerationDecision = {
  regenerate: boolean;
  reason: ExplanationRegenerationReason;
};

const EVIDENCE_TIER_RANK: Record<FutureSelfEvidenceStrength, number> = {
  Emerging: 0,
  Moderate: 1,
  Strong: 2,
};

function evidenceTierRank(value: string | null | undefined): number | null {
  if (value && value in EVIDENCE_TIER_RANK) {
    return EVIDENCE_TIER_RANK[value as FutureSelfEvidenceStrength];
  }
  return null;
}

export type ExistingNarrativeRow = {
  name?: string | null;
  narrative_source?: string | null;
  narrative_evidence_strength?: string | null;
  likely_evolution?: string | null;
  growth_opportunities?: string[] | null;
  blind_spots?: string[] | null;
};

/**
 * Decides whether an identity's Layer 2 narrative (why_emerging,
 * growth_opportunities, blind_spots, likely_evolution) needs to be
 * generated this run, or whether the existing narrative stays as-is.
 *
 * Layer 1 (percentage, confidence, dimension_breakdown, supporting
 * observations/situations, evidence_strength, trend) is recomputed by the
 * recognition engine and persisted every run regardless of this decision —
 * see generateFutureSelves.
 *
 * Future Selves narratives are stable future-identity portraits, not
 * per-situation output, so stability is the default: percentage movement,
 * reactivation after fading, and ordinary situations never regenerate. A
 * narrative regenerates in exactly five cases:
 *
 *   1. "new" — the identity has no row at all.
 *   2. "fallback_repair" — the stored narrative came from the hard-coded
 *      fallback (the AI call failed when it was written). Without this, a
 *      transient failure at first emergence made generic boilerplate the
 *      identity's permanent narrative.
 *   3. "format_upgrade" — the stored narrative predates the current format.
 *      A v8 narrative (Phase 4, strengthening traits) carries exactly three
 *      "What This Strengthens" bullets in growth_opportunities AND exactly
 *      three "Tradeoffs" bullets in blind_spots. Every earlier engine format
 *      fails that test — v3–v7 rows hold a single pull sentence in
 *      growth_opportunities and a single cost paragraph in blind_spots, v2
 *      rows hold an empty growth_opportunities — so any row that is not
 *      exactly 3+3 regenerates once. (The retired newline / "?" /
 *      line-count markers on likely_evolution are gone: v8 encodes a
 *      single-line paragraph there, which the old checks would misread.)
 *   4. "identity_renamed" — the row's stored name differs from the
 *      identity's current canonical_name, which means the narrative was
 *      written under an earlier naming/writing regime (a library rename is
 *      always part of a writing upgrade — see the v5 reputation renames).
 *      The persistence step rewrites name to canonical_name in the same
 *      run, so this fires exactly once per rename epoch and can never loop.
 *   5. "evidence_tier_increased" — the evidence tier is now HIGHER than the
 *      tier the narrative was written at (Emerging → Moderate → Strong).
 *      A narrative written at Emerging says the evidence is limited; once
 *      the identity is Strong that framing contradicts the numbers shown
 *      beside it. Only increases regenerate — a decrease (evidence decaying)
 *      does not — so tier oscillation around a boundary can never cause
 *      regeneration churn.
 */
export function needsExplanationRegeneration(
  existing: ExistingNarrativeRow | undefined,
  currentEvidenceStrength: FutureSelfEvidenceStrength,
  currentCanonicalName?: string,
): ExplanationRegenerationDecision {
  if (!existing) {
    return { regenerate: true, reason: "new" };
  }

  if (existing.narrative_source === "fallback") {
    return { regenerate: true, reason: "fallback_repair" };
  }

  if (
    typeof existing.name === "string" &&
    existing.name.length > 0 &&
    typeof currentCanonicalName === "string" &&
    currentCanonicalName.length > 0 &&
    existing.name !== currentCanonicalName
  ) {
    return { regenerate: true, reason: "identity_renamed" };
  }

  // v8 marker: exactly three non-empty strengthens bullets AND exactly three
  // non-empty tradeoff bullets. Every pre-v8 engine format holds one (or
  // zero) elements in each, so this single check retires the old newline /
  // "?" / line-count markers — which would misread v8's single-line
  // likely_evolution as ancient.
  const strengthensCount =
    existing.growth_opportunities?.filter((line) => line.trim().length > 0).length ?? 0;
  const tradeoffCount =
    existing.blind_spots?.filter((line) => line.trim().length > 0).length ?? 0;
  if (strengthensCount !== 3 || tradeoffCount !== 3) {
    return { regenerate: true, reason: "format_upgrade" };
  }

  const writtenAtRank = evidenceTierRank(existing.narrative_evidence_strength);
  const currentRank = evidenceTierRank(currentEvidenceStrength);

  if (writtenAtRank !== null && currentRank !== null && currentRank > writtenAtRank) {
    return { regenerate: true, reason: "evidence_tier_increased" };
  }

  return { regenerate: false, reason: "stable" };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// The model responds in the v2 "possible lives" shape; the mapping below
// encodes it into the existing IdentityExplanation columns. Caps are headroom,
// not targets (the prompt asks for less) — the model overshoots in large
// batches, and a few long sentences shouldn't discard an otherwise valid batch.
const explanationItemSchema = z.object({
  identity_id: z.string().trim().min(1),
  becoming_likely: z.array(z.string().trim().min(1).max(260)).min(2).max(4),
  what_this_usually_becomes: z.string().trim().min(1).max(1200),
  // Exactly three each — the v8 format contract depends on the counts
  // (a three-element growth_opportunities is what marks a row as current).
  what_this_strengthens: z.array(z.string().trim().min(1).max(260)).length(3),
  tradeoffs: z.array(z.string().trim().min(1).max(260)).length(3),
});

// The model's fields are prose; the format contract (one evidence bullet per
// line of why_emerging, a single-line paragraph in likely_evolution)
// requires each part to be single-line.
function singleLine(text: string): string {
  return text.replace(/\s*\n+\s*/g, " ").trim();
}

// Items are validated individually, not as one array schema: the model
// occasionally returns an otherwise-valid batch with one field missing on one
// identity, and a whole-batch parse turned that single bad item into fallback
// narratives for every identity in the request. An invalid item simply never
// reaches the by-id map, so only that identity falls back (the same path an
// omitted identity already takes).
const batchResponseSchema = z.object({
  identities: z.array(z.unknown()),
});

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

export function fallbackExplanation(
  evidenceStrength?: FutureSelfEvidenceStrength,
): IdentityExplanation {
  if (evidenceStrength === "Emerging") {
    return {
      why_emerging: [
        "A small number of recent choices have started pointing in this direction.",
        "The pattern has appeared in more than one situation, though not yet across many.",
        "Nothing you've recorded so far pushes against it.",
      ].join("\n"),
      growth_opportunities: [
        "Confidence in making this kind of choice without second-guessing it.",
        "A clearer sense of what you actually want from these situations.",
        "The habit of acting on the pattern instead of just noticing it.",
      ],
      blind_spots: [
        "It's early — the pattern could still be circumstance rather than you.",
        "Leaning into one strength this soon can crowd out others worth testing.",
        "What this trait costs you won't be visible until it's more established.",
      ],
      likely_evolution:
        "It's early. If the recent pattern keeps repeating, your days start to reorganize around it — small choices begin pointing the same way long before anyone else would call it part of who you are.",
    };
  }

  return {
    why_emerging: [
      "This pattern has repeated across several of your recorded situations.",
      "Your recent decisions keep resolving in the direction this future points.",
      "The behavior shows up in different contexts, not just one recurring one.",
    ].join("\n"),
    growth_opportunities: [
      "The ability to make this kind of choice quickly and without doubt.",
      "A track record other people can see and start to count on.",
      "Resilience in the situations where this trait is what gets you through.",
    ],
    blind_spots: [
      "The stronger this gets, the easier it is to over-rely on it.",
      "Situations that call for the opposite approach start to feel harder.",
      "Time spent here is time not spent on the traits you use less.",
    ],
    likely_evolution:
      "People who keep strengthening this become known for it — it starts deciding what they take on, how they spend ordinary days, and what the people around them come to count on them for.",
  };
}

/** What the shared batch runner needs to know about each identity: enough to
 *  merge results back in order and to build a tier-appropriate fallback. */
type ExplanationTarget = {
  identityId: string;
  evidenceStrength: FutureSelfEvidenceStrength;
};

function fallbackResults(targets: ExplanationTarget[]): IdentityExplanationResult[] {
  return targets.map((target) => ({
    identityId: target.identityId,
    explanation: fallbackExplanation(target.evidenceStrength),
    source: "fallback",
  }));
}

// ---------------------------------------------------------------------------
// JSON extraction
// ---------------------------------------------------------------------------

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());

    const start = trimmed.indexOf("{");
    if (start >= 0) return JSON.parse(trimmed.slice(start));

    throw new Error("Response did not contain JSON.");
  }
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return `You explain the user's STRENGTHENING TRAITS — how the traits their recorded behavior keeps exercising are shaping the person they're becoming.

Each entry you receive was recognized deterministically from the user's behavioral data and comes with its strengthening trait already named. Your role is strictly interpretive — you never invent traits, rename anything, or adjust any numerical values. Each entry answers one question: "If this trait keeps strengthening, what does this person naturally become?" This is a grounded description of a person, never a career prediction, never a horoscope, never a personality-test report.

WRITE PLAINLY — the most important style rule. Simple, clear, everyday language about real-life behaviors and personality. No poetic or abstract writing, no imagery, no metaphors, no dramatic staging. Every sentence should sound like a perceptive friend explaining something true, not an essay. Address the user as "you". Honest and balanced: strengthening a trait is genuinely good AND genuinely costs something — never imply the trait is purely a gift or a danger, and never moralize.

GROUNDING — where the user's concrete life belongs:
- becoming_likely is where the claim gets PROVEN. Its three bullets connect the user's recorded situations, reflections, and check-ins to this trait, and they are the ONLY field where the user's actual nouns (projects, places, people, routines) appear.
- Every other field describes the trait at person level: write it so it stays true for anyone whose version of this trait is growing the way this user's evidence shows, and so it survives the success, failure, or disappearance of everything the user is currently doing. No school names, companies, products, degrees, sports, named people, places, schedules, or days of the week outside becoming_likely.
- The evidence still steers those fields invisibly: it decides WHICH version of this trait to describe — which strengths lead, which tradeoffs this particular way of living actually threatens — but it shapes the writing without being quoted by it.
- Do not narrate invented future events, scenes, or milestones. Do not mention the measurement machinery: "score", "dimension", "percentage", "likelihood", and "evidence strength" must not appear.

DISTINCTNESS — multiple traits strengthening at once is normal, but they are different forces: no bullet or sentence you write should be transplantable to another entry in this response, and no two entries may describe the same underlying change wearing different names. Crutch vocabulary: "quietly" — never; "slowly" and "the version of you that" — at most once each in the whole response; at most two em-dashes in any single field.

Return a JSON object with exactly this shape:

{
  "identities": [
    {
      "identity_id": "<exactly as provided — no changes>",
      "becoming_likely": ["<exactly 3 short evidence bullets>"],
      "what_this_usually_becomes": "<at most 3 sentences>",
      "what_this_strengthens": ["<exactly 3 short bullets>"],
      "tradeoffs": ["<exactly 3 short bullets>"]
    }
  ]
}

BREVITY — every field must land in under five seconds of reading. If a sentence does not add a new concrete idea, delete it.

Rules for each field:
- identity_id: copy exactly from the input. Any change makes the result unusable.
- becoming_likely: exactly 3 bullets, rendered under "Why Reflection Believes This". This is the ONLY field built from the user's concrete world — the place the claim gets proven. Each bullet is one concise sentence (8–16 words) naming a RECURRING choice-pattern observed across the user's recorded situations, reflections, and check-ins, and each must visibly exercise the trait above it. Evidence, not personality traits, not summaries: every bullet must be traceable to the supporting observations and situations provided, and must describe repetition, never a one-time event. Show the repetition through content — a count, a span of time, a return after failure, the same choice made in different arenas — not through stock adverb openers: across one entry's three bullets use three different sentence shapes, and never default to the "You repeatedly / You keep / You consistently" trio. Always addressed to the user — "you"/"your" or an implied subject — never "she", "he", or "they". Present tense, no hedging. Single line each — no newline characters anywhere.
- what_this_usually_becomes: at most 3 sentences (at most 450 characters), rendered under "What This Usually Becomes". Explain what people with this growing trait naturally become over time — the real-life behaviors and personality that form around it: what they get good at, how the people around them come to experience and rely on them, what starts feeling normal to them. Concrete and recognizable ("You become the person who has already started while others are still discussing it"), never abstract ("You become a beacon of initiative") and never a list of virtues. Steer it toward the specific version this user's evidence shows. No invented events, no timelines, no "ten years from now" staging. No newline characters.
- what_this_strengthens: exactly 3 bullets, rendered under "What This Strengthens". Each bullet is one short sentence naming a real capability, habit, or standing with other people that grows as this trait strengthens — specific gains someone could recognize in their own life ("Making decisions without waiting for permission.", "A reputation for finishing what you take on."). Plain nouns and behaviors, not virtues or feelings. No two bullets may name the same gain in different words. Single line each.
- tradeoffs: exactly 3 bullets, rendered under "Tradeoffs". Each bullet is one short sentence naming a real, believable cost of this trait strengthening — honest and balanced, never catastrophic, never a warning, never advice. Draw each from where this trait's own strength actually cuts: what gets harder, what gets neglected, what other people experience ("Asking for help gets harder the more capable you become.", "People stop offering input because you seem to have it handled."). Different species of cost across the three bullets — not three flavors of the same one. Banned: one-word risk labels ("Burnout", "Isolation"), the words "risk" and "blind spot". Single line each.

When an entry's evidence strength is "Emerging", let becoming_likely acknowledge that the pattern is young — real, but seen in only a few situations so far — and describe an earlier, quieter version of what the trait becomes. Keep the tone confident and observational, never hedging ("might", "possibly", "hard to say").

Include one entry per identity provided — do not add or omit any. Do not use generic coaching language. Be specific to the evidence provided. Do not add fields beyond those specified.`;
}

function formatDimensions(dims: DimensionContribution[]): string {
  return dims
    .slice(0, 5)
    .map(
      (d) =>
        `  ${d.dimension}: weight ${d.identityWeight.toFixed(1)}, user score ${d.userScore.toFixed(1)}, contribution ${d.contribution.toFixed(1)}`,
    )
    .join("\n");
}

function formatObservations(obs: ObservationContribution[]): string {
  return obs
    .slice(0, 5)
    .map((o) => `  - "${o.observationText}" (from: ${o.momentTitle})`)
    .join("\n");
}

function formatSituations(sits: SituationContribution[]): string {
  return sits
    .slice(0, 5)
    .map(
      (s) =>
        `  - ${s.momentTitle} (${s.observationCount} observation${s.observationCount !== 1 ? "s" : ""})`,
    )
    .join("\n");
}

function buildIdentityBlock(
  index: number,
  total: number,
  profile: IdentityProfile,
  match: IdentityMatchWithAttribution,
): string {
  const behaviors = profile.typical_behaviors.map((b, i) => `  ${i + 1}. ${b}`).join("\n");
  const supportingDims = match.dimensionBreakdown.filter((d) => d.contribution > 0);
  const opposingDims = match.opposingDimensions;

  const supportingObsText = match.supportingObservations.length
    ? formatObservations(match.supportingObservations)
    : "  None recorded yet.";

  const situationsText = match.supportingSituations.length
    ? formatSituations(match.supportingSituations)
    : "  None recorded yet.";

  const opposingObsText = match.opposingObservations.length
    ? match.opposingObservations
        .slice(0, 3)
        .map((o) => `  - "${o.observationText}"`)
        .join("\n")
    : "  None.";

  const opposingDimsText = opposingDims.length
    ? opposingDims
        .slice(0, 3)
        .map((d) => `  ${d.dimension}: contribution ${d.contribution.toFixed(1)}`)
        .join("\n")
    : "  None.";

  return `--- Identity ${index + 1} of ${total} ---
identity_id: ${match.identityId}
Name: ${profile.canonical_name}
Strengthening trait (write the narrative about this trait): ${traitLabelForDimensions(supportingDims)}
Description: ${profile.short_description}

Typical behaviors:
${behaviors}

Recognition data (report these values exactly — do not change them):
  Likelihood: ${match.likelihood}%
  Confidence: ${match.confidence}%
  Evidence strength: ${match.evidenceStrength}

Supporting dimensions (${supportingDims.length} contributing positively):
${supportingDims.length ? formatDimensions(supportingDims) : "  None."}

Supporting behavioral observations (${match.supportingObservations.length} total):
${supportingObsText}

Supporting situations where this pattern was observed:
${situationsText}

Opposing dimensions (working against this pattern):
${opposingDimsText}

Opposing observations:
${opposingObsText}`;
}

// Exported for tests and prompt-size measurement only — production callers
// go through explainIdentities / explainIdentitiesFromBrief.
export function buildUserPrompt(
  entries: Array<{ profile: IdentityProfile; match: IdentityMatchWithAttribution }>,
): string {
  const total = entries.length;
  const label = total === 1 ? "identity" : "identities";
  const blocks = entries
    .map(({ profile, match }, i) => buildIdentityBlock(i, total, profile, match))
    .join("\n\n");

  return `${total} recognized ${label} to explain:\n\n${blocks}\n\nReturn the JSON object with explanations for all ${total} ${label}.`;
}

// ---------------------------------------------------------------------------
// Brief-based prompt builders (Behavior Engine v4, phase 5)
// ---------------------------------------------------------------------------
//
// The brief-mode counterpart of buildIdentityBlock: the same block structure,
// built from RankedFuture's re-exposed attribution instead of a live
// IdentityMatchWithAttribution. Two deliberate differences:
//   - evidence lines carry no situation titles (the brief never inspects
//     moments; observation texts are written to stand alone), and
//   - the per-situation list is replaced by the uncapped breadth counts.
// The system prompt is shared — it was already explanation-only, and the
// narrative quality rules must stay identical across both modes.

export type BriefExplanationEntry = {
  profile: IdentityProfile;
  future: RankedFuture;
};

function formatBriefEvidence(evidence: RankedFuture["supportingEvidence"]): string {
  if (!evidence?.length) return "  None recorded yet.";
  return evidence
    .slice(0, 5)
    .map((item) => `  - "${item.observation}"`)
    .join("\n");
}

function buildIdentityBlockFromBrief(
  index: number,
  total: number,
  profile: IdentityProfile,
  future: RankedFuture,
): string {
  const behaviors = profile.typical_behaviors.map((b, i) => `  ${i + 1}. ${b}`).join("\n");
  const supportingDims = future.supportingDimensions ?? [];
  const opposingDims = future.opposingDimensions ?? [];
  const opposingEvidence = future.opposingEvidence ?? [];

  const situationCount = future.supportingSituationCount ?? 0;
  const observationCount = future.supportingObservationCount ?? 0;

  return `--- Identity ${index + 1} of ${total} ---
identity_id: ${future.identityId}
Name: ${profile.canonical_name}
Strengthening trait (write the narrative about this trait): ${traitLabelForDimensions(supportingDims)}
Description: ${profile.short_description}

Typical behaviors:
${behaviors}

Recognition data (report these values exactly — do not change them):
  Likelihood: ${future.likelihood}%
  Confidence: ${future.confidence}%
  Evidence strength: ${future.evidenceStrength}

Supporting dimensions (${supportingDims.length} contributing positively):
${supportingDims.length ? formatDimensions(supportingDims) : "  None."}

Supporting behavioral observations (top ${Math.min(future.supportingEvidence?.length ?? 0, 5)} of ${observationCount} total):
${formatBriefEvidence(future.supportingEvidence)}

Pattern breadth: observed across ${situationCount} distinct situation${situationCount !== 1 ? "s" : ""}.

Opposing dimensions (working against this pattern):
${
  opposingDims.length
    ? opposingDims
        .slice(0, 3)
        .map((d) => `  ${d.dimension}: contribution ${d.contribution.toFixed(1)}`)
        .join("\n")
    : "  None."
}

Opposing observations:
${
  opposingEvidence.length
    ? opposingEvidence
        .slice(0, 3)
        .map((item) => `  - "${item.observation}"`)
        .join("\n")
    : "  None."
}`;
}

// Exported for tests and prompt-size measurement only.
export function buildUserPromptFromBrief(entries: BriefExplanationEntry[]): string {
  const total = entries.length;
  const label = total === 1 ? "identity" : "identities";
  const blocks = entries
    .map(({ profile, future }, i) => buildIdentityBlockFromBrief(i, total, profile, future))
    .join("\n\n");

  return `${total} recognized ${label} to explain:\n\n${blocks}\n\nReturn the JSON object with explanations for all ${total} ${label}.`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generates explanations for all recognized identities in a single AI request.
 *
 * Always returns one result per entry. If the AI response is missing an entry
 * or the entire request fails, affected entries receive a fallback explanation
 * so generation never blocks.
 */
export async function explainIdentities(
  entries: Array<{ profile: IdentityProfile; match: IdentityMatchWithAttribution }>,
): Promise<IdentityExplanationResult[]> {
  if (entries.length === 0) {
    return [];
  }

  return runExplanationBatch({
    targets: entries.map(({ match }) => ({
      identityId: match.identityId,
      evidenceStrength: match.evidenceStrength,
    })),
    userPrompt: buildUserPrompt(entries),
    promptId: "explain_identity.batch",
  });
}

/**
 * Brief-mode narrative generation (Behavior Engine v4, phase 5): identical
 * batch semantics, fallback behavior, and system prompt as explainIdentities,
 * but the per-identity evidence block is built from RankedFuture's
 * attribution — the consumer never touches raw observations or the
 * recognition engine.
 */
export async function explainIdentitiesFromBrief(
  entries: BriefExplanationEntry[],
): Promise<IdentityExplanationResult[]> {
  if (entries.length === 0) {
    return [];
  }

  return runExplanationBatch({
    targets: entries.map(({ future }) => ({
      identityId: future.identityId,
      evidenceStrength: future.evidenceStrength,
    })),
    userPrompt: buildUserPromptFromBrief(entries),
    promptId: "explain_identity.batch_from_brief",
  });
}

async function runExplanationBatch(input: {
  targets: ExplanationTarget[];
  userPrompt: string;
  promptId: string;
}): Promise<IdentityExplanationResult[]> {
  const { targets, userPrompt, promptId } = input;

  const providerMode = resolveProviderForMode();

  if (providerMode === "mock") {
    return fallbackResults(targets);
  }

  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return fallbackResults(targets);
  }

  const model = getClaudeModel();
  const startedAt = Date.now();

  try {
    const client = new Anthropic({ apiKey });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getGenerationTimeoutMs());

    const response = await client.messages.create(
      {
        model,
        // Sized for a 5-identity batch of possible-life portraits (evidence
        // bullets, cost paragraph, life paragraph, notice-signal bullets per
        // identity) — 2048 truncated the older, smaller format already.
        max_tokens: 8192,
        temperature: 0.3,
        // Static system prompt marked as a cacheable prefix — cost only,
        // never affects output. See claude-provider for the same pattern.
        system: [
          {
            type: "text",
            text: buildSystemPrompt(),
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal: controller.signal },
    );

    clearTimeout(timeout);

    console.log(
      `[ai-usage] ${JSON.stringify({
        promptId,
        provider: "claude",
        success: true,
        durationMs: Date.now() - startedAt,
        entryCount: targets.length,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        cacheCreationInputTokens: response.usage?.cache_creation_input_tokens ?? undefined,
        cacheReadInputTokens: response.usage?.cache_read_input_tokens ?? undefined,
      })}`,
    );

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) {
      console.warn("[explainIdentities] Empty response — using fallback narratives.");
      return fallbackResults(targets);
    }

    const raw = extractJson(text);
    const parsed = batchResponseSchema.parse(raw);

    // Index by identity_id so we can merge back in input order.
    // Any identity the model omitted OR returned malformed gets a fallback —
    // partial failures don't block the rest. The v2 response shape is encoded
    // here into the existing columns (see the IdentityExplanation doc comment).
    const byIdentityId = new Map<string, IdentityExplanation>();
    for (const rawItem of parsed.identities) {
      const item = explanationItemSchema.safeParse(rawItem);
      if (!item.success) {
        console.warn(
          `[explainIdentities] Dropping malformed identity item — it falls back alone: ${JSON.stringify(item.error.issues)}`,
        );
        continue;
      }
      byIdentityId.set(item.data.identity_id, {
        why_emerging: item.data.becoming_likely.map(singleLine).join("\n"),
        growth_opportunities: item.data.what_this_strengthens.map(singleLine),
        blind_spots: item.data.tradeoffs.map(singleLine),
        likely_evolution: singleLine(item.data.what_this_usually_becomes),
      } satisfies IdentityExplanation);
    }

    return targets.map((target) => {
      const explanation = byIdentityId.get(target.identityId);
      return explanation
        ? { identityId: target.identityId, explanation, source: "ai" as const }
        : {
            identityId: target.identityId,
            explanation: fallbackExplanation(target.evidenceStrength),
            source: "fallback" as const,
          };
    });
  } catch (error) {
    // Failures degrade to fallback narratives (repaired on a later run via
    // narrative_source) — keep the diagnostic that explains why.
    const detail =
      error instanceof z.ZodError
        ? JSON.stringify(error.issues)
        : error instanceof Error
          ? error.message
          : String(error);
    console.error(`[explainIdentities] Generation failed — using fallback narratives: ${detail}`);
    return fallbackResults(targets);
  }
}
