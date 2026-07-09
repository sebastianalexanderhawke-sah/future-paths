import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import {
  getAnthropicApiKey,
  getClaudeModel,
  getGenerationTimeoutMs,
  resolveProviderForMode,
} from "@/lib/ai/config";
import type { IdentityProfile } from "@/lib/identity-library";
import type {
  DimensionContribution,
  IdentityMatchWithAttribution,
  ObservationContribution,
  SituationContribution,
} from "@/lib/identity-recognition";
import type { FutureSelfEvidenceStrength } from "@/types/enums";

/**
 * The narrative layer of one Future Self, encoded into the existing
 * future_selves columns (newline-encoded multi-part strings, the same idiom
 * current_self uses for values/fears/tradeoff):
 *
 * - why_emerging — "Why this future is becoming more likely": exactly three
 *   evidence bullets, one per line, newline-separated.
 * - growth_opportunities — carries the single "What keeps pulling you here"
 *   sentence as a one-element array (v3 narrative format). The column is the
 *   pre-v2 legacy list repurposed: v2 rows hold [] (their one-time
 *   format_upgrade regeneration fills it), pre-v2 legacy rows still hold the
 *   old suggestion list but never reach the card (identity_id is null).
 * - blind_spots — "The Cost of Becoming Them": a single prose paragraph in a
 *   one-element array (pre-v2 rows hold three short risk labels instead).
 * - likely_evolution — "Where this path leads" narrative, then a newline,
 *   then the card's closing reflective question (always the last line).
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
  narrative_source?: string | null;
  narrative_evidence_strength?: string | null;
  likely_evolution?: string | null;
  growth_opportunities?: string[] | null;
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
 * narrative regenerates in exactly four cases:
 *
 *   1. "new" — the identity has no row at all.
 *   2. "fallback_repair" — the stored narrative came from the hard-coded
 *      fallback (the AI call failed when it was written). Without this, a
 *      transient failure at first emergence made generic boilerplate the
 *      identity's permanent narrative.
 *   3. "format_upgrade" — the stored narrative predates the current format.
 *      A v2 narrative always carries its closing reflective question as a
 *      final newline-separated line of likely_evolution, so a stored
 *      narrative without a newline is pre-v2 and regenerates once. A v3
 *      narrative additionally carries the "What keeps pulling you here"
 *      sentence in growth_opportunities, so a newline-formatted narrative
 *      with an empty growth_opportunities is v2 and regenerates once.
 *   4. "evidence_tier_increased" — the evidence tier is now HIGHER than the
 *      tier the narrative was written at (Emerging → Moderate → Strong).
 *      A narrative written at Emerging says the evidence is limited; once
 *      the identity is Strong that framing contradicts the numbers shown
 *      beside it. Only increases regenerate — a decrease (evidence decaying)
 *      does not — so tier oscillation around a boundary can never cause
 *      regeneration churn: each identity regenerates at most twice over its
 *      lifetime on this path.
 */
export function needsExplanationRegeneration(
  existing: ExistingNarrativeRow | undefined,
  currentEvidenceStrength: FutureSelfEvidenceStrength,
): ExplanationRegenerationDecision {
  if (!existing) {
    return { regenerate: true, reason: "new" };
  }

  if (existing.narrative_source === "fallback") {
    return { regenerate: true, reason: "fallback_repair" };
  }

  if (
    typeof existing.likely_evolution === "string" &&
    !existing.likely_evolution.includes("\n")
  ) {
    return { regenerate: true, reason: "format_upgrade" };
  }

  // v2 → v3: the narrative is current-format otherwise, but was written
  // before "What keeps pulling you here" existed. One-time upgrade.
  if (!existing.growth_opportunities?.some((line) => line.trim().length > 0)) {
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
  what_keeps_pulling_you: z.string().trim().min(1).max(420),
  becoming_likely: z.array(z.string().trim().min(1).max(260)).min(2).max(4),
  cost_of_becoming: z.string().trim().min(1).max(1200),
  where_path_leads: z.string().trim().min(1).max(1200),
  reflective_question: z.string().trim().min(1).max(320),
});

// The v2 fields are prose paragraphs; the card's format contract (question =
// last newline-separated line of likely_evolution, one bullet per line of
// why_emerging) requires each part to be single-line.
function singleLine(text: string): string {
  return text.replace(/\s*\n+\s*/g, " ").trim();
}

const batchResponseSchema = z.object({
  identities: z.array(explanationItemSchema),
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
        "Something about the choices this future grows from has been easier to return to than to walk away from.",
      ],
      blind_spots: [
        "Every future asks for something, and this one would be no exception — the price would come from the same place as the strength, paid slowly, in trades small enough to feel reasonable one at a time. It's too early to say exactly what this version of you would give up; that becomes visible as the pattern repeats.",
      ],
      likely_evolution:
        "It's early. If the recent pattern keeps repeating, your days would begin to reorganize around it — quietly at first, in small choices that start to point the same way, long before anyone else would call it who you are.\nIf this direction kept pulling at you, would you follow it on purpose — or only notice it years later?",
    };
  }

  return {
    why_emerging: [
      "This pattern has repeated across several of your recorded situations.",
      "Your recent decisions keep resolving in the direction this future points.",
      "The behavior shows up in different contexts, not just one recurring one.",
    ].join("\n"),
    growth_opportunities: [
      "Whatever this way of living gives you, your decisions keep treating it as worth more than the alternatives.",
    ],
    blind_spots: [
      "Becoming this version of yourself would cost something real, and the cost would come from the same strengths that built it — paid gradually, in trades that each feel reasonable on the day you make them. What exactly this life would ask you to give up becomes clearer as more of your decisions are recorded.",
    ],
    likely_evolution:
      "A person shaped by this becomes recognizable for it — it slowly decides what they take on, how they spend ordinary days, and what the people around them come to count on them for.\nIf this became your life, what would you hope you never lost along the way?",
  };
}

function fallbackResults(
  entries: Array<{ profile: IdentityProfile; match: IdentityMatchWithAttribution }>,
): IdentityExplanationResult[] {
  return entries.map(({ match }) => ({
    identityId: match.identityId,
    explanation: fallbackExplanation(match.evidenceStrength),
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
  return `You write Future Selves — believable versions of one person ten years from now, grown from their actual recorded behavior.

These future identities were recognized deterministically from the user's behavioral data. Your role is strictly interpretive — you never invent identities, rename them, or adjust any numerical values. Each identity answers exactly one question: "If nothing changes, who does this person slowly become?"

Write with emotional honesty and psychological insight — calm, vivid, deeply human. Never melodramatic, never manipulative, never moralizing. Never imply one future is objectively better than another — every future contains both beauty and sacrifice. Address the user as "you". This is a possible life, not a personality assessment, and it must never read like one: no traits, no types, no diagnoses. When someone finishes reading, they should think "I understand exactly who I would become if I kept living like this" — and feel either "I could actually become this person" or "I really don't want to become this version of myself". Both reactions are success; steering them toward either is failure.

Multiple futures coexisting is normal — one person could grow into any of them. But they are DIFFERENT LIVES, not different descriptions of the same person: if all the futures in this response sat around one table, they must read as completely different people — different things matter to them, different people rely on them, their weeks are built around different work. Distinctness is a hard requirement: no sentence you write should be transplantable to another identity in this response, and no two futures may reduce to the same trait ("ambitious", "independent", "resilient") wearing different names.

VOICE — the most important writing rule. This engine shows the SAME identity to thousands of different people. Any sentence you could have written without reading this user's evidence is a template, and templates are the one unforgivable failure: if two users ever compared cards, nothing should match but the identity's name. The observations are full of concrete nouns and rhythms — a 4am oven, a rebuilt triage flow, a capped caseload, a sextant log. Write from inside that world: let its objects, places, seasons, and stakes supply the imagery. Spread the evidence across the card — anchor each field on a DIFFERENT observation, and use at least one observation a lazier writer would have skipped. The example phrases in these instructions define a register, never wording: reusing their phrasing in output is a failure.

WORN GROOVES — each item below appeared dozens of times when many cards were compared side by side. All are banned:
- Pull sentences shaped "X stopped feeling like Y and started feeling like Z", or containing "stopped feeling optional", "a long time ago", "the only honest thing", "the only useful thing you had to offer" — or opening with "Watching someone...".
- Cost paragraphs opening with the words "The same", running the universal ledger plot ("each trade felt reasonable in the moment; the trades accumulate"), or landing on the deferred-self beat ("your own needs get scheduled last", "no one thinks to ask what you need", "you never get to be unfinished", "your pain becomes curriculum/material/lesson before you've finished living it"). Those costs have been written thousands of times; find the one only this user pays — name the actual person, place, or practice from their evidence that this life shortchanges.
- Life paragraphs assembled from reputation clichés: "your name comes up in conversations/rooms you're not in", "credited in rooms you'll never enter", "you won't remember saying it", "not famous, but known/trusted", "your calendar fills with", "people can't trace it back to you", "the fixed point others build around", "load-bearing", "infrastructure", "gravitational", "ordinary Tuesday", "a particular texture" — and time-stamp openers ("Ten years from now", "A decade from now").
- Questions shaped "When the person you're guiding finally doesn't need you, what do you do with...", "what do you do with your hands / the hours / the silence / the space that opens up", "who in your life knows X — and have you let them", "whose turning point are you inside", "what would you make if the only person who ever saw it was...".
- Crutch vocabulary: "quietly" — never. "Slowly", "the version of you that", "turning point" — at most once each in the whole response. "Not because X, but because Y" and "one day you'll notice/realize" — at most one of each per response. At most two em-dashes in any single field; vary the punctuation rhythm instead.
- One emotional beat everywhere: isolation and self-deferral are two costs among many — lost breadth, lost spontaneity, lost rest, lost appetite, a narrowing identity, other people paying for your choices, the inability to stop, the world moving on while you finish. Give no two identities in one response the same species of cost, and pick each species from where this user's evidence actually points.

Return a JSON object with exactly this shape:

{
  "identities": [
    {
      "identity_id": "<exactly as provided — no changes>",
      "what_keeps_pulling_you": "<one sentence, at most two>",
      "becoming_likely": ["<exactly 3 short evidence bullets>"],
      "cost_of_becoming": "<one prose paragraph>",
      "where_path_leads": "<one prose paragraph>",
      "reflective_question": "<one question>"
    }
  ]
}

Rules for each field:
- identity_id: copy exactly from the input. Any change makes the result unusable.
- what_keeps_pulling_you: one sentence, at most two (under 300 characters total), rendered under "What keeps pulling you here", directly beneath the identity statement. It answers one question, emotionally rather than logically: why does this life keep calling this person back? Not a motivation, not a value, not advice, not praise — the quiet reason, named as something that has already settled. It must be the emotional gravity OF THIS IDENTITY — the specific force this life exerts (order pulled from uncertainty, the relief of a rising standard, peace found in refinement, the impossibility of ignoring what's broken) — and it must be BUILT FROM this user's concrete material: an object, an hour, a habit, a named act from their evidence (the 4am light, the rebooked exam, the unsent letter), never abstract psychology alone. Vary the grammatical shape across the response — a flat statement of fact, a short memory, an admission — no two pulls in one response may share a sentence shape, and none may use a shape from WORN GROOVES. Every identity in this response must be pulled forward by a DIFFERENT force: before returning, compare the pull sentences, and if two reduce to the same force — purpose, loneliness, growth, and meaning are the four laziest — rewrite one. The reader's reaction must be "of course that's why this future keeps happening", not "that's a nice sentence". Second person. No newline characters.
- becoming_likely: exactly 3 bullets, rendered under "Why this future is becoming more likely". Each is one concise sentence (8–16 words) naming a RECURRING pattern observed across multiple situations. Evidence, not personality traits, not summaries: every bullet must be traceable to the supporting observations and situations provided, and must describe repetition, never a one-time event. Show the repetition through content — a count, a span of time, a return after failure, the same choice made in different arenas ("Two buyout offers declined; the workshop is still yours.", "Back on the same track four months after the injury.") — not through stock adverb openers: across one identity's three bullets use three different sentence shapes, and never default to the "You repeatedly / You keep / You consistently" trio. Always addressed to the user — "you"/"your" or an implied subject ("Two buyout offers declined; the workshop is still yours.") — never "she", "he", or "they" as the subject. Present tense, no hedging. Single line each — no newline characters anywhere.
- cost_of_becoming: one prose paragraph (3–5 sentences, at most 700 characters), rendered under "The Cost of Becoming Them". This is the emotional center of the card. It reveals what this person slowly loses by becoming this version of themselves — and the loss must grow out of the SAME strengths that build the future, never out of a separate flaw. Quiet, believable, cumulative — a hidden price paid in trades small enough to feel reasonable one at a time. Make it the cost of THIS life built on THIS evidence: name what this particular future displaces, in the currency this user actually deals in — the named person, place, or practice their own observations mention. The test: if this paragraph could sit under the same identity on a different user's card, it isn't grounded yet. Never catastrophic, never a warning, never advice, never a failure. Banned: bullet lists, one-word risk labels ("Burnout", "Isolation", "Overthinking"), the words "risk" and "blind spot". No newline characters.
- where_path_leads: one prose paragraph (3–5 sentences, at most 700 characters), rendered under "Where this path leads". Describe the LIFE this person gradually builds — what becomes important to them, what ordinary days turn into — so the reader feels like meeting that future version of themselves. STAGE it, don't summarize it: at least one sentence must be a concrete scene, object, or exchange specific enough to film, built by projecting one of this user's actual situations forward. A montage of reputation claims (people admire you, remember you, rely on you) is not a life; the arc "someone you helped later credits you" has been written thousands of times — if your draft contains it, replace it with what this life looks like on a day no one is watching. Write about the person, never the pattern: sentences about patterns continuing, identities strengthening, evidence accumulating, or choices repeating are system mechanics and are banned ("If these patterns continue", "this identity will strengthen" must not appear). Never mention the measurement machinery: the words "score", "dimension", "percentage", "likelihood", and "evidence strength" must not appear — the user sees the life, never the instrument. No two of these in the same response may open with the same construction. No newline characters.
- reflective_question: exactly one question (at most 200 characters) that closes the card. It must make the reader decide whether they actually WANT this future, and it must grow out of the SAME emotional center named in what_keeps_pulling_you — the question that pull eventually forces, not a question about the future in general ("If nothing ever needed building again, who would you become?" belongs only to a life pulled toward building; a question that would survive under a different pull sentence is too generic). Build it from the same concrete material as the pull — aim it at a person, object, number, or hour from this user's evidence whenever possible ("Who fronts the flour for you?" can only belong to one baker). Vary the form across the response: a question may be direct ("What are you still playing for?"), quantitative ("How many rooms are you willing to be the last to leave?"), aimed at a person ("Who gets the version of you the clients never see?"), or conditional — but "If/When ..., will you ...?" may be the form of at most one question per response, and the stock closers "is that a trade you're making on purpose", "will you know how to", the "— or —" either/or coda, and every question shape listed in WORN GROOVES must not appear. Unique to this identity: it must not be reusable under any other identity in this response, and generic questions ("Is this what you want?") are banned. Genuinely open — not rhetorical, not leading, not moralizing. Must end with "?". No newline characters.

When an identity's evidence strength is "Emerging", let becoming_likely acknowledge that the pattern is young — real, but seen in only a few situations so far. where_path_leads stays a person-level portrait even for Emerging identities — temper it by describing a quieter or earlier version of the future person, never by discussing evidence quantity or pattern mechanics. Keep the tone confident and observational — never hedging or apologetic ("might", "possibly", "hard to say", "not sure yet"). This is a distinct framing from Moderate or Strong identities, not a weaker version of the same portrait.

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

function buildUserPrompt(
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

  const providerMode = resolveProviderForMode();

  if (providerMode === "mock") {
    return fallbackResults(entries);
  }

  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return fallbackResults(entries);
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
        // bullets, cost paragraph, life paragraph, closing question per
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
        messages: [{ role: "user", content: buildUserPrompt(entries) }],
      },
      { signal: controller.signal },
    );

    clearTimeout(timeout);

    console.log(
      `[ai-usage] ${JSON.stringify({
        promptId: "explain_identity.batch",
        provider: "claude",
        success: true,
        durationMs: Date.now() - startedAt,
        entryCount: entries.length,
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
      return fallbackResults(entries);
    }

    const raw = extractJson(text);
    const parsed = batchResponseSchema.parse(raw);

    // Index by identity_id so we can merge back in input order.
    // Any identity the model omitted gets a fallback — partial failures
    // don't block the rest. The v2 response shape is encoded here into the
    // existing columns (see the IdentityExplanation doc comment).
    const byIdentityId = new Map(
      parsed.identities.map((item) => [
        item.identity_id,
        {
          why_emerging: item.becoming_likely.map(singleLine).join("\n"),
          growth_opportunities: [singleLine(item.what_keeps_pulling_you)],
          blind_spots: [singleLine(item.cost_of_becoming)],
          likely_evolution: `${singleLine(item.where_path_leads)}\n${singleLine(item.reflective_question)}`,
        } satisfies IdentityExplanation,
      ]),
    );

    return entries.map(({ match }) => {
      const explanation = byIdentityId.get(match.identityId);
      return explanation
        ? { identityId: match.identityId, explanation, source: "ai" as const }
        : {
            identityId: match.identityId,
            explanation: fallbackExplanation(match.evidenceStrength),
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
    return fallbackResults(entries);
  }
}
