// ============================================================
// CBAR Workspace — activity logging & notification helpers
// ============================================================

import { createClient } from "./supabase/client";
import type { Profile } from "./types";

/**
 * Records an action in the activity log.
 * Fails silently — logging must never break a user flow.
 */
export async function logActivity(params: {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userData.user.id)
      .single();

    await supabase.from("activity_logs").insert({
      user_id: profile?.id ?? null,
      action: params.action,
      entity_type: params.entityType ?? "",
      entity_id: params.entityId ?? "",
      details: params.details ?? {},
    });
  } catch {
    // never throw from logging
  }
}

/**
 * Sends a notification to a specific member.
 */
export async function notifyUser(
  profileId: string,
  notification: {
    type?: string;
    title: string;
    body?: string;
    link?: string;
  }
) {
  try {
    const supabase = createClient();
    await supabase.from("notifications").insert({
      user_id: profileId,
      type: notification.type ?? "info",
      title: notification.title,
      body: notification.body ?? "",
      link: notification.link ?? "",
    });
  } catch {
    // never throw from notifications
  }
}

/**
 * Sends a notification to every active member except the sender.
 */
export async function notifyAll(
  members: Pick<Profile, "id">[],
  senderId: string | null,
  notification: { type?: string; title: string; body?: string; link?: string }
) {
  await Promise.all(
    members
      .filter((m) => m.id !== senderId)
      .map((m) => notifyUser(m.id, notification))
  );
}
