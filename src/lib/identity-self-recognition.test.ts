import { describe, expect, it } from "vitest";

import { computeDimensionScores, isValidSignalSlug } from "@/lib/behavior-signals";
import { IDENTITY_LIBRARY } from "@/lib/identity-library";
import { recognizeIdentities } from "@/lib/identity-recognition";

/**
 * Self-recognition audit: the library and the signal vocabulary must stay
 * aligned. For every identity, its own typical_behaviors — translated into
 * the signal slugs the extractor would tag them with — must make the engine
 * rank that identity #1. If an identity cannot win its own canonical
 * evidence, the engine is guessing every time it surfaces.
 *
 * Phase 4 margins are two-tier because the library is deliberately built
 * from trait VARIATIONS sharing a dominant dimension (Independent Builder /
 * Independent Loner / Quiet Confident are three ways Independence grows):
 *
 *   - Against competitors with a DIFFERENT dominant dimension the old
 *     confusion bar applies: a real margin, because both could appear on the
 *     page together and mixing them up misfiles the user's evidence.
 *   - Against SIBLINGS (same dominant dimension) only a strict win plus a
 *     small buffer is required: selection surfaces at most one per dominant
 *     dimension, so a close sibling race can never render two near-duplicate
 *     cards — the dedup test below pins that guarantee.
 *
 * Each entry lists one signal group per typical behavior, in card order, so
 * a library edit and its evidence stay reviewable side by side. When a card
 * behavior changes, update its group here — the test failing on a rename is
 * the point.
 */
const CANONICAL_EVIDENCE: Record<string, string[][]> = {
  "independent-builder": [
    ["chooses_solo_path"], // solo route on the work that matters
    ["starts_something_new"], // starts without permission or backing
    ["sets_own_terms"], // own terms over the default offer
    ["takes_uncertain_risk"], // risk as the price of ownership
    ["starts_something_new", "chooses_solo_path"], // idea → first step, alone
  ],
  "quiet-confident": [
    ["sets_own_terms"], // decides without polling the room
    ["chooses_solo_path"], // works alone without approval
    ["engages_conflict_directly"], // holds position under pushback
    ["takes_uncertain_risk"], // acts on their own read
    ["sets_own_terms"], // defines the conditions
  ],
  "independent-loner": [
    ["chooses_solo_path"], // solo even when company is offered
    ["chooses_solo_path"], // hard stretches handled alone
    ["sets_own_terms"], // keeps their own counsel
    ["chooses_solo_path"], // start to finish alone
  ],
  "careful-protector": [
    ["declines_risky_opportunity"], // declines exposure of what they hold
    ["declines_risky_opportunity"], // says no to the enticing bet
    ["resists_change"], // proven approach over untested
    ["chooses_solo_path"], // plans kept close, handled alone
    ["sets_own_terms"], // controls the conditions first
  ],
  "trusted-companion": [
    ["prioritizes_relationships"], // shows up again and again
    ["prioritizes_relationships"], // people over the solo win
    ["maintains_commitment"], // promises kept through busy seasons
    ["seeks_collaboration"], // pulls others in
    ["seeks_collaboration"], // stays part of shared things
  ],
  "steady-caregiver": [
    ["prioritizes_relationships"], // checks in during hard stretches
    ["guides_someones_growth"], // helps others grow unasked
    ["shares_personal_struggle"], // shares struggles so others feel less alone
    ["asks_for_help"], // asks and offers help freely
  ],
  "peace-keeper": [
    ["defers_to_others"], // lets others decide to keep it smooth
    ["avoids_conflict"], // steps around disagreements
    ["prioritizes_relationships", "defers_to_others"], // group comfort over own preference
    ["seeks_collaboration"], // keeps everyone included
    ["avoids_conflict"], // absorbs friction rather than voicing it
  ],
  "thoughtful-mentor": [
    ["guides_someones_growth"], // invests in someone's growth
    ["guides_someones_growth"], // names what someone is becoming
    ["journals_or_reflects"], // experience → lessons
    ["opens_up_about_weakness"], // honest about own mistakes
    ["prioritizes_relationships"], // present through hard seasons
  ],
  "purposeful-achiever": [
    ["starts_something_new"], // starts toward the goal unprompted
    ["starts_something_new"], // opens the next challenge
    ["seeks_stronger_challenge"], // harder standard on purpose
    ["maintains_commitment"], // works the plan past the fun
    ["tracks_own_performance"], // measures progress honestly
  ],
  "trusted-guide": [
    ["starts_something_new"], // organizes the effort
    ["starts_something_new"], // steps up first
    ["seeks_collaboration"], // brings people into the work
    ["guides_someones_growth"], // develops the people around them
    ["engages_conflict_directly"], // the unpopular call
  ],
  "hopeful-builder": [
    ["starts_something_new"], // starts expecting it to work
    ["starts_something_new"], // next attempt soon after a setback
    ["seeks_collaboration"], // rallies others around the upside
    ["explores_new_topic"], // unfamiliar as promising
    ["takes_uncertain_risk"], // bets on possibility before proof
  ],
  "honest-reflector": [
    ["journals_or_reflects"], // examines own patterns on purpose
    ["opens_up_about_weakness"], // names their part out loud
    ["self_corrects"], // corrects course when drifting
    ["questions_assumptions"], // questions own assumptions first
  ],
  "deep-analyzer": [
    ["explores_new_topic"], // researches before positioning
    ["questions_assumptions"], // returns to open questions
    ["questions_assumptions"], // keeps questioning after others settle
    ["journals_or_reflects"], // reviews past decisions in detail
    ["journals_or_reflects"], // thinks it all the way through
  ],
  "careful-planner": [
    ["journals_or_reflects"], // plans in advance, deliberately
    ["tracks_own_performance"], // tracks the details
    ["resists_change"], // proven routine over surprises
    ["declines_risky_opportunity"], // no bets they can't control
    ["sets_own_terms"], // defines the conditions
  ],
  "relentless-improver": [
    ["tracks_own_performance"], // studies own work for flaws
    ["tracks_own_performance"], // standard keeps rising
    ["self_corrects"], // fixes unflagged flaws
    ["self_corrects"], // reworks the acceptable
    ["maintains_commitment"], // practices past finished
  ],
  "adaptive-navigator": [
    ["adapts_to_feedback"], // changes approach on new information
    ["adapts_to_feedback"], // absorbs upheaval
    ["leaves_completed_chapter"], // leaves without ceremony
    ["self_corrects"], // adjusts before being forced
    ["explores_new_topic"], // reads new territory quickly
  ],
  "comfort-seeker": [
    ["resists_change"], // keeps the working routine
    ["resists_change"], // familiar over novel
    ["declines_risky_opportunity"], // passes on disruption
    ["declines_risky_opportunity"], // avoids uncomfortable downsides
    ["defers_to_others"], // goes along with the group's plan
  ],
  "curious-explorer": [
    ["explores_new_topic"], // follows the question past need
    ["explores_new_topic"], // enters unfamiliar domains
    ["questions_assumptions"], // pokes at assumptions
    ["leaves_completed_chapter"], // finished chapter → unopened one
    ["takes_uncertain_risk"], // uncertain but interesting
  ],
  "original-creator": [
    ["creates_original_work"], // makes original things
    ["creates_original_work"], // new work from own obsessions
    ["shares_original_work"], // work in front of judges
    ["shares_original_work"], // ships despite exposure
    ["sets_own_terms"], // the path that allows expression
  ],
  "lifelong-learner": [
    ["explores_new_topic"], // studies what they don't know
    ["explores_new_topic"], // least experienced in the room
    ["asks_for_help"], // help without shame
    ["questions_assumptions"], // assumes they might be wrong
    ["opens_up_about_weakness"], // admits not knowing, out loud
  ],
  "steady-finisher": [
    ["follows_through_consistently"], // completes over weeks
    ["follows_through_consistently"], // habit outlives novelty
    ["maintains_commitment"], // commitments through difficulty
    ["maintains_commitment"], // delivers unwatched
    ["tracks_own_performance"], // tracks follow-through honestly
  ],
  "steady-anchor": [
    ["resists_change"], // keeps what already works
    ["declines_risky_opportunity"], // declines foundation-risk
    ["declines_risky_opportunity"], // turns down the exciting disruption
    ["maintains_commitment"], // promises intact through disruption
    ["maintains_commitment"], // still there when people check
  ],
  "dependable-steward": [
    ["maintains_commitment"], // carries the entrusted, unreminded
    ["maintains_commitment"], // obligations past convenience
    ["follows_through_consistently"], // finishes the unglamorous work
    ["prioritizes_relationships"], // shows up for dependents
    ["prioritizes_relationships"], // dependents in every decision
  ],
  "long-game-thinker": [
    ["maintains_commitment"], // outcomes years away
    ["follows_through_consistently"], // steady without quick wins
    ["takes_deliberate_break"], // pauses on purpose
    ["takes_deliberate_break"], // waits out the urge to rush
    ["declines_risky_opportunity"], // no fast payoff over the long plan
  ],
  "tireless-worker": [
    ["maintains_commitment"], // keeps going after others stop
    ["maintains_commitment"], // works through rest
    ["follows_through_consistently"], // finishes everything picked up
    ["starts_something_new"], // another commitment on a full plate
    ["starts_something_new"], // next task immediately
  ],
  "bold-decision-maker": [
    ["takes_uncertain_risk"], // decides amid uncertainty
    ["takes_uncertain_risk"], // the postponed leap, taken
    ["seeks_stronger_challenge"], // harder option on purpose
    ["engages_conflict_directly"], // hard thing said directly
    ["starts_something_new"], // acts first
  ],
  "spontaneous-adventurer": [
    ["takes_uncertain_risk"], // yes before the details
    ["takes_uncertain_risk"], // jumps in while others deliberate
    ["leaves_completed_chapter"], // drops the finished chapter
    ["adapts_to_feedback"], // rolls with the change
    ["explores_new_topic"], // unfamiliar for its own sake
  ],
  "resilient-climber": [
    ["returns_after_setback"], // re-enters soon after a loss
    ["returns_after_setback"], // back to what knocked them down
    ["adapts_to_feedback"], // adjusts rather than quits
    ["seeks_stronger_challenge"], // harder version after surviving
    ["tracks_own_performance"], // tracks the comeback honestly
  ],
  "principled-leader": [
    ["engages_conflict_directly"], // names the unmentioned problem
    ["engages_conflict_directly"], // stays in the uncomfortable conversation
    ["questions_assumptions"], // challenges how things are done
    ["starts_something_new"], // pushes to fix the system
    ["maintains_commitment"], // holds the standard
  ],
  "conflict-avoider": [
    ["avoids_conflict"], // steps back from heat
    ["avoids_conflict"], // lets the point go
    ["avoids_conflict"], // finds the exit early
    ["adapts_to_feedback"], // bends plans around friction
    ["defers_to_others"], // someone else makes the contested call
  ],
};

// Below this relative margin against a DIFFERENT-dominant-trait competitor,
// everyday evidence noise can flip which trait the page shows — the audit
// that motivated Identity Engine v2 treated ~23% as "confusion likely".
const MIN_CROSS_TRAIT_MARGIN = 0.15;
// Siblings share a dominant dimension and can never co-display (dedup keeps
// one), so only a strict, float-safe win is required within the group.
const MIN_SIBLING_MARGIN = 0.03;

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
      // Full undeduped ranking: sibling scores must stay visible so the
      // margins below can be audited against every competitor.
      const matches = recognizeIdentities(dimensions, {
        minLikelihood: 0,
        maxResults: IDENTITY_LIBRARY.length,
        dedupeByDominantTrait: false,
      });

      it("ranks #1 on its own canonical evidence", () => {
        expect(
          matches[0]?.identityId,
          `${identity.canonical_name} lost its own evidence to ${matches[0]?.canonicalName}`,
        ).toBe(identity.id);
      });

      it("beats every competitor by the tier-appropriate margin", () => {
        const [first, ...rest] = matches;
        expect(first.identityId).toBe(identity.id);

        for (const competitor of rest) {
          if (competitor.score <= 0) continue;
          const margin = (first.score - competitor.score) / first.score;
          const sibling = competitor.dominantDimension === first.dominantDimension;
          const required = sibling ? MIN_SIBLING_MARGIN : MIN_CROSS_TRAIT_MARGIN;
          expect(
            margin,
            `${identity.canonical_name} beats ${competitor.canonicalName} (${
              sibling ? "sibling" : "cross-trait"
            }) by only ${(margin * 100).toFixed(1)}%`,
          ).toBeGreaterThanOrEqual(required);
        }
      });
    });
  }
});

describe("dominant-trait dedup (Phase 4 selection rule)", () => {
  it("never surfaces two Future Selves sharing a dominant dimension", () => {
    // Evidence engineered to score several Independence variations at once.
    const dimensions = computeDimensionScores([
      "chooses_solo_path",
      "chooses_solo_path",
      "sets_own_terms",
      "starts_something_new",
      "takes_uncertain_risk",
      "explores_new_topic",
      "maintains_commitment",
    ]);

    const matches = recognizeIdentities(dimensions, {
      minLikelihood: 0,
      maxResults: IDENTITY_LIBRARY.length,
    });

    const dominants = matches.map((match) => match.dominantDimension);
    expect(new Set(dominants).size).toBe(dominants.length);
  });

  it("keeps the highest-scoring identity of each dominant-trait group", () => {
    const dimensions = computeDimensionScores([
      "chooses_solo_path",
      "chooses_solo_path",
      "chooses_solo_path",
      "sets_own_terms",
    ]);

    const full = recognizeIdentities(dimensions, {
      minLikelihood: 0,
      maxResults: IDENTITY_LIBRARY.length,
      dedupeByDominantTrait: false,
    });
    const deduped = recognizeIdentities(dimensions, {
      minLikelihood: 0,
      maxResults: IDENTITY_LIBRARY.length,
    });

    // The strongest Independence-dominant match survives; its siblings don't.
    const independenceWinner = full.find(
      (match) => match.dominantDimension === "Independence",
    );
    const surfacedIndependence = deduped.filter(
      (match) => match.dominantDimension === "Independence",
    );
    expect(surfacedIndependence).toHaveLength(1);
    expect(surfacedIndependence[0].identityId).toBe(independenceWinner?.identityId);
  });

  it("caps user-facing selection at 5 distinct traits by default", () => {
    // Broad evidence touching every dimension positively.
    const dimensions = computeDimensionScores([
      "chooses_solo_path",
      "seeks_collaboration",
      "starts_something_new",
      "journals_or_reflects",
      "adapts_to_feedback",
      "explores_new_topic",
      "follows_through_consistently",
      "takes_uncertain_risk",
      "shares_personal_struggle",
      "engages_conflict_directly",
      "maintains_commitment",
      "creates_original_work",
      "guides_someones_growth",
      "returns_after_setback",
    ]);

    const matches = recognizeIdentities(dimensions, { minLikelihood: 0 });
    expect(matches.length).toBeLessThanOrEqual(5);
    const dominants = matches.map((match) => match.dominantDimension);
    expect(new Set(dominants).size).toBe(dominants.length);
  });
});
