"use server";

import { redirect } from "next/navigation";

import { createMoment, updateMoment } from "@/lib/moments";

export type MomentFormState = {
  error: string | null;
};

export async function createMomentAction(
  _prevState: MomentFormState,
  formData: FormData,
): Promise<MomentFormState> {
  const title = formData.get("title");
  const description = formData.get("description");

  if (typeof title !== "string") {
    return { error: "Title is required." };
  }

  const result = await createMoment({
    title,
    description: typeof description === "string" ? description : null,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  redirect(`/moments/${result.moment.id}`);
}

export async function updateMomentAction(
  _prevState: MomentFormState,
  formData: FormData,
): Promise<MomentFormState> {
  const momentId = formData.get("momentId");
  const title = formData.get("title");
  const description = formData.get("description");

  if (typeof momentId !== "string" || typeof title !== "string") {
    return { error: "Invalid form submission." };
  }

  const result = await updateMoment(momentId, {
    title,
    description: typeof description === "string" ? description : null,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  redirect(`/moments/${result.moment.id}`);
}

export async function archiveMomentAction(formData: FormData) {
  const momentId = formData.get("momentId");

  if (typeof momentId !== "string") {
    redirect("/moments");
  }

  const result = await updateMoment(momentId, { status: "archived" });

  if ("error" in result) {
    redirect(`/moments/${momentId}`);
  }

  redirect("/moments");
}
