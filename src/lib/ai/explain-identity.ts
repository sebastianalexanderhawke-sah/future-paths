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

export type IdentityExplanation = {
  why_emerging: string;
  growth_opportunities: string[];
  blind_spots: string[];
  likely_evolution: string;
};

export type IdentityExplanationResult = {
  identityId: string;
  explanation: IdentityExplanation;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const explanationItemSchema = z.object({
  identity_id: z.string().trim().min(1),
  why_emerging: z.string().trim().min(1).max(1000),
  growth_opportunities: z.array(z.string().trim().min(1).max(200)).min(1).max(4),
  blind_spots: z.array(z.string().trim().min(1).max(200)).min(1).max(4),
  likely_evolution: z.string().trim().min(1).max(600),
});

const batchResponseSchema = z.object({
  identities: z.array(explanationItemSchema),
});

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

export function fallbackExplanation(): IdentityExplanation {
  return {
    why_emerging:
      "This identity pattern is appearing across your recent situations and behavioral choices.",
    growth_opportunities: [
      "Engage deliberately in situations that call for this pattern.",
      "Notice when this identity is active and what enables it.",
    ],
    blind_spots: ["Watch for moments when this pattern creates friction with other values."],
    likely_evolution:
      "If these patterns continue, this identity may become more consistent across a wider range of situations.",
  };
}

function fallbackResults(
  entries: Array<{ profile: IdentityProfile; match: IdentityMatchWithAttribution }>,
): IdentityExplanationResult[] {
  return entries.map(({ match }) => ({
    identityId: match.identityId,
    explanation: fallbackExplanation(),
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
  return `You explain a set of recognized behavioral identity patterns together.

These patterns were identified deterministically from the user's behavioral data. Your role is strictly interpretive — explain existing evidence. You must never invent identities, rename them, or adjust any numerical values.

Multiple identities coexisting in one person is normal. They may reinforce each other or represent different dimensions of how this person operates. Each explanation should feel aware of the broader identity profile — avoid repeating identical wording across explanations.

Return a JSON object with exactly this shape:

{
  "identities": [
    {
      "identity_id": "<exactly as provided — no changes>",
      "why_emerging": "<2-4 sentences>",
      "growth_opportunities": ["<2-4 strings>"],
      "blind_spots": ["<2-4 strings>"],
      "likely_evolution": "<2-3 sentences>"
    }
  ]
}

Rules for each field:
- identity_id: copy exactly from the input. Any change makes the result unusable.
- why_emerging: 2-4 sentences. Reference specific situations and observation types. Begin with what the evidence shows: "Across several situations...", "The evidence shows...", "In multiple contexts..."
- growth_opportunities: 2-4 strings. Each is a concrete behavior (8-20 words). Start each with a verb: Start, Practice, Seek, Build, Create, Take, Develop, Invest, Pursue.
- blind_spots: 2-4 strings. Ground each specifically in what the opposing evidence shows. Start each with a noun or present-tense verb.
- likely_evolution: 2-3 sentences. Use grounded forward-looking language: "If these patterns continue...", "The trajectory suggests...", "Over time, this pattern could..."

Include one entry per identity provided — do not add or omit any. Do not use generic coaching language. Be specific to the evidence provided. Do not add fields beyond those specified.`;
}

function formatDimensions(dims: DimensionContribution[]): string {
  return dims
    .slice(0, 5)
    .map(
      (d) =>
        `  ${d.dimension}: weight ${d.identityWeight.toFixed(1)}, user score ${d.userScore}, contribution ${d.contribution.toFixed(1)}`,
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

  if (resolveProviderForMode() === "mock") {
    return fallbackResults(entries);
  }

  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return fallbackResults(entries);
  }

  try {
    const client = new Anthropic({ apiKey });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getGenerationTimeoutMs());

    const response = await client.messages.create(
      {
        model: getClaudeModel(),
        max_tokens: 2048,
        temperature: 0.3,
        system: buildSystemPrompt(),
        messages: [{ role: "user", content: buildUserPrompt(entries) }],
      },
      { signal: controller.signal },
    );

    clearTimeout(timeout);

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) {
      return fallbackResults(entries);
    }

    const raw = extractJson(text);
    const parsed = batchResponseSchema.parse(raw);

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

    return entries.map(({ match }) => ({
      identityId: match.identityId,
      explanation: byIdentityId.get(match.identityId) ?? fallbackExplanation(),
    }));
  } catch {
    return fallbackResults(entries);
  }
}
