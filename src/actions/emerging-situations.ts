"use server";

import { revalidatePath } from "next/cache";

import { dismissEmergingSituation } from "@/lib/emerging-situation";

/**
 * "Dismiss" on the emerging-situation callout. Dismissal is permanent for
 * the situation — the suggestion never returns — and nothing else changes.
 */
export async function dismissEmergingSituationAction(
  formData: FormData,
): Promise<void> {
  const momentId = formData.get("momentId");

  if (typeof momentId !== "string" || !momentId) {
    return;
  }

  await dismissEmergingSituation(momentId);

  revalidatePath(`/moments/${momentId}`);
}
