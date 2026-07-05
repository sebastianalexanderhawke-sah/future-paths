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
 * Future Selves narratives are archetypes, not per-situation output, so
 * stability is the default: percentage movement, reactivation after fading,
 * and ordinary situations never regenerate. A narrative regenerates in
 * exactly three cases:
 *
 *   1. "new" — the identity has no row at all.
 *   2. "fallback_repair" — the stored narrative came from the hard-coded
 *      fallback (the AI call failed when it was written). Without this, a
 *      transient failure at first emergence made generic boilerplate the
 *      identity's permanent narrative.
 *   3. "evidence_tier_increased" — the evidence tier is now HIGHER than the
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

const explanationItemSchema = z.object({
  identity_id: z.string().trim().min(1),
  why_emerging: z.string().trim().min(1).max(1000),
  growth_opportunities: z.array(z.string().trim().min(1).max(200)).min(1).max(4),
  // Trade-offs and predictions: the prompt asks for ≤180/≤550 chars, but the
  // model overshoots in large batches — the caps below are headroom, not
  // targets, so a few long sentences don't discard an otherwise valid batch.
  blind_spots: z.array(z.string().trim().min(1).max(300)).min(1).max(4),
  likely_evolution: z.string().trim().min(1).max(900),
});

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
      why_emerging:
        "This identity is beginning to emerge from a small number of specific behavioral choices. The pattern is real, but it has not yet repeated across enough situations to call it established.",
      growth_opportunities: [
        "Seek out situations that would let this pattern show up again.",
        "Notice when a choice lines up with this identity and what made it possible.",
      ],
      blind_spots: [
        "Mistaking a moment for a direction",
        "Crowding out other ways of being before they get room",
        "Building on a pattern that hasn't been tested yet",
      ],
      likely_evolution:
        "A person shaped by this becomes someone whose days, relationships, and decisions gradually reorganize around it — quietly at first, in small choices that begin to point the same way.",
    };
  }

  return {
    why_emerging:
      "This identity pattern is appearing across your recent situations and behavioral choices.",
    growth_opportunities: [
      "Engage deliberately in situations that call for this pattern.",
      "Notice when this identity is active and what enables it.",
    ],
    blind_spots: [
      "Losing what this strength displaces",
      "A narrowing range of who you can be",
      "People outside this pattern receiving less of you",
    ],
    likely_evolution:
      "A person defined by this becomes recognizable for it — it shapes what they take on, how they decide, and what the people around them come to rely on them for.",
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
  console.log(`[IDENTITY-DEBUG] extractJson start | inputChars=${text.length}`);
  const trimmed = text.trim();
  try {
    console.log(`[IDENTITY-DEBUG] JSON.parse attempt=direct start`);
    const result = JSON.parse(trimmed);
    console.log(`[IDENTITY-DEBUG] JSON.parse attempt=direct end | success=true`);
    console.log(`[IDENTITY-DEBUG] extractJson end | branch=direct`);
    return result;
  } catch (directError) {
    console.log(
      `[IDENTITY-DEBUG] JSON.parse attempt=direct end | success=false error=${
        directError instanceof Error ? `${directError.name}: ${directError.message}` : String(directError)
      }`,
    );
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      console.log(`[IDENTITY-DEBUG] JSON.parse attempt=fenced start`);
      try {
        const result = JSON.parse(fenced[1].trim());
        console.log(`[IDENTITY-DEBUG] JSON.parse attempt=fenced end | success=true`);
        console.log(`[IDENTITY-DEBUG] extractJson end | branch=fenced`);
        return result;
      } catch (fencedError) {
        console.log(
          `[IDENTITY-DEBUG] JSON.parse attempt=fenced end | success=false error=${
            fencedError instanceof Error ? `${fencedError.name}: ${fencedError.message}` : String(fencedError)
          }`,
        );
        throw fencedError;
      }
    }
    const start = trimmed.indexOf("{");
    if (start >= 0) {
      console.log(`[IDENTITY-DEBUG] JSON.parse attempt=slice-from-brace start | braceIndex=${start}`);
      try {
        const result = JSON.parse(trimmed.slice(start));
        console.log(`[IDENTITY-DEBUG] JSON.parse attempt=slice-from-brace end | success=true`);
        console.log(`[IDENTITY-DEBUG] extractJson end | branch=slice-from-brace`);
        return result;
      } catch (sliceError) {
        console.log(
          `[IDENTITY-DEBUG] JSON.parse attempt=slice-from-brace end | success=false error=${
            sliceError instanceof Error ? `${sliceError.name}: ${sliceError.message}` : String(sliceError)
          }`,
        );
        throw sliceError;
      }
    }
    console.log(`[IDENTITY-DEBUG] extractJson end | branch=none-found`);
    throw new Error("Response did not contain JSON.");
  }
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return `You explain a set of recognized behavioral identity patterns together.

These patterns were identified deterministically from the user's behavioral data. Your role is strictly interpretive — explain existing evidence. You must never invent identities, rename them, or adjust any numerical values.

Multiple identities coexisting in one person is normal. They may reinforce each other or represent different dimensions of how this person operates. Each explanation should feel aware of the broader identity profile. Distinctness is a hard requirement: no sentence you write should be transplantable to another identity in this response. Vary sentence openers across identities — if two explanations begin the same way, rewrite one.

Return a JSON object with exactly this shape:

{
  "identities": [
    {
      "identity_id": "<exactly as provided — no changes>",
      "why_emerging": "<2-4 sentences>",
      "growth_opportunities": ["<2-4 strings>"],
      "blind_spots": ["<exactly 3 short risks>"],
      "likely_evolution": "<2-4 sentences>"
    }
  ]
}

Rules for each field:
- identity_id: copy exactly from the input. Any change makes the result unusable.
- why_emerging: 2-4 sentences. Reference specific situations and observation types. Begin with what the evidence shows: "Across several situations...", "The evidence shows...", "In multiple contexts..."
- growth_opportunities: 2-4 strings. Each is a concrete behavior (8-20 words). Start each with a verb: Start, Practice, Seek, Build, Create, Take, Develop, Invest, Pursue.
- blind_spots: exactly 3 strings, rendered to the user under the heading "What You Risk". Each is a short, emotionally recognizable risk (2-8 words, noun phrase preferred) that emerges if this identity becomes dominant — the register of "Burnout", "Isolation", "Never feeling settled", "Carrying everything alone". Each must be a direct consequence of THIS archetype, felt from inside the life, not observed from outside it. No advice, no mechanisms, no explanations, no moral judgments, no full sentences of analysis ("watch for", "can make it harder to", "means that" are banned). If a risk could appear under a different identity in this response, replace it.
- likely_evolution: 2-4 sentences. This is a prediction, and it must answer: if this identity became one of the defining patterns of this person's life, who would they gradually become? Before writing, decide what KIND of future this archetype most naturally produces — a career trajectory, a relationship trajectory, a reputation, a lifestyle, an inner life, a leadership arc, a craft, a community role — and write that kind, chosen from where this identity's consequences actually concentrate. Different identities in the same response must not all describe the same kind of future. Ground the future in this user's actual evidence: project their specific situations and behaviors forward, so that another person with the same archetype but different evidence would get a visibly different future. It should read as "this is MY version of this identity", never a generic description of the archetype. Write about the person, never the pattern: any sentence about patterns continuing, identities strengthening, evidence accumulating, or repetition of choices is a system mechanic and is banned ("If these patterns continue", "this identity will strengthen", "if similar choices repeat" must not appear). Never mention the measurement machinery: the words "score", "dimension", "percentage", "likelihood", and "evidence strength" must not appear — the user sees the life, never the instrument. Do not open more than one prediction in this response with the same construction (e.g. "This person becomes..."). At most 550 characters.

When an identity's evidence strength is "Emerging", frame why_emerging around an identity beginning to emerge, not an established one: acknowledge that the evidence so far is limited. likely_evolution stays a person-level prediction even for Emerging identities — temper it by describing a quieter or earlier version of the future person, never by discussing evidence quantity or pattern mechanics. Keep the tone confident and observational — never hedging or apologetic ("might", "possibly", "hard to say", "not sure yet"). This is a distinct framing from Moderate or Strong identities, not a weaker version of the same explanation.

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
  console.log(`[IDENTITY-DEBUG] enter explainIdentities | entryCount=${entries.length}`);

  if (entries.length === 0) {
    return [];
  }

  const providerMode = resolveProviderForMode();
  console.log(`[IDENTITY-DEBUG] provider selected | provider=${providerMode}`);

  if (providerMode === "mock") {
    console.log(`[IDENTITY-DEBUG] fallbackResults() executing | reason=provider_mock`);
    return fallbackResults(entries);
  }

  const apiKey = getAnthropicApiKey();
  console.log(`[IDENTITY-DEBUG] api key present | present=${Boolean(apiKey)}`);
  if (!apiKey) {
    console.log(`[IDENTITY-DEBUG] fallbackResults() executing | reason=missing_api_key`);
    return fallbackResults(entries);
  }

  const model = getClaudeModel();
  console.log(`[IDENTITY-DEBUG] model used | model=${model}`);
  console.log(`[IDENTITY-DEBUG] number of identities | count=${entries.length}`);

  try {
    const client = new Anthropic({ apiKey });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getGenerationTimeoutMs());

    const __aiWaitT0 = Date.now();
    console.log(
      `[PROFILE] explainIdentities AI_WAIT | start=${new Date(__aiWaitT0).toISOString()} entryCount=${entries.length}`,
    );
    console.log(`[IDENTITY-DEBUG] AI request started | model=${model} entryCount=${entries.length}`);
    const response = await client.messages.create(
      {
        model,
        // Sized for a 5-identity batch of Phase 7B narratives (3-4 trade-offs
        // and person-level predictions per identity) — 2048 truncated these.
        max_tokens: 8192,
        temperature: 0.3,
        system: buildSystemPrompt(),
        messages: [{ role: "user", content: buildUserPrompt(entries) }],
      },
      { signal: controller.signal },
    );
    console.log(
      `[PROFILE] explainIdentities AI_WAIT | end=${new Date().toISOString()} durationMs=${Date.now() - __aiWaitT0}`,
    );
    console.log(
      `[IDENTITY-DEBUG] AI request completed | stopReason=${response.stop_reason} durationMs=${Date.now() - __aiWaitT0}`,
    );
    console.log(
      `[IDENTITY-DEBUG] token usage | inputTokens=${response.usage?.input_tokens} outputTokens=${response.usage?.output_tokens}`,
    );

    clearTimeout(timeout);

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    console.log(`[IDENTITY-DEBUG] raw response length | chars=${text.length}`);
    console.log(`[IDENTITY-DEBUG] raw response first 500 chars | text=${JSON.stringify(text.slice(0, 500))}`);
    console.log(`[IDENTITY-DEBUG] raw response last 500 chars | text=${JSON.stringify(text.slice(-500))}`);

    if (!text) {
      console.log(`[IDENTITY-DEBUG] fallbackResults() executing | reason=empty_response_text`);
      return fallbackResults(entries);
    }

    const __parseT0 = Date.now();
    console.log(`[PROFILE] explainIdentities PARSE | start=${new Date(__parseT0).toISOString()}`);

    let raw: unknown;
    try {
      raw = extractJson(text);
      console.log(`[IDENTITY-DEBUG] JSON extraction | success=true`);
      console.log(
        `[IDENTITY-DEBUG] parsed JSON keys | keys=${
          raw && typeof raw === "object" ? JSON.stringify(Object.keys(raw)) : `n/a (typeof=${typeof raw})`
        }`,
      );
    } catch (jsonError) {
      console.log(
        `[IDENTITY-DEBUG] JSON extraction | success=false error=${
          jsonError instanceof Error ? `${jsonError.name}: ${jsonError.message}` : String(jsonError)
        }`,
      );
      throw jsonError;
    }

    let parsed: ReturnType<typeof batchResponseSchema.parse>;
    console.log(`[IDENTITY-DEBUG] batchResponseSchema.parse start`);
    try {
      parsed = batchResponseSchema.parse(raw);
      console.log(`[IDENTITY-DEBUG] batchResponseSchema.parse end | success=true`);
      console.log(`[IDENTITY-DEBUG] Zod validation | success=true`);
    } catch (zodError) {
      console.log(`[IDENTITY-DEBUG] batchResponseSchema.parse end | success=false`);
      console.log(
        `[IDENTITY-DEBUG] Zod validation | success=false fullError=${
          zodError instanceof z.ZodError ? JSON.stringify(zodError.issues, null, 2) : String(zodError)
        }`,
      );
      if (zodError instanceof z.ZodError) {
        for (const issue of zodError.issues) {
          console.log(
            `[IDENTITY-DEBUG] invalid field | path=${issue.path.join(".")} code=${issue.code} message=${issue.message}`,
          );
        }
      }
      throw zodError;
    }

    console.log(
      `[PROFILE] explainIdentities PARSE | end=${new Date().toISOString()} durationMs=${Date.now() - __parseT0}`,
    );
    console.log(`[IDENTITY-DEBUG] explanations parsed | count=${parsed.identities.length}`);

    // Index by identity_id so we can merge back in input order.
    // Any identity the model omitted gets a fallback — partial failures
    // don't block the rest.
    const byIdentityId = new Map(
      parsed.identities.map((item) => [
        item.identity_id,
        {
          why_emerging: item.why_emerging,
          growth_opportunities: item.growth_opportunities,
          blind_spots: item.blind_spots,
          likely_evolution: item.likely_evolution,
        } satisfies IdentityExplanation,
      ]),
    );

    const missingIdentityIds = entries
      .map(({ match }) => match.identityId)
      .filter((id) => !byIdentityId.has(id));
    console.log(
      `[IDENTITY-DEBUG] missing identity_ids | count=${missingIdentityIds.length} ids=${JSON.stringify(missingIdentityIds)}`,
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
    console.log(
      `[IDENTITY-DEBUG] caught error | name=${
        error instanceof Error ? error.name : typeof error
      } message=${error instanceof Error ? error.message : String(error)} stack=${
        error instanceof Error ? error.stack : "n/a"
      }`,
    );
    console.log(`[IDENTITY-DEBUG] fallbackResults() executing | reason=caught_exception`);
    return fallbackResults(entries);
  }
}
