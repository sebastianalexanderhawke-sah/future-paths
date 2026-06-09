"use server";

import { redirect } from "next/navigation";

import { generateCurrentSelf } from "@/lib/current-self";

export async function generateCurrentSelfAction() {
  const result = await generateCurrentSelf();

  if ("error" in result) {
    redirect(`/current-self?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/current-self");
}
