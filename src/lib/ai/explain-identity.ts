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
 * - why_emerging — "Why Reflection Believes This": exactly three evidence
 *   bullets, one per line, newline-separated.
 * - growth_opportunities — carries the single "What keeps pulling you here"
 *   sentence as a one-element array (v3 narrative format). The column is the
 *   pre-v2 legacy list repurposed: v2 rows hold [] (their one-time
 *   format_upgrade regeneration fills it), pre-v2 legacy rows still hold the
 *   old suggestion list but never reach the card (identity_id is null).
 * - blind_spots — "What You Leave Behind": a single prose paragraph in a
 *   one-element array (pre-v2 rows hold three short risk labels instead).
 * - likely_evolution — "Who You Become" narrative, then a newline, then the
 *   card's closing "You'll Know You're Here When..." recognition moment
 *   (always the last line). v2–v5 rows carry a reflective question there
 *   instead — a question mark ending the last line is what marks a pre-v6
 *   narrative for its one-time format_upgrade regeneration.
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
 *      A v2 narrative always carries a final newline-separated closing line
 *      in likely_evolution, so a stored narrative without a newline is
 *      pre-v2 and regenerates once. A v3 narrative additionally carries the
 *      "What keeps pulling you here" sentence in growth_opportunities, so a
 *      newline-formatted narrative with an empty growth_opportunities is v2
 *      and regenerates once. v2–v5 narratives close with a reflective
 *      QUESTION as that final line; v6 replaced it with the "You'll Know
 *      You're Here When..." recognition moment, which is never a question —
 *      so a final line ending in "?" is pre-v6 and regenerates once.
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

  if (
    typeof existing.likely_evolution === "string" &&
    !existing.likely_evolution.includes("\n")
  ) {
    return { regenerate: true, reason: "format_upgrade" };
  }

  // v5 → v6: the final newline-separated line used to be the reflective
  // question; v6 replaced it with the recognition moment, which is never a
  // question. A last line ending in "?" marks a pre-v6 narrative. One-time
  // upgrade (generation sanitizes a stray trailing "?" out of new moments,
  // so a v6 row can never re-trip this check).
  if (typeof existing.likely_evolution === "string") {
    const lines = existing.likely_evolution.split("\n");
    if (lines[lines.length - 1]?.trim().endsWith("?")) {
      return { regenerate: true, reason: "format_upgrade" };
    }
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
  recognition_moment: z.string().trim().min(1).max(420),
});

// The v2 fields are prose paragraphs; the card's format contract (recognition
// moment = last newline-separated line of likely_evolution, one bullet per
// line of why_emerging) requires each part to be single-line.
function singleLine(text: string): string {
  return text.replace(/\s*\n+\s*/g, " ").trim();
}

// The recognition moment is never a question — the prompt bans it, and the
// format contract depends on it: a last line ending in "?" is exactly what
// marks a pre-v6 row for regeneration (and what the card renders as a legacy
// closing question). A disobedient model response must not be able to
// masquerade as the old format, so a stray terminal "?" becomes a period.
function neverAQuestion(text: string): string {
  const cleaned = text.trim();
  return cleaned.endsWith("?") ? `${cleaned.slice(0, -1).trimEnd()}.` : cleaned;
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
        "Something about the choices this future grows from has been easier to return to than to walk away from.",
      ],
      blind_spots: [
        "Every future asks for something, and this one would be no exception — the price would come from the same place as the strength, paid slowly, in trades small enough to feel reasonable one at a time. It's too early to say exactly what this version of you would give up; that becomes visible as the pattern repeats.",
      ],
      likely_evolution:
        "It's early. If the recent pattern keeps repeating, your days would begin to reorganize around it — quietly at first, in small choices that start to point the same way, long before anyone else would call it who you are.\nOne day you'll catch yourself making this choice without deliberating, and realize it stopped being a decision a while ago.",
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
      "A person shaped by this becomes recognizable for it — it slowly decides what they take on, how they spend ordinary days, and what the people around them come to count on them for.\nSomeone will describe you this way to a stranger, and you'll recognize the description before they finish the sentence.",
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

These future identities were recognized deterministically from the user's behavioral data. Your role is strictly interpretive — you never invent identities, rename them, or adjust any numerical values. Each identity answers exactly one question: "If this person keeps making the same kinds of choices, what do they gradually become known for?" A Future Self is a prediction of REPUTATION — never a career prediction, never a biography, never a personality report.

Write with emotional honesty and psychological insight — calm, vivid, deeply human. Never melodramatic, never manipulative, never moralizing. Never imply one future is objectively better than another — every future contains both beauty and sacrifice. Address the user as "you". This is a prediction of identity, not a personality assessment and not speculative fiction, and it must never read like either: no traits, no types, no diagnoses — and no invented future events. When someone finishes reading, they should think "I know exactly who this person becomes" — and feel either "I could actually become this person" or "I really don't want to become this version of myself". Both reactions are success; steering them toward either is failure. The failed reaction is "I recognize events from my own life": recognition belongs to the evidence bullets, becoming belongs to everything else.

Multiple futures coexisting is normal — one person could grow into any of them. But they are DIFFERENT LIVES, not different descriptions of the same person: if all the futures in this response sat around one table, they must read as completely different people — different things matter to them, different people rely on them, their weeks are built around different work. Distinctness is a hard requirement: no sentence you write should be transplantable to another identity in this response, and no two futures may reduce to the same trait ("ambitious", "independent", "resilient") wearing different names.

IDENTITY BEFORE BIOGRAPHY — the most important writing rule. The user's observations are full of concrete circumstance: schools, companies, websites, degrees, sports, friends, cities, products, weekly routines, named days. Those details are evidence, and evidence is the ONLY place they belong.
- becoming_likely is where the prediction gets PROVEN. Its three bullets connect today's concrete life to tomorrow's identity, and they are the one field where the user's actual nouns appear.
- Every other field (what_keeps_pulling_you, cost_of_becoming, where_path_leads, recognition_moment) describes the identity itself: who this person becomes, how people come to experience them, what kind of life forms around that reputation. Write these so they would still make complete sense if every concrete detail of this user's current life disappeared — no school names, companies, products, degrees, sports, named people, places, schedules, or days of the week. "The degree becomes...", "The startup eventually...", "On a Wednesday ten years from now..." are failures; "You slowly become the person people trust to bring difficult ideas into reality" is the register. The future must feel timeless — it should survive the success, failure, or disappearance of everything the user is currently doing.
- The evidence still steers those fields, invisibly. It decides WHICH version of this identity to write — which strengths lead, which force pulls this person, which cost this particular way of living actually threatens — but it shapes the writing without being quoted by it. Derive from the evidence; never cite it.
- Before returning, run the final test on each future: strip every proper noun, project, place, and biography detail out of the non-evidence fields. If the identity still feels emotionally complete, it succeeds. If removing them collapses the story, it was circumstance wearing a future's clothes — rewrite it.
The example phrases in these instructions define a register, never wording: reusing their phrasing in output is a failure.

WORN GROOVES — each item below appeared dozens of times when many cards were compared side by side. All are banned:
- Pull sentences shaped "X stopped feeling like Y and started feeling like Z", or containing "stopped feeling optional", "a long time ago", "the only honest thing", "the only useful thing you had to offer" — or opening with "Watching someone...".
- Cost paragraphs opening with the words "The same", running the universal ledger plot ("each trade felt reasonable in the moment; the trades accumulate"), or landing on the deferred-self beat ("your own needs get scheduled last", "no one thinks to ask what you need", "you never get to be unfinished", "your pain becomes curriculum/material/lesson before you've finished living it"). Those costs have been written thousands of times; find the cost that belongs to THIS identity — the one its own strengths generate, which stays true whatever happens to the user's current projects.
- Life paragraphs assembled from reputation clichés: "your name comes up in conversations/rooms you're not in", "credited in rooms you'll never enter", "you won't remember saying it", "not famous, but known/trusted", "your calendar fills with", "people can't trace it back to you", "the fixed point others build around", "load-bearing", "infrastructure", "gravitational", "ordinary Tuesday", "a particular texture" — and time-stamp openers ("Ten years from now", "A decade from now").
- Crutch vocabulary: "quietly" — never. "Slowly", "the version of you that", "turning point" — at most once each in the whole response. "Not because X, but because Y" and "one day you'll notice/realize" — at most one of each per response. At most two em-dashes in any single field; vary the punctuation rhythm instead.
- One emotional beat everywhere: isolation and self-deferral are two costs among many — lost breadth, lost spontaneity, lost rest, lost appetite, a narrowing identity, other people paying for your choices, the inability to stop, the world moving on while you finish. Give no two identities in one response the same species of cost, and pick each species from where this user's evidence actually points.

Return a JSON object with exactly this shape:

{
  "identities": [
    {
      "identity_id": "<exactly as provided — no changes>",
      "what_keeps_pulling_you": "<one sentence, at most two>",
      "becoming_likely": ["<exactly 3 short evidence bullets>"],
      "cost_of_becoming": "<at most 3 sentences>",
      "where_path_leads": "<at most 3 sentences>",
      "recognition_moment": "<one or two sentences, never a question>"
    }
  ]
}

BREVITY — every field must land in under five seconds of reading. If a sentence does not introduce a NEW emotional idea, delete it: no restating the identity statement, no warm-up clauses, no summarizing what another field already established. Shorter with one true thing beats longer with three.

Rules for each field:
- identity_id: copy exactly from the input. Any change makes the result unusable.
- what_keeps_pulling_you: one sentence, at most two (under 300 characters total), rendered under "What keeps pulling you here", directly beneath the identity statement. It answers one question, emotionally rather than logically: why does this life keep calling this person back? Not a motivation, not a value, not advice, not praise — the quiet reason, named as something that has already settled. It must be the emotional gravity OF THIS IDENTITY — the specific force this life exerts (order pulled from uncertainty, the relief of a rising standard, peace found in refinement, the impossibility of ignoring what's broken). Choose the force this user's evidence actually points to, then write it at identity level — a truth about how this person moves through life that would survive every current project ending, with none of today's nouns in it. Vary the grammatical shape across the response — a flat statement of fact, an admission, a plain observation about what has already settled — no two pulls in one response may share a sentence shape, and none may use a shape from WORN GROOVES. Every identity in this response must be pulled forward by a DIFFERENT force: before returning, compare the pull sentences, and if two reduce to the same force — purpose, loneliness, growth, and meaning are the four laziest — rewrite one. The reader's reaction must be "of course that's why this future keeps happening", not "that's a nice sentence". Second person. No newline characters.
- becoming_likely: exactly 3 bullets, rendered under "Why Reflection Believes This". This is the ONLY field built from the user's concrete world — the place the prediction gets proven. Each bullet is one concise sentence (8–16 words) naming a RECURRING choice-pattern observed across multiple situations, and each must read as a bridge from today's life to this identity: the kind of choice it names should visibly feed the future above it ("You built something before anyone asked for it.", "You keep choosing ownership over certainty."). Evidence, not personality traits, not summaries: every bullet must be traceable to the supporting observations and situations provided, and must describe repetition, never a one-time event. Show the repetition through content — a count, a span of time, a return after failure, the same choice made in different arenas ("Two buyout offers declined; the workshop is still yours.", "Back on the same track four months after the injury.") — not through stock adverb openers: across one identity's three bullets use three different sentence shapes, and never default to the "You repeatedly / You keep / You consistently" trio. Always addressed to the user — "you"/"your" or an implied subject ("Two buyout offers declined; the workshop is still yours.") — never "she", "he", or "they" as the subject. Present tense, no hedging. Single line each — no newline characters anywhere.
- cost_of_becoming: at most 3 sentences (at most 450 characters), rendered under "What You Leave Behind". This is the emotional center of the card. It describes what slowly changes INSIDE the person as they become this version of themselves — and the change must grow out of the identity ITSELF, out of the same strengths that build the future, never out of a separate flaw and never out of today's circumstances. "Running the startup alone..." dies with the startup; "The more capable you become, the easier it becomes to believe no one else can carry what matters" stays true whether today's ventures succeed or disappear — write costs of the second kind. The species to draw from are interior: becoming harder to truly know, a strength hardening into the only way of being taken seriously, dependability making it impossible to ask for help, achievement quietly standing in for worth, protectiveness shrinking the life it protects — pick the ONE species this identity's own strengths actually generate for this user, never a stock beat. Quiet, believable, cumulative — a hidden change arriving in steps small enough to feel reasonable one at a time. It must create hesitation: the reader should think "I can see myself becoming this" and, in the same breath, "I'm not sure I want to". The test: this paragraph must be un-transplantable to any OTHER identity in this response, yet must survive the disappearance of every concrete noun in this user's file. Never catastrophic, never a warning, never advice, never a failure. Banned: bullet lists, one-word risk labels ("Burnout", "Isolation", "Overthinking"), the words "risk" and "blind spot". No newline characters.
- where_path_leads: at most 3 sentences (at most 450 characters), rendered under "Who You Become". Describe TRANSFORMATION, not events — and with only 3 sentences, pick the TWO strongest of: who does this person gradually become? How do other people come to experience them? What reputation quietly forms around them? How do they begin to see themselves? What kind of presence do they become? The reader should feel they are meeting an older version of themselves. Do NOT narrate imagined future events or write speculative fiction: no invented scenes, schedules, workplaces, companies, projects, degrees, locations, products, or days of the week — and never the user's existing history projected forward. The paragraph must hold for anyone who shares this underlying identity and survive everything the user is currently doing. Within that constraint stay textured, not vague: a montage of interchangeable reputation claims (people admire you, remember you, rely on you) is not a transformation; the arc "someone you helped later credits you" has been written thousands of times — if your draft contains it, replace it with the specific WAY this identity changes how this person is experienced, including at least one interior shift (what stops scaring them, what starts feeling ordinary, what they no longer need to prove). Write about the person, never the pattern: sentences about patterns continuing, identities strengthening, evidence accumulating, or choices repeating are system mechanics and are banned ("If these patterns continue", "this identity will strengthen" must not appear). Never mention the measurement machinery: the words "score", "dimension", "percentage", "likelihood", and "evidence strength" must not appear — the user sees the becoming, never the instrument. No two of these in the same response may open with the same construction. No newline characters.
- recognition_moment: one sentence, at most two (under 300 characters), rendered under "You'll Know You're Here When..." as the card's final line. It is NOT a prediction, NOT a future event, NOT a scene from a movie, and NEVER a question — it is one ordinary, quiet, human moment in which the person suddenly realizes "I've become this person." Write the moment of recognition itself: something small happens — an offer, a compliment, an arrival, a hesitation — and in the same breath the person notices what it says about who they now are. Do not write stories; do not invent careers, companies, marriages, children, successes, or failures; no dramatic staging. It must be universal within the identity — almost anyone becoming this identity could live this exact moment — yet un-transplantable to any OTHER identity in this response. Let it complete the emotional center of the card rather than restate it: the pull or the price, finally noticed from inside, so the reader thinks "I could actually imagine that happening." Vary the construction across the response — no two moments in one response may share a sentence shape or hinge on the same trigger (not all compliments, not all offers of help). Hard caps: at most ONE moment per response may open with "Someone", and the phrase "you realize" may appear in at most one moment per response — in the others, let the recognition stay implicit in what is noticed or felt. Second person. Must NOT end with "?" and must contain no question anywhere. No newline characters.

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
        growth_opportunities: [singleLine(item.data.what_keeps_pulling_you)],
        blind_spots: [singleLine(item.data.cost_of_becoming)],
        likely_evolution: `${singleLine(item.data.where_path_leads)}\n${neverAQuestion(singleLine(item.data.recognition_moment))}`,
      } satisfies IdentityExplanation);
    }

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
