"use server";

import { redirect } from "next/navigation";

import { choosePath, generatePaths } from "@/lib/paths";

function redirectWithError(momentId: string, error: string): never {
  redirect(`/moments/${momentId}?error=${encodeURIComponent(error)}`);
}

export async function generatePathsAction(formData: FormData) {
  const momentId = formData.get("momentId");

  if (typeof momentId !== "string") {
    redirect("/moments");
  }

  const result = await generatePaths(momentId);

  if ("error" in result) {
    redirectWithError(momentId, result.error);
  }

  redirect(`/moments/${momentId}`);
}

export async function choosePathAction(formData: FormData) {
  const momentId = formData.get("momentId");
  const pathId = formData.get("pathId");

  if (typeof momentId !== "string" || typeof pathId !== "string") {
    redirect("/moments");
  }

  const result = await choosePath(momentId, pathId);

  if ("error" in result) {
    redirectWithError(momentId, result.error);
  }

  redirect(`/moments/${momentId}`);
}
