import { afterEach, describe, expect, it, vi } from "vitest";

const { authMock, updateEqMock, updateMock } = vi.hoisted(() => {
  const updateEqMock = vi.fn();
  return {
    authMock: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
    updateEqMock,
    updateMock: vi.fn(() => ({ eq: updateEqMock })),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: authMock,
    from: vi.fn(() => ({ update: updateMock })),
  })),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ origin: "https://app.test" })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { requestEmailChange, updateDisplayName } = await import("@/actions/settings");

function formDataFrom(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.append(key, value);
  }
  return formData;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("updateDisplayName", () => {
  it("saves a trimmed display name to the profile row", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    updateEqMock.mockResolvedValue({ error: null });

    const state = await updateDisplayName(
      { error: null, saved: false },
      formDataFrom({ displayName: "  Sebastian  " }),
    );

    expect(state).toEqual({ error: null, saved: true });
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Sebastian" });
    expect(updateEqMock).toHaveBeenCalledWith("id", "u1");
  });

  it("clears the name when submitted empty", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    updateEqMock.mockResolvedValue({ error: null });

    const state = await updateDisplayName(
      { error: null, saved: false },
      formDataFrom({ displayName: "   " }),
    );

    expect(state).toEqual({ error: null, saved: true });
    expect(updateMock).toHaveBeenCalledWith({ display_name: null });
  });

  it("rejects names over the length limit without writing", async () => {
    const state = await updateDisplayName(
      { error: null, saved: false },
      formDataFrom({ displayName: "x".repeat(61) }),
    );

    expect(state.saved).toBe(false);
    expect(state.error).toMatch(/60 characters/);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("requestEmailChange", () => {
  it("starts the change and reports the pending address", async () => {
    authMock.getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "old@b.test" } },
    });
    authMock.updateUser.mockResolvedValue({ error: null });

    const state = await requestEmailChange(
      { error: null, pendingEmail: null },
      formDataFrom({ email: "new@b.test" }),
    );

    expect(state).toEqual({ error: null, pendingEmail: "new@b.test" });
    // The confirmation link must round-trip through the app's auth callback.
    expect(authMock.updateUser).toHaveBeenCalledWith(
      { email: "new@b.test" },
      { emailRedirectTo: "https://app.test/auth/callback?next=/settings" },
    );
  });

  it("rejects the current address without calling auth", async () => {
    authMock.getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "same@b.test" } },
    });

    const state = await requestEmailChange(
      { error: null, pendingEmail: null },
      formDataFrom({ email: "Same@b.test" }),
    );

    expect(state.pendingEmail).toBeNull();
    expect(state.error).toMatch(/already your email/);
    expect(authMock.updateUser).not.toHaveBeenCalled();
  });
});
