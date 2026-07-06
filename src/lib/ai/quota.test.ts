import { afterEach, describe, expect, it, vi } from "vitest";

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: rpcMock })),
}));

const {
  consumeGenerationQuota,
  DEFAULT_DAILY_GENERATION_LIMIT,
  getDailyGenerationLimit,
  isQuotaBypassedForUser,
} = await import("@/lib/ai/quota");

afterEach(() => {
  vi.unstubAllEnvs();
  rpcMock.mockReset();
});

describe("getDailyGenerationLimit", () => {
  it("defaults when unset or invalid", () => {
    vi.stubEnv("AI_DAILY_GENERATION_LIMIT", "");
    expect(getDailyGenerationLimit()).toBe(DEFAULT_DAILY_GENERATION_LIMIT);

    vi.stubEnv("AI_DAILY_GENERATION_LIMIT", "not-a-number");
    expect(getDailyGenerationLimit()).toBe(DEFAULT_DAILY_GENERATION_LIMIT);

    vi.stubEnv("AI_DAILY_GENERATION_LIMIT", "-5");
    expect(getDailyGenerationLimit()).toBe(DEFAULT_DAILY_GENERATION_LIMIT);
  });

  it("honors a configured positive limit", () => {
    vi.stubEnv("AI_DAILY_GENERATION_LIMIT", "50");
    expect(getDailyGenerationLimit()).toBe(50);
  });
});

describe("isQuotaBypassedForUser", () => {
  it("always bypasses outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isQuotaBypassedForUser("anyone")).toBe(true);
  });

  it("enforces in production for non-allowlisted users", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_QUOTA_BYPASS_USER_IDS", "admin-1, admin-2");
    expect(isQuotaBypassedForUser("regular-user")).toBe(false);
  });

  it("bypasses allowlisted admin users in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_QUOTA_BYPASS_USER_IDS", "admin-1, admin-2");
    expect(isQuotaBypassedForUser("admin-2")).toBe(true);
  });
});

describe("consumeGenerationQuota", () => {
  it("does not touch the database when bypassed", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const decision = await consumeGenerationQuota("user-1");

    expect(decision).toEqual({ allowed: true });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("allows while the RPC reports remaining quota", async () => {
    vi.stubEnv("NODE_ENV", "production");
    rpcMock.mockResolvedValue({ data: true, error: null });

    const decision = await consumeGenerationQuota("user-1");

    expect(decision).toEqual({ allowed: true });
    expect(rpcMock).toHaveBeenCalledWith("consume_ai_generation_quota", {
      p_limit: DEFAULT_DAILY_GENERATION_LIMIT,
    });
  });

  it("blocks with quota_exceeded when the RPC reports exhaustion", async () => {
    vi.stubEnv("NODE_ENV", "production");
    rpcMock.mockResolvedValue({ data: false, error: null });

    const decision = await consumeGenerationQuota("user-1");

    expect(decision).toEqual({ allowed: false, reason: "quota_exceeded" });
  });

  it("fails open and reports when the quota check itself errors", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    rpcMock.mockResolvedValue({ data: null, error: { message: "db unavailable" } });

    const decision = await consumeGenerationQuota("user-1");

    expect(decision).toEqual({ allowed: true });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain("failing open");

    errorSpy.mockRestore();
  });

  it("fails open and reports when the RPC call throws", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    rpcMock.mockRejectedValue(new Error("network down"));

    const decision = await consumeGenerationQuota("user-1");

    expect(decision).toEqual({ allowed: true });
    expect(errorSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});
