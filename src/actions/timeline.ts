"use server";

import { redirect } from "next/navigation";

import { deleteUserTimeline, generateTimeline } from "@/lib/life-chapters";

export async function generateTimelineAction() {
  const result = await generateTimeline();

  if ("error" in result) {
    redirect(`/timeline?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/timeline");
}

export async function deleteTimelineDevAction() {
  if (process.env.NODE_ENV === "production") {
    redirect("/timeline");
  }

  const result = await deleteUserTimeline();

  if ("error" in result) {
    redirect(`/timeline?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/timeline");
}
