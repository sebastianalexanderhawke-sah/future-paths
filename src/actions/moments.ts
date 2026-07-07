"use server";

import { redirect } from "next/navigation";

import { createMoment, updateMoment } from "@/lib/moments";

export type ResolveTransformFormState = {
  error: string | null;
};

export type MomentFormState = {
  error: string | null;
};

export async function createMomentAction(
  _prevState: MomentFormState,
  formData: FormData,
): Promise<MomentFormState> {
  const title = formData.get("title");
  const description = formData.get("description");
  const clientToken = formData.get("clientToken");

  if (typeof title !== "string") {
    return { error: "Title is required." };
  }

  const result = await createMoment({
    title,
    description: typeof description === "string" ? description : null,
    clientToken:
      typeof clientToken === "string" && clientToken ? clientToken : null,
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

export async function resolveAndTransformAction(
  _prevState: ResolveTransformFormState,
  formData: FormData,
): Promise<ResolveTransformFormState> {
  const momentId = formData.get("momentId");
  const newTitle = formData.get("newTitle");
  const clientToken = formData.get("clientToken");

  if (typeof momentId !== "string") {
    return { error: "Invalid submission." };
  }

  if (typeof newTitle !== "string" || !newTitle.trim()) {
    return { error: "Please name the new situation before continuing." };
  }

  const archiveResult = await updateMoment(momentId, { status: "archived" });
  if ("error" in archiveResult) {
    return { error: archiveResult.error };
  }

  const createResult = await createMoment({
    title: newTitle.trim(),
    clientToken:
      typeof clientToken === "string" && clientToken ? clientToken : null,
  });
  if ("error" in createResult) {
    return { error: createResult.error };
  }

  redirect(`/moments/${createResult.moment.id}`);
}
