import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getIdentityEngineMode,
  IdentityEngineConfigError,
  isMockAllowedInProduction,
  resolveProviderForMode,
} from "@/lib/ai/config";
import { getIdentityAIProvider } from "@/lib/ai/providers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getIdentityEngineMode", () => {
  it("defaults to mock when the mode is absent (local development)", () => {
    vi.stubEnv("IDENTITY_ENGINE_MODE", "");
    expect(getIdentityEngineMode()).toBe("mock");
  });

  it("accepts each recognized mode", () => {
    for (const mode of ["mock", "claude", "auto"]) {
      vi.stubEnv("IDENTITY_ENGINE_MODE", mode);
      expect(getIdentityEngineMode()).toBe(mode);
    }
  });

  it("rejects an unrecognized mode instead of defaulting it to mock", () => {
    vi.stubEnv("IDENTITY_ENGINE_MODE", "claud");
    expect(() => getIdentityEngineMode()).toThrow(IdentityEngineConfigError);
    expect(() => getIdentityEngineMode()).toThrow(/Invalid IDENTITY_ENGINE_MODE "claud"/);
  });
});

describe("resolveProviderForMode", () => {
  it("resolves auto to claude when an API key is configured", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    expect(resolveProviderForMode("auto")).toBe("claude");
  });

  it("resolves auto to mock when no API key is configured", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(resolveProviderForMode("auto")).toBe("mock");
  });
});

describe("getIdentityAIProvider production fail-closed", () => {
  it("throws when production would run on the mock provider", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("IDENTITY_ENGINE_MODE", "mock");
    expect(() => getIdentityAIProvider()).toThrow(IdentityEngineConfigError);
  });

  it("throws when production auto mode has no API key", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("IDENTITY_ENGINE_MODE", "auto");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => getIdentityAIProvider()).toThrow(IdentityEngineConfigError);
  });

  it("throws when production has no mode configured at all", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("IDENTITY_ENGINE_MODE", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => getIdentityAIProvider()).toThrow(IdentityEngineConfigError);
  });

  it("allows mock in production only with the explicit opt-in", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("IDENTITY_ENGINE_MODE", "mock");
    vi.stubEnv("IDENTITY_ENGINE_ALLOW_MOCK", "true");
    expect(isMockAllowedInProduction()).toBe(true);
    expect(getIdentityAIProvider().id).toBe("mock");
  });

  it("serves claude in production when configured correctly", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("IDENTITY_ENGINE_MODE", "claude");
    expect(getIdentityAIProvider().id).toBe("claude");
  });

  it("keeps the mock default outside production (development behavior unchanged)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("IDENTITY_ENGINE_MODE", "");
    expect(getIdentityAIProvider().id).toBe("mock");
  });
});
