"use server";

import { redirect } from "next/navigation";

import { queueFutureSelvesGeneration } from "@/lib/future-selves";

export async function generateFutureSelvesAction() {
  const result = await queueFutureSelvesGeneration();

  if ("error" in result) {
    redirect(`/future-selves?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/future-selves");
}
