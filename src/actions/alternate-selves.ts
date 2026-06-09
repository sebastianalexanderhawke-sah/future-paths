"use server";

import { redirect } from "next/navigation";

import {
  archivePastCrossroad,
  createPastCrossroad,
  generateAlternateSelf,
  generateAlternativePaths,
  selectAlternativePath,
} from "@/lib/past-crossroads";

export type PastCrossroadFormState = {
  error: string | null;
};

export async function createPastCrossroadAction(
  _prevState: PastCrossroadFormState,
  formData: FormData,
): Promise<PastCrossroadFormState> {
  const whatHappened = formData.get("whatHappened");
  const whyChosen = formData.get("whyChosen");
  const lifeStage = formData.get("lifeStage");

  if (typeof whatHappened !== "string") {
    return { error: "Invalid form submission." };
  }

  const result = await createPastCrossroad({
    whatHappened,
    whyChosen: typeof whyChosen === "string" ? whyChosen : null,
    lifeStage: typeof lifeStage === "string" ? lifeStage : null,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  redirect(`/alternate-selves/${result.crossroad.id}`);
}

export async function generateAlternativePathsAction(formData: FormData) {
  const crossroadId = formData.get("crossroadId");

  if (typeof crossroadId !== "string") {
    redirect("/alternate-selves");
  }

  const result = await generateAlternativePaths(crossroadId);

  if ("error" in result) {
    redirect(`/alternate-selves/${crossroadId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/alternate-selves/${crossroadId}`);
}

export async function selectAlternativePathAction(formData: FormData) {
  const crossroadId = formData.get("crossroadId");
  const pathId = formData.get("pathId");

  if (typeof crossroadId !== "string" || typeof pathId !== "string") {
    redirect("/alternate-selves");
  }

  const result = await selectAlternativePath(crossroadId, pathId);

  if ("error" in result) {
    redirect(`/alternate-selves/${crossroadId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/alternate-selves/${crossroadId}`);
}

export async function generateAlternateSelfAction(formData: FormData) {
  const crossroadId = formData.get("crossroadId");

  if (typeof crossroadId !== "string") {
    redirect("/alternate-selves");
  }

  const result = await generateAlternateSelf(crossroadId);

  if ("error" in result) {
    redirect(`/alternate-selves/${crossroadId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/alternate-selves/${crossroadId}`);
}

export async function archivePastCrossroadAction(formData: FormData) {
  const crossroadId = formData.get("crossroadId");

  if (typeof crossroadId !== "string") {
    redirect("/alternate-selves");
  }

  const result = await archivePastCrossroad(crossroadId);

  if ("error" in result) {
    redirect(`/alternate-selves/${crossroadId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/alternate-selves");
}
