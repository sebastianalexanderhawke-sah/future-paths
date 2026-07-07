import { createClient } from "@/lib/supabase/server";
import type { Moment } from "@/types/database";
import type { MomentStatus } from "@/types/enums";

const TITLE_MAX_LENGTH = 200;

type AuthSuccess = { userId: string };
type AuthFailure = { error: string };

async function requireUser(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Not authenticated." };
  }

  return { userId: user.id };
}

function validateTitle(title: string): string | null {
  const trimmed = title.trim();

  if (!trimmed) {
    return "Title is required.";
  }

  if (trimmed.length > TITLE_MAX_LENGTH) {
    return `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

export async function listMoments(): Promise<
  { moments: Moment[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("moments")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { moments: data };
}

export async function listArchivedMoments(): Promise<
  { moments: Moment[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("moments")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { moments: data };
}

export async function getMoment(
  id: string,
): Promise<{ moment: Moment } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("moments")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Moment not found." };
  }

  return { moment: data };
}

export async function createMoment(input: {
  title: string;
  description?: string | null;
  clientToken?: string | null;
}): Promise<{ moment: Moment } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const titleError = validateTitle(input.title);
  if (titleError) {
    return { error: titleError };
  }

  const description =
    input.description?.trim() === "" ? null : (input.description?.trim() ?? null);

  const title = input.title.trim();
  const clientToken = input.clientToken ?? null;
  const supabase = await createClient();

  // Idempotency (same pattern as check-ins): if this exact submission already
  // created a moment — the browser disconnected after the server committed
  // but before the client saw success — recover that moment instead of
  // creating a duplicate. The description is refreshed if the caller edited
  // context between attempts; the token identity is (user, submission), so
  // title changes regenerate the token client-side.
  if (clientToken) {
    const { data: existing } = await supabase
      .from("moments")
      .select("*")
      .eq("user_id", auth.userId)
      .eq("client_token", clientToken)
      .maybeSingle();

    if (existing) {
      if (existing.description !== description) {
        const { data: refreshed } = await supabase
          .from("moments")
          .update({ description })
          .eq("id", existing.id)
          .eq("user_id", auth.userId)
          .select("*")
          .maybeSingle();

        return { moment: refreshed ?? existing };
      }

      return { moment: existing };
    }
  }

  // Atomic: the moment row and its "moment_created" timeline event are written
  // in a single transaction inside create_moment_with_event, so a failure can
  // never leave a moment without its event (or require a manual delete-rollback).
  const { data: moment, error: momentError } = await supabase.rpc(
    "create_moment_with_event",
    {
      p_title: title,
      p_description: description,
      p_client_token: clientToken,
    },
  );

  if (momentError || !moment) {
    // Unique-violation backstop for the truly-concurrent duplicate: the other
    // submission with this token won the insert; recover its moment.
    if (momentError?.code === "23505" && clientToken) {
      const { data: existing } = await supabase
        .from("moments")
        .select("*")
        .eq("user_id", auth.userId)
        .eq("client_token", clientToken)
        .maybeSingle();

      if (existing) {
        return { moment: existing };
      }
    }

    return { error: momentError?.message ?? "Failed to create moment." };
  }

  return { moment };
}

export async function updateMoment(
  id: string,
  input: {
    title?: string;
    description?: string | null;
    current_understanding?: string | null;
    status?: MomentStatus;
  },
): Promise<{ moment: Moment } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const updates: {
    title?: string;
    description?: string | null;
    current_understanding?: string | null;
    status?: MomentStatus;
  } = {};

  if (input.title !== undefined) {
    const titleError = validateTitle(input.title);
    if (titleError) {
      return { error: titleError };
    }
    updates.title = input.title.trim();
  }

  if (input.description !== undefined) {
    const description =
      input.description?.trim() === "" ? null : (input.description?.trim() ?? null);
    updates.description = description;
  }

  if (input.current_understanding !== undefined) {
    updates.current_understanding = input.current_understanding;
  }

  if (input.status !== undefined) {
    updates.status = input.status;
  }

  if (Object.keys(updates).length === 0) {
    return { error: "Nothing to update." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("moments")
    .update(updates)
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("*")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Moment not found." };
  }

  return { moment: data };
}
