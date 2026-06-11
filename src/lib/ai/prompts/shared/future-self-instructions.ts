import { FUTURE_SELF_STAGES } from "@/types/enums";

export const APPROVED_FUTURE_SELF_STAGES = [...FUTURE_SELF_STAGES];

export const APPROVED_FUTURE_SELF_STAGES_PROMPT_TEXT =
  APPROVED_FUTURE_SELF_STAGES.join(", ");

export const STRICT_FUTURE_SELF_STAGE_RULES = `Future self stage rules (strict — validation will reject any other value):
- stage MUST be exactly one of: ${APPROVED_FUTURE_SELF_STAGES_PROMPT_TEXT}
- Never invent stage labels (e.g. developing, forming, potential, nascent, active, faded).
- Use exact spelling from the approved list, including the underscore in future_self.
- If uncertain, map the concept to the closest approved stage before output:
  - possible: early or tentative identity trajectory
  - emerging: strengthening pattern with more history
  - future_self: well-established trajectory with substantial history`;
