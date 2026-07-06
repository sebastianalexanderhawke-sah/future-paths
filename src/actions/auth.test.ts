import { afterEach, describe, expect, it, vi } from "vitest";

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: {
    signUp: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    getUser: vi.fn(),
  },
  // The real redirect() never returns — it throws. The mock mirrors that so
  // action code after redirect() is provably unreachable in tests too.
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: authMock })),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ origin: "https://app.test" })),
}));

const { requestPasswordReset, signUp, updatePassword } = await import("@/actions/auth");

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

describe("signUp", () => {
  it("redirects to Overview when Supabase returns a session (confirmations disabled)", async () => {
    authMock.signUp.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });

    await expect(
      signUp(
        { error: null, pendingEmail: null },
        formDataFrom({ email: "a@b.test", password: "longenough" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/overview");
  });

  it("returns the check-your-email state when no session is returned (confirmations enabled)", async () => {
    authMock.signUp.mockResolvedValue({ data: { session: null }, error: null });

    const state = await signUp(
      { error: null, pendingEmail: null },
      formDataFrom({ email: "a@b.test", password: "longenough" }),
    );

    expect(state).toEqual({ error: null, pendingEmail: "a@b.test" });
    expect(redirectMock).not.toHaveBeenCalled();
    // Confirmation link must round-trip through the app's auth callback.
    expect(authMock.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          emailRedirectTo: "https://app.test/auth/callback?next=/overview",
        },
      }),
    );
  });
});

describe("requestPasswordReset", () => {
  it("reports success without revealing whether the account exists", async () => {
    authMock.resetPasswordForEmail.mockResolvedValue({ error: null });

    const state = await requestPasswordReset(
      { error: null, sent: false },
      formDataFrom({ email: "a@b.test" }),
    );

    expect(state).toEqual({ error: null, sent: true });
    expect(authMock.resetPasswordForEmail).toHaveBeenCalledWith("a@b.test", {
      redirectTo: "https://app.test/auth/callback?next=/update-password",
    });
  });

  it("reports the same success even when Supabase errors (no account enumeration)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.resetPasswordForEmail.mockResolvedValue({
      error: { message: "rate limited" },
    });

    const state = await requestPasswordReset(
      { error: null, sent: false },
      formDataFrom({ email: "a@b.test" }),
    );

    expect(state).toEqual({ error: null, sent: true });
    // The failure is still visible server-side through the error reporter.
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("updatePassword", () => {
  it("rejects mismatched passwords before touching auth", async () => {
    const state = await updatePassword(
      { error: null, updated: false },
      formDataFrom({ password: "longenough", confirmPassword: "different1" }),
    );

    expect(state.error).toMatch(/don't match/);
    expect(authMock.updateUser).not.toHaveBeenCalled();
  });

  it("explains an expired link when no session remains", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: null } });

    const state = await updatePassword(
      { error: null, updated: false },
      formDataFrom({ password: "longenough", confirmPassword: "longenough" }),
    );

    expect(state.error).toMatch(/expired/);
    expect(authMock.updateUser).not.toHaveBeenCalled();
  });

  it("updates the password for an authenticated recovery session", async () => {
    authMock.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    authMock.updateUser.mockResolvedValue({ error: null });

    const state = await updatePassword(
      { error: null, updated: false },
      formDataFrom({ password: "longenough", confirmPassword: "longenough" }),
    );

    expect(state).toEqual({ error: null, updated: true });
    expect(authMock.updateUser).toHaveBeenCalledWith({ password: "longenough" });
  });
});
