import { afterEach, describe, expect, it, vi } from "vitest";

const { authMock, momentsCountMock, fromMock, redirectMock } = vi.hoisted(() => {
  // signIn's onboarding check: from("moments").select(..., head).eq(...)
  // resolving to a count. Default is a data-holding account; tests override.
  const momentsCountMock = vi.fn<
    () => Promise<{ count: number | null; error: { message: string } | null }>
  >(async () => ({ count: 3, error: null }));
  return {
    authMock: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resend: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getUser: vi.fn(),
    },
    momentsCountMock,
    fromMock: vi.fn(() => ({
      select: vi.fn(() => ({ eq: momentsCountMock })),
    })),
    // The real redirect() never returns — it throws. The mock mirrors that so
    // action code after redirect() is provably unreachable in tests too.
    redirectMock: vi.fn((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    }),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: authMock, from: fromMock })),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ origin: "https://app.test" })),
}));

const { requestPasswordReset, signIn, signUp, updatePassword } = await import(
  "@/actions/auth"
);

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

describe("signIn onboarding routing", () => {
  function signInWith(user: Record<string, unknown>, redirectTo?: string) {
    authMock.signInWithPassword.mockResolvedValue({
      data: { user },
      error: null,
    });
    return signIn(
      { error: null },
      formDataFrom({
        email: "a@b.test",
        password: "longenough",
        ...(redirectTo ? { redirectTo } : {}),
      }),
    );
  }

  it("routes a brand-new account (no flag, no situations) to /welcome", async () => {
    momentsCountMock.mockResolvedValue({ count: 0, error: null });

    await expect(signInWith({ id: "u1", user_metadata: {} })).rejects.toThrow(
      "NEXT_REDIRECT:/welcome",
    );
  });

  it("routes anyone who finished or skipped onboarding to /overview without counting", async () => {
    await expect(
      signInWith({
        id: "u1",
        user_metadata: { onboarding_completed_at: "2026-07-13T00:00:00Z" },
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/overview");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("keeps accounts that predate onboarding (no flag, has situations) out of /welcome", async () => {
    momentsCountMock.mockResolvedValue({ count: 3, error: null });

    await expect(signInWith({ id: "u1", user_metadata: {} })).rejects.toThrow(
      "NEXT_REDIRECT:/overview",
    );
  });

  it("lets an explicit deep link win over onboarding", async () => {
    await expect(
      signInWith({ id: "u1", user_metadata: {} }, "/moments/abc"),
    ).rejects.toThrow("NEXT_REDIRECT:/moments/abc");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("resolves a failed count to /overview, never detouring a working account", async () => {
    momentsCountMock.mockResolvedValue({
      count: null,
      error: { message: "boom" },
    });

    await expect(signInWith({ id: "u1", user_metadata: {} })).rejects.toThrow(
      "NEXT_REDIRECT:/overview",
    );
  });
});

describe("signUp", () => {
  it("redirects new accounts to onboarding when Supabase returns a session (confirmations disabled)", async () => {
    authMock.signUp.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });

    await expect(
      signUp(
        { error: null, pendingEmail: null },
        formDataFrom({ email: "a@b.test", password: "longenough" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/welcome");
  });

  it("returns the check-your-email state when no session is returned (confirmations enabled)", async () => {
    authMock.signUp.mockResolvedValue({ data: { session: null }, error: null });

    const state = await signUp(
      { error: null, pendingEmail: null },
      formDataFrom({ email: "a@b.test", password: "longenough" }),
    );

    expect(state).toEqual({ error: null, pendingEmail: "a@b.test" });
    expect(redirectMock).not.toHaveBeenCalled();
    // Confirmation link must round-trip through the app's auth callback,
    // landing the newly confirmed account in onboarding.
    expect(authMock.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          emailRedirectTo: "https://app.test/auth/callback?next=/welcome",
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
