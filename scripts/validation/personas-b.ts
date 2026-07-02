/**
 * Phase 8G validation personas 11-20.
 */

import type { ValidationPersona } from "./personas-a";

export const PERSONAS_B: ValidationPersona[] = [
  {
    id: "elaine-therapist",
    name: "Elaine",
    age: 44,
    occupation: "Solo-practice therapist (independent)",
    sketch:
      "Left a group practice to run her own. Deeply reflective, strong boundaries, small caseload by design. Conflict: depth vs. income; goal: a practice she never has to escape from.",
    situations: [
      { title: "leaving the group practice", observations: [
        ["Left a secure group practice to open a solo office", "chooses_solo_path", "takes_uncertain_risk"],
        ["Designed her own intake model instead of reusing the group's", "sets_own_terms", "starts_something_new"],
      ]},
      { title: "caseload boundaries", observations: [
        ["Capped her caseload at eighteen despite waitlist pressure", "sets_own_terms"],
        ["Kept the cap through a lean financial quarter", "maintains_commitment"],
      ]},
      { title: "her own therapy and supervision", observations: [
        ["Continued her own weekly therapy for a decade", "maintains_commitment", "journals_or_reflects"],
        ["Brought a countertransference problem to supervision immediately", "asks_for_help", "opens_up_about_weakness"],
      ]},
      { title: "client crisis handling", observations: [
        ["Held the frame with a client pushing every boundary, session after session", "follows_through_consistently"],
        ["Reviewed the case notes each week to examine her own reactions", "journals_or_reflects", "self_corrects"],
      ]},
      { title: "modality retraining", observations: [
        ["Trained in a new trauma modality over two years of weekends", "explores_new_topic", "follows_through_consistently"],
        ["Piloted it with three consenting clients before adopting broadly", "self_corrects"],
      ]},
      { title: "friend asking for free therapy", observations: [
        ["Declined to treat a close friend and explained the ethics plainly", "sets_own_terms"],
        ["Helped the friend find another therapist and checked in monthly", "prioritizes_relationships", "follows_through_consistently"],
      ]},
      { title: "quiet sabbath practice", observations: [
        ["Kept a phone-off Saturday practice for years", "takes_deliberate_break", "follows_through_consistently"],
        ["Journaled monthly on whether the work still fit her", "journals_or_reflects", "questions_assumptions"],
      ]},
      { title: "professional article", observations: [
        ["Wrote a journal article questioning a fashionable diagnostic trend", "questions_assumptions", "starts_something_new"],
        ["Revised her thesis after two peer reviewers dismantled a section", "adapts_to_feedback", "self_corrects"],
      ]},
      { title: "mother's dementia onset", observations: [
        ["Reduced the caseload one afternoon a week to accompany her mother", "prioritizes_relationships"],
        ["Told close colleagues what was happening rather than disappearing", "shares_personal_struggle"],
      ]},
      { title: "raising her rates", observations: [
        ["Raised rates after years of undercharging, with three months' notice", "sets_own_terms"],
        ["Kept two long-term clients at legacy rates by explicit choice", "prioritizes_relationships"],
      ]},
    ],
  },
  {
    id: "kofi-er-doc",
    name: "Kofi",
    age: 36,
    occupation: "Emergency physician",
    sketch:
      "Night-shift ER attending in an underfunded hospital. Fast, blunt, recovers quickly. Conflict: system failure vs. individual care; goal: stay human in a meat grinder.",
    situations: [
      { title: "hallway medicine nights", observations: [
        ["Rebuilt triage flow mid-shift when the waiting room overflowed", "adapts_to_feedback", "starts_something_new"],
        ["Made disposition calls on incomplete information all night", "takes_uncertain_risk"],
      ]},
      { title: "missed diagnosis case", observations: [
        ["Called the family himself when his miss came to light", "opens_up_about_weakness"],
        ["Presented his own error at the morbidity conference", "opens_up_about_weakness", "self_corrects"],
        ["Changed his abdominal pain workup rule afterward", "adapts_to_feedback"],
      ]},
      { title: "peer support group", observations: [
        ["Co-founded a physician peer support circle after a colleague's suicide", "starts_something_new", "seeks_collaboration"],
        ["Spoke first about his own intrusive thoughts to open the group", "shares_personal_struggle"],
      ]},
      { title: "telling hard truths to families", observations: [
        ["Gave families the honest prognosis rather than softened versions", "opens_up_about_weakness"],
        ["Stayed with a family after a failed resuscitation past shift end", "prioritizes_relationships"],
      ]},
      { title: "administration staffing fight", observations: [
        ["Documented unsafe staffing and took it to administration twice", "engages_conflict_directly", "follows_through_consistently"],
        ["Kept working the schedule while the dispute ran", "maintains_commitment"],
      ]},
      { title: "global health deployment", observations: [
        ["Took an unpaid month with a field hospital abroad", "takes_uncertain_risk", "starts_something_new"],
        ["Learned enough French in eight weeks to run triage", "explores_new_topic", "adapts_to_feedback"],
      ]},
      { title: "marathon habit", observations: [
        ["Kept a 5am run streak through rotating night shifts", "follows_through_consistently"],
        ["Booked a quarterly recovery weekend and defended it", "takes_deliberate_break", "sets_own_terms"],
      ]},
      { title: "resident who froze", observations: [
        ["Told the resident about the time he froze in his own training", "opens_up_about_weakness"],
        ["Ran the resident through simulations weekly until confident", "follows_through_consistently", "seeks_collaboration"],
      ]},
      { title: "night shift toll on marriage", observations: [
        ["Moved to a worse-paying schedule to keep weekends with his wife", "prioritizes_relationships", "sets_own_terms"],
        ["Started couples counseling before it became a crisis", "starts_something_new", "asks_for_help"],
      ]},
      { title: "equipment shortage improvisation", observations: [
        ["Improvised a pediatric workaround during an equipment failure", "adapts_to_feedback", "takes_uncertain_risk"],
        ["Wrote the workaround into a protocol and got it approved", "follows_through_consistently", "starts_something_new"],
      ]},
    ],
  },
  {
    id: "tara-sales",
    name: "Tara",
    age: 39,
    occupation: "Enterprise sales executive (highly social)",
    sketch:
      "Twelve years in SaaS sales, president's club regular. Everyone's first call. Conflicts: quota pressure vs. honest selling; goal: VP of sales without losing her network's trust.",
    situations: [
      { title: "walking away from a bad-fit deal", observations: [
        ["Told a prospect the product wouldn't solve their problem and withdrew", "opens_up_about_weakness", "sets_own_terms"],
        ["Introduced them to a competitor's rep she trusted", "prioritizes_relationships", "seeks_collaboration"],
      ]},
      { title: "quarter she missed badly", observations: [
        ["Owned the miss in the team call without excuses", "opens_up_about_weakness"],
        ["Rebuilt her pipeline process from the loss reviews", "self_corrects", "adapts_to_feedback"],
      ]},
      { title: "mentoring ring", observations: [
        ["Ran a monthly dinner for junior women in sales for five years", "starts_something_new", "maintains_commitment", "prioritizes_relationships"],
        ["Made introductions that cost her internal political capital", "prioritizes_relationships"],
      ]},
      { title: "the big logo gamble", observations: [
        ["Spent two quarters on one whale account against her manager's advice", "takes_uncertain_risk", "sets_own_terms"],
        ["Coordinated six internal teams to land the deal", "seeks_collaboration"],
      ]},
      { title: "new vertical territory", observations: [
        ["Volunteered for the unproven healthcare vertical", "takes_uncertain_risk", "starts_something_new"],
        ["Studied healthcare compliance to speak the buyers' language", "explores_new_topic"],
        ["Rewrote her pitch after early meetings flopped", "adapts_to_feedback", "self_corrects"],
      ]},
      { title: "colleague taking credit", observations: [
        ["Let a credit-grab slide once, then raised it directly with the colleague", "avoids_conflict", "engages_conflict_directly"],
        ["Kept collaborating with the same colleague on the account", "seeks_collaboration"],
      ]},
      { title: "friend's startup asking for intros", observations: [
        ["Opened her customer network to a friend's fledgling startup", "prioritizes_relationships"],
        ["Kept advising the friend monthly through their rough launch", "maintains_commitment"],
      ]},
      { title: "cancer scare year", observations: [
        ["Told her team the reason for her absences instead of covering", "shares_personal_struggle"],
        ["Kept her biggest renewals personally through treatment", "maintains_commitment"],
      ]},
      { title: "vp promotion politics", observations: [
        ["Asked three mentors to pressure-test her promotion case", "asks_for_help", "seeks_collaboration"],
        ["Deferred the push a year when the reorg made timing wrong", "defers_to_others"],
      ]},
      { title: "president's club streak", observations: [
        ["Hit quota eleven straight quarters through two product crises", "follows_through_consistently"],
        ["Shared her playbook openly with the whole team", "seeks_collaboration"],
      ]},
    ],
  },
  {
    id: "jae-student",
    name: "Jae",
    age: 21,
    occupation: "University junior (undeclared until last year)",
    sketch:
      "Switched from pre-med to cognitive science after a crisis of motivation. Curious about everything, commits to little. Conflict: parents' expectations; goal: find the thing worth finishing.",
    situations: [
      { title: "dropping pre-med", observations: [
        ["Dropped the pre-med track after two years of family investment", "takes_uncertain_risk", "questions_assumptions"],
        ["Told his parents directly rather than hiding the change", "opens_up_about_weakness"],
      ]},
      { title: "trying four clubs in one semester", observations: [
        ["Joined debate, film society, a robotics team, and a climbing group in one term", "explores_new_topic", "starts_something_new"],
        ["Quit three of them by December without much guilt", "explores_new_topic"],
      ]},
      { title: "cognitive science discovery", observations: [
        ["Audited a cognitive science lecture on a whim and stayed", "explores_new_topic"],
        ["Read the professor's entire book list over winter break", "explores_new_topic", "follows_through_consistently"],
      ]},
      { title: "study abroad decision", observations: [
        ["Applied for an exchange year in Seoul knowing no one there", "takes_uncertain_risk", "starts_something_new"],
        ["Asked his advisor to help restructure his credits for it", "asks_for_help"],
      ]},
      { title: "roommate conflict", observations: [
        ["Moved out rather than confront the roommate directly", "avoids_conflict"],
        ["Wrote in his notes app about why confrontation scares him", "journals_or_reflects"],
      ]},
      { title: "research assistant post", observations: [
        ["Talked his way into an RA slot without the prerequisites", "takes_uncertain_risk", "sets_own_terms"],
        ["Redid a failed analysis three times until the postdoc approved it", "self_corrects", "adapts_to_feedback"],
      ]},
      { title: "part-time tutoring job", observations: [
        ["Kept the same four tutoring students all year", "follows_through_consistently"],
        ["Adjusted his methods for the student who was falling behind", "adapts_to_feedback"],
      ]},
      { title: "questioning the family script", observations: [
        ["Wrote a long unsent letter questioning the doctor plan his family had for him", "journals_or_reflects", "questions_assumptions"],
        ["Talked to his uncle — the family's one non-doctor — about paths", "asks_for_help"],
      ]},
      { title: "hackathon weekend", observations: [
        ["Entered a hackathon in a domain he'd never touched", "explores_new_topic", "takes_uncertain_risk"],
        ["Pitched the half-broken demo on stage anyway", "opens_up_about_weakness"],
      ]},
      { title: "grandmother's hospitalization", observations: [
        ["Took the overnight hospital shifts no one else could cover", "prioritizes_relationships"],
        ["Kept his exam schedule intact by studying in the ward", "maintains_commitment"],
      ]},
    ],
  },
  {
    id: "amara-immigrant",
    name: "Amara",
    age: 33,
    occupation: "Immigrant rebuilding life (pharmacist recertifying)",
    sketch:
      "Licensed pharmacist in Lagos; stocking shelves in Toronto while recertifying. Two jobs, remittances home, exam sequence ahead. Goal: pharmacist license within three years.",
    situations: [
      { title: "the decision to emigrate", observations: [
        ["Left an established career and community for an uncertain start abroad", "takes_uncertain_risk"],
        ["Chose the country by researching licensure paths for a year", "explores_new_topic", "journals_or_reflects"],
      ]},
      { title: "recertification exam sequence", observations: [
        ["Studied before dawn shifts for the first equivalency exam", "follows_through_consistently", "maintains_commitment"],
        ["Failed the second exam once and rebooked it the same week", "self_corrects", "maintains_commitment"],
      ]},
      { title: "two jobs balance", observations: [
        ["Held both the pharmacy-assistant and warehouse jobs for eighteen months", "maintains_commitment"],
        ["Negotiated the warehouse shift pattern around exam dates", "sets_own_terms", "adapts_to_feedback"],
      ]},
      { title: "remittances home", observations: [
        ["Sent money home monthly without missing once", "follows_through_consistently", "prioritizes_relationships"],
        ["Told her mother honestly when she had to reduce the amount", "opens_up_about_weakness"],
      ]},
      { title: "navigating the credential bureaucracy", observations: [
        ["Asked a settlement agency to review her document package", "asks_for_help"],
        ["Appealed a rejected transcript evaluation and won", "follows_through_consistently", "questions_assumptions"],
      ]},
      { title: "building new community", observations: [
        ["Joined the local Nigerian association and volunteered at events", "seeks_collaboration", "starts_something_new"],
        ["Hosted newcomers from home for their first weeks, repeatedly", "prioritizes_relationships"],
      ]},
      { title: "winter depression stretch", observations: [
        ["Told her cousin she was struggling instead of performing strength", "shares_personal_struggle"],
        ["Kept the study schedule anyway, adjusted smaller", "maintains_commitment", "adapts_to_feedback"],
      ]},
      { title: "supervisor's dismissiveness", observations: [
        ["Corrected a supervisor's dosing error politely but firmly", "questions_assumptions", "engages_conflict_directly"],
        ["Let his condescension go unanswered to protect the reference", "avoids_conflict"],
      ]},
      { title: "learning the local system", observations: [
        ["Shadowed a licensed pharmacist on her day off to learn local practice", "explores_new_topic", "starts_something_new"],
        ["Adapted her Lagos counseling style to local expectations", "adapts_to_feedback"],
      ]},
      { title: "keeping traditions", observations: [
        ["Kept Sunday family video calls and festival cooking without exception", "maintains_commitment", "prioritizes_relationships"],
        ["Taught a cooking class at the community center", "starts_something_new", "seeks_collaboration"],
      ]},
    ],
    extraSituations: [
      { title: "final licensing exam", observations: [
        ["Passed the final exam and negotiated her first pharmacist posting", "sets_own_terms"],
        ["Threw a thank-you dinner for everyone who had helped", "prioritizes_relationships"],
      ]},
    ],
  },
  {
    id: "paul-nonprofit",
    name: "Paul",
    age: 48,
    occupation: "Non-profit director (housing)",
    sketch:
      "Founded a housing nonprofit fifteen years ago. Chronic funding cliff-edges. Radically transparent with staff. Goal: the org outliving him.",
    situations: [
      { title: "funding cliff year", observations: [
        ["Told the whole staff the runway numbers before deciding anything", "opens_up_about_weakness"],
        ["Launched an emergency donor circle within a fortnight", "starts_something_new", "seeks_collaboration"],
        ["Cut his own salary before any staff role", "sets_own_terms", "prioritizes_relationships"],
      ]},
      { title: "founding story", observations: [
        ["Started the org from a church basement with no funding", "starts_something_new", "takes_uncertain_risk"],
        ["Knocked on two hundred doors the first winter", "follows_through_consistently"],
      ]},
      { title: "board conflict over mission drift", observations: [
        ["Initiated the hard board conversation about mission drift himself", "engages_conflict_directly", "questions_assumptions"],
        ["Accepted the board's compromise he only half agreed with", "defers_to_others"],
      ]},
      { title: "burnout admission", observations: [
        ["Told the board he was burning out and needed a sabbatical", "opens_up_about_weakness", "shares_personal_struggle"],
        ["Built a deputy structure so the org could run without him", "starts_something_new", "seeks_collaboration"],
      ]},
      { title: "city partnership negotiation", observations: [
        ["Spent two years courting a skeptical city housing office", "maintains_commitment", "follows_through_consistently"],
        ["Redesigned the program to fit city audit requirements", "adapts_to_feedback"],
      ]},
      { title: "resident council", observations: [
        ["Created a resident council with real veto power over programs", "starts_something_new", "seeks_collaboration"],
        ["Accepted the council killing his favorite initiative", "defers_to_others", "adapts_to_feedback"],
      ]},
      { title: "staff member's public criticism", observations: [
        ["Met the critical staffer one-on-one and heard the whole case", "seeks_collaboration"],
        ["Implemented two of her three demands and explained the third", "adapts_to_feedback", "opens_up_about_weakness"],
      ]},
      { title: "his own housing story", observations: [
        ["Spoke publicly about his childhood eviction for the first time", "shares_personal_struggle", "opens_up_about_weakness"],
        ["Kept telling it at fundraisers despite the personal cost", "maintains_commitment"],
      ]},
      { title: "succession planning", observations: [
        ["Named a successor timeline years before anyone asked", "starts_something_new", "journals_or_reflects"],
        ["Mentored the deputy weekly toward the handover", "maintains_commitment", "prioritizes_relationships"],
      ]},
      { title: "declining a political run", observations: [
        ["Declined a city council recruitment to stay on mission", "sets_own_terms"],
        ["Wrote out the temptation and its costs before deciding", "journals_or_reflects"],
      ]},
    ],
  },
  {
    id: "nina-engineer",
    name: "Nina",
    age: 30,
    occupation: "Software engineer (highly social)",
    sketch:
      "Backend engineer who is the team's connective tissue. Pairs by default, organizes everything. Conflict: glue work vs. promotion criteria; goal: staff engineer without becoming a hermit.",
    situations: [
      { title: "the glue work problem", observations: [
        ["Raised with her manager that onboarding and glue work were invisible in promo criteria", "questions_assumptions", "sets_own_terms"],
        ["Kept doing the onboarding anyway while the process changed", "maintains_commitment", "prioritizes_relationships"],
      ]},
      { title: "pairing culture", observations: [
        ["Paired daily by preference even on solo-sized tasks", "seeks_collaboration"],
        ["Started a rotating pairing calendar for the whole team", "starts_something_new", "seeks_collaboration"],
      ]},
      { title: "production outage night", observations: [
        ["Ran the incident channel calmly and delegated by strength", "seeks_collaboration", "adapts_to_feedback"],
        ["Wrote the blameless postmortem naming her own config mistake", "opens_up_about_weakness", "self_corrects"],
      ]},
      { title: "team offsite organizing", observations: [
        ["Organized the team offsite three years running", "maintains_commitment", "starts_something_new"],
        ["Collected anonymous input and reshaped the agenda around it", "adapts_to_feedback", "seeks_collaboration"],
      ]},
      { title: "difficult teammate", observations: [
        ["Invited the abrasive teammate to pair rather than avoiding him", "seeks_collaboration"],
        ["Named the friction directly in their one-on-one, kindly", "opens_up_about_weakness", "engages_conflict_directly"],
      ]},
      { title: "conference speaking", observations: [
        ["Submitted her first conference talk on team topology", "starts_something_new", "takes_uncertain_risk"],
        ["Rehearsed with five colleagues and rewrote it twice from feedback", "seeks_collaboration", "adapts_to_feedback"],
      ]},
      { title: "learning distributed systems deeply", observations: [
        ["Ran a semester-long paper reading group on consensus algorithms", "explores_new_topic", "seeks_collaboration", "follows_through_consistently"],
        ["Asked a principal engineer to mentor her through the gaps", "asks_for_help"],
      ]},
      { title: "reorg anxiety", observations: [
        ["Told her skip-level honestly that the reorg plan would break two teams", "opens_up_about_weakness", "questions_assumptions"],
        ["Helped both affected teams re-form after the decision went ahead anyway", "prioritizes_relationships", "adapts_to_feedback"],
      ]},
      { title: "friend's bootcamp mentee", observations: [
        ["Mentored a career-switcher weekly for a year, unpaid", "maintains_commitment", "prioritizes_relationships"],
        ["Got the mentee referred into her own company", "prioritizes_relationships"],
      ]},
      { title: "declining the manager track", observations: [
        ["Chose the staff-engineer path over management after real consideration", "sets_own_terms"],
        ["Wrote a doc on why, and shared it with other ambivalent engineers", "journals_or_reflects", "seeks_collaboration"],
      ]},
    ],
  },
  {
    id: "harold-retired",
    name: "Harold",
    age: 68,
    occupation: "Retired civil engineer",
    sketch:
      "Forty years of bridges; three years retired. Routines, workshop, grandchildren. Conflict: relevance vs. rest; goal: useful without being employed.",
    situations: [
      { title: "the retirement transition", observations: [
        ["Kept his 6am schedule and structured weekdays after retiring", "follows_through_consistently", "resists_change"],
        ["Wrote a memoir chapter each month about the bridge years", "journals_or_reflects", "starts_something_new"],
      ]},
      { title: "the workshop", observations: [
        ["Restored an antique lathe alone over a winter", "chooses_solo_path", "follows_through_consistently"],
        ["Machined replacement parts for neighbors without charging", "prioritizes_relationships"],
      ]},
      { title: "grandchildren wednesdays", observations: [
        ["Kept a standing Wednesday with his grandchildren for three years", "maintains_commitment", "prioritizes_relationships"],
        ["Built each grandchild a project of their choosing, at their pace", "prioritizes_relationships"],
      ]},
      { title: "city bridge inspection scandal", observations: [
        ["Wrote a detailed technical letter when the city ignored inspection findings", "questions_assumptions", "starts_something_new"],
        ["Testified at the council meeting despite hating the spotlight", "takes_uncertain_risk", "engages_conflict_directly"],
      ]},
      { title: "his knees", observations: [
        ["Followed the physio program exactly and adjusted the workshop layout", "follows_through_consistently", "adapts_to_feedback"],
        ["Admitted to his son he couldn't rewire the attic alone anymore", "opens_up_about_weakness", "asks_for_help"],
      ]},
      { title: "investment pitch from nephew", observations: [
        ["Declined the nephew's crypto venture after reading the whitepaper", "resists_change", "questions_assumptions"],
        ["Offered a small no-strings gift instead of the investment", "prioritizes_relationships"],
      ]},
      { title: "learning celestial navigation", observations: [
        ["Took up celestial navigation from books for no practical reason", "explores_new_topic", "chooses_solo_path"],
        ["Kept a sextant log through a full season", "follows_through_consistently"],
      ]},
      { title: "wife's book club invasion", observations: [
        ["Joined his wife's book club after years of declining", "starts_something_new"],
        ["Read every selection fully even the ones he disliked", "follows_through_consistently"],
      ]},
      { title: "old firm's consulting request", observations: [
        ["Accepted a limited consulting review on his own strict terms", "sets_own_terms"],
        ["Declined the follow-on contract that would recreate a job", "resists_change", "sets_own_terms"],
      ]},
      { title: "neighborhood flood response", observations: [
        ["Organized the street's sandbag line during the flood warning", "starts_something_new", "seeks_collaboration"],
        ["Checked the elderly neighbors' basements for a week after", "prioritizes_relationships", "follows_through_consistently"],
      ]},
    ],
  },
  {
    id: "zoe-freelancer",
    name: "Zoe",
    age: 27,
    occupation: "Freelance brand designer",
    sketch:
      "Three years freelance after an agency exit. Feast-famine income, strong aesthetic opinions. Conflict: client money vs. artistic integrity; goal: a studio with her name on it.",
    situations: [
      { title: "leaving the agency", observations: [
        ["Quit the agency after her redesign was shipped watered-down", "sets_own_terms", "takes_uncertain_risk"],
        ["Launched her freelance practice with two months of savings", "starts_something_new", "takes_uncertain_risk"],
      ]},
      { title: "the anchor client dependency", observations: [
        ["Fired her biggest client when scope creep became disrespect", "engages_conflict_directly", "takes_uncertain_risk"],
        ["Rebuilt the income gap with four smaller clients in a quarter", "adapts_to_feedback", "starts_something_new"],
      ]},
      { title: "style evolution", observations: [
        ["Taught herself motion design to extend her offer", "explores_new_topic"],
        ["Killed her signature style when it started feeling like a cage", "questions_assumptions", "self_corrects"],
      ]},
      { title: "pricing experiments", observations: [
        ["Moved from hourly to value pricing despite losing two clients", "sets_own_terms", "takes_uncertain_risk"],
        ["Published her pricing openly on her site", "opens_up_about_weakness", "sets_own_terms"],
      ]},
      { title: "the studio collective question", observations: [
        ["Tested a shared studio with two peers for six months", "seeks_collaboration", "starts_something_new"],
        ["Left the collective when consensus slowed every decision", "chooses_solo_path", "sets_own_terms"],
      ]},
      { title: "client work vs personal work", observations: [
        ["Reserved every Friday for unpaid personal projects", "sets_own_terms", "follows_through_consistently"],
        ["Posted unfinished experiments publicly for critique", "opens_up_about_weakness", "adapts_to_feedback"],
      ]},
      { title: "dry spell panic", observations: [
        ["Told her designer group chat honestly that she was two months from broke", "shares_personal_struggle", "asks_for_help"],
        ["Took a bridge contract she disliked and finished it at full quality", "follows_through_consistently"],
      ]},
      { title: "design conference talk", observations: [
        ["Pitched a talk criticizing the industry's trend-chasing", "questions_assumptions", "takes_uncertain_risk"],
        ["Rewrote it after a mentor called the first draft smug", "adapts_to_feedback", "self_corrects"],
      ]},
      { title: "teaching a weekend workshop", observations: [
        ["Ran a branding workshop for local small businesses at low cost", "starts_something_new", "prioritizes_relationships"],
        ["Repeated it quarterly once she saw what it did for them", "maintains_commitment"],
      ]},
      { title: "moving cities for no reason but wanting to", observations: [
        ["Moved to a new city primarily because it felt creatively alive", "takes_uncertain_risk", "explores_new_topic"],
        ["Rebuilt her local client base within a year", "starts_something_new", "follows_through_consistently"],
      ]},
    ],
  },
  {
    id: "greg-accountant",
    name: "Greg",
    age: 43,
    occupation: "Senior accountant (curious)",
    sketch:
      "Eighteen years at the same regional firm, and a voracious autodidact at night — languages, astronomy, baking chemistry. Conflict: none he'd admit; goal: quietly know everything.",
    situations: [
      { title: "the language ladder", observations: [
        ["Studied Japanese daily for four years to read novels untranslated", "explores_new_topic", "follows_through_consistently"],
        ["Started Polish the month he finished his Japanese goal", "explores_new_topic", "starts_something_new"],
      ]},
      { title: "process modernization at the firm", observations: [
        ["Questioned the firm's twenty-year-old reconciliation process in writing", "questions_assumptions"],
        ["Built the replacement tool himself on weekends", "chooses_solo_path", "starts_something_new"],
        ["Trained the whole office on it patiently for a month", "seeks_collaboration", "follows_through_consistently"],
      ]},
      { title: "partner track ambivalence", observations: [
        ["Declined to pursue partnership when it was dangled, twice", "sets_own_terms", "resists_change"],
        ["Wrote in his journal that the title would buy nothing he wants", "journals_or_reflects"],
      ]},
      { title: "astronomy obsession", observations: [
        ["Ground his own telescope mirror following a 1950s manual", "explores_new_topic", "chooses_solo_path"],
        ["Logged observations nightly through an entire winter", "follows_through_consistently"],
      ]},
      { title: "tax season grind", observations: [
        ["Carried the same client list through eighteen tax seasons", "maintains_commitment", "follows_through_consistently"],
        ["Refused to adopt the firm's rushed-review shortcut under deadline", "sets_own_terms", "resists_change"],
      ]},
      { title: "the sourdough rabbit hole", observations: [
        ["Ran controlled hydration experiments on sourdough for months", "explores_new_topic", "journals_or_reflects"],
        ["Presented the results to his baffled family with charts", "starts_something_new"],
      ]},
      { title: "brother's bankruptcy", observations: [
        ["Spent every Sunday for a year untangling his brother's business debts", "maintains_commitment", "prioritizes_relationships"],
        ["Never mentioned it to anyone outside the family", "avoids_conflict"],
      ]},
      { title: "client's fraud discovery", observations: [
        ["Reported a long-standing client's fraud despite the fee loss", "sets_own_terms", "engages_conflict_directly"],
        ["Documented everything meticulously for the regulator", "follows_through_consistently"],
      ]},
      { title: "the lecture series", observations: [
        ["Attended a university's open physics lectures every Thursday for years", "explores_new_topic", "maintains_commitment"],
        ["Asked the professor questions that became a standing coffee chat", "asks_for_help", "seeks_collaboration"],
      ]},
      { title: "his 25th wedding anniversary", observations: [
        ["Planned a trip retracing their honeymoon exactly", "prioritizes_relationships", "maintains_commitment"],
        ["Learned enough Italian beforehand to order everywhere", "explores_new_topic"],
      ]},
    ],
  },
];
