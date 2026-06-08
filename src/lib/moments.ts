import { createClient } from "@/lib/supabase/server";
import type { Moment } from "@/types/database";
import type { MomentStatus } from "@/types/enums";

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;

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

function validateDescription(description: string | null | undefined): string | null {
  if (description == null || description.trim() === "") {
    return null;
  }

  if (description.trim().length > DESCRIPTION_MAX_LENGTH) {
    return `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
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

  const descriptionError = validateDescription(description);
  if (descriptionError) {
    return { error: descriptionError };
  }

  const title = input.title.trim();
  const supabase = await createClient();

  const { data: moment, error: momentError } = await supabase
    .from("moments")
    .insert({
      user_id: auth.userId,
      title,
      description,
    })
    .select("*")
    .single();

  if (momentError || !moment) {
    return { error: momentError?.message ?? "Failed to create moment." };
  }

  const { error: timelineError } = await supabase.from("timeline_events").insert({
    user_id: auth.userId,
    event_type: "moment_created",
    reference_type: "moment",
    reference_id: moment.id,
    title: "Captured a moment",
    summary: description,
    metadata: {
      moment_id: moment.id,
      moment_title: title,
    },
  });

  if (timelineError) {
    await supabase.from("moments").delete().eq("id", moment.id);
    return { error: timelineError.message };
  }

  return { moment };
}

export async function updateMoment(
  id: string,
  input: {
    title?: string;
    description?: string | null;
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
    const descriptionError = validateDescription(description);
    if (descriptionError) {
      return { error: descriptionError };
    }
    updates.description = description;
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
