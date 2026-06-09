import type { z } from "zod";

import type { IdentityContextBundle } from "@/lib/ai/context/slices";
import type { ContextProfile } from "@/lib/ai/context/profiles";

export const IDENTITY_ENGINE_MODES = ["mock", "claude", "auto"] as const;
export type IdentityEngineMode = (typeof IDENTITY_ENGINE_MODES)[number];

export const IDENTITY_ENGINE_PROVIDERS = ["mock", "claude"] as const;
export type IdentityEngineProviderId = (typeof IDENTITY_ENGINE_PROVIDERS)[number];

export type GenerationMetadata = {
  provider: IdentityEngineProviderId;
  prompt_id: string;
  prompt_version: string;
  generated_at: string;
};

export type StructuredGenerationRequest<T> = {
  profile: ContextProfile;
  promptId: string;
  promptVersion: string;
  context: IdentityContextBundle;
  schema: z.ZodType<T>;
  options?: {
    maxTokens?: number;
    temperature?: number;
  };
};

export type GenerationSuccess<T> = {
  ok: true;
  data: T;
  metadata: GenerationMetadata;
};

export type GenerationFailure = {
  ok: false;
  error: string;
  fallbackAvailable: boolean;
};

export type GenerationResult<T> = GenerationSuccess<T> | GenerationFailure;

export function createGenerationMetadata(input: {
  provider: IdentityEngineProviderId;
  promptId: string;
  promptVersion: string;
  generatedAt?: string;
}): GenerationMetadata {
  return {
    provider: input.provider,
    prompt_id: input.promptId,
    prompt_version: input.promptVersion,
    generated_at: input.generatedAt ?? new Date().toISOString(),
  };
};
