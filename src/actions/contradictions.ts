"use server";

import { redirect } from "next/navigation";

import { detectContradictions } from "@/lib/contradictions";

export async function detectContradictionsAction() {
  const result = await detectContradictions();

  if ("error" in result) {
    redirect(`/contradictions?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/contradictions");
}
