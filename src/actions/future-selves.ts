"use server";

import { redirect } from "next/navigation";

import { generateFutureSelves } from "@/lib/future-selves";

export async function generateFutureSelvesAction() {
  const result = await generateFutureSelves();

  if ("error" in result) {
    redirect(`/future-selves?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/future-selves");
}
