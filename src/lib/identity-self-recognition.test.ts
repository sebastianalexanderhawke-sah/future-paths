import { describe, expect, it } from "vitest";

import { computeDimensionScores, isValidSignalSlug } from "@/lib/behavior-signals";
import { IDENTITY_LIBRARY } from "@/lib/identity-library";
import { recognizeIdentities } from "@/lib/identity-recognition";

/**
 * Self-recognition audit: the library and the signal vocabulary must stay
 * aligned. For every identity, its own typical_behaviors — translated into
 * the signal slugs the extractor would tag them with — must make the engine
 * rank that identity #1, with a real margin over the runner-up. If an
 * identity cannot win its own canonical evidence, the engine is guessing
 * every time it surfaces (this is exactly how The Competitor and The Creator
 * were broken before the Identity Engine v2 vocabulary expansion: a canonical
 * competitor ranked behind The Builder, and a canonical creator ranked third).
 *
 * Each entry lists one signal group per typical behavior, in card order, so a
 * library edit and its evidence stay reviewable side by side. When a card
 * behavior changes, update its group here — the test failing on a rename is
 * the point.
 */
const CANONICAL_EVIDENCE: Record<string, string[][]> = {
  "the-builder": [
    ["starts_something_new"], // starts without waiting for permission
    ["starts_something_new"], // turns problems into things that get made
    ["sets_own_terms", "chooses_solo_path"], // keeps ownership of the important pieces
    ["takes_uncertain_risk"], // accepts real risk as the price of making
    ["starts_something_new"], // idea → first concrete step faster than others
  ],
  "the-explorer": [
    ["explores_new_topic", "takes_uncertain_risk"], // unfamiliar over comfortable
    ["explores_new_topic"], // enters new domains, places, communities
    ["adapts_to_feedback", "self_corrects"], // changes direction on new information
    ["adapts_to_feedback"], // adapts quickly to upheaval
    ["leaves_completed_chapter"], // leaves finished chapters behind
  ],
  "the-mentor": [
    ["guides_someones_growth"], // invests time in someone else's growth
    ["opens_up_about_weakness", "shares_personal_struggle"], // shares own failures openly
    ["prioritizes_relationships", "maintains_commitment"], // stays present through a hard season
    ["journals_or_reflects"], // turns experience into lessons
    ["guides_someones_growth"], // names what someone is becoming
  ],
  "the-craftsman": [
    ["follows_through_consistently"], // returns to the same discipline
    ["maintains_commitment"], // practices past "finished"
    ["tracks_own_performance", "self_corrects"], // studies own work for what's still wrong
    ["chooses_solo_path"], // protects long uninterrupted stretches
    ["maintains_commitment"], // refuses shortcuts under pressure
  ],
  "the-guardian": [
    ["resists_change", "prioritizes_relationships"], // protects what's already good
    ["maintains_commitment"], // keeps promises through disruption
    ["declines_risky_opportunity"], // declines what would endanger dependents
    ["follows_through_consistently"], // the person who is still there
    ["resists_change"], // waits for certainty before changing
  ],
  "the-connector": [
    ["seeks_collaboration"], // introduces people who should know each other
    ["starts_something_new", "seeks_collaboration"], // organizes the gathering
    ["engages_conflict_directly", "prioritizes_relationships"], // stays through conflict
    ["prioritizes_relationships"], // pulls the drifting back in
    ["shares_personal_struggle"], // shares difficulty so others feel safe
  ],
  "the-competitor": [
    ["enters_competitive_arena"], // seeks measured, public arenas
    ["seeks_stronger_challenge"], // harder opponent over comfortable win
    ["returns_after_setback"], // returns quickly after losses
    ["tracks_own_performance"], // tracks performance honestly
    ["seeks_stronger_challenge"], // raises the standard once it stops being hard
  ],
  "the-reformer": [
    ["engages_conflict_directly", "questions_assumptions"], // names the unmentioned problem
    ["questions_assumptions", "engages_conflict_directly"], // challenges how things are done
    ["engages_conflict_directly"], // stays in the uncomfortable conversation
    ["engages_conflict_directly"], // takes the friction as the price of the fix
    ["starts_something_new"], // pushes to change the system
  ],
  "the-scholar": [
    ["explores_new_topic"], // follows the question past the practical need
    ["explores_new_topic"], // reads and researches before forming a position
    ["questions_assumptions"], // returns to open questions
    ["journals_or_reflects"], // examines own past decisions
    ["questions_assumptions"], // prefers complete understanding
  ],
  "the-creator": [
    ["creates_original_work"], // makes original things
    ["shares_original_work"], // puts own work in front of people who could judge it
    ["sets_own_terms"], // self-expression over the conventional path
    ["creates_original_work", "explores_new_topic"], // new work from own obsessions
    ["creates_original_work"], // begins the next piece regardless of applause
  ],
};

// Below this relative margin, everyday evidence noise can flip the ranking —
// the audit that motivated v2 treated ~23% as "confusion likely".
const MIN_RUNNER_UP_MARGIN = 0.2;

describe("identity self-recognition (library ↔ signal vocabulary alignment)", () => {
  it("defines canonical evidence for exactly the identities in the library", () => {
    expect(Object.keys(CANONICAL_EVIDENCE).sort()).toEqual(
      IDENTITY_LIBRARY.map((i) => i.id).sort(),
    );
  });

  it("lists one signal group per typical behavior, in card order", () => {
    for (const identity of IDENTITY_LIBRARY) {
      expect(
        CANONICAL_EVIDENCE[identity.id],
        `${identity.canonical_name}: evidence groups must match typical_behaviors 1:1`,
      ).toHaveLength(identity.typical_behaviors.length);
    }
  });

  it("uses only signals from the approved vocabulary", () => {
    for (const [id, groups] of Object.entries(CANONICAL_EVIDENCE)) {
      for (const slug of groups.flat()) {
        expect(isValidSignalSlug(slug), `${id}: unknown signal "${slug}"`).toBe(true);
      }
    }
  });

  for (const identity of IDENTITY_LIBRARY) {
    describe(identity.canonical_name, () => {
      const signals = CANONICAL_EVIDENCE[identity.id].flat();
      const dimensions = computeDimensionScores(signals);
      const matches = recognizeIdentities(dimensions, {
        minLikelihood: 0,
        maxResults: IDENTITY_LIBRARY.length,
      });

      it("ranks #1 on its own canonical evidence", () => {
        expect(
          matches[0]?.identityId,
          `${identity.canonical_name} lost its own evidence to ${matches[0]?.canonicalName}`,
        ).toBe(identity.id);
      });

      it(`beats the runner-up by at least ${MIN_RUNNER_UP_MARGIN * 100}%`, () => {
        const [first, second] = matches;
        expect(first.identityId).toBe(identity.id);
        expect(second).toBeDefined();
        const margin = (first.score - second.score) / first.score;
        expect(
          margin,
          `${identity.canonical_name} beats ${second.canonicalName} by only ${(margin * 100).toFixed(0)}%`,
        ).toBeGreaterThanOrEqual(MIN_RUNNER_UP_MARGIN);
      });
    });
  }
});
