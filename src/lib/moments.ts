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

/**
 * Deletes a moment owned by the current user. Used to clean up a situation that
 * was created at the start of an AI generation request when that generation
 * fails before completion, so a failed request never leaves an orphaned,
 * empty situation behind. Scoped by user_id, so it can only ever remove the
 * caller's own moment. paths and forecasts are removed via ON DELETE CASCADE;
 * timeline_events reference a moment without an FK, so they are removed here.
 */
export async function deleteMoment(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();

  await supabase
    .from("timeline_events")
    .delete()
    .eq("user_id", auth.userId)
    .eq("reference_type", "moment")
    .eq("reference_id", id);

  const { error } = await supabase
    .from("moments")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) {
    return { error: error.message };
  }

  return { ok: true };
}

export async function createMoment(input: {
  title: string;
  description?: string | null;
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
  const supabase = await createClient();

  // Atomic: the moment row and its "moment_created" timeline event are written
  // in a single transaction inside create_moment_with_event, so a failure can
  // never leave a moment without its event (or require a manual delete-rollback).
  const { data: moment, error: momentError } = await supabase.rpc(
    "create_moment_with_event",
    {
      p_title: title,
      p_description: description,
    },
  );

  if (momentError || !moment) {
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
