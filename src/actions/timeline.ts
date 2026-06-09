"use server";

import { redirect } from "next/navigation";

import { generateTimeline } from "@/lib/life-chapters";

export async function generateTimelineAction() {
  const result = await generateTimeline();

  if ("error" in result) {
    redirect(`/timeline?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/timeline");
}
