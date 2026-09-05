// ============================================================
// CBAR Workspace — Admin Users Edge Function
// Deploy with:  supabase functions deploy admin-users
//
// Actions (POST JSON):
//   { action: "create-user",     email, password, fullName, role, committeeId?, studentNumber? }
//   { action: "reset-password",  authUserId, newPassword }
//   { action: "set-status",      authUserId, status: "Active" | "Inactive" }
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Verify the caller is an Administrator -----------------
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ error: "Missing authorization token" }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: callerData, error: callerError } =
      await callerClient.auth.getUser(token);
    if (callerError || !callerData.user) {
      return json({ error: "Invalid token" }, 401);
    }

    const service = createClient(supabaseUrl, serviceKey);

    const { data: callerProfile } = await service
      .from("profiles")
      .select("id, role")
      .eq("user_id", callerData.user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "Administrator") {
      return json({ error: "Only administrators can manage users" }, 403);
    }

    // --- Handle the requested action ---------------------------
    const body = await req.json();
    const action = body.action as string;

    if (action === "create-user") {
      const { email, password, fullName, role, committeeId, studentNumber } =
        body as {
          email: string;
          password: string;
          fullName: string;
          role: "Administrator" | "Researcher";
          committeeId?: string | null;
          studentNumber?: string;
        };

      if (!email || !password || !fullName) {
        return json({ error: "email, password and fullName are required" }, 400);
      }

      const { data: created, error: createError } = await service.auth.admin
        .createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

      if (createError) {
        return json({ error: createError.message }, 400);
      }

      // Attach the seeded profile (by email) to the new auth user,
      // or create a fresh profile if none exists yet.
      const { error: profileError } = await service
        .from("profiles")
        .upsert(
          {
            user_id: created.user.id,
            full_name: fullName,
            email,
            role: role ?? "Researcher",
            status: "Active",
            committee_id: committeeId ?? null,
            student_number: studentNumber ?? "",
          },
          { onConflict: "email" }
        );

      if (profileError) {
        return json({ error: profileError.message }, 500);
      }

      return json({ data: { userId: created.user.id, email } });
    }

    if (action === "reset-password") {
      const { authUserId, newPassword } = body as {
        authUserId: string;
        newPassword: string;
      };
      if (!authUserId || !newPassword) {
        return json({ error: "authUserId and newPassword are required" }, 400);
      }

      const { error } = await service.auth.admin.updateUserById(authUserId, {
        password: newPassword,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ data: { ok: true } });
    }

    if (action === "set-status") {
      const { authUserId, status } = body as {
        authUserId: string;
        status: "Active" | "Inactive";
      };
      if (!authUserId || !status) {
        return json({ error: "authUserId and status are required" }, 400);
      }

      const ban = status === "Inactive";
      const { error } = await service.auth.admin.updateUserById(authUserId, {
        ban_duration: ban ? "876000h" : "none",
      });
      if (error) return json({ error: error.message }, 400);

      await service
        .from("profiles")
        .update({ status })
        .eq("user_id", authUserId);

      return json({ data: { ok: true } });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
});
