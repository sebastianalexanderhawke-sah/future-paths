"use server";

import { redirect } from "next/navigation";

import {
  generateIdentityPrompts,
  submitIdentityPromptResponse,
} from "@/lib/identity-prompts";

export async function generateIdentityPromptsAction() {
  const result = await generateIdentityPrompts();

  if ("error" in result) {
    redirect(`/identity-prompts?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/identity-prompts");
}

export type IdentityPromptResponseFormState = {
  error: string | null;
};

export async function submitIdentityPromptResponseAction(
  _prevState: IdentityPromptResponseFormState,
  formData: FormData,
): Promise<IdentityPromptResponseFormState> {
  const promptId = formData.get("promptId");
  const response = formData.get("response");

  if (typeof promptId !== "string") {
    return { error: "Invalid form submission." };
  }

  if (typeof response !== "string") {
    return { error: "Response is required." };
  }

  const result = await submitIdentityPromptResponse(promptId, response);

  if ("error" in result) {
    return { error: result.error };
  }

  redirect(`/identity-prompts/${promptId}`);
}
