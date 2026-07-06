import { afterEach, describe, expect, it, vi } from "vitest";

import {
  reportDiscardedResultError,
  reportError,
  swallowReporting,
} from "@/lib/observability";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("reportError", () => {
  it("emits one structured [error-report] line", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await reportError("test: something failed", new Error("boom"), { momentId: "m1" });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const line = errorSpy.mock.calls[0][0] as string;
    expect(line).toContain("[error-report]");
    const payload = JSON.parse(line.replace("[error-report] ", ""));
    expect(payload.context).toBe("test: something failed");
    expect(payload.message).toBe("boom");
    expect(payload.extra).toEqual({ momentId: "m1" });
    expect(payload.stack).toBeDefined();
  });

  it("posts to the webhook when ERROR_REPORTING_WEBHOOK_URL is set", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("ERROR_REPORTING_WEBHOOK_URL", "https://example.com/hook");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok"));

    await reportError("test: webhook", "failure text");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.com/hook");
    expect(JSON.parse((init as RequestInit).body as string).message).toBe(
      "failure text",
    );
  });

  it("never rejects, even when logging and the webhook both fail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("console broken");
    });
    vi.stubEnv("ERROR_REPORTING_WEBHOOK_URL", "https://example.com/hook");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    await expect(reportError("test: resilient", new Error("x"))).resolves.toBeUndefined();
  });
});

describe("swallowReporting", () => {
  it("reports and swallows, matching bare .catch(() => {}) semantics", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await Promise.reject(new Error("background failure")).catch(
      swallowReporting("test: swallowed"),
    );

    expect(result).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain("background failure");
  });
});

describe("reportDiscardedResultError", () => {
  it("reports results that resolved to { error }", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await reportDiscardedResultError("test: result error", { error: "generation failed" });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain("generation failed");
  });

  it("stays silent for successful results", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await reportDiscardedResultError("test: ok result", { futureSelves: [] });
    await reportDiscardedResultError("test: undefined result", undefined);

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
