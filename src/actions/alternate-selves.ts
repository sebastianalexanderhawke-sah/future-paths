"use server";

import { redirect } from "next/navigation";

import {
  archiveAlternateSelf,
  createAlternateSelf,
  refreshAlternateSelf,
} from "@/lib/alternate-selves";

export type AlternateSelfFormState = {
  error: string | null;
};

export async function createAlternateSelfAction(
  _prevState: AlternateSelfFormState,
  formData: FormData,
): Promise<AlternateSelfFormState> {
  const decisionTitle = formData.get("decisionTitle");
  const chosenPath = formData.get("chosenPath");
  const unchosenPath = formData.get("unchosenPath");

  if (typeof decisionTitle !== "string") {
    return { error: "Invalid form submission." };
  }

  if (typeof chosenPath !== "string" || typeof unchosenPath !== "string") {
    return { error: "Both paths are required." };
  }

  const result = await createAlternateSelf({
    decisionTitle,
    chosenPath,
    unchosenPath,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  redirect(`/alternate-selves/${result.alternateSelf.id}`);
}

export async function refreshAlternateSelfAction(formData: FormData) {
  const alternateSelfId = formData.get("alternateSelfId");

  if (typeof alternateSelfId !== "string") {
    redirect("/alternate-selves");
  }

  const result = await refreshAlternateSelf(alternateSelfId);

  if ("error" in result) {
    redirect(
      `/alternate-selves/${alternateSelfId}?error=${encodeURIComponent(result.error)}`,
    );
  }

  redirect(`/alternate-selves/${alternateSelfId}`);
}

export async function archiveAlternateSelfAction(formData: FormData) {
  const alternateSelfId = formData.get("alternateSelfId");

  if (typeof alternateSelfId !== "string") {
    redirect("/alternate-selves");
  }

  const result = await archiveAlternateSelf(alternateSelfId);

  if ("error" in result) {
    redirect(
      `/alternate-selves/${alternateSelfId}?error=${encodeURIComponent(result.error)}`,
    );
  }

  redirect("/alternate-selves");
}
