import { firstSentence } from "@/lib/first-sentence";
import type { CheckIn, IdentityUpdate } from "@/types/database";

function findIdentityUpdateForCheckIn(
  checkIn: CheckIn,
  identityUpdates: IdentityUpdate[],
): IdentityUpdate | null {
  const direct = identityUpdates.find((update) => update.check_in_id === checkIn.id);
  if (direct) {
    return direct;
  }

  const checkInTime = new Date(checkIn.created_at).getTime();
  let closest: IdentityUpdate | null = null;
  let closestDiff = Infinity;

  for (const update of identityUpdates) {
    const updateTime = new Date(update.created_at).getTime();
    if (updateTime < checkInTime) {
      continue;
    }

    const diff = updateTime - checkInTime;
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = update;
    }
  }

  return closest;
}

/** Maps check-in id → first sentence of the associated identity update summary. */
export function buildCheckInIdentitySummaryMap(
  checkIns: CheckIn[],
  identityUpdates: IdentityUpdate[],
): Record<string, string | null> {
  const map: Record<string, string | null> = {};

  for (const checkIn of checkIns) {
    const update = findIdentityUpdateForCheckIn(checkIn, identityUpdates);
    const sentence = update ? firstSentence(update.summary) : "";
    map[checkIn.id] = sentence || null;
  }

  return map;
}
