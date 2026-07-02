/**
 * Phase 8G validation personas 1-10.
 *
 * Each persona is a realistic life expressed as situations → observations →
 * signals, authored the way behavior extraction would tag them. Signals are
 * assigned from described behavior, never from target identities — the whole
 * point is to see what the engine finds.
 */

export type ValidationObservation = [text: string, ...signals: string[]];
export type ValidationSituation = { title: string; observations: ValidationObservation[] };
export type ValidationPersona = {
  id: string;
  name: string;
  age: number;
  occupation: string;
  sketch: string;
  situations: ValidationSituation[];
  /** Used by the stability audit: re-run with these appended. */
  extraSituations?: ValidationSituation[];
};

export const PERSONAS_A: ValidationPersona[] = [
  {
    id: "maya-founder",
    name: "Maya",
    age: 29,
    occupation: "First-time startup founder (introverted)",
    sketch:
      "Left a staff engineer job to build a devtools startup solo. Deep worker, dreads networking, ships relentlessly. Conflicts: avoids confronting her only contractor; goal: default-alive by next year.",
    situations: [
      { title: "quitting the staff engineering job", observations: [
        ["Resigned from a stable senior role with nothing lined up but savings", "takes_uncertain_risk"],
        ["Decided the product direction alone rather than recruiting a cofounder first", "chooses_solo_path"],
        ["Set a personal runway rule of eighteen months before revisiting employment", "sets_own_terms"],
      ]},
      { title: "building the first prototype", observations: [
        ["Built the entire MVP without contractors or advisors", "chooses_solo_path"],
        ["Shipped a rough first version to twenty strangers despite embarrassment", "takes_uncertain_risk", "starts_something_new"],
        ["Kept a daily build log examining what worked and what didn't", "journals_or_reflects"],
      ]},
      { title: "first paying customer", observations: [
        ["Rewrote the onboarding flow three times after watching users struggle", "adapts_to_feedback"],
        ["Held the launch date she had committed to publicly", "follows_through_consistently"],
        ["Priced the product higher than advisors suggested and held the line", "sets_own_terms"],
      ]},
      { title: "the contractor problem", observations: [
        ["Postponed a hard conversation with the underperforming contractor for six weeks", "avoids_conflict"],
        ["Quietly redid the contractor's work at night instead of addressing it", "avoids_conflict", "chooses_solo_path"],
        ["Wrote out the resentment in her journal before finally acting", "journals_or_reflects"],
      ]},
      { title: "investor meetings", observations: [
        ["Pitched forty investors over two months despite hating the format", "maintains_commitment"],
        ["Admitted to a lead investor that she didn't know her churn numbers yet", "opens_up_about_weakness"],
        ["Declined a term sheet that required moving to another city", "sets_own_terms"],
      ]},
      { title: "burnout scare in month eight", observations: [
        ["Took a full week off after recognizing she was making careless errors", "takes_deliberate_break", "self_corrects"],
        ["Told her sister how frightened she was of failing publicly", "shares_personal_struggle"],
        ["Returned to the same work plan rather than abandoning the company", "maintains_commitment"],
      ]},
      { title: "learning sales from scratch", observations: [
        ["Studied sales techniques from books rather than hiring a salesperson", "explores_new_topic", "chooses_solo_path"],
        ["Ran the same outbound routine every morning for a quarter", "follows_through_consistently"],
        ["Dropped her original ideal-customer theory when the data contradicted it", "self_corrects", "adapts_to_feedback"],
      ]},
      { title: "old employer counteroffer", observations: [
        ["Turned down a lucrative return offer that came with a fixed roadmap", "sets_own_terms"],
        ["Chose continued financial uncertainty over a guaranteed salary", "takes_uncertain_risk"],
        ["Reflected in writing on why the offer tempted her", "journals_or_reflects"],
      ]},
      { title: "first hire decision", observations: [
        ["Delayed hiring for months, preferring to do support herself", "chooses_solo_path"],
        ["Finally asked a former colleague for help screening candidates", "asks_for_help"],
        ["Committed to a part-time hire despite the burn-rate anxiety", "takes_uncertain_risk"],
      ]},
      { title: "college friend's wedding", observations: [
        ["Flew across the country mid-crunch because the friendship mattered more", "prioritizes_relationships"],
        ["Left her laptop at home for the weekend deliberately", "takes_deliberate_break"],
      ]},
    ],
    extraSituations: [
      { title: "acquisition inquiry", observations: [
        ["Explored an unsolicited acquisition conversation without committing", "explores_new_topic"],
        ["Kept the news entirely to herself while deciding", "chooses_solo_path"],
        ["Declined the offer to keep building on her own terms", "sets_own_terms"],
      ]},
      { title: "conference talk invitation", observations: [
        ["Accepted a speaking slot despite stage fright", "takes_uncertain_risk"],
        ["Rehearsed the talk daily for three weeks", "follows_through_consistently"],
      ]},
    ],
  },
  {
    id: "devon-single-parent",
    name: "Devon",
    age: 34,
    occupation: "Single parent, retail assistant manager",
    sketch:
      "Raising an eight-year-old alone. Steady shifts, tight budget, co-parenting friction with ex. Goals: stability for his son, finish a supervision certificate. Avoids fights, never misses pickup.",
    situations: [
      { title: "promotion that required relocating", observations: [
        ["Declined a store manager role two hours away to keep his son's school stable", "resists_change"],
        ["Prioritized his son's routine over his own career step", "prioritizes_relationships"],
      ]},
      { title: "co-parenting schedule dispute", observations: [
        ["Accepted an unfair holiday split rather than reopen a fight with his ex", "avoids_conflict"],
        ["Kept every scheduled pickup for two years without exception", "follows_through_consistently"],
        ["Vented to his sister instead of his son about the frustration", "shares_personal_struggle"],
      ]},
      { title: "son's reading difficulties", observations: [
        ["Ran the same bedtime reading routine every night for a school year", "maintains_commitment"],
        ["Asked the school for a formal assessment instead of waiting", "asks_for_help", "starts_something_new"],
        ["Adjusted the routine when the specialist suggested a different method", "adapts_to_feedback"],
      ]},
      { title: "supervision certificate course", observations: [
        ["Enrolled in a night certificate program on top of full-time work", "starts_something_new"],
        ["Kept attending through a brutal holiday retail season", "maintains_commitment"],
        ["Asked his mother to cover two evenings a week", "asks_for_help"],
      ]},
      { title: "budget crisis after car repair", observations: [
        ["Cut his own expenses rather than touching his son's activity fund", "prioritizes_relationships"],
        ["Kept paying every bill on time through the squeeze", "follows_through_consistently"],
        ["Admitted to his mother that he was scared about money", "opens_up_about_weakness"],
      ]},
      { title: "store staffing meltdown", observations: [
        ["Covered three extra shifts so his team's schedules held", "maintains_commitment"],
        ["Deferred to the store manager's plan despite disagreeing with parts of it", "defers_to_others"],
        ["Suggested one fix quietly afterward rather than in the meeting", "avoids_conflict"],
      ]},
      { title: "his own health checkup scare", observations: [
        ["Booked the follow-up immediately instead of postponing", "self_corrects"],
        ["Told his closest friend about the scare instead of carrying it alone", "shares_personal_struggle"],
        ["Started a modest walking routine and kept it", "follows_through_consistently"],
      ]},
      { title: "old friends' weekend trip", observations: [
        ["Skipped the trip because it fell on his custody weekend", "prioritizes_relationships"],
        ["Organized a local afternoon with the same friends the next month", "seeks_collaboration"],
      ]},
      { title: "school volunteering", observations: [
        ["Signed up for the same monthly library slot all year", "maintains_commitment"],
        ["Showed up for other parents' kids when they had no one", "prioritizes_relationships"],
      ]},
      { title: "quiet Sunday reflection habit", observations: [
        ["Kept a small notebook reviewing each week as a father", "journals_or_reflects"],
        ["Wrote about the guilt of not giving his son a second parent", "journals_or_reflects", "opens_up_about_weakness"],
      ]},
    ],
    extraSituations: [
      { title: "ex proposes moving the child to another state", observations: [
        ["Engaged a mediator immediately rather than letting it drift", "starts_something_new"],
        ["Held firm on keeping his son local despite the confrontation", "sets_own_terms", "engages_conflict_directly"],
        ["Stayed civil through mediation for his son's sake", "prioritizes_relationships"],
      ]},
    ],
  },
  {
    id: "priya-icu-nurse",
    name: "Priya",
    age: 31,
    occupation: "ICU nurse (risk-taking)",
    sketch:
      "Volunteers for the hardest assignments, pushes back on physicians, applying to flight nursing. Solo traveler. Conflicts: unit politics; goal: critical-care transport career.",
    situations: [
      { title: "volunteering for the covid overflow unit", observations: [
        ["Volunteered for the highest-acuity unit when others declined", "takes_uncertain_risk"],
        ["Kept the assignment for six straight months", "maintains_commitment"],
        ["Debriefed weekly with a peer group about what she was seeing", "shares_personal_struggle", "seeks_collaboration"],
      ]},
      { title: "challenging an attending's order", observations: [
        ["Questioned a medication order she believed was wrong, twice, until reviewed", "questions_assumptions", "engages_conflict_directly"],
        ["Documented and escalated through the chain when dismissed", "follows_through_consistently", "engages_conflict_directly"],
      ]},
      { title: "flight nursing application", observations: [
        ["Applied to a flight nursing program with a 10% acceptance rate", "takes_uncertain_risk", "starts_something_new"],
        ["Studied transport medicine on her own before any interview", "explores_new_topic"],
        ["Told her manager openly she intended to leave bedside nursing", "opens_up_about_weakness", "sets_own_terms"],
      ]},
      { title: "solo trek in Patagonia", observations: [
        ["Booked a two-week solo trek despite family objections", "chooses_solo_path", "takes_uncertain_risk"],
        ["Trained on a fixed plan for four months beforehand", "follows_through_consistently"],
      ]},
      { title: "code that went wrong", observations: [
        ["Requested the case review herself after a patient death", "self_corrects", "opens_up_about_weakness"],
        ["Returned to the same bed assignment the next shift", "maintains_commitment"],
        ["Changed her handoff checklist based on the review findings", "adapts_to_feedback"],
      ]},
      { title: "precepting a new graduate nurse", observations: [
        ["Took on precepting during the unit's worst staffing stretch", "starts_something_new"],
        ["Shared her own first-year mistakes to normalize the student's fear", "opens_up_about_weakness"],
        ["Held the student to the full checklist even when shifts ran long", "follows_through_consistently"],
      ]},
      { title: "unit scheduling fight", observations: [
        ["Proposed an alternative self-scheduling system to the manager", "starts_something_new", "questions_assumptions"],
        ["Negotiated her own block schedule rather than accepting the default", "sets_own_terms"],
      ]},
      { title: "sister's postpartum depression", observations: [
        ["Drove four hours every weekend for two months to support her sister", "prioritizes_relationships", "maintains_commitment"],
        ["Asked a colleague to cover shifts so she could be there", "asks_for_help"],
      ]},
      { title: "learning ultrasound skills", observations: [
        ["Enrolled in an optional ultrasound course at her own expense", "explores_new_topic"],
        ["Practiced on volunteers until competent, then taught two peers", "follows_through_consistently", "seeks_collaboration"],
      ]},
      { title: "deciding against management track", observations: [
        ["Turned down a charge nurse promotion that would reduce patient contact", "sets_own_terms"],
        ["Wrote out what she actually wants from the career before deciding", "journals_or_reflects"],
        ["Chose the harder clinical path over the safer administrative one", "takes_uncertain_risk"],
      ]},
    ],
  },
  {
    id: "james-officer",
    name: "James",
    age: 45,
    occupation: "Army lieutenant colonel",
    sketch:
      "Twenty-two years in. Leads a battalion; deployment veteran. Goals: bring everyone home, make full colonel. Tendencies: mission first, admits limits carefully, institutional loyalty.",
    situations: [
      { title: "taking battalion command", observations: [
        ["Accepted command knowing it meant another family relocation", "takes_uncertain_risk"],
        ["Held listening sessions with every company before changing anything", "seeks_collaboration", "adapts_to_feedback"],
        ["Kept his predecessor's working systems instead of rebranding them", "defers_to_others"],
      ]},
      { title: "soldier's suicide attempt in the unit", observations: [
        ["Told the formation about his own past counseling to reduce stigma", "opens_up_about_weakness"],
        ["Instituted and personally attended weekly welfare checks all year", "follows_through_consistently", "starts_something_new"],
      ]},
      { title: "disagreeing with brigade strategy", observations: [
        ["Voiced his objection formally once, then executed the ordered plan fully", "defers_to_others", "engages_conflict_directly"],
        ["Documented lessons afterward for the next planning cycle", "journals_or_reflects", "self_corrects"],
      ]},
      { title: "training accident investigation", observations: [
        ["Took formal responsibility rather than letting a captain absorb it", "opens_up_about_weakness"],
        ["Rewrote the range protocol based on the findings", "adapts_to_feedback", "self_corrects"],
        ["Briefed the families personally rather than delegating", "prioritizes_relationships"],
      ]},
      { title: "twenty-year marriage strain", observations: [
        ["Started couples counseling despite career-culture stigma", "starts_something_new", "shares_personal_struggle"],
        ["Kept a standing Friday call with his wife through the deployment", "maintains_commitment"],
      ]},
      { title: "deployment readiness cycle", observations: [
        ["Ran the same pre-deployment certification sequence without shortcuts", "follows_through_consistently"],
        ["Maintained the battalion's training calendar through three schedule shocks", "maintains_commitment"],
        ["Adjusted the field exercise after-action reviews into the next iteration", "adapts_to_feedback"],
      ]},
      { title: "mentoring a struggling captain", observations: [
        ["Met the captain weekly for a year rather than transferring the problem", "maintains_commitment", "prioritizes_relationships"],
        ["Shared his own worst evaluation to make the lesson land", "opens_up_about_weakness"],
      ]},
      { title: "war college application", observations: [
        ["Applied for a strategy fellowship outside the standard track", "starts_something_new", "takes_uncertain_risk"],
        ["Studied policy literature nightly for the entrance essay", "explores_new_topic", "follows_through_consistently"],
      ]},
      { title: "retirement question", observations: [
        ["Wrote privately about who he is without the uniform", "journals_or_reflects"],
        ["Deferred the decision and committed fully to the current command", "maintains_commitment"],
      ]},
      { title: "his father's decline", observations: [
        ["Took emergency leave despite the command climate frowning on it", "prioritizes_relationships", "sets_own_terms"],
        ["Organized the sibling care rotation for their father", "seeks_collaboration", "starts_something_new"],
      ]},
    ],
  },
  {
    id: "lena-scientist",
    name: "Lena",
    age: 38,
    occupation: "Research scientist (computational biology)",
    sketch:
      "Mid-career PI chasing tenure. Deep questions over fashionable ones. Conflicts: funding pressure vs. curiosity; goal: a result that outlives her.",
    situations: [
      { title: "pivoting the lab's research direction", observations: [
        ["Moved the lab into an adjacent field after a conference talk changed her mind", "explores_new_topic", "adapts_to_feedback"],
        ["Spent six weekends learning the new field's methods herself", "explores_new_topic"],
        ["Kept two long-running projects alive through the pivot", "maintains_commitment"],
      ]},
      { title: "retracting a flawed preprint", observations: [
        ["Retracted her own preprint after finding the error herself", "self_corrects", "opens_up_about_weakness"],
        ["Published a public post-mortem of the mistake", "journals_or_reflects", "opens_up_about_weakness"],
      ]},
      { title: "grant rejection cycle", observations: [
        ["Rewrote the same proposal four times across two years", "maintains_commitment", "follows_through_consistently"],
        ["Questioned the panel's framing and re-scoped the aims accordingly", "questions_assumptions", "adapts_to_feedback"],
      ]},
      { title: "solo sabbatical project", observations: [
        ["Spent a sabbatical semester coding alone on a speculative model", "chooses_solo_path"],
        ["Chose the speculative project over a safe collaboration invite", "takes_uncertain_risk", "sets_own_terms"],
        ["Kept a daily research notebook throughout", "journals_or_reflects"],
      ]},
      { title: "student's failing project", observations: [
        ["Redesigned a student's dead-end project with them rather than cutting them loose", "seeks_collaboration", "adapts_to_feedback"],
        ["Met the student weekly until the new direction stabilized", "follows_through_consistently", "prioritizes_relationships"],
      ]},
      { title: "industry offer at double salary", observations: [
        ["Declined an industry role that would end her open research agenda", "sets_own_terms"],
        ["Wrote out the decision tradeoffs before responding", "journals_or_reflects"],
      ]},
      { title: "conference keynote question", observations: [
        ["Said 'I don't know' on stage to a famous rival's question", "opens_up_about_weakness"],
        ["Followed up publicly a month later with the worked-out answer", "follows_through_consistently"],
      ]},
      { title: "reading outside the field", observations: [
        ["Ran a monthly reading group on the philosophy of biology", "explores_new_topic", "starts_something_new", "seeks_collaboration"],
        ["Questioned a core assumption of her subfield in a review article", "questions_assumptions"],
      ]},
      { title: "burnout after tenure package submission", observations: [
        ["Took a three-week full stop after submitting the tenure package", "takes_deliberate_break"],
        ["Told her department chair the process had worn her down", "shares_personal_struggle"],
      ]},
      { title: "replication dispute with another lab", observations: [
        ["Shared her full data and code with the challenging lab immediately", "seeks_collaboration"],
        ["Updated her paper's claims when their correction held up", "self_corrects", "adapts_to_feedback"],
      ]},
    ],
  },
  {
    id: "marcus-teacher",
    name: "Marcus",
    age: 41,
    occupation: "High-school history teacher",
    sketch:
      "Fifteen years at the same school. Runs the debate club, knows every kid's name. Conflicts: administration churn vs. classroom autonomy; goal: kids who think for themselves.",
    situations: [
      { title: "student living in a car", observations: [
        ["Quietly organized meals and a gym-shower arrangement for the student", "starts_something_new", "prioritizes_relationships"],
        ["Coordinated with the counselor and coach without exposing the kid", "seeks_collaboration"],
        ["Kept checking in weekly for the rest of the year", "follows_through_consistently"],
      ]},
      { title: "new curriculum mandate", observations: [
        ["Adapted the mandated curriculum to keep his primary-source method", "adapts_to_feedback", "sets_own_terms"],
        ["Raised concerns in the faculty meeting once, then worked within the frame", "defers_to_others"],
      ]},
      { title: "debate club rebuild", observations: [
        ["Restarted the dormant debate club with six students", "starts_something_new"],
        ["Ran practice every Tuesday for three years straight", "follows_through_consistently", "maintains_commitment"],
        ["Recruited a rival school's coach to run joint scrimmages", "seeks_collaboration"],
      ]},
      { title: "his own classroom failure", observations: [
        ["Told his students a unit had failed and rebuilt it with their input", "opens_up_about_weakness", "adapts_to_feedback"],
        ["Wrote a term-by-term teaching journal", "journals_or_reflects"],
      ]},
      { title: "colleague conflict over grading", observations: [
        ["Let a department grading dispute go rather than escalate it", "avoids_conflict"],
        ["Aligned his rubric with the department's despite disagreeing", "defers_to_others"],
      ]},
      { title: "divorce year", observations: [
        ["Told two close colleagues rather than hiding why he was struggling", "shares_personal_struggle"],
        ["Kept every class and club commitment through the divorce", "maintains_commitment"],
        ["Started therapy on a colleague's recommendation", "asks_for_help", "starts_something_new"],
      ]},
      { title: "summer master's program", observations: [
        ["Enrolled in a summer history master's for the subject, not the pay bump", "explores_new_topic"],
        ["Finished the thesis over three summers without missing a season", "follows_through_consistently"],
      ]},
      { title: "student cheating case", observations: [
        ["Handled a star student's plagiarism privately with a redo and a talk", "prioritizes_relationships"],
        ["Held the consequence despite parent pressure to erase it", "sets_own_terms", "engages_conflict_directly"],
      ]},
      { title: "principal's leadership offer", observations: [
        ["Declined the assistant principal track to stay in the classroom", "sets_own_terms"],
        ["Wrote out what he'd lose leaving the classroom before deciding", "journals_or_reflects"],
      ]},
      { title: "annual alumni dinner", observations: [
        ["Hosted the alumni dinner he started a decade ago, every year", "maintains_commitment", "prioritizes_relationships"],
        ["Invited estranged former students personally", "prioritizes_relationships"],
      ]},
    ],
  },
  {
    id: "aisha-athlete",
    name: "Aisha",
    age: 26,
    occupation: "Olympic 400m hurdler",
    sketch:
      "One Games behind her, chasing a second. Injury history. Tendencies: escalating targets, coach-driven adjustment, ruthless routines. Conflict: body vs. ambition.",
    situations: [
      { title: "achilles injury comeback", observations: [
        ["Followed a nine-month rehab protocol to the day", "follows_through_consistently", "maintains_commitment"],
        ["Returned to the same championship meet where she ruptured it", "takes_uncertain_risk"],
        ["Rebuilt her stride mechanics from scratch with the physio", "adapts_to_feedback"],
      ]},
      { title: "changing coaches after a plateau", observations: [
        ["Left a comfortable coaching setup after two flat seasons", "takes_uncertain_risk", "starts_something_new"],
        ["Adopted the new coach's contradicting technique despite early losses", "adapts_to_feedback"],
        ["Kept a training diary comparing old and new metrics", "journals_or_reflects"],
      ]},
      { title: "moving up in class", observations: [
        ["Entered senior European meets a year before her coach recommended", "takes_uncertain_risk", "sets_own_terms"],
        ["Trained a second daily session to close the gap", "maintains_commitment"],
      ]},
      { title: "sponsorship pressure", observations: [
        ["Declined a sponsor's request to race injured", "sets_own_terms"],
        ["Was open publicly about choosing recovery over the appearance", "opens_up_about_weakness"],
      ]},
      { title: "olympic final loss", observations: [
        ["Watched the final's film within forty-eight hours of losing", "self_corrects"],
        ["Set the next quadrennial's target higher, not safer", "starts_something_new"],
        ["Talked openly with her sports psychologist about the grief", "shares_personal_struggle", "asks_for_help"],
      ]},
      { title: "training camp abroad", observations: [
        ["Relocated alone to a foreign training base for six months", "chooses_solo_path", "takes_uncertain_risk"],
        ["Learned enough Portuguese to train with the local group", "explores_new_topic", "seeks_collaboration"],
      ]},
      { title: "younger rival's rise", observations: [
        ["Studied the rival's races instead of avoiding them", "questions_assumptions", "self_corrects"],
        ["Invited the rival to share training blocks", "seeks_collaboration"],
      ]},
      { title: "off-season discipline", observations: [
        ["Kept 5am sessions through the off-season without a coach watching", "follows_through_consistently"],
        ["Scheduled one full rest week and actually took it", "takes_deliberate_break"],
      ]},
      { title: "family wedding vs. trials prep", observations: [
        ["Flew overnight to her brother's wedding between qualification rounds", "prioritizes_relationships"],
        ["Returned on schedule and held her qualifying plan", "maintains_commitment"],
      ]},
      { title: "degree she keeps deferring", observations: [
        ["Re-enrolled in one remote course despite the training load", "starts_something_new", "explores_new_topic"],
        ["Admitted to her mother she fears life after track", "opens_up_about_weakness", "shares_personal_struggle"],
      ]},
    ],
  },
  {
    id: "viktor-pianist",
    name: "Viktor",
    age: 35,
    occupation: "Concert pianist (highly disciplined artist)",
    sketch:
      "Conservatory-trained, competition circuit survivor. Six hours daily at the keyboard for twenty years. Conflicts: purity vs. market; goal: a definitive Schubert cycle.",
    situations: [
      { title: "the schubert cycle project", observations: [
        ["Committed to recording the complete sonatas over five years", "maintains_commitment", "starts_something_new"],
        ["Practiced the same passage daily for months until it was right", "follows_through_consistently"],
        ["Studied the manuscripts and letters before interpreting", "explores_new_topic", "journals_or_reflects"],
      ]},
      { title: "declining the crossover album", observations: [
        ["Turned down a lucrative film-music crossover album", "sets_own_terms", "resists_change"],
        ["Accepted the financial cost of staying in core repertoire", "sets_own_terms"],
      ]},
      { title: "memory slip on stage", observations: [
        ["Rebuilt his memorization method entirely after a public memory slip", "self_corrects", "adapts_to_feedback"],
        ["Wrote a long private analysis of what failed", "journals_or_reflects"],
        ["Played the same concerto again within the season", "maintains_commitment"],
      ]},
      { title: "practice solitude", observations: [
        ["Structured his life around six protected solo hours daily", "chooses_solo_path", "follows_through_consistently"],
        ["Declined ensemble invitations that would fragment practice", "chooses_solo_path", "resists_change"],
      ]},
      { title: "masterclass teaching invitation", observations: [
        ["Accepted a teaching residency only after protecting his schedule", "sets_own_terms"],
        ["Prepared each student's score as thoroughly as his own", "follows_through_consistently"],
      ]},
      { title: "hand injury scare", observations: [
        ["Stopped playing for six weeks on medical advice, exactly as prescribed", "follows_through_consistently", "takes_deliberate_break"],
        ["Told his manager the truth about the injury rather than hiding it", "opens_up_about_weakness"],
      ]},
      { title: "critic's harsh review", observations: [
        ["Re-listened to the criticized recording and conceded two points", "self_corrects", "questions_assumptions"],
        ["Kept his interpretive choice on the third point", "sets_own_terms"],
      ]},
      { title: "father's disapproval of the career", observations: [
        ["Maintained the monthly call with his father despite the standing argument", "maintains_commitment", "prioritizes_relationships"],
        ["Told his father plainly the career was not negotiable", "sets_own_terms", "engages_conflict_directly"],
      ]},
      { title: "competition juror offer", observations: [
        ["Declined jury seats that conflicted with recording windows", "resists_change", "sets_own_terms"],
        ["Kept the recording calendar intact through three seasons", "maintains_commitment"],
      ]},
      { title: "learning fortepiano", observations: [
        ["Spent a summer learning period instruments to inform the cycle", "explores_new_topic"],
        ["Incorporated only what survived his testing into performance", "self_corrects"],
      ]},
    ],
    extraSituations: [
      { title: "spontaneous jazz invitation", observations: [
        ["Sat in on a late-night jazz set completely outside his repertoire", "explores_new_topic", "takes_uncertain_risk"],
        ["Booked a monthly improvisation lesson afterward", "starts_something_new"],
      ]},
    ],
  },
  {
    id: "rosa-bakery",
    name: "Rosa",
    age: 52,
    occupation: "Bakery owner (28 years)",
    sketch:
      "Second-generation neighborhood bakery. Same 4am start for decades. Conflicts: chain competition, landlord pressure; goal: hand the bakery to her niece intact.",
    situations: [
      { title: "chain bakery opening across the street", observations: [
        ["Kept her recipes and prices rather than chasing the chain's model", "resists_change"],
        ["Doubled down on the regulars who had sustained the shop", "prioritizes_relationships"],
      ]},
      { title: "landlord's rent increase", observations: [
        ["Negotiated a longer lease at moderate increase rather than relocating", "sets_own_terms", "resists_change"],
        ["Consulted her accountant nephew before signing", "asks_for_help"],
      ]},
      { title: "the 4am routine", observations: [
        ["Opened at the same hour every day for twenty-eight years", "follows_through_consistently"],
        ["Kept baking through her husband's illness year", "maintains_commitment"],
      ]},
      { title: "training her niece", observations: [
        ["Committed to a three-year handover plan for her niece", "maintains_commitment", "starts_something_new"],
        ["Taught the recipes exactly, then allowed one new pastry a season", "sets_own_terms"],
      ]},
      { title: "neighborhood funeral", observations: [
        ["Baked for a regular's funeral without being asked", "prioritizes_relationships"],
        ["Closed the shop a half-day to attend — the first closure in years", "prioritizes_relationships"],
      ]},
      { title: "delivery app pressure", observations: [
        ["Declined delivery apps after testing showed quality suffered", "resists_change", "self_corrects"],
        ["Kept a simple phone-order system her regulars preferred", "prioritizes_relationships"],
      ]},
      { title: "flour supplier failure", observations: [
        ["Sourced a new supplier within a week without changing the bread", "adapts_to_feedback"],
        ["Absorbed the cost increase rather than altering the recipe", "sets_own_terms", "maintains_commitment"],
      ]},
      { title: "her back giving out", observations: [
        ["Admitted to her niece she couldn't lift the sacks anymore", "opens_up_about_weakness"],
        ["Restructured the morning shift around the limitation", "adapts_to_feedback"],
      ]},
      { title: "community fundraiser", observations: [
        ["Organized the street's stalls for the school fundraiser, as every year", "seeks_collaboration", "maintains_commitment"],
        ["Fronted flour costs for a struggling neighbor's stall quietly", "prioritizes_relationships"],
      ]},
      { title: "retirement conversations", observations: [
        ["Wrote her wishes for the bakery in a letter to her niece", "journals_or_reflects"],
        ["Deferred her own retirement date until the handover felt safe", "maintains_commitment"],
      ]},
    ],
  },
  {
    id: "sam-carpenter",
    name: "Sam",
    age: 47,
    occupation: "Custom furniture carpenter",
    sketch:
      "One-man workshop, three-month waitlist. Learned by doing, no formal training. Conflicts: scale vs. craft; goal: work he'd sign without flinching at 70.",
    situations: [
      { title: "the chain contractor buyout offer", observations: [
        ["Turned down a steady contractor salary to keep the workshop", "sets_own_terms", "chooses_solo_path"],
        ["Accepted slower income for full control of what he builds", "sets_own_terms"],
      ]},
      { title: "a commission he botched", observations: [
        ["Rebuilt a client's flawed table at his own cost without being asked", "self_corrects", "follows_through_consistently"],
        ["Changed his joinery approach after studying where it failed", "self_corrects"],
      ]},
      { title: "learning timber framing", observations: [
        ["Taught himself timber framing from books and one old-timer's visits", "explores_new_topic", "chooses_solo_path"],
        ["Built his own shed as the practice project before taking clients", "starts_something_new"],
      ]},
      { title: "apprentice request", observations: [
        ["Took on a neighbor's directionless son as a part-time apprentice", "starts_something_new", "prioritizes_relationships"],
        ["Kept the apprenticeship going a full year despite the productivity cost", "maintains_commitment"],
      ]},
      { title: "the waitlist problem", observations: [
        ["Kept a three-month waitlist rather than hiring or rushing", "sets_own_terms", "resists_change"],
        ["Held delivery dates he promised, working nights when needed", "follows_through_consistently"],
      ]},
      { title: "wife's illness season", observations: [
        ["Cut the workshop to half-days for four months of her treatment", "prioritizes_relationships"],
        ["Told longtime clients the real reason for delays", "opens_up_about_weakness"],
      ]},
      { title: "gallery exhibition invitation", observations: [
        ["Entered three pieces in a regional craft exhibition despite dreading exposure", "takes_uncertain_risk"],
        ["Priced the pieces at their worth and refused to discount", "sets_own_terms"],
      ]},
      { title: "cheap materials temptation", observations: [
        ["Kept sourcing expensive local hardwood when plywood would sell fine", "maintains_commitment", "sets_own_terms"],
        ["Explained the choice to clients rather than hiding the cost", "follows_through_consistently"],
      ]},
      { title: "workshop fire scare", observations: [
        ["Rebuilt the finishing room to code within a month of the near-miss", "self_corrects", "adapts_to_feedback"],
        ["Asked the fire marshal to inspect and advise", "asks_for_help"],
      ]},
      { title: "sunday fishing ritual", observations: [
        ["Protected his Sunday fishing morning against every backlog", "takes_deliberate_break", "follows_through_consistently"],
        ["Brought the apprentice along once a month", "prioritizes_relationships"],
      ]},
    ],
  },
];
